import React from 'react'
import { Link } from 'react-router-dom'
import { EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

export const statusMap = {
  pending_pickup: { label: 'Menunggu Pickup', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  picked_up: { label: 'Dijemput', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  washing: { label: 'Dicuci', color: 'bg-violet-50 text-violet-700 border border-violet-200' },
  drying: { label: 'Dikeringkan', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  ironing: { label: 'Disetrika', color: 'bg-pink-50 text-pink-700 border border-pink-200' },
  ready_for_delivery: { label: 'Siap Diantar', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
  completed: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border border-red-200' },
  price_confirmed: { label: 'Harga Dikonfirmasi', color: 'bg-teal-50 text-teal-700 border border-teal-200' },
}

const sourceMap = {
  website: '🖥️ Website',
  walk_in: '🏪 Datang Langsung',
  whatsapp: '💬 WhatsApp',
}

const OrderTable = ({ orders, onEditPrice }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-gray-500 font-medium">Belum ada pesanan</p>
        <p className="text-gray-400 text-sm mt-1">Pesanan akan muncul di sini</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Layanan</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Berat</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sumber</th>
            <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {orders.map((order) => {
            const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' }
            if (order.status === 'ready_for_delivery' && order.order_source === 'walk_in') {
              status.label = 'Siap Diambil'
            }
            return (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3.5 px-6">
                  <span className="text-sm font-bold text-blue-600">{order.code}</span>
                </td>
                <td className="py-3.5 px-6">
                  <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                  <p className="text-xs text-gray-400">{order.customer_phone}</p>
                </td>
                <td className="py-3.5 px-6 text-sm text-gray-700">{order.service_name}</td>
                <td className="py-3.5 px-6 text-sm text-gray-700">{order.weight} {order.service_unit || 'kg'}</td>
                <td className="py-3.5 px-6 text-sm font-semibold text-gray-900">
                  Rp{order.total_price?.toLocaleString('id-ID')}
                </td>
                <td className="py-3.5 px-6">
                  <span className={`badge ${status.color}`}>{status.label}</span>
                </td>
                <td className="py-3.5 px-6 text-sm text-gray-500">
                  {sourceMap[order.order_source] || order.order_source}
                </td>
                <td className="py-3.5 px-6">
                  <div className="flex items-center gap-1">
                    {onEditPrice && order.order_source !== 'walk_in' && !['completed', 'cancelled'].includes(order.status) && (
                      <button
                        onClick={() => onEditPrice(order)}
                        title="Konfirmasi Harga"
                        className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors inline-flex"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                    <Link to={`/orders/${order.code}`} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex">
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default OrderTable
