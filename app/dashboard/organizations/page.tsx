'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import {
  Building2,
  Warehouse as WarehouseIcon,
  Plus,
  X,
  MapPin,
  ClipboardList,
  ClipboardCheck,
  Search,
  Settings,
  Library,
  CheckSquare,
  Edit2,
  Trash2,
  Upload,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'

interface Organization {
  _id: string
  name: string
  code: string
  email?: string
  phone?: string
  address?: string
  status: string
  createdAt: string
}

interface Warehouse {
  _id: string
  name: string
  code: string
  location?: string
  address?: string
  status: string
  auditStatus?: 'not_started' | 'in_progress' | 'completed'
  totalProducts?: number
  auditedProducts?: number
  checklistQuestions?: { category: string; question: string; responseType: string; order: number }[]
}

export default function CompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Warehouse Modal States
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [showAddNodeModal, setShowAddNodeModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [orgWarehouses, setOrgWarehouses] = useState<Warehouse[]>([])
  const [whLoading, setWhLoading] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)

  const [formData, setFormData] = useState({ name: '', code: '', email: '', phone: '', address: '' })
  const [whFormData, setWhFormData] = useState({ name: '', code: '', location: '', address: '' })

  const [error, setError] = useState('')
  const [whError, setWhError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<any>(null)

  // Checklist Bank and Assignment States
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankQuestions, setBankQuestions] = useState<any[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [newBankQuestion, setNewBankQuestion] = useState({ category: '', question: '', responseType: 'yes_no' })

  const [showWhChecklistModal, setShowWhChecklistModal] = useState(false)
  const [whChecklistTarget, setWhChecklistTarget] = useState<Warehouse | null>(null)
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<string[]>([])

  const isAdmin = session?.user?.role === 'admin'
  const isStoreManager = session?.user?.role === 'store_manager'
  const isLeadAuditor = session?.user?.role === 'lead_auditor' || session?.user?.role === 'admin'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (
      status === 'authenticated' &&
      !['admin', 'store_manager', 'auditor', 'lead_auditor'].includes(session?.user?.role || '')
    ) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrganizations()
    }
  }, [status, session])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data)
      }
    } catch (err) {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async (orgId: string) => {
    try {
      setWhLoading(true)
      const response = await fetch(`/api/warehouses?organizationId=${orgId}`)
      if (response.ok) {
        const data = await response.json()
        setOrgWarehouses(data)
      }
    } catch (err) {
    } finally {
      setWhLoading(false)
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const url = editingOrg ? `/api/organizations/${editingOrg._id}` : '/api/organizations'
      const method = editingOrg ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSuccess(editingOrg ? `Updated company: ${formData.name}` : `Added company: ${formData.name}`)
        setFormData({ name: '', code: '', email: '', phone: '', address: '' })
        setEditingOrg(null)
        fetchOrganizations()
        setTimeout(() => {
          setShowCreateModal(false)
          setSuccess('')
        }, 2000)
      } else {
        setError((await res.json()).error)
      }
    } catch (err) {
      setError('Error saving company')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg) return
    setSubmitting(true)
    setWhError('')
    try {
      const url = editingWarehouse ? `/api/warehouses/${editingWarehouse._id}` : '/api/warehouses'
      const method = editingWarehouse ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...whFormData, organization: selectedOrg._id }),
      })
      if (res.ok) {
        const data = await res.json()
        setWhFormData({ name: '', code: '', location: '', address: '' })
        setEditingWarehouse(null)
        setShowAddNodeModal(false)
        fetchWarehouses(selectedOrg._id)

        // Proactively prompt to configure checklist for NEW warehouses
        if (method === 'POST' && data.warehouse) {
          setTimeout(() => {
            if (
              confirm(
                'Warehouse created successfully! Would you like to configure its specific audit checklist from the Question Bank now?'
              )
            ) {
              handleOpenWhChecklist(data.warehouse)
            }
          }, 500)
        }
      } else {
        setWhError((await res.json()).error)
      }
    } catch (err) {
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${orgName}"? This will also delete all associated warehouses and products. This action cannot be undone.`
      )
    )
      return
    try {
      const res = await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess(`${orgName} deleted successfully`)
        fetchOrganizations()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError((await res.json()).error || 'Failed to delete company')
      }
    } catch (err) {
      setError('Failed to delete company')
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedOrg) return

    setBulkUploading(true)
    setBulkSummary(null)
    setWhError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('organizationId', selectedOrg._id)

    try {
      const res = await fetch('/api/warehouses/bulk', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        setBulkSummary(data.summary)
        fetchWarehouses(selectedOrg._id)
      } else {
        setWhError(data.error || 'Bulk upload failed')
      }
    } catch (err) {
      setWhError('Failed to upload file')
    } finally {
      setBulkUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDeleteWarehouse = async (whId: string, whName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${whName}"? This will also delete all associated products. This action cannot be undone.`
      )
    )
      return
    try {
      const res = await fetch(`/api/warehouses/${whId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchWarehouses(selectedOrg!._id)
      } else {
        setWhError((await res.json()).error || 'Failed to delete warehouse')
      }
    } catch (err) {
      setWhError('Failed to delete warehouse')
    }
  }

  const fetchBankQuestions = async () => {
    try {
      setBankLoading(true)
      const res = await fetch('/api/checklist-bank')
      if (res.ok) setBankQuestions(await res.json())
    } finally {
      setBankLoading(false)
    }
  }

  const handleAddToBank = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/checklist-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBankQuestion),
      })
      if (res.ok) {
        setNewBankQuestion({ category: '', question: '', responseType: 'yes_no' })
        fetchBankQuestions()
      }
    } catch (err) {}
  }

  const handleDeleteFromBank = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const res = await fetch(`/api/checklist-bank?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchBankQuestions()
    } catch (err) {}
  }

  const handleOpenWhChecklist = async (wh: Warehouse) => {
    setWhChecklistTarget(wh)
    await fetchBankQuestions()

    // Find IDs of bank questions that match the warehouse's current questions
    const currentWhQuestions = wh.checklistQuestions || []
    const matchingIds: string[] = []

    // We need to wait for bankQuestions to be updated, but since fetchBankQuestions is async and updates state
    // it might be better to fetch and handle the data directly.
    const res = await fetch('/api/checklist-bank')
    if (res.ok) {
      const currentBank = await res.json()
      setBankQuestions(currentBank)
      currentWhQuestions.forEach((whQ) => {
        const match = currentBank.find((bq: any) => bq.question === whQ.question && bq.category === whQ.category)
        if (match) matchingIds.push(match._id)
      })
      setSelectedBankQuestions(matchingIds)
    }

    setShowWhChecklistModal(true)
  }

  const handleSaveWhChecklist = async () => {
    if (!whChecklistTarget) return
    const questionsToAssign = bankQuestions
      .filter((q) => selectedBankQuestions.includes(q._id))
      .map((q, index) => ({
        category: q.category,
        question: q.question,
        responseType: q.responseType,
        order: index,
      }))

    try {
      const res = await fetch(`/api/warehouses/${whChecklistTarget._id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToAssign }),
      })
      if (res.ok) {
        setShowWhChecklistModal(false)
        fetchWarehouses(selectedOrg!._id)
      }
    } catch (err) {}
  }

  const handleImportFromTemplate = async () => {
    if (!confirm('This will import all questions from the active checklist template into the Question Bank. Continue?'))
      return
    try {
      setBankLoading(true)
      const res = await fetch('/api/checklist-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_from_template' }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.message)
        fetchBankQuestions()
      }
    } finally {
      setBankLoading(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 sm:mb-10 pb-6 border-b border-zinc-200 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Companies</h2>
            <p className="text-zinc-500 font-medium text-sm mt-1">
              Manage organizations, catalog registry and warehouse networks
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLeadAuditor && (
              <button
                onClick={() => {
                  fetchBankQuestions()
                  setShowBankModal(true)
                }}
                className="border border-zinc-200 text-zinc-600 px-4 sm:px-6 py-3 font-bold text-sm rounded-xl hover:bg-zinc-50 transition-all flex items-center shadow-sm"
              >
                <Library className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Question Bank</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-black text-white px-4 sm:px-6 py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Add Company</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Company Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {organizations.map((org) => (
                <tr key={org._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="text-base font-bold text-black">{org.name}</div>
                    <div className="text-xs font-medium text-zinc-400 mt-0.5 uppercase tracking-widest font-mono">
                      {org.code}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrg(org)
                          fetchWarehouses(org._id)
                          setShowWarehouseModal(true)
                        }}
                        className="border border-zinc-200 px-3 sm:px-4 py-2 hover:border-black rounded-lg text-xs font-bold transition-all text-zinc-600 inline-flex items-center"
                      >
                        <WarehouseIcon className="w-3 h-3 sm:mr-2" />
                        <span className="hidden sm:inline">Warehouses</span>
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setEditingOrg(org)
                              setFormData({
                                name: org.name,
                                code: org.code,
                                email: org.email || '',
                                phone: org.phone || '',
                                address: org.address || '',
                              })
                              setShowCreateModal(true)
                            }}
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600 hover:text-black"
                            title="Edit company"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrganization(org._id, org.name)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-zinc-600 hover:text-red-600"
                            title="Delete company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create/Edit Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold mb-6 border-b border-zinc-100 pb-4 text-black">
              {editingOrg ? 'Edit Company' : 'Add New Company'}
            </h3>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <input
                type="text"
                placeholder="Company Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
              />
              <input
                type="text"
                placeholder="Unique Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                disabled={!!editingOrg}
              />
              {error && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}
              {success && <p className="text-xs font-bold text-green-500 uppercase tracking-widest">{success}</p>}
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingOrg(null)
                    setFormData({ name: '', code: '', email: '', phone: '', address: '' })
                  }}
                  className="flex-1 font-bold text-sm border border-zinc-200 py-3 rounded-xl hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-black text-white py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 disabled:opacity-50"
                >
                  {editingOrg ? 'Update Company' : 'Save Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Management Modal */}
      {showWarehouseModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full h-[95vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="p-5 sm:p-7 border-b border-zinc-100 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-black truncate">{selectedOrg.name}</h3>
                <p className="text-zinc-400 font-medium text-xs mt-0.5">
                  {orgWarehouses.length} warehouse{orgWarehouses.length !== 1 ? 's' : ''} registered
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(isAdmin || isStoreManager) && (
                  <button
                    onClick={() => {
                      setEditingWarehouse(null)
                      setWhFormData({ name: '', code: '', location: '', address: '' })
                      setWhError('')
                      setShowAddNodeModal(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Node</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setBulkSummary(null); setShowImportModal(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:border-black hover:text-black transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                )}
                <button
                  onClick={() => setShowWarehouseModal(false)}
                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Warehouse list — full width */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {whLoading ? (
                <div className="flex items-center justify-center py-20 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm font-medium">Loading warehouses…</span>
                </div>
              ) : orgWarehouses.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl text-zinc-300 font-bold text-xs uppercase tracking-widest">
                  No warehouses registered for this company
                </div>
              ) : (
                <div className="space-y-3">
                  {orgWarehouses.map((wh) => {
                    const total = wh.totalProducts ?? 0
                    const audited = wh.auditedProducts ?? 0
                    const pct = total > 0 ? Math.round((audited / total) * 100) : 0
                    return (
                      <div
                        key={wh._id}
                        className="p-4 sm:p-5 border border-zinc-100 rounded-2xl flex items-start justify-between gap-4 group hover:border-zinc-300 transition-colors"
                      >
                        {/* Info + progress */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm text-black">{wh.name}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{wh.code}</span>
                          </div>
                          <div className="flex items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider gap-3">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{wh.location || 'No location'}</span>
                            {wh.address && <span className="hidden sm:flex items-center gap-1 font-medium text-zinc-400 text-[10px] normal-case"><Building2 className="w-3 h-3 shrink-0" />{wh.address}</span>}
                          </div>
                          {total > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                                <span>{audited} / {total} audited</span>
                                <span className={pct === 100 ? 'text-emerald-500' : ''}>{pct}%</span>
                              </div>
                              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-black' : 'bg-zinc-200'}`}
                                  style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => router.push(`/dashboard/warehouses/${wh._id}`)}
                            className="p-2 bg-zinc-50 text-black border border-zinc-200 rounded-xl hover:bg-black hover:text-white transition-all"
                            title="View inventory"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/warehouses/${wh._id}?tab=checklist`)}
                            className="p-2 bg-zinc-50 text-emerald-600 border border-zinc-200 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                            title="Verification Checklist"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>
                          {isLeadAuditor && (
                            <button
                              onClick={() => handleOpenWhChecklist(wh)}
                              className="p-2 bg-zinc-50 text-blue-600 border border-zinc-200 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                              title="Configure Checklist"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingWarehouse(wh)
                                  setWhFormData({ name: wh.name, code: wh.code, location: wh.location || '', address: wh.address || '' })
                                  setWhError('')
                                  setShowAddNodeModal(true)
                                }}
                                className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500 hover:text-black"
                                title="Edit warehouse"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteWarehouse(wh._id, wh.name)}
                                className="p-2 hover:bg-red-50 rounded-xl transition-colors text-zinc-500 hover:text-red-600"
                                title="Delete warehouse"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Node Sub-modal */}
      {showAddNodeModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-black">
                  {editingWarehouse ? 'Edit Warehouse' : 'Add Operational Node'}
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">{selectedOrg.name}</p>
              </div>
              <button
                onClick={() => { setShowAddNodeModal(false); setEditingWarehouse(null); setWhFormData({ name: '', code: '', location: '', address: '' }) }}
                className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateWarehouse} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Distribution Center"
                    required
                    value={whFormData.name}
                    onChange={(e) => setWhFormData({ ...whFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Unique Node Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WH-001"
                    required
                    value={whFormData.code}
                    onChange={(e) => setWhFormData({ ...whFormData, code: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                    disabled={!!editingWarehouse}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">City / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Karachi South"
                      required
                      value={whFormData.location}
                      onChange={(e) => setWhFormData({ ...whFormData, location: e.target.value })}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Full Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 123, Sector 5…"
                      value={whFormData.address}
                      onChange={(e) => setWhFormData({ ...whFormData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                    />
                  </div>
                </div>
                {whError && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{whError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddNodeModal(false); setEditingWarehouse(null); setWhFormData({ name: '', code: '', location: '', address: '' }) }}
                    className="flex-1 py-3 border border-zinc-200 text-black font-bold text-sm rounded-xl hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : editingWarehouse ? 'Update' : 'Add Warehouse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Nodes Sub-modal */}
      {showImportModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-black flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Bulk Import Nodes
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">{selectedOrg?.name}</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-6 text-center">
                <input
                  type="file"
                  id="bulk-upload-wh"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleBulkUpload}
                  disabled={bulkUploading}
                />
                <label
                  htmlFor="bulk-upload-wh"
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer py-4 ${bulkUploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <Upload className={`w-8 h-8 ${bulkUploading ? 'animate-bounce text-zinc-300' : 'text-zinc-300'}`} />
                  <span className="text-sm font-bold text-zinc-700">{bulkUploading ? 'Processing…' : 'Click to upload spreadsheet'}</span>
                  <span className="text-xs text-zinc-400 font-medium">.xlsx, .xls or .csv</span>
                </label>
              </div>
              <a
                href="/templates/warehouse_template.csv"
                download
                className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3" /> Download Sample Template
              </a>
              {bulkSummary && (
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black mb-3">Import Result</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <p className="text-[8px] font-bold text-emerald-600 uppercase mb-1">Success</p>
                      <p className="text-2xl font-black text-emerald-700">{bulkSummary.success}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center border border-zinc-100">
                      <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">Skipped</p>
                      <p className="text-2xl font-black text-zinc-500">{bulkSummary.skipped}</p>
                    </div>
                  </div>
                  {bulkSummary.errors?.length > 0 && (
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {bulkSummary.errors.slice(0, 3).map((err: string, i: number) => (
                        <p key={i} className="text-[8px] text-red-500 font-bold uppercase truncate">{err}</p>
                      ))}
                      {bulkSummary.errors.length > 3 && (
                        <p className="text-[8px] text-zinc-400 font-bold uppercase">+{bulkSummary.errors.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {whError && bulkUploading && (
                <p className="text-xs font-bold text-red-500 text-center uppercase tracking-widest">{whError}</p>
              )}
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full py-3 border border-zinc-200 text-black font-bold text-sm rounded-xl hover:bg-zinc-50 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 sm:p-8 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-black flex items-center">
                  <Library className="w-5 h-5 mr-3" /> Question Bank
                </h3>
                <p className="text-zinc-500 font-medium text-xs mt-1">Manage global verification questions</p>
              </div>
              <div className="flex items-center gap-3">
                {bankQuestions.length === 0 && (
                  <button
                    onClick={handleImportFromTemplate}
                    disabled={bankLoading}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-all flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1.5" /> Import Existing Template
                  </button>
                )}
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-zinc-400 hover:text-black transition-all p-2 rounded-full hover:bg-zinc-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-5 sm:p-8 border-b border-zinc-100 bg-zinc-50/50">
              <form onSubmit={handleAddToBank} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Safety"
                    required
                    value={newBankQuestion.category}
                    onChange={(e) => setNewBankQuestion({ ...newBankQuestion, category: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Is the area clean?"
                    required
                    value={newBankQuestion.question}
                    onChange={(e) => setNewBankQuestion({ ...newBankQuestion, question: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-black text-white font-bold text-xs rounded-xl hover:bg-zinc-800 transition-all"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {bankQuestions.map((q) => (
                <div
                  key={q._id}
                  className="p-4 border border-zinc-100 rounded-2xl flex justify-between items-center group hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-zinc-100 rounded text-zinc-500">
                      {q.category}
                    </span>
                    <p className="text-sm font-bold mt-1">{q.question}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFromBank(q._id)}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {bankQuestions.length === 0 && (
                <div className="py-20 text-center text-zinc-300 font-bold text-xs uppercase">Bank is empty</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Checklist Configuration Modal */}
      {showWhChecklistModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-60 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 sm:p-8 border-b border-zinc-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-black flex items-center">
                  <CheckSquare className="w-5 h-5 mr-3" /> Checklist for {whChecklistTarget?.name}
                </h3>
                <p className="text-zinc-500 font-medium text-xs mt-1">
                  Select questions from the bank for this warehouse
                </p>
              </div>
              <button
                onClick={() => setShowWhChecklistModal(false)}
                className="text-zinc-400 hover:text-black transition-all p-2 rounded-full hover:bg-zinc-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              {/* Group questions by category */}
              {Array.from(new Set(bankQuestions.map((q) => q.category))).map((cat) => (
                <div key={cat} className="mb-8">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 ml-1">{cat}</h4>
                  <div className="space-y-3">
                    {bankQuestions
                      .filter((q) => q.category === cat)
                      .map((q) => (
                        <label
                          key={q._id}
                          className={`flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedBankQuestions.includes(q._id) ? 'border-black bg-zinc-50' : 'border-zinc-100 hover:border-zinc-200'}`}
                        >
                          <input
                            type="checkbox"
                            className="w-5 h-5 accent-black mr-4"
                            checked={selectedBankQuestions.includes(q._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBankQuestions([...selectedBankQuestions, q._id])
                              else setSelectedBankQuestions(selectedBankQuestions.filter((id) => id !== q._id))
                            }}
                          />
                          <span className="text-sm font-bold">{q.question}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
              {bankQuestions.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-zinc-400 font-bold text-xs uppercase">No questions available in bank</p>
                  <button
                    onClick={() => {
                      setShowWhChecklistModal(false)
                      setShowBankModal(true)
                    }}
                    className="mt-4 text-black font-bold text-xs underline"
                  >
                    Go to Question Bank
                  </button>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-8 border-t border-zinc-100 flex gap-4 bg-zinc-50/50">
              <button
                onClick={() => setShowWhChecklistModal(false)}
                className="flex-1 py-4 border border-zinc-200 text-black font-bold text-sm rounded-xl hover:bg-zinc-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWhChecklist}
                className="flex-1 py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md"
              >
                Update Warehouse Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
