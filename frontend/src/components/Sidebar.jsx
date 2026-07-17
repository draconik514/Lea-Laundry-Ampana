import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  CurrencyDollarIcon as CurrencySolid,
  ChartBarIcon as ChartSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
} from '@heroicons/react/24/solid'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, activeIcon: HomeSolid },
  { name: 'Pesanan', href: '/orders', icon: ClipboardDocumentListIcon, activeIcon: ClipboardSolid },
  { name: 'Layanan', href: '/services', icon: CurrencyDollarIcon, activeIcon: CurrencySolid },
  { name: 'Laporan', href: '/reports', icon: ChartBarIcon, activeIcon: ChartSolid },
  { name: 'Feedback', href: '/feedbacks', icon: ChatBubbleLeftRightIcon, activeIcon: ChatSolid },
]

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-100 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg">
            <img src="/laundryfoto.jpg" alt="Lea Laundry Ampana" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">Lea Laundry Ampana</p>
            <p className="text-xs text-gray-400 leading-tight">Manajemen Laundry</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
          {navigation.map((item) => {
            const active = isActive(item.href)
            const Icon = active ? item.activeIcon : item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={active ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-2">
          <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-150"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
