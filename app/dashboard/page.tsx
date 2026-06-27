'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'
import {
  Building2,
  AlertTriangle,
  Users,
  Package,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  BarChart2,
  PieChart as PieIcon,
  Activity,
  ListOrdered,
  X,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalOrganizations: number
  totalWarehouses: number
  completedAudits: number
  activeDiscrepancies: number
  totalUsers: number
  totalProducts?: number
  totalInventoryValue?: number
  warehouseAuditStatus?: { name: string; value: number; color: string }[]
  discrepancyByWarehouse?: { warehouseId: string; name: string; totalDiscrepancy: number }[]
  auditHistoryByWeek?: { week: string; audits: number; weekStartISO: string; weekEndISO: string }[]
  topDiscrepantProducts?: { productId: string; name: string; totalDiscrepancy: number }[]
}

interface DrillDownColumn {
  key: string
  label: string
  hrefKey?: string    // row field containing the target ID → hrefPrefix + row[hrefKey]
  hrefPrefix?: string
  staticHref?: string // fixed URL used for every row (e.g. list pages with no individual page)
}

interface DrillDownModal {
  open: boolean
  title: string
  subtitle?: string
  columns: DrillDownColumn[]
  rows: any[]
  loading: boolean
}

const MODAL_CLOSED: DrillDownModal = {
  open: false,
  title: '',
  subtitle: undefined,
  columns: [],
  rows: [],
  loading: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EmptyChart = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center h-full py-10 text-zinc-300">
    <p className="text-xs font-bold uppercase tracking-widest">{label}</p>
  </div>
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function statusLabel(s: string) {
  if (s === 'in_progress') return 'In Progress'
  if (s === 'completed') return 'Completed'
  return 'Not Started'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalWarehouses: 0,
    completedAudits: 0,
    activeDiscrepancies: 0,
    totalUsers: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  const [modal, setModal] = useState<DrillDownModal>(MODAL_CLOSED)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchStats()
  }, [status, router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }

  // Fetch drill-down data and open modal
  const openDrillDown = async (
    title: string,
    subtitle: string,
    columns: DrillDownColumn[],
    url: string
  ) => {
    setModal({ open: true, title, subtitle, columns, rows: [], loading: true })
    try {
      const res = await fetch(url)
      const rows = res.ok ? await res.json() : []
      setModal((prev) => ({ ...prev, rows, loading: false }))
    } catch {
      setModal((prev) => ({ ...prev, loading: false }))
    }
  }

  // ── Click handlers ──────────────────────────────────────────────────────────

  const onBarClick = (data: any) => {
    if (!data?.activePayload?.[0]) return
    const entry = data.activePayload[0].payload
    openDrillDown(
      entry.name,
      'Audit records for this warehouse',
      [
        { key: 'productName', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'systemQuantity', label: 'System Qty' },
        { key: 'physicalQuantity', label: 'Physical Count' },
        { key: 'discrepancy', label: 'Variance' },
        { key: 'createdAt', label: 'Date' },
      ],
      `/api/dashboard/drill-down?type=warehouse&warehouseId=${entry.warehouseId}`
    )
  }

  const onPieClick = (data: any) => {
    if (!data?.name) return
    const statusMap: Record<string, string> = {
      'Not Started': 'not_started',
      'In Progress': 'in_progress',
      Completed: 'completed',
    }
    const statusKey = statusMap[data.name] ?? 'not_started'
    openDrillDown(
      `${data.name} Warehouses`,
      `All warehouses with status: ${data.name}`,
      [
        { key: 'name', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
        { key: 'code', label: 'Code' },
        { key: 'organization', label: 'Organization', staticHref: '/dashboard/organizations' },
        { key: 'auditStatus', label: 'Status' },
      ],
      `/api/dashboard/drill-down?type=audit-status&status=${statusKey}`
    )
  }

  const onAreaClick = (data: any) => {
    if (!data?.activePayload?.[0]) return
    const entry = data.activePayload[0].payload
    openDrillDown(
      `Week of ${entry.week}`,
      `${entry.audits} audit record${entry.audits !== 1 ? 's' : ''}`,
      [
        { key: 'productName', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'warehouseName', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
        { key: 'systemQuantity', label: 'System Qty' },
        { key: 'physicalQuantity', label: 'Physical Count' },
        { key: 'discrepancy', label: 'Variance' },
        { key: 'createdAt', label: 'Date' },
      ],
      `/api/dashboard/drill-down?type=audit-week&from=${entry.weekStartISO}&to=${entry.weekEndISO}`
    )
  }

  const onProductClick = (productId: string, productName: string) => {
    openDrillDown(
      productName,
      'Audit history across all warehouses',
      [
        { key: 'warehouseName', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
        { key: 'systemQuantity', label: 'System Qty' },
        { key: 'physicalQuantity', label: 'Physical Count' },
        { key: 'discrepancy', label: 'Variance' },
        { key: 'createdAt', label: 'Date' },
      ],
      `/api/dashboard/drill-down?type=product&productId=${productId}`
    )
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  if (!session) return null

  const statCards = [
    {
      title: 'Companies',
      value: loadingStats ? '...' : stats.totalOrganizations.toString(),
      icon: Building2,
      onClick: () =>
        openDrillDown(
          'Companies',
          'All organizations in the system',
          [
            { key: 'name', label: 'Company Name', staticHref: '/dashboard/organizations' },
            { key: 'code', label: 'Code' },
            { key: 'warehouses', label: 'Warehouses' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Created' },
          ],
          '/api/dashboard/drill-down?type=companies'
        ),
    },
    {
      title: 'Products',
      value: loadingStats ? '...' : (stats.totalProducts?.toString() ?? '0'),
      icon: Package,
      onClick: () =>
        openDrillDown(
          'Products',
          'All products tracked in the system',
          [
            { key: 'name', label: 'Product Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'unit', label: 'Unit' },
            { key: 'warehouse', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
            { key: 'bookStock', label: 'Book Stock' },
            { key: 'bookStockValue', label: 'Book Value' },
          ],
          '/api/dashboard/drill-down?type=products'
        ),
    },
    {
      title: 'Current Stock',
      value: loadingStats ? '...' : (stats.totalInventoryValue?.toString() ?? '0'),
      icon: TrendingUp,
      onClick: () =>
        openDrillDown(
          'Current Stock',
          'Stock totals grouped by warehouse',
          [
            { key: 'warehouse', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
            { key: 'organization', label: 'Organization', staticHref: '/dashboard/organizations' },
            { key: 'products', label: 'Products' },
            { key: 'totalQuantity', label: 'Total Qty' },
            { key: 'totalBookStock', label: 'Book Stock' },
            { key: 'totalBookStockValue', label: 'Book Value' },
          ],
          '/api/dashboard/drill-down?type=stock'
        ),
    },
    {
      title: 'Discrepancies',
      value: loadingStats ? '...' : stats.activeDiscrepancies.toString(),
      icon: AlertTriangle,
      onClick: () =>
        openDrillDown(
          'Discrepancies',
          'All audit records with non-zero variance',
          [
            { key: 'productName', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'warehouseName', label: 'Warehouse', hrefKey: 'warehouseId', hrefPrefix: '/dashboard/warehouses/' },
            { key: 'systemQuantity', label: 'System Qty' },
            { key: 'physicalQuantity', label: 'Physical Count' },
            { key: 'discrepancy', label: 'Variance' },
            { key: 'createdAt', label: 'Date' },
          ],
          '/api/dashboard/drill-down?type=discrepancies'
        ),
    },
  ]

  const maxDiscrepancy = Math.max(...(stats.discrepancyByWarehouse?.map((d) => d.totalDiscrepancy) ?? [1]))

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Heading */}
        <div className="mb-8 sm:mb-10 flex justify-between items-end pb-6 sm:pb-8 border-b border-zinc-100">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Welcome, {session.user?.name?.split(' ')[0]}
            </h2>
            <p className="text-zinc-500 font-medium text-sm mt-1">
              {session.user.role === 'admin' ? 'System Overview' : 'Manage your organization inventory'}
            </p>
          </div>
          <div className="hidden md:block text-right">
            <div className="flex items-center justify-end text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">
              <Clock className="w-3 h-3 mr-2" /> Live Time
            </div>
            <p className="text-xl font-bold tracking-tight">{currentTime.toLocaleTimeString([], { hour12: false })}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            const isDiscrepancy = stat.title === 'Discrepancies' && Number(stat.value) > 0
            return (
              <button
                key={index}
                onClick={stat.onClick}
                className="bg-white border border-zinc-200 p-5 sm:p-8 rounded-2xl hover:border-black transition-all group shadow-sm text-left w-full cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className={`p-2 rounded-lg transition-all ${isDiscrepancy ? 'bg-red-50 text-red-600' : 'bg-zinc-50 text-zinc-400'} group-hover:bg-black group-hover:text-white`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Stat 0{index + 1}
                  </span>
                </div>
                <p className={`text-3xl sm:text-4xl font-bold tracking-tight mb-1 ${isDiscrepancy ? 'text-red-600' : 'text-black'}`}>
                  {stat.value}
                </p>
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.title}</h3>
              </button>
            )
          })}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Discrepancy by Warehouse — Bar */}
          <div className="lg:col-span-2 border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center">
                <BarChart2 className="w-4 h-4 mr-2 text-zinc-400" /> Discrepancy by Warehouse
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Variance Units</span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-4 font-medium">Click a bar to see audit records</p>
            {loadingStats ? (
              <div className="h-52 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
              </div>
            ) : !stats.discrepancyByWarehouse?.length ? (
              <div className="h-52"><EmptyChart label="No audit data yet" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={stats.discrepancyByWarehouse}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  onClick={onBarClick}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + '…' : v)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, fontWeight: 700 }}
                    labelStyle={{ color: '#000', fontWeight: 800 }}
                    formatter={(v) => [v, 'Variance']}
                  />
                  <Bar dataKey="totalDiscrepancy" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {stats.discrepancyByWarehouse.map((entry, i) => (
                      <Cell key={i} fill={entry.totalDiscrepancy > 0 ? '#000000' : '#e4e4e7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Warehouse Audit Status — Donut */}
          <div className="border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center">
                <PieIcon className="w-4 h-4 mr-2 text-zinc-400" /> Audit Status
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Warehouses</span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-4 font-medium">Click a segment to see warehouses</p>
            {loadingStats ? (
              <div className="h-52 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
              </div>
            ) : !stats.warehouseAuditStatus?.some((s) => s.value > 0) ? (
              <div className="h-52"><EmptyChart label="No warehouses yet" /></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={stats.warehouseAuditStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={onPieClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {stats.warehouseAuditStatus!.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, fontWeight: 700 }}
                      formatter={(v, name) => [v, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-2">
                  {stats.warehouseAuditStatus!.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => onPieClick(s)}
                      className="flex items-center justify-between text-xs hover:bg-zinc-50 px-2 py-1 rounded-lg transition-colors w-full"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="font-medium text-zinc-500">{s.name}</span>
                      </div>
                      <span className="font-bold text-black">{s.value}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Audit History — Area */}
          <div className="lg:col-span-2 border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center">
                <Activity className="w-4 h-4 mr-2 text-zinc-400" /> Audit History
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Last 8 Weeks</span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-4 font-medium">Click a data point to see that week's records</p>
            {loadingStats ? (
              <div className="h-52 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
              </div>
            ) : !stats.auditHistoryByWeek?.length ? (
              <div className="h-52"><EmptyChart label="No audit history yet" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart
                  data={stats.auditHistoryByWeek}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  onClick={onAreaClick}
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fontWeight: 700, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, fontWeight: 700 }}
                    formatter={(v) => [v, 'Audits']}
                  />
                  <Area
                    type="monotone"
                    dataKey="audits"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="url(#auditGrad)"
                    dot={{ r: 4, fill: '#000', strokeWidth: 0, cursor: 'pointer' }}
                    activeDot={{ r: 6, fill: '#000' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 5 Discrepant Products — Ranked list */}
          <div className="border border-zinc-200 rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold flex items-center">
                <ListOrdered className="w-4 h-4 mr-2 text-zinc-400" /> Top Discrepancies
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">By Product</span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-4 font-medium">Click a row to see audit history</p>
            {loadingStats ? (
              <div className="h-52 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
              </div>
            ) : !stats.topDiscrepantProducts?.length ? (
              <div className="h-52"><EmptyChart label="No discrepancies found" /></div>
            ) : (
              <div className="space-y-3">
                {stats.topDiscrepantProducts.map((p, i) => {
                  const pct = maxDiscrepancy > 0 ? Math.round((p.totalDiscrepancy / maxDiscrepancy) * 100) : 0
                  return (
                    <button
                      key={i}
                      onClick={() => onProductClick(p.productId, p.name)}
                      className="w-full text-left hover:bg-zinc-50 rounded-xl px-2 py-2 transition-colors group"
                    >
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-black text-zinc-300 shrink-0">#{i + 1}</span>
                          <span className="text-xs font-bold text-black truncate group-hover:underline">{p.name}</span>
                        </div>
                        <span className="text-xs font-black text-black shrink-0 ml-2">{p.totalDiscrepancy}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-zinc-100 pt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-5 pl-3 border-l-2 border-black">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.user.role === 'admin' && (
              <>
                <button
                  onClick={() => router.push('/dashboard/organizations')}
                  className="flex items-center justify-between p-6 border border-zinc-200 bg-white rounded-2xl hover:border-black transition-all group shadow-sm"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold">Manage Companies</span>
                    <span className="text-xs text-zinc-400">Add or edit organizations</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-300 group-hover:text-black transition-all" />
                </button>
                <button
                  onClick={() => router.push('/dashboard/users')}
                  className="flex items-center justify-between p-6 border border-zinc-200 bg-white rounded-2xl hover:border-black transition-all group shadow-sm"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold">Manage Users</span>
                    <span className="text-xs text-zinc-400">Control system access</span>
                  </div>
                  <Users className="w-5 h-5 text-zinc-300 group-hover:text-black transition-all" />
                </button>
              </>
            )}
            <button
              onClick={() => router.push('/dashboard/organizations')}
              className="flex items-center justify-between p-6 border border-black bg-black text-white rounded-2xl hover:bg-zinc-800 transition-all shadow-lg group"
            >
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold">New Audit Session</span>
                <span className="text-xs opacity-70">Begin physical count at a location</span>
              </div>
              <Briefcase className="w-5 h-5 text-white/50 group-hover:text-white transition-all" />
            </button>
          </div>
        </div>
      </main>

      {/* ── Drill-Down Modal ──────────────────────────────────────────────────── */}
      {modal.open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={() => setModal(MODAL_CLOSED)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-100 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-black">{modal.title}</h3>
                {modal.subtitle && <p className="text-xs text-zinc-400 font-medium mt-0.5">{modal.subtitle}</p>}
              </div>
              <button
                onClick={() => setModal(MODAL_CLOSED)}
                className="p-2 hover:bg-zinc-100 rounded-xl transition-colors ml-4 shrink-0"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {modal.loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                </div>
              ) : modal.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
                  <p className="text-xs font-bold uppercase tracking-widest">No records found</p>
                </div>
              ) : (
                <table className="w-full text-left min-w-max">
                  <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      {modal.columns.map((col) => (
                        <th key={col.key} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {modal.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-zinc-50 transition-colors">
                        {modal.columns.map((col) => {
                          const raw = row[col.key]
                          let display: React.ReactNode = raw ?? '-'

                          if (col.key === 'createdAt' && raw) {
                            display = formatDate(raw)
                          } else if (col.key === 'discrepancy' && raw !== undefined) {
                            const n = Number(raw)
                            display = (
                              <span className={`font-bold ${n < 0 ? 'text-red-500' : n > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                {n > 0 ? `+${n}` : n}
                              </span>
                            )
                          } else if (col.key === 'auditStatus') {
                            display = statusLabel(raw)
                          }

                          const href =
                            col.staticHref
                              ? col.staticHref
                              : col.hrefKey && row[col.hrefKey]
                                ? `${col.hrefPrefix ?? ''}${row[col.hrefKey]}`
                                : null

                          return (
                            <td key={col.key} className="px-5 py-4 text-sm font-medium text-black whitespace-nowrap">
                              {href ? (
                                <Link
                                  href={href}
                                  onClick={() => setModal(MODAL_CLOSED)}
                                  className="underline decoration-zinc-300 hover:decoration-black transition-colors"
                                >
                                  {display}
                                </Link>
                              ) : (
                                display
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Row count */}
            {!modal.loading && modal.rows.length > 0 && (
              <div className="px-6 py-3 border-t border-zinc-100 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  {modal.rows.length} record{modal.rows.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
