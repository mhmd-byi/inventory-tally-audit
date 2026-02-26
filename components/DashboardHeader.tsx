'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ProfileMenu from './ProfileMenu'
import { LayoutDashboard, Building2, Warehouse, Users, Package } from 'lucide-react'

export default function DashboardHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      roles: ['admin', 'store_manager', 'auditor', 'lead_auditor'],
      icon: LayoutDashboard,
    },
    {
      name: 'Companies',
      href: '/dashboard/organizations',
      roles: ['admin', 'store_manager', 'auditor', 'lead_auditor'],
      icon: Building2,
    },
    { name: 'User Management', href: '/dashboard/users', roles: ['admin', 'lead_auditor'], icon: Users },
  ]

  const filteredNavItems = navItems.filter((item) => item.roles.includes(session?.user?.role || ''))

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: App Name & Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-70 transition-opacity">
            <div className="p-2 bg-black rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-black tracking-tight">Inventory Audit</h1>
            </div>
          </Link>

          {/* Middle: Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center space-x-2 ${
                    pathname === item.href
                      ? 'bg-zinc-100 text-black'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right: Profile Menu */}
          <div className="flex items-center">
            {session?.user && (
              <ProfileMenu
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  role: session.user.role,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
