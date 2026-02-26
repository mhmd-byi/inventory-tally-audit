'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import { Users, UserPlus, X, Check, AlertCircle, Building2, Database, Trash2 } from 'lucide-react'

interface Organization {
  _id: string
  name: string
  code: string
}

interface Warehouse {
  _id: string
  name: string
  code: string
}

interface UserData {
  _id: string
  name: string
  email: string
  role: string
  organization?: Organization
  organizations?: Organization[]
  warehouse?: Warehouse
  warehouses?: Warehouse[]
  createdAt: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingWarehouses, setFetchingWarehouses] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auditor',
    organizationId: '',
    organizationIds: [] as string[],
    warehouseId: '',
    warehouseIds: [] as string[],
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = session?.user?.role === 'admin'
  const isLeadAuditor = session?.user?.role === 'lead_auditor'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && !['admin', 'lead_auditor'].includes(session?.user?.role || '')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && (isAdmin || isLeadAuditor)) {
      fetchUsers()
      fetchOrganizations()
    }
  }, [status, session, isAdmin, isLeadAuditor])

  useEffect(() => {
    if (isLeadAuditor) {
      setFormData((prev) => ({ ...prev, role: 'auditor' }))
    }
  }, [isLeadAuditor])

  useEffect(() => {
    if (isLeadAuditor && session?.user?.organization && formData.role === 'auditor') {
      setFormData((prev) => ({ ...prev, organizationId: session.user.organization || '' }))
      fetchWarehouses(session.user.organization)
    }
  }, [isLeadAuditor, session, formData.role])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        setError((await response.json()).error || 'Sync Error')
      }
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) setOrganizations(await response.json())
    } catch (err) {}
  }

  const fetchWarehouses = async (orgId: string) => {
    if (!orgId) {
      setWarehouses([])
      return
    }
    try {
      setFetchingWarehouses(true)
      const response = await fetch(`/api/warehouses?organizationId=${orgId}`)
      if (response.ok) setWarehouses(await response.json())
    } catch (err) {
    } finally {
      setFetchingWarehouses(false)
    }
  }

  const handleWarehouseToggle = (whId: string) => {
    setFormData((prev) => {
      const current = [...prev.warehouseIds]
      if (current.includes(whId)) {
        return { ...prev, warehouseIds: current.filter((id) => id !== whId) }
      } else {
        return { ...prev, warehouseIds: [...current, whId] }
      }
    })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (formData.role === 'store_manager') {
      if (!formData.organizationId) {
        setError('Please select a company for the Store Manager')
        setSubmitting(false)
        return
      }
      if (!formData.warehouseId) {
        setError('Please select a warehouse for the Store Manager')
        setSubmitting(false)
        return
      }
    }

    if (formData.role === 'auditor') {
      if (!formData.organizationId) {
        setError('Please select a company for the Auditor')
        setSubmitting(false)
        return
      }
      if (formData.warehouseIds.length === 0) {
        setError('Please select at least one warehouse for the Auditor')
        setSubmitting(false)
        return
      }
    }

    if (formData.role === 'lead_auditor') {
      if (!formData.organizationId) {
        setError('Please select a company for the Lead Auditor')
        setSubmitting(false)
        return
      }
    }

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          secretKey: 'your-super-secret-key-change-this-in-prod',
        }),
      })

      if (response.ok) {
        setSuccess(`User account created for ${formData.name}`)
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'auditor',
          organizationId: '',
          organizationIds: [],
          warehouseId: '',
          warehouseIds: [],
        })
        setWarehouses([])
        fetchUsers()
        setTimeout(() => {
          setShowCreateModal(false)
          setSuccess('')
        }, 2000)
      } else {
        setError((await response.json()).error || 'Account creation failed')
      }
    } catch (err) {
      setError('Unexpected Error')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (response.ok) setUsers(users.filter((u) => u._id !== userId))
      else setError((await response.json()).error || 'Deletion failed')
    } catch (err) {
      setError('Error')
    }
  }

  if (status === 'loading') return null

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex justify-between items-end mb-10 pb-6 border-b border-zinc-200">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Users</h2>
            <p className="text-zinc-500 font-medium text-sm mt-1">Manage accounts and platform access</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-black text-white px-6 py-3 font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all flex items-center shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add New User
          </button>
        </div>

        {success && (
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl mb-8 flex items-center space-x-3">
            <Check className="w-5 h-5 text-black" />
            <span className="font-bold text-sm text-black">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-8 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-bold text-sm text-red-600">{error}</span>
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Name & Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Account Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">Company Access</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center font-bold text-black mr-4 uppercase text-sm border border-zinc-200">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black">{user.name}</div>
                        <div className="text-xs font-medium text-zinc-400 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider border border-zinc-200 px-2 py-0.5 rounded-md bg-white">
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      {user.role === 'admin' ? (
                        <span className="text-[10px] font-bold uppercase text-zinc-400">All Systems Access</span>
                      ) : user.role === 'lead_auditor' ? (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase text-black">
                            {typeof user.organization === 'object' ? (user.organization as any)?.name : '-'}
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                            ✓ Full Organization Access
                          </span>
                        </div>
                      ) : user.role === 'auditor' ? (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase text-black">
                            {typeof user.organization === 'object' ? (user.organization as any)?.name : '-'}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {user.warehouses?.map((wh: any) => (
                              <span
                                key={wh._id}
                                className="text-[9px] font-bold border border-zinc-100 px-1.5 py-0.5 rounded uppercase bg-zinc-50/50 text-zinc-500 inline-flex items-center"
                              >
                                <Database className="w-2 h-2 mr-1" /> {wh.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase text-black">
                            {typeof user.organization === 'object' ? (user.organization as any)?.name : '-'}
                          </div>
                          {user.warehouse && (
                            <div className="flex items-center text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                              <Database className="w-2.5 h-2.5 mr-1" /> {user.warehouse.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      className="text-zinc-300 hover:text-red-500 transition-all p-2 disabled:opacity-0"
                      onClick={() => deleteUser(user._id)}
                      disabled={user.email === session?.user?.email}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-10 border-b border-zinc-100 pb-6">
              <div>
                <h3 className="text-xl font-bold text-black">User Setup</h3>
                <p className="text-zinc-500 font-medium text-xs mt-1">Create new system account</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-300 hover:text-black transition-all p-2"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm"
                />
                <input
                  type="password"
                  placeholder="Account Password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-medium text-sm shadow-sm"
                />

                {isAdmin ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:border-black outline-none font-bold text-sm appearance-none shadow-sm"
                  >
                    <option value="auditor">Auditor (Specific Warehouses)</option>
                    <option value="lead_auditor">Lead Auditor (Organization-wide)</option>
                    <option value="store_manager">Store Manager (Single Company)</option>
                    <option value="admin">System Admin</option>
                  </select>
                ) : (
                  <div className="w-full px-4 py-3 border border-zinc-100 bg-zinc-50 rounded-xl font-bold text-sm text-zinc-500 flex items-center">
                    Auditor (Specific Warehouses)
                  </div>
                )}

                {formData.role === 'store_manager' && (
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Assignment Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">Company</label>
                        <select
                          required
                          value={formData.organizationId}
                          onChange={(e) => {
                            setFormData({ ...formData, organizationId: e.target.value, warehouseId: '' })
                            fetchWarehouses(e.target.value)
                          }}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-bold text-xs uppercase outline-none shadow-sm"
                        >
                          <option value="">Select Company</option>
                          {organizations.map((org) => (
                            <option key={org._id} value={org._id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">
                          Warehouse
                        </label>
                        <select
                          required
                          value={formData.warehouseId}
                          disabled={!formData.organizationId || fetchingWarehouses}
                          onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-bold text-xs uppercase outline-none shadow-sm disabled:opacity-50"
                        >
                          <option value="">{fetchingWarehouses ? 'Loading...' : 'Select Warehouse'}</option>
                          {warehouses.map((wh) => (
                            <option key={wh._id} value={wh._id}>
                              {wh.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {formData.role === 'lead_auditor' && isAdmin && (
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Lead Auditor Assignment
                    </h4>
                    <div>
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">
                        Company (Full Access)
                      </label>
                      <select
                        required
                        value={formData.organizationId}
                        onChange={(e) => {
                          setFormData({ ...formData, organizationId: e.target.value })
                        }}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-bold text-xs uppercase outline-none shadow-sm"
                      >
                        <option value="">Select Company</option>
                        {organizations.map((org) => (
                          <option key={org._id} value={org._id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-zinc-400 mt-2 ml-1">
                        Lead Auditor will have access to ALL warehouses in this company
                      </p>
                    </div>
                  </div>
                )}

                {formData.role === 'auditor' && (
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Auditor Assignment
                    </h4>
                    <div className="space-y-4">
                      {isAdmin && (
                        <div>
                          <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">
                            Company
                          </label>
                          <select
                            required
                            value={formData.organizationId}
                            onChange={(e) => {
                              setFormData({ ...formData, organizationId: e.target.value, warehouseIds: [] })
                              fetchWarehouses(e.target.value)
                            }}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-bold text-xs uppercase outline-none shadow-sm"
                          >
                            <option value="">Select Company</option>
                            {organizations.map((org) => (
                              <option key={org._id} value={org._id}>
                                {org.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {isLeadAuditor && session?.user?.organization && (
                        <div>
                          <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">
                            Company
                          </label>
                          <div className="w-full px-3 py-2 border border-zinc-100 bg-zinc-50 rounded-lg font-bold text-xs uppercase text-zinc-500">
                            {organizations.find((o) => o._id === session.user.organization)?.name ||
                              'Your Assigned Company'}
                          </div>
                        </div>
                      )}

                      {formData.organizationId && (
                        <div>
                          <label className="text-[9px] font-black uppercase text-zinc-400 ml-1 mb-1 block">
                            Allow Specific Warehouses
                          </label>
                          <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar bg-white p-4 rounded-xl border border-zinc-200 shadow-inner">
                            {fetchingWarehouses ? (
                              <div className="text-[10px] font-bold text-zinc-400 uppercase animate-pulse">
                                Scanning locations...
                              </div>
                            ) : warehouses.length === 0 ? (
                              <div className="text-[10px] font-bold text-red-400 uppercase">No warehouses found</div>
                            ) : (
                              warehouses.map((wh) => (
                                <label key={wh._id} className="flex items-center space-x-3 cursor-pointer group">
                                  <div
                                    onClick={() => handleWarehouseToggle(wh._id)}
                                    className={`w-5 h-5 border border-zinc-300 rounded flex items-center justify-center transition-all ${formData.warehouseIds.includes(wh._id) ? 'bg-black border-black text-white' : 'bg-white group-hover:border-black'}`}
                                  >
                                    {formData.warehouseIds.includes(wh._id) && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs font-bold text-black uppercase group-hover:text-black transition-colors">
                                    {wh.name}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-zinc-800 transition-all shadow-md"
              >
                {submitting ? 'Creating User...' : 'Establish Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
