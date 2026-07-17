import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import brand from '../config/brand'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login berhasil!')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden">
            <img src="/laundryfoto.jpg" alt={brand.name} className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-bold text-xl">{brand.name}</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Kelola laundry<br />lebih mudah &<br />terorganisir
          </h2>
          <p className="text-blue-200 text-lg">
            Sistem manajemen laundry digital untuk bisnis yang lebih efisien.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['📦', 'Kelola Order'], ['📊', 'Laporan Real-time'], ['🔔', 'Tracking Status']].map(([icon, text]) => (
              <div key={text} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-white text-sm font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
      </div>

      {/* Right panel - login only */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-2xl overflow-hidden">
              <img src="/laundryfoto.jpg" alt={brand.name} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-xl text-gray-900">{brand.name}</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Selamat datang kembali</h1>
            <p className="text-gray-500 mt-1 text-sm">Masuk ke dashboard pengelola laundry</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@laundry.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
