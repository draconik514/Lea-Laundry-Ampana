import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, TrashIcon, CheckCircleIcon, ShareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import StatusTimeline from '../components/StatusTimeline'
import api from '../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import brand from '../config/brand'

const statusOptions = [
  { value: 'pending_pickup', label: 'Menunggu Pickup' },
  { value: 'picked_up', label: 'Sudah Dijemput' },
  { value: 'washing', label: 'Dicuci' },
  { value: 'drying', label: 'Dikeringkan' },
  { value: 'ironing', label: 'Disetrika' },
  { value: 'ready_for_delivery', label: 'Siap Diantar' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const statusColors = {
  pending_pickup: 'bg-amber-50 text-amber-700 border-amber-200',
  picked_up: 'bg-blue-50 text-blue-700 border-blue-200',
  washing: 'bg-violet-50 text-violet-700 border-violet-200',
  drying: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ironing: 'bg-pink-50 text-pink-700 border-pink-200',
  ready_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
  </div>
)

const OrderDetail = () => {
  const { code } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')

  useEffect(() => { fetchOrder() }, [code])

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/order/${code}`)
      setOrder(data.order)
      setSelectedStatus(data.order.status)
      setHistory(data.history || [])
    } catch {
      toast.error('Order tidak ditemukan')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const sendWhatsApp = (orderData, newStatus) => {
    if (!orderData?.customer_phone) return
    const phone = orderData.customer_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
    
    let message = ''
    if (newStatus === 'completed') {
      message = `✅ *Laundry Selesai!*\n\nHalo *${orderData.customer_name}*,\n\nLaundry Anda sudah selesai dan siap diambil! 🎉\n\n📋 *Detail Order:*\n• Kode: *${orderData.code}*\n• Layanan: ${orderData.service_name}\n• Berat: ${orderData.weight} kg\n• Total: *Rp${orderData.total_price?.toLocaleString('id-ID')}*\n\nTerima kasih telah menggunakan layanan ${brand.name} 🧺`
    } else if (newStatus === 'ready_for_delivery') {
      const isDeliveryOrder = orderData.order_source !== 'walk_in'
      if (isDeliveryOrder) {
        message = `🚐 *Laundry Siap Diantar!*\n\nHalo *${orderData.customer_name}*,\n\nLaundry Anda sudah selesai diproses dan akan segera kami antar ke alamat Anda.\n\n📋 Kode Order: *${orderData.code}*\n📍 Alamat Antar: ${orderData.customer_address || '-'}\n\nTerima kasih telah menggunakan layanan ${brand.name} 🧺`
      } else {
        message = `📦 *Laundry Siap Diambil!*\n\nHalo *${orderData.customer_name}*,\n\nLaundry Anda sudah selesai diproses dan siap untuk diambil di toko kami.\n\n📋 Kode Order: *${orderData.code}*\n📍 Alamat: ${brand.address}\n⏰ Jam Buka: ${brand.hours}\n\nTerima kasih telah menggunakan layanan ${brand.name} 🧺`
      }
    } else if (newStatus === 'picked_up') {
      message = `🧺 *Laundry Sudah Dijemput!*\n\nHalo *${orderData.customer_name}*,\n\nLaundry Anda sudah kami jemput dan sedang diproses.\n\n📋 Kode Order: *${orderData.code}*\n\nCek status kapan saja di: ${window.location.origin}/customer/track/${orderData.code}`
    }

    if (message) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }
  }

  const updateStatus = async () => {
    if (selectedStatus === order.status) return
    const label = statusOptions.find(s => s.value === selectedStatus)?.label
    if (!window.confirm(`Ubah status menjadi "${label}"?`)) {
      setSelectedStatus(order.status)
      return
    }
    setUpdating(true)
    try {
      await api.put(`/orders/${order.id}/status`, { status: selectedStatus })
      toast.success('Status berhasil diupdate')

      // Auto kirim WA untuk status tertentu
      if (['completed', 'ready_for_delivery', 'picked_up'].includes(selectedStatus) && order.customer_phone) {
        const confirmed = window.confirm(`Kirim notifikasi WhatsApp ke ${order.customer_name}?`)
        if (confirmed) {
          sendWhatsApp(order, selectedStatus)
        }
      }

      fetchOrder()
    } catch {
      toast.error('Gagal mengupdate status')
      setSelectedStatus(order.status)
    } finally {
      setUpdating(false)
    }
  }

  const deleteOrder = async () => {
    if (!window.confirm('Yakin ingin menghapus order ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      await api.delete(`/orders/${order.id}`)
      toast.success('Order berhasil dihapus')
      navigate('/orders')
    } catch {
      toast.error('Gagal menghapus order')
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(order.code)
    toast.success('Kode disalin!')
  }

  const shareTrackingLink = () => {
    const url = `${window.location.origin}/customer/track/${order.code}`
    navigator.clipboard.writeText(url)
    toast.success('Link tracking disalin!')
  }

  const sendTrackingWA = () => {
    if (!order?.customer_phone) {
      toast.error('Nomor WhatsApp tidak tersedia')
      return
    }
    const phone = order.customer_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')
    const url = `${window.location.origin}/customer/track/${order.code}`
    const message = `🧺 *Konfirmasi Order Laundry*\n\nHalo *${order.customer_name}*,\n\nPesanan laundry Anda telah kami terima!\n\n📋 *Kode Order:* \`${order.code}\`\n🔗 *Cek Status:* ${url}\n\nSimpan kode ini untuk tracking status laundry Anda kapan saja.\n\nTerima kasih! 😊`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <LoadingSpinner />
    </div>
  )

  const isDelivery = order?.order_source !== 'walk_in'

  const availableStatusOptions = !isDelivery
    ? statusOptions
        .filter(s => !['pending_pickup', 'picked_up'].includes(s.value))
        .map(s => s.value === 'ready_for_delivery' ? { ...s, label: 'Siap Diambil' } : s)
    : statusOptions.map(s => s.value === 'ready_for_delivery' ? { ...s, label: 'Siap Diantar' } : s)

  // Label yang aware order_source, dipakai di badge header & riwayat
  const getStatusLabel = (statusValue) => {
    const opt = statusOptions.find(s => s.value === statusValue)
    if (!opt) return statusValue
    if (statusValue === 'ready_for_delivery') return isDelivery ? 'Siap Diantar' : 'Siap Diambil'
    return opt.label
  }

  const statusColor = statusColors[order?.status] || 'bg-gray-100 text-gray-600 border-gray-200'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">Detail Order</h1>
            <span className="text-gray-400 font-mono text-sm">#{order?.code}</span>
          </div>
        </div>
        <span className={`badge border ${statusColor}`}>
          {getStatusLabel(order?.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
              Informasi Order
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <InfoRow label="Pelanggan" value={order?.customer_name} />
              <InfoRow label="WhatsApp" value={order?.customer_phone} />
              <InfoRow label="Sumber" value={
                order?.order_source === 'website' ? '🖥️ Website' :
                order?.order_source === 'walk_in' ? '🏪 Datang Langsung' :
                order?.order_source === 'whatsapp' ? '💬 WhatsApp' : order?.order_source
              } />
              <InfoRow label="Layanan" value={order?.service_name} />
              <InfoRow label="Berat" value={order?.weight ? `${order.weight} ${order.service_unit || 'kg'}` : null} />
              <InfoRow label="Total Harga" value={order?.total_price ? `Rp${order.total_price.toLocaleString('id-ID')}` : null} />
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Alamat" value={order?.customer_address} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <InfoRow
                  label="Estimasi Selesai"
                  value={order?.created_at
                    ? new Date(new Date(order.created_at).getTime() + (order.estimated_day || 2) * 86400000)
                        .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : null}
                />
              </div>
            </div>
            {order?.note && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Catatan</p>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{order.note}</p>
              </div>
            )}
          </div>

          {/* Kode pesanan untuk customer */}
          <div className="card border-2 border-blue-100 bg-blue-50/30">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
              Kode Tracking untuk Customer
            </h3>
            <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-blue-100 mb-4">
              <span className="text-2xl font-bold text-blue-600 tracking-widest font-mono flex-1">{order?.code}</span>
              <button onClick={copyCode} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Salin kode">
                <ClipboardDocumentIcon className="w-5 h-5 text-blue-500" />
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={shareTrackingLink} className="btn-secondary flex-1 text-sm">
                <ShareIcon className="w-4 h-4" />
                Salin Link
              </button>
              <button
                onClick={sendTrackingWA}
                disabled={!order?.customer_phone}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40"
              >
                💬 Kirim via WA
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Customer bisa cek status di: /customer/track/{order?.code}
            </p>
          </div>

          {/* Status timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-green-500 rounded-full" />
              Progress Status
            </h3>
            <StatusTimeline currentStatus={order?.status} orderSource={order?.order_source} />
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                Riwayat Status
              </h3>
              <div className="space-y-2">
                {history.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="text-gray-400 text-xs w-36 flex-shrink-0">
                      {new Date(h.updated_at).toLocaleString('id-ID')}
                    </span>
                    <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                      {getStatusLabel(h.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="space-y-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={updating}
                className="input"
              >
                {availableStatusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={updateStatus}
                disabled={updating || selectedStatus === order?.status}
                className="btn-primary w-full disabled:opacity-40"
              >
                {updating ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Simpan Status
                  </>
                )}
              </button>
              {['completed', 'ready_for_delivery', 'picked_up'].includes(selectedStatus) && order?.customer_phone && selectedStatus !== order?.status && (
                <p className="text-xs text-center text-green-600">
                  💬 Notifikasi WA akan ditawarkan setelah disimpan
                </p>
              )}
            </div>
          </div>

          {/* Manual WA */}
          {order?.customer_phone && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Notifikasi WhatsApp</h3>
              <div className="space-y-2">
                <button
                  onClick={() => sendWhatsApp(order, 'completed')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  ✅ Laundry Selesai
                </button>
                <button
                  onClick={() => sendWhatsApp(order, 'ready_for_delivery')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  📦 {isDelivery ? 'Siap Diantar' : 'Siap Diambil'}
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Zona Bahaya</h3>
            <button onClick={deleteOrder} className="btn-danger w-full">
              <TrashIcon className="w-4 h-4" />
              Hapus Order
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDetail
