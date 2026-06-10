'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ProfileMenu from './ProfileMenu'
import { LayoutDashboard, Building2, Users, Package, Menu, X } from 'lucide-react'

export default function DashboardHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    <>
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

            {/* Middle: Navigation (desktop only) */}
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

            {/* Right: Profile Menu + Hamburger */}
            <div className="flex items-center space-x-2">
              {session?.user && (
                <ProfileMenu
                  user={{
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                  }}
                />
              )}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 md:hidden shadow-xl transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-200">
          <span className="text-base font-bold text-black">Menu</span>
          <button
            className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <nav className="flex flex-col p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all inline-flex items-center space-x-3 ${
                  pathname === item.href
                    ? 'bg-zinc-100 text-black'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-black'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
