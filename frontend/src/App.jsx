import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Router from './routes/Router'

class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Terjadi kesalahan</h2>
          <p className="text-sm text-gray-500 mb-4">Silakan muat ulang halaman</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            Muat Ulang
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Router />
            <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { background: '#363636', color: '#fff' },
              success: { style: { background: '#22c55e', color: '#fff' } },
              error: { style: { background: '#ef4444', color: '#fff' } },
            }}
          />
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
