import React, { useState, useEffect } from 'react'
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, ClockIcon, ScaleIcon } from '@heroicons/react/24/outline'
import api from '../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const emptyForm = { name: '', category: '', description: '', unit: 'Pcs', price_per_kg: '', estimated_day: '' }

const CATEGORY_OPTIONS = ['Cuci Komplit', 'Setrika', 'Cuci Lipat', 'Cuci Satuan', 'Umum']

const CATEGORY_META = {
  'Cuci Komplit': { icon: '👕', desc: 'Cuci, Setrika & Lipat', color: 'bg-blue-700',   light: 'bg-blue-50',   text: 'text-blue-700'   },
  'Setrika':      { icon: '🔥', desc: 'Hanya Setrika',         color: 'bg-blue-500',  light: 'bg-blue-50',   text: 'text-blue-600'  },
  'Cuci Lipat':   { icon: '🧺', desc: 'Cuci, Kering & Lipat',  color: 'bg-blue-600',  light: 'bg-blue-50',   text: 'text-blue-700'  },
  'Cuci Satuan':  { icon: '🧺', desc: 'Harga per item / kg',   color: 'bg-blue-600',  light: 'bg-blue-50',  text: 'text-blue-700'  },
  'Umum':         { icon: '🫧', desc: 'Layanan Lainnya',        color: 'bg-blue-400',  light: 'bg-blue-50',   text: 'text-blue-600'  },
}

const tierBadge = (name, category) => {
  if (category === 'Cuci Satuan') return { label: 'Regular 1-2 Hari', cls: 'bg-blue-100 text-blue-700' }
  if (name.includes('3 Jam'))  return { label: 'Express 3 Jam',  cls: 'bg-blue-100 text-blue-800' }
  if (name.includes('6 Jam'))  return { label: 'Express 6 Jam',  cls: 'bg-blue-100 text-blue-700' }
  if (name.includes('12 Jam')) return { label: 'Express 12 Jam', cls: 'bg-blue-50 text-blue-600'  }
  return { label: 'Reguler', cls: 'bg-gray-100 text-gray-600' }
}

const Services = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchServices() }, [])

  const fetchServices = async () => {
    try {
      const { data } = await api.get('/services')
      setServices(data)
    } catch {
      toast.error('Gagal memuat layanan')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        category: form.category || 'Umum',
        description: form.description,
        unit: form.category === 'Cuci Satuan' ? form.unit : 'Kg',
        price_per_kg: parseFloat(form.price_per_kg),
        estimated_day: parseInt(form.estimated_day),
      }
      if (editing) {
        await api.put(`/services/${editing.id}`, payload)
        toast.success('Layanan berhasil diupdate')
      } else {
        await api.post('/services', payload)
        toast.success('Layanan berhasil ditambahkan')
      }
      fetchServices()
      resetForm()
    } catch {
      toast.error('Gagal menyimpan layanan')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteService = async (id, name) => {
    if (!window.confirm(`Hapus layanan "${name}"?`)) return
    try {
      await api.delete(`/services/${id}`)
      toast.success('Layanan berhasil dihapus')
      fetchServices()
    } catch {
      toast.error('Gagal menghapus layanan')
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditing(null)
    setShowModal(false)
  }

  const editService = (service) => {
    setEditing(service)
    setForm({
      name: service.name,
      category: service.category || 'Umum',
      description: service.description || '',
      unit: service.unit || 'Pcs',
      price_per_kg: service.price_per_kg.toString(),
      estimated_day: service.estimated_day.toString(),
    })
    setShowModal(true)
  }

  // Kelompokkan per kategori
  const grouped = {}
  services.forEach(s => {
    const cat = s.category || 'Umum'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  if (loading) return (
    <div className="flex justify-center py-20">
      <LoadingSpinner />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Layanan</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola layanan dan tarif laundry</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          Tambah Layanan
        </button>
      </div>

      {services.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🧴</div>
          <p className="text-gray-500 font-medium">Belum ada layanan</p>
          <p className="text-gray-400 text-sm mt-1">Tambah layanan pertama untuk mulai menerima order</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META['Umum']
            return (
              <div key={cat}>
                {/* Header kategori */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${meta.color} rounded-xl flex items-center justify-center text-xl`}>
                    {meta.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{cat}</p>
                    <p className="text-xs text-gray-400">{meta.desc}</p>
                  </div>
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${meta.light} ${meta.text}`}>
                    {items.length} layanan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {items.map((service) => {
                    const tier = tierBadge(service.name, cat)
                    const isSatuan = cat === 'Cuci Satuan'
                    return (
                      <div key={service.id} className="card hover:shadow-md transition-all duration-200 group relative">
                        {/* Action buttons */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => editService(service)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteService(service.id, service.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Tier badge */}
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${tier.cls}`}>
                          {tier.label}
                        </span>

                        {/* Harga */}
                        <p className="text-2xl font-extrabold text-gray-900">
                          Rp{service.price_per_kg.toLocaleString('id-ID')}
                          <span className="text-sm font-normal text-gray-400">/{isSatuan ? (service.unit || 'item') : 'kg'}</span>
                        </p>

                        {service.description && (
                          <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {service.estimated_day === 1 ? 'Hari ini' : `${service.estimated_day} hari`}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <ScaleIcon className="w-3.5 h-3.5" />
                            {isSatuan ? 'per item' : 'per kg'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Layanan' : 'Tambah Layanan Baru'}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nama Layanan</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Contoh: Cuci Komplit — Express 6 Jam"
                  required
                />
              </div>
              <div>
                <label className="label">Deskripsi <span className="text-gray-400 font-normal text-xs">(opsional)</span></label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  placeholder="Contoh: Cuci, Setrika, Lipat · 6 Jam"
                />
              </div>
              {form.category === 'Cuci Satuan' && (
                <div>
                  <label className="label">Satuan Harga</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Pcs', 'Set', 'Kg'].map(u => (
                      <button
                        key={u} type="button"
                        onClick={() => setForm({ ...form, unit: u })}
                        className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                          form.unit === u
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {form.unit === 'Kg' ? 'Harga per kg — admin konfirmasi setelah timbang' : `Harga per ${form.unit} — customer input jumlah, harga otomatis terhitung`}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{form.category === 'Cuci Satuan' ? 'Harga per Item (Rp)' : 'Harga per Kg (Rp)'}</label>
                  <input
                    type="number"
                    value={form.price_per_kg}
                    onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
                    className="input"
                    placeholder="10000"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Estimasi (Hari)</label>
                  <input
                    type="number"
                    value={form.estimated_day}
                    onChange={(e) => setForm({ ...form, estimated_day: e.target.value })}
                    className="input"
                    placeholder="2"
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editing ? 'Simpan Perubahan' : 'Tambah Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Services
