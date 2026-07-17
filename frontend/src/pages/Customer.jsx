import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { MagnifyingGlassIcon, CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid'
import {
  ClockIcon, PhoneIcon, MapPinIcon, SparklesIcon,
  BoltIcon, ShieldCheckIcon, TruckIcon,
  UserIcon, ScaleIcon, DocumentTextIcon, XMarkIcon, ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import LocationPicker from '../components/LocationPicker'
import brand from '../config/brand'

const ADMIN_WA = brand.adminWa
// Default: +62 852-4241-1919

const features = [
  { icon: SparklesIcon, title: 'Bersih & Wangi', desc: 'Menggunakan deterjen premium, hasil cucian bersih dan wangi tahan lama.', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: BoltIcon, title: 'Cepat & Tepat Waktu', desc: 'Proses laundry sesuai estimasi, tidak ada keterlambatan.', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { icon: ShieldCheckIcon, title: 'Aman & Terpercaya', desc: 'Pakaian Anda ditangani dengan hati-hati dan penuh tanggung jawab.', color: 'text-green-500', bg: 'bg-green-50' },
  { icon: TruckIcon, title: 'Mudah Dipantau', desc: 'Cek status laundry Anda kapan saja lewat kode order.', color: 'text-purple-500', bg: 'bg-purple-50' },
]

const steps = [
  { num: '01', title: 'Pesan Online / Antar', desc: 'Pesan antar jemput online atau langsung antar ke toko kami.' },
  { num: '02', title: 'Kami Jemput', desc: 'Kurir kami akan menjemput pakaian Anda sesuai alamat.' },
  { num: '03', title: 'Proses Laundry', desc: 'Kami cuci, keringkan, dan setrika dengan standar terbaik.' },
  { num: '04', title: 'Diantar Kembali', desc: 'Pakaian bersih diantar ke rumah Anda sesuai estimasi.' },
]

const testimonials = brand.testimonials

const SATUAN_ITEMS = [
  { name: 'Sprei',        unit: 'Pcs', price: 12000 },
  { name: 'Selimut',      unit: 'Pcs', price: 12000 },
  { name: 'Kameja Dinas', unit: 'Set', price: 15000 },
  { name: 'Jas',          unit: 'Set', price: 20000 },
  { name: 'Gorden',       unit: 'Kg',  price: 12000 },
  { name: 'Bedcover',     unit: 'Kg',  price: 10000 },
  { name: 'Kemeja Putih', unit: 'Pcs', price: 12000 },
  { name: 'Sepatu',       unit: 'Pcs', price: 20000 },
]

const emptyForm = {
  customer_name: '', customer_phone: '', customer_address: '',
  service_id: '', weight: '', note: ''
}

const Customer = () => {
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [code, setCode] = useState('')
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [gpsCoords, setGpsCoords] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const orderFormRef = useRef(null)

  useEffect(() => {
    api.get('/services').then(r => {
      setServices(r.data)
      if (r.data.length > 0) setForm(f => ({ ...f, service_id: r.data[0].id.toString() }))
    }).catch(() => {})
  }, [])

  const handleTrack = (e) => {
    e.preventDefault()
    if (code.trim()) navigate(`/customer/track/${code.trim()}`)
  }

  const openOrderForm = () => {
    setShowOrderForm(true)
    setSuccessOrder(null)
    setTimeout(() => orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/customer/order', {
        ...form,
        weight: parseFloat(form.weight) || 0,
        service_id: parseInt(form.service_id),
        order_source: 'website'
      })
      setSuccessOrder(data)
      toast.success(`Pesanan berhasil! Kode: ${data.code}`)

      const trackUrl = `${window.location.origin}/customer/track/${data.code}`
      const serviceName = selectedService?.name || '-'
      const unit = selectedService?.unit || 'kg'
      const qty = form.weight ? `${form.weight} ${unit}` : 'belum ditentukan'
      const mapsLink = gpsCoords
        ? `https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`
        : null
      const lines = [
        '🧺 *PESANAN ANTAR JEMPUT BARU!*',
        '',
        `👤 Nama: *${form.customer_name}*`,
        `📱 WhatsApp: *${form.customer_phone}*`,
        `📍 Alamat: ${form.customer_address}`,
        ...(mapsLink ? [`🗺 Buka di Maps: ${mapsLink}`] : []),
        `👕 Layanan: ${serviceName}`,
        `⚖ Jumlah: ${qty}`,
        ...(form.note ? [`📝 Catatan: ${form.note}`] : []),
        '',
        `📦 Kode Order: *${data.code}*`,
        `🔗 Tracking: ${trackUrl}`,
        '',
        'Segera konfirmasi penjemputan ke pelanggan.',
      ]
      const waUrl = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(lines.join('\n'))}`
      const a = document.createElement('a')
      a.href = waUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat pesanan')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedService = services.find(s => s.id === parseInt(form.service_id))
  const isSatuan = selectedService?.category === 'Cuci Satuan'
  const satuanUnit = selectedService?.unit || 'Kg'
  const satuanServices = services.filter(s => s.category === 'Cuci Satuan')
  const otherServices = services.filter(s => s.category !== 'Cuci Satuan')

  // Kalau Pcs/Set: harga = price_per_kg * qty, kalau Kg: admin konfirmasi
  const estimatedPrice = selectedService && form.weight
    ? selectedService.price_per_kg * parseFloat(form.weight || 0)
    : null

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden">
              <img src="/laundryfoto.jpg" alt="Mega Laundry" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{brand.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 font-medium">
            <a href="#layanan" className="hover:text-blue-600 transition-colors">Layanan</a>
            <a href="#cara-kerja" className="hover:text-blue-600 transition-colors">Cara Kerja</a>
            <a href="#testimoni" className="hover:text-blue-600 transition-colors">Testimoni</a>
            <button onClick={openOrderForm} className="text-blue-600 font-semibold hover:underline">Pesan Antar Jemput</button>
          </div>
          <a
            href={`https://wa.me/${ADMIN_WA}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <PhoneIcon className="w-4 h-4" />
            Hubungi Kami
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <CheckBadgeIcon className="w-4 h-4 text-yellow-300" />
            Dipercaya pelanggan di {brand.city}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            Laundry Bersih & Wangi,<br />
            <span className="text-yellow-300">Siap Tepat Waktu</span>
          </h1>
          <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
            Serahkan pakaian Anda kepada kami. Kami jaga kebersihan dan kerapiannya dengan standar terbaik.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <button
              onClick={openOrderForm}
              className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold px-8 py-3.5 rounded-2xl transition-colors text-sm shadow-lg"
            >
              🚐 Pesan Antar Jemput
            </button>
            <button
              onClick={() => navigate('/customer/track')}
              className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors text-sm border border-white/20"
            >
              🔍 Cek Status Pesanan
            </button>
          </div>

          {/* Track order box */}
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-lg mx-auto">
            <p className="text-sm font-semibold text-gray-700 mb-3 text-left">🔍 Cek Status Pesanan</p>
            <form onSubmit={handleTrack} className="flex gap-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Masukkan kode order..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-wider"
                />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Cek
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {[[brand.stats.customers, 'Pelanggan Puas'], [brand.stats.years, 'Pengalaman'], [brand.stats.ontime, 'Tepat Waktu']].map(([val, label]) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-blue-600">{val}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-2">Keunggulan Kami</p>
            <h2 className="text-3xl font-bold text-gray-900">Kenapa Pilih {brand.name}?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <p className="font-semibold text-gray-900 mb-1">{title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="layanan" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-2">Harga Transparan</p>
            <h2 className="text-3xl font-bold text-gray-900">Daftar Layanan & Harga</h2>
            <p className="text-gray-500 text-sm mt-2">Pilih layanan sesuai kebutuhan, tersedia pilihan reguler hingga express</p>
          </div>

          {/* Card Cuci Satuan — pakai data dari DB kalau ada, fallback ke SATUAN_ITEMS */}
          {(() => {
            const displayItems = satuanServices.length > 0
              ? satuanServices.map(s => ({ name: s.name, unit: s.unit || 'item', price: s.price_per_kg }))
              : SATUAN_ITEMS
            return (
              <div className="mb-10 rounded-2xl overflow-hidden shadow-sm border border-blue-100">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🧺</div>
                      <div>
                        <p className="font-bold text-lg leading-tight">Cuci Satuan</p>
                        <p className="text-xs text-blue-200">Regular 1–2 Hari · Harga per item / kg</p>
                      </div>
                    </div>
                    <span className="hidden sm:block text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">
                      {displayItems.length} Item Tersedia
                    </span>
                  </div>
                </div>
                <div className="bg-white p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {displayItems.map(item => (
                      <div key={item.name} className="bg-blue-50 rounded-xl p-3.5 flex flex-col gap-1 border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{item.unit}</span>
                        <p className="text-sm font-bold text-gray-800 leading-tight">{item.name}</p>
                        <p className="text-base font-extrabold text-blue-700 mt-auto">
                          Rp{item.price.toLocaleString('id-ID')}
                          <span className="text-xs font-normal text-gray-400">/{item.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button onClick={openOrderForm} className="w-full text-sm font-semibold py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                    Pesan Cuci Satuan
                  </button>
                </div>
              </div>
            )
          })()}

          {services.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : (() => {
            // Kelompokkan per kategori — exclude Cuci Satuan (sudah ada card khusus di atas)
            const categories = {}
            services.filter(s => s.category !== 'Cuci Satuan').forEach(s => {
              const cat = s.category || 'Umum'
              if (!categories[cat]) categories[cat] = []
              categories[cat].push(s)
            })
            const catIcons = {
              'Cuci Komplit': { icon: '👕', desc: 'Cuci, Setrika & Lipat', color: 'blue-700' },
              'Setrika':      { icon: '🔥', desc: 'Hanya Setrika',         color: 'blue-500' },
              'Cuci Lipat':   { icon: '🧺', desc: 'Cuci, Kering & Lipat',  color: 'blue-600' },
            }
            const tierBadge = (name) => {
              if (name.includes('3 Jam'))  return { label: 'Express 3 Jam',  cls: 'bg-blue-100 text-blue-800' }
              if (name.includes('6 Jam'))  return { label: 'Express 6 Jam',  cls: 'bg-blue-100 text-blue-700' }
              if (name.includes('12 Jam')) return { label: 'Express 12 Jam', cls: 'bg-blue-50 text-blue-600'  }
              return { label: 'Reguler', cls: 'bg-gray-100 text-gray-600' }
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Object.entries(categories).map(([cat, items]) => {
                  const meta = catIcons[cat] || { icon: '🫧', desc: '', color: 'blue-600' }
                  return (
                    <div key={cat} className="rounded-2xl overflow-hidden border border-blue-100 shadow-sm ring-1 ring-blue-100">
                      <div className={`bg-${meta.color} px-6 py-5 text-white`}>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-3xl">{meta.icon}</span>
                          <div>
                            <p className="font-bold text-lg leading-tight">{cat}</p>
                            <p className="text-xs opacity-80">{meta.desc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white divide-y divide-gray-50">
                        {items.map((s, i) => {
                          const tier = tierBadge(s.name)
                          return (
                            <div key={s.id} className={`flex items-center justify-between px-5 py-3.5 ${i === 0 ? 'bg-blue-50/40' : ''}`}>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.cls}`}>
                                {tier.label}
                              </span>
                              <span className="font-bold text-gray-900 text-sm">
                                Rp{s.price_per_kg.toLocaleString('id-ID')}<span className="text-gray-400 font-normal">/kg</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                        <button
                          onClick={openOrderForm}
                          className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors bg-${meta.color} text-white hover:opacity-90`}
                        >
                          Pesan Sekarang
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </section>


      {/* Form Pesan Antar Jemput */}
      {showOrderForm && (
        <section id="pesan-antar-jemput" ref={orderFormRef} className="py-16 px-6 bg-blue-50 border-y border-blue-100">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-1">Layanan Antar Jemput</p>
                <h2 className="text-2xl font-bold text-gray-900">Pesan Laundry Online</h2>
                <p className="text-gray-500 text-sm mt-1">Isi form di bawah, kami akan jemput pakaian Anda</p>
              </div>
              <button onClick={() => setShowOrderForm(false)} className="p-2 hover:bg-blue-100 rounded-xl transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {successOrder ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-green-100">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Pesanan Berhasil Dikirim! 🎉</h3>
                <p className="text-gray-500 text-sm mb-6">Simpan kode ini untuk tracking status laundry Anda</p>
                <div className="bg-blue-50 rounded-2xl p-5 mb-6">
                  <p className="text-xs text-gray-500 mb-1">Kode Pesanan</p>
                  <p className="text-3xl font-bold text-blue-600 tracking-widest font-mono">{successOrder.code}</p>
                  <p className="text-sm text-gray-500 mt-2">Total: <span className="font-bold text-gray-900">Rp{successOrder.order?.total_price?.toLocaleString('id-ID')}</span></p>
                </div>
                <p className="text-xs text-gray-400 mb-4">Notifikasi otomatis sudah dikirim ke admin. Jika tidak terbuka, klik tombol di bawah.</p>
                <a
                  href={`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(
                    `🧺 *PESANAN ANTAR JEMPUT BARU!*\n\n👤 Nama: *${successOrder.order?.customer_name || ''}*\n📦 Kode Order: *${successOrder.code}*\n🔗 Tracking: ${window.location.origin}/customer/track/${successOrder.code}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm mb-3"
                >
                  💬 Konfirmasi ke Admin via WA
                </a>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/customer/track/${successOrder.code}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    🔍 Pantau Status
                  </button>
                  <button
                    onClick={() => { setSuccessOrder(null); setForm({ ...emptyForm, service_id: form.service_id }) }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    + Pesan Lagi
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <form onSubmit={handleOrderSubmit}>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" /> Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          value={form.customer_name}
                          onChange={e => setForm({ ...form, customer_name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nama lengkap Anda"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-gray-400" /> No. WhatsApp *
                        </label>
                        <input
                          type="tel"
                          value={form.customer_phone}
                          onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="08xxxxxxxxxx"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-gray-400" /> Alamat Pickup *
                      </label>
                      <LocationPicker
                        adminPhone={ADMIN_WA}
                        customerName={form.customer_name}
                        onLocationSelect={({ address, lat, lng }) => {
                          setForm(f => ({ ...f, customer_address: address }))
                          if (lat && lng) setGpsCoords({ lat, lng })
                        }}
                      />
                      <textarea
                        value={form.customer_address}
                        onChange={e => setForm({ ...form, customer_address: e.target.value })}
                        className="w-full mt-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="2"
                        placeholder="Alamat lengkap untuk penjemputan"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Jenis Layanan *</label>
                        {services.length === 0 ? (
                          <div className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-400">Memuat layanan...</div>
                        ) : (() => {
                          // Kelompokkan per kategori (exclude Cuci Satuan dari grouped biasa)
                          const grouped = {}
                          otherServices.forEach(s => {
                            const cat = s.category || 'Umum'
                            if (!grouped[cat]) grouped[cat] = []
                            grouped[cat].push(s)
                          })
                          return (
                            <select
                              value={form.service_id}
                              onChange={e => setForm({ ...form, service_id: e.target.value, weight: '' })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              {Object.entries(grouped).map(([cat, items]) => (
                                <optgroup key={cat} label={`── ${cat} ──`}>
                                  {items.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name.replace(`${cat} — `, '')} · Rp{s.price_per_kg.toLocaleString('id-ID')}/kg
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              {satuanServices.length > 0 && (
                                <optgroup label="── Cuci Satuan ──">
                                  {satuanServices.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} · Rp{s.price_per_kg.toLocaleString('id-ID')}/{s.unit || 'item'}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          )
                        })()}
                      </div>
                      <div>
                        {isSatuan && satuanUnit !== 'Kg' ? (
                          <>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <ScaleIcon className="w-3.5 h-3.5 text-gray-400" /> Jumlah ({satuanUnit}) *
                            </label>
                            <input
                              type="number"
                              value={form.weight}
                              onChange={e => setForm({ ...form, weight: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Jumlah ${satuanUnit}`}
                              required
                              min="1"
                              step="1"
                            />
                          </>
                        ) : (
                          <>
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <ScaleIcon className="w-3.5 h-3.5 text-gray-400" />
                              {isSatuan ? 'Perkiraan Berat (kg)' : 'Perkiraan Berat (kg)'}
                              <span className="text-blue-400 font-normal normal-case text-xs ml-1">opsional</span>
                            </label>
                            <input
                              type="number"
                              value={form.weight}
                              onChange={e => setForm({ ...form, weight: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Kosongkan jika tidak tahu"
                              min="0.5"
                              step="0.5"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Info harga */}
                    {isSatuan && satuanUnit === 'Kg' ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                        <p className="font-semibold mb-1">⚖️ Harga Dikonfirmasi Admin</p>
                        <p>Item ini dihitung per <strong>Kg</strong>. Berat akan ditimbang oleh admin setelah dijemput, lalu admin akan konfirmasi harga via WhatsApp sebelum diproses.</p>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                        <p className="font-semibold mb-1">💡 Tentang Harga & Berat</p>
                        <p>Berat di sini hanya <strong>perkiraan</strong>. Harga final dihitung setelah pakaian ditimbang ulang di laundry kami. Jika ada selisih, admin akan konfirmasi lewat WhatsApp sebelum diproses.</p>
                      </div>
                    )}

                    {estimatedPrice !== null && estimatedPrice > 0 && !(isSatuan && satuanUnit === 'Kg') && (
                      <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-500 font-medium">
                            {isSatuan ? `Total Harga (${form.weight} ${satuanUnit})` : 'Estimasi Total (belum pasti)'}
                          </p>
                          <p className="text-xl font-bold text-blue-700">Rp{estimatedPrice.toLocaleString('id-ID')}</p>
                        </div>
                        {selectedService && (
                          <div className="text-right">
                            <p className="text-xs text-blue-400">Estimasi selesai</p>
                            <p className="text-sm font-semibold text-blue-600">{selectedService.estimated_day === 1 ? 'Hari ini' : `${selectedService.estimated_day} hari`}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <DocumentTextIcon className="w-3.5 h-3.5 text-gray-400" /> Catatan (Opsional)
                      </label>
                      <textarea
                        value={form.note}
                        onChange={e => setForm({ ...form, note: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="2"
                        placeholder="Contoh: ada karpet, jaket tebal, jangan diperas"
                      />
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <button
                      type="submit"
                      disabled={submitting || services.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                      ) : '🚐 Kirim Pesanan Antar Jemput'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="cara-kerja" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-2">Mudah & Simpel</p>
            <h2 className="text-3xl font-bold text-gray-900">Cara Kerja Kami</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
                  <p className="text-4xl font-extrabold text-blue-200 mb-3">{step.num}</p>
                  <p className="font-semibold text-gray-900 mb-2">{step.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-8 -right-4 z-10 items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-400 font-bold text-sm">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimoni" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-2">Kata Mereka</p>
            <h2 className="text-3xl font-bold text-gray-900">Testimoni Pelanggan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map(({ name, text, rating }) => (
              <div key={name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: rating }).map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">"{text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {name.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info & CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Kunjungi {brand.name}</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-blue-100">
                  <MapPinIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-300" />
                  <p className="text-sm">{brand.address}</p>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <ClockIcon className="w-5 h-5 flex-shrink-0 text-yellow-300" />
                  <p className="text-sm">{brand.hours}</p>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <PhoneIcon className="w-5 h-5 flex-shrink-0 text-yellow-300" />
                  <p className="text-sm">{brand.phone}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={openOrderForm}
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-3.5 px-6 rounded-2xl transition-colors text-sm"
              >
                🚐 Pesan Antar Jemput
              </button>
              <a
                href={`https://wa.me/${ADMIN_WA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold py-3.5 px-6 rounded-2xl transition-colors text-sm"
              >
                💬 Chat WhatsApp Admin
              </a>
              <button
                onClick={() => navigate('/customer/track')}
                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold py-3.5 px-6 rounded-2xl transition-colors text-sm border border-white/20"
              >
                🔍 Cek Status Pesanan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <img src="/laundryfoto.jpg" alt="Mega Laundry" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white">{brand.name}</span>
        </div>
        <p className="text-gray-500 text-xs">© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
      </footer>

    </div>
  )
}

export default Customer
