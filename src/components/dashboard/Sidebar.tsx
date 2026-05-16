'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  tenantName: string
  userEmail: string
}

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard', exact: true },
  { href: '/dashboard/contacts', icon: '👥', label: 'Contacts', exact: false },
  { href: '/dashboard/campaigns', icon: '📢', label: 'Campaigns', exact: false },
]

export default function Sidebar({ tenantName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    document.cookie = "demo_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = tenantName.slice(0, 2).toUpperCase()

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">💬</div>
        <div>
          <div className="sidebar-brand">WaBroadcast</div>
          <div className="sidebar-brand-sub">Dashboard</div>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="tenant-badge">
          <div className="tenant-avatar">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="tenant-name">{tenantName}</div>
            <div className="text-xs text-muted truncate">{userEmail}</div>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn btn-secondary w-full"
          style={{ marginTop: '8px', fontSize: '12px', height: '32px' }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
