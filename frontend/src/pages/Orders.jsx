import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon, ClipboardDocumentCheckIcon, ArrowDownTrayIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import OrderTable from '../components/OrderTable'
import api from '../services/api'
import toast from 'react-hot-toast'

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending_pickup', label: 'Menunggu Pickup' },
  { value: 'picked_up', label: 'Dijemput' },
  { value: 'washing', label: 'Dicuci' },
  { value: 'drying', label: 'Dikeringkan' },
  { value: 'ironing', label: 'Disetrika' },
  { value: 'ready_for_delivery', label: 'Siap Diantar' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const sourceOptions = [
  { value: 'walk_in', label: '🏪 Datang Langsung' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'website', label: '🖥️ Website' },
]

const sourceLabels = {
  website: 'Website', walk_in: 'Datang Langsung', whatsapp: 'WhatsApp'
}

const statusLabels = {
  pending_pickup: 'Menunggu Pickup', picked_up: 'Dijemput', washing: 'Dicuci',
  drying: 'Dikeringkan', ironing: 'Disetrika', ready_for_delivery: 'Siap Diantar',
  completed: 'Selesai', cancelled: 'Dibatalkan', price_confirmed: 'Harga Dikonfirmasi',
}

const emptyForm = {
  customer_name: '', customer_phone: '', customer_address: '',
  service_id: '', weight: '', note: '', order_source: 'walk_in'
}

const getWeekRange = (offset = 0) => {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day) + offset * 7
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

const formatDate = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const formatDateShort = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal buat pesanan
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [services, setServices] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState(null)

  // Modal export
  const [showExport, setShowExport] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Modal edit harga
  const [editPriceOrder, setEditPriceOrder] = useState(null)
  const [editPriceForm, setEditPriceForm] = useState({ weight: '', total_price: '', note: '' })
  const [editPriceLoading, setEditPriceLoading] = useState(false)
  const [waURL, setWaURL] = useState(null)

  // Debounce search — reset ke page 1 saat search berubah
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page saat filter berubah
  useEffect(() => { setPage(1) }, [status, date])

  useEffect(() => { fetchOrders() }, [search, status, date, page])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)
      if (date) params.append('date', date)
      params.append('page', page)
      const { data } = await api.get(`/orders?${params}`)
      setOrders(data.data || [])
      setTotalPages(data.total_pages || 1)
      setTotalCount(data.total || 0)
    } catch {
      toast.error('Gagal memuat pesanan')
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    if (services.length > 0) return
    try {
      const { data } = await api.get('/services')
      setServices(data || [])
      if (data.length > 0) setForm(f => ({ ...f, service_id: data[0].id.toString() }))
    } catch {
      toast.error('Gagal memuat layanan')
    }
  }

  const openModal = () => {
    setForm(emptyForm)
    setSuccessInfo(null)
    setShowModal(true)
    fetchServices()
  }

  const closeModal = () => {
    setShowModal(false)
    setSuccessInfo(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/orders', {
        ...form,
        weight: parseFloat(form.weight) || 0,
        service_id: parseInt(form.service_id),
      })
      toast.success('Pesanan berhasil dibuat!')
      setSuccessInfo(data)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat pesanan')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Export CSV — filter per hari di backend, bukan ambil semua ──
  const handleExport = async () => {
    setExporting(true)
    try {
      const { monday, sunday } = getWeekRange(weekOffset)
      const params = new URLSearchParams()
      params.append('date_from', formatDateShort(monday))
      params.append('date_to', formatDateShort(sunday))

      const { data } = await api.get(`/orders/export?${params}`)
      const allOrders = data.data || []

      if (allOrders.length === 0) {
        toast.error('Tidak ada pesanan di minggu ini')
        setExporting(false)
        return
      }

      const headers = [
        'Kode', 'Nama Pelanggan', 'No. WhatsApp', 'Alamat',
        'Layanan', 'Berat (kg)', 'Total Harga (Rp)',
        'Status', 'Sumber', 'Tanggal Order'
      ]

      const rows = allOrders.map(o => [
        o.code,
        o.customer_name,
        o.customer_phone || '-',
        o.customer_address || '-',
        o.service_name,
        o.weight,
        o.total_price,
        statusLabels[o.status] || o.status,
        sourceLabels[o.order_source] || o.order_source,
        new Date(o.created_at).toLocaleString('id-ID')
      ])

      const totalPendapatan = allOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total_price, 0)
      const selesai = allOrders.filter(o => o.status === 'completed').length

      const summary = [
        [],
        ['RINGKASAN MINGGU'],
        [`Periode: ${formatDate(monday)} - ${formatDate(sunday)}`],
        [`Total Pesanan: ${allOrders.length}`],
        [`Pesanan Selesai: ${selesai}`],
        [`Total Pendapatan: Rp${totalPendapatan.toLocaleString('id-ID')}`],
      ]

      const csvContent = [
        ['LAPORAN PESANAN MINGGUAN'],
        [`Periode: ${formatDate(monday)} s/d ${formatDate(sunday)}`],
        [],
        headers,
        ...rows,
        ...summary,
      ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pesanan-minggu-${formatDateShort(monday)}_${formatDateShort(sunday)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${allOrders.length} pesanan berhasil diekspor!`)
      setShowExport(false)
    } catch {
      toast.error('Gagal mengekspor data')
    } finally {
      setExporting(false)
    }
  }

  const openEditPrice = (order) => {
    setEditPriceOrder(order)
    setEditPriceForm({ weight: '', total_price: '', note: '' })
    setWaURL(null)
  }

  const handleEditPrice = async (e) => {
    e.preventDefault()
    setEditPriceLoading(true)
    try {
      const { data } = await api.put(`/orders/${editPriceOrder.id}/price`, {
        weight: parseFloat(editPriceForm.weight),
        total_price: parseFloat(editPriceForm.total_price),
        note: editPriceForm.note,
      })
      toast.success('Harga berhasil dikonfirmasi!')
      setWaURL(data.wa_url)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal update harga')
    } finally {
      setEditPriceLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === parseInt(form.service_id))
  const isSatuan = selectedService?.category === 'Cuci Satuan'
  const satuanUnit = selectedService?.unit || 'Kg'
  const estimatedPrice = selectedService && form.weight
    ? selectedService.price_per_kg * parseFloat(form.weight || 0)
    : null

  const hasFilter = searchInput || status !== 'all' || date
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('all')
    setDate('')
  }

  const { monday, sunday } = getWeekRange(weekOffset)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola semua pesanan laundry</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExport(true)} className="btn-secondary">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export Mingguan
          </button>
          <button onClick={openModal} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Buat Pesanan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pelanggan atau kode..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:w-48">
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input sm:w-44" />
          {hasFilter && (
            <button onClick={clearFilters} className="btn-secondary gap-1.5 whitespace-nowrap">
              <XMarkIcon className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Memuat...' : `${totalCount} pesanan ditemukan`}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <OrderTable orders={orders} onEditPrice={openEditPrice} />
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-400">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-sm font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Export */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExport(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Export Pesanan Mingguan</h2>
                <p className="text-xs text-gray-400 mt-0.5">Unduh data pesanan dalam format CSV</p>
              </div>
              <button onClick={() => setShowExport(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="label flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                  Pilih Minggu
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                  >
                    ←
                  </button>
                  <div className="flex-1 text-center bg-blue-50 rounded-xl py-3 px-2">
                    <p className="text-xs text-blue-500 font-medium">
                      {weekOffset === 0 ? 'Minggu Ini' : weekOffset === -1 ? 'Minggu Lalu' : `${Math.abs(weekOffset)} Minggu Lalu`}
                    </p>
                    <p className="text-sm font-bold text-blue-700 mt-0.5">
                      {formatDate(monday)}
                    </p>
                    <p className="text-xs text-blue-500">s/d {formatDate(sunday)}</p>
                  </div>
                  <button
                    onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
                    disabled={weekOffset >= 0}
                    className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">File akan berisi:</p>
                {[
                  '✅ Kode & nama pelanggan',
                  '✅ Layanan, berat & total harga',
                  '✅ Status & sumber pesanan',
                  '✅ Tanggal order',
                  '✅ Ringkasan & total pendapatan',
                ].map(t => <p key={t} className="text-xs text-gray-500">{t}</p>)}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowExport(false)} className="btn-secondary flex-1">
                  Batal
                </button>
                <button onClick={handleExport} disabled={exporting} className="btn-primary flex-1">
                  {exporting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengekspor...
                    </span>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Download CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Pesanan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Buat Pesanan Baru</h2>
                <p className="text-xs text-gray-400 mt-0.5">Catat pesanan pelanggan yang datang langsung</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {successInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Pesanan Berhasil Dicatat!</h3>
                <p className="text-sm text-gray-500 mb-6">Berikut detail pesanan yang baru dibuat</p>
                <div className="w-full bg-blue-50 rounded-2xl p-5 text-left space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Kode Pesanan</span>
                    <span className="text-lg font-bold text-blue-600 tracking-wider font-mono">{successInfo.code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Harga</span>
                    <span className="text-base font-bold text-gray-900">Rp{successInfo.total_price?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-6">Berikan kode ini ke pelanggan untuk tracking status laundry mereka</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => { setSuccessInfo(null); setForm({ ...emptyForm, service_id: form.service_id }) }} className="btn-secondary flex-1">
                    + Pesanan Lagi
                  </button>
                  <button onClick={closeModal} className="btn-primary flex-1">Selesai</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div>
                    <label className="label">Sumber Pesanan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {sourceOptions.map(opt => (
                        <button key={opt.value} type="button" onClick={() => setForm({ ...form, order_source: opt.value })}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-center ${form.order_source === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">Nama Pelanggan <span className="text-red-400">*</span></label>
                      <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input" placeholder="Nama lengkap" required />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="label">No. WhatsApp</label>
                      <input type="tel" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input" placeholder="08xxxxxxxxxx" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Alamat <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
                    <input type="text" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} className="input" placeholder="Alamat pelanggan" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Layanan <span className="text-red-400">*</span></label>
                      <select
                        value={form.service_id}
                        onChange={(e) => setForm({ ...form, service_id: e.target.value, weight: '' })}
                        className="input"
                        required
                      >
                        {services.length === 0 ? (
                          <option value="">Memuat...</option>
                        ) : (() => {
                          const grouped = {}
                          services.forEach(s => {
                            const cat = s.category || 'Umum'
                            if (!grouped[cat]) grouped[cat] = []
                            grouped[cat].push(s)
                          })
                          return Object.entries(grouped).map(([cat, items]) => (
                            <optgroup key={cat} label={`── ${cat} ──`}>
                              {items.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} · Rp{s.price_per_kg.toLocaleString('id-ID')}/{s.unit || 'kg'}
                                </option>
                              ))}
                            </optgroup>
                          ))
                        })()}
                      </select>
                    </div>
                    <div>
                      {isSatuan && satuanUnit !== 'Kg' ? (
                        <>
                          <label className="label">Jumlah ({satuanUnit}) <span className="text-red-400">*</span></label>
                          <input
                            type="number"
                            value={form.weight}
                            onChange={(e) => setForm({ ...form, weight: e.target.value })}
                            className="input"
                            placeholder={`Jumlah ${satuanUnit}`}
                            required
                            min="1"
                            step="1"
                          />
                        </>
                      ) : (
                        <>
                          <label className="label">
                            Berat (kg)
                            {isSatuan && satuanUnit === 'Kg'
                              ? <span className="text-gray-400 font-normal text-xs ml-1">(opsional)</span>
                              : <span className="text-red-400"> *</span>
                            }
                          </label>
                          <input
                            type="number"
                            value={form.weight}
                            onChange={(e) => setForm({ ...form, weight: e.target.value })}
                            className="input"
                            placeholder={isSatuan ? 'Dikonfirmasi admin' : 'Contoh: 3'}
                            required={!isSatuan}
                            min="0.5"
                            step="0.5"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {isSatuan && satuanUnit === 'Kg' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                      ⚖️ <strong>Harga dikonfirmasi admin</strong> — item ini dihitung per Kg, berat ditimbang setelah dijemput.
                    </div>
                  )}
                  {estimatedPrice !== null && estimatedPrice > 0 && !(isSatuan && satuanUnit === 'Kg') && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-500 font-medium">
                          {isSatuan ? `Total (${form.weight} ${satuanUnit})` : 'Estimasi Total'}
                        </p>
                        <p className="text-xl font-bold text-blue-700">Rp{estimatedPrice.toLocaleString('id-ID')}</p>
                      </div>
                      {selectedService && (
                        <div className="text-right">
                          <p className="text-xs text-blue-400">Estimasi selesai</p>
                          <p className="text-sm font-semibold text-blue-600">{selectedService.estimated_day} hari</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="label">Catatan <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
                    <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input resize-none" rows="2" placeholder="Contoh: ada karpet, jaket tebal, jangan diperas" />
                  </div>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Batal</button>
                  <button type="submit" disabled={submitting || services.length === 0} className="btn-primary flex-1">
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </span>
                    ) : 'Buat Pesanan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Modal Edit Harga */}
      {editPriceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !waURL && setEditPriceOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Konfirmasi Harga</h2>
                <p className="text-xs text-gray-400 mt-0.5">Order <span className="font-mono font-bold text-blue-600">{editPriceOrder.code}</span> · {editPriceOrder.customer_name}</p>
              </div>
              <button onClick={() => setEditPriceOrder(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {waURL ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Harga Tersimpan!</p>
                  <p className="text-sm text-gray-500 mt-1">Klik tombol di bawah untuk kirim notifikasi ke customer via WhatsApp</p>
                </div>
                <a
                  href={waURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  💬 Kirim Notif WA ke Customer
                </a>
                <button onClick={() => setEditPriceOrder(null)} className="btn-secondary w-full">Tutup</button>
              </div>
            ) : (
              <form onSubmit={handleEditPrice} className="p-6 space-y-4">
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700">
                  ⚖️ Masukkan berat aktual setelah ditimbang ulang
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Berat Aktual (kg) <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      value={editPriceForm.weight}
                      onChange={(e) => {
                        const w = parseFloat(e.target.value) || 0
                        const auto = w > 0 ? String(Math.round(editPriceOrder.price_per_kg * w)) : ''
                        setEditPriceForm(f => ({ ...f, weight: e.target.value, total_price: auto }))
                      }}
                      className="input"
                      placeholder="0.0"
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Total Harga (Rp) <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      value={editPriceForm.total_price}
                      onChange={(e) => setEditPriceForm(f => ({ ...f, total_price: e.target.value }))}
                      className="input"
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
                {editPriceForm.weight && editPriceForm.total_price && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-sm text-blue-600">Total Konfirmasi</span>
                    <span className="text-lg font-bold text-blue-700">Rp{Number(editPriceForm.total_price).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div>
                  <label className="label">Catatan <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
                  <input
                    type="text"
                    value={editPriceForm.note}
                    onChange={(e) => setEditPriceForm(f => ({ ...f, note: e.target.value }))}
                    className="input"
                    placeholder="Contoh: ada tambahan karpet"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setEditPriceOrder(null)} className="btn-secondary flex-1">Batal</button>
                  <button type="submit" disabled={editPriceLoading} className="btn-primary flex-1">
                    {editPriceLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </span>
                    ) : 'Simpan & Notif WA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders
