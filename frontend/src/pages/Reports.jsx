import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon, ChartBarIcon, ShoppingBagIcon,
  ArrowTrendingUpIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import CardStats from '../components/CardStats'
import api from '../services/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const COLORS_CATEGORY = {
  'Cuci Komplit': '#3b82f6',
  'Setrika':      '#f97316',
  'Cuci Lipat':   '#22c55e',
  'Umum':         '#8b5cf6',
}
const fmt = (v) => `Rp${Number(v).toLocaleString('id-ID')}`

const Reports = () => {
  const [report, setReport] = useState({
    dailyRevenue: 0, monthlyRevenue: 0, totalRevenue: 0,
    totalOrders: 0, dailyOrders: 0, monthlyOrders: 0,
    averageOrder: 0, revenueByService: [], dailyData: []
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [chartMode, setChartMode] = useState('daily')

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const yearStart = new Date().getFullYear() + '-01-01'
    Promise.all([
      api.get('/reports/financial'),
      api.get(`/orders/export?date_from=${yearStart}&date_to=${today}`)
    ]).then(([{ data: d }, { data: o }]) => {
      setReport({
        dailyRevenue: d.daily_revenue ?? 0,
        monthlyRevenue: d.monthly_revenue ?? 0,
        totalRevenue: d.total_revenue ?? 0,
        totalOrders: d.total_orders ?? 0,
        dailyOrders: d.daily_orders ?? 0,
        monthlyOrders: d.monthly_orders ?? 0,
        averageOrder: d.average_order ?? 0,
        revenueByService: (d.revenue_by_service ?? []).map(s => ({
          serviceName: s.service_name,
          category: s.category || 'Umum',
          totalOrders: s.total_orders,
          totalRevenue: s.total_revenue
        })),
        dailyData: d.daily_data ?? []
      })
      setOrders(o.data || [])
    })
    .catch(() => toast.error('Gagal memuat laporan'))
    .finally(() => setLoading(false))
  }, [])

  const exportExcel = () => {
    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const now = new Date().toLocaleString('id-ID')
      const today = new Date().toISOString().slice(0, 10)

      const statusLabel = {
        pending_pickup: 'Menunggu Pickup', picked_up: 'Dijemput', washing: 'Dicuci',
        drying: 'Dikeringkan', ironing: 'Disetrika', ready_for_delivery: 'Siap Diantar',
        completed: 'Selesai', cancelled: 'Dibatalkan'
      }
      const sourceLabel = { website: 'Website', walk_in: 'Datang Langsung', whatsapp: 'WhatsApp' }

      // Helper style
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        }
      }
      const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: '1E3A8A' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
      const subtitleStyle = {
        font: { sz: 10, color: { rgb: '6B7280' } },
        alignment: { horizontal: 'left' }
      }
      const labelStyle = {
        font: { bold: true, sz: 10, color: { rgb: '374151' } },
        fill: { fgColor: { rgb: 'F3F4F6' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      }
      const valueStyle = {
        font: { sz: 10, color: { rgb: '111827' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      }
      const valueMoneyStyle = {
        font: { bold: true, sz: 10, color: { rgb: '059669' } },
        numFmt: '#,##0',
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      }
      const rowEvenStyle = {
        font: { sz: 10 },
        fill: { fgColor: { rgb: 'F9FAFB' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      }
      const rowOddStyle = {
        font: { sz: 10 },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      }
      const moneyRowStyle = (isEven) => ({
        font: { sz: 10, color: { rgb: '059669' } },
        fill: { fgColor: { rgb: isEven ? 'F9FAFB' : 'FFFFFF' } },
        numFmt: '#,##0',
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        }
      })


      // ==========================================
      // SHEET 1: RINGKASAN
      // ==========================================
      const summaryAoa = [
        ['🧺 LAPORAN KEUANGAN LAUNDRYFLOW', ''],
        [`Dicetak pada: ${now}`, ''],
        ['', ''],
        ['📊 RINGKASAN KEUANGAN', ''],
        ['Keterangan', 'Nilai'],
        ['Pendapatan Hari Ini', report.dailyRevenue],
        ['Pendapatan Bulan Ini', report.monthlyRevenue],
        ['Total Pendapatan (All Time)', report.totalRevenue],
        ['', ''],
        ['📦 RINGKASAN ORDER', ''],
        ['Keterangan', 'Jumlah'],
        ['Total Semua Order', report.totalOrders],
        ['Order Hari Ini', report.dailyOrders],
        ['Order Bulan Ini', report.monthlyOrders],
        ['Rata-rata Nilai per Order', report.averageOrder],
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa)
      wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }]
      wsSummary['!rows'] = [{ hpt: 28 }, { hpt: 16 }, { hpt: 10 }]

      // Apply styles ringkasan
      wsSummary['A1'].s = titleStyle
      wsSummary['A2'].s = subtitleStyle
      ;['A4', 'A10'].forEach(c => { if (wsSummary[c]) wsSummary[c].s = { font: { bold: true, sz: 11, color: { rgb: '1E3A8A' } } } })
      ;['A5', 'B5', 'A11', 'B11'].forEach(c => { if (wsSummary[c]) wsSummary[c].s = headerStyle })
      ;[6, 7, 8, 12, 13, 14, 15].forEach(row => {
        if (wsSummary[`A${row}`]) wsSummary[`A${row}`].s = labelStyle
        if (wsSummary[`B${row}`]) {
          wsSummary[`B${row}`].s = row === 12 || row === 13 || row === 14
            ? valueStyle
            : valueMoneyStyle
        }
      })
      wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
      XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Ringkasan')

      // ==========================================
      // SHEET 2: SEMUA ORDER
      // ==========================================
      const orderHeaders = [
        'No.', 'Kode Order', 'Nama Pelanggan', 'No. WhatsApp',
        'Layanan', 'Berat (kg)', 'Total Harga (Rp)',
        'Status', 'Sumber Order', 'Tanggal Order'
      ]
      const orderRows = orders.map((o, i) => [
        i + 1,
        o.code,
        o.customer_name,
        o.customer_phone || '-',
        o.service_name,
        Number(o.weight),
        Number(o.total_price),
        statusLabel[o.status] || o.status,
        sourceLabel[o.order_source] || o.order_source,
        new Date(o.created_at).toLocaleString('id-ID')
      ])

      const wsOrders = XLSX.utils.aoa_to_sheet([orderHeaders, ...orderRows])
      wsOrders['!cols'] = [
        { wch: 5 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
        { wch: 20 }, { wch: 12 }, { wch: 18 },
        { wch: 20 }, { wch: 18 }, { wch: 24 }
      ]
      wsOrders['!rows'] = [{ hpt: 22 }]

      // Style header
      orderHeaders.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci })
        if (wsOrders[cellRef]) wsOrders[cellRef].s = headerStyle
      })
      // Style baris data
      orderRows.forEach((row, ri) => {
        const isEven = ri % 2 === 0
        row.forEach((_, ci) => {
          const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci })
          if (!wsOrders[cellRef]) return
          if (ci === 6) {
            wsOrders[cellRef].s = moneyRowStyle(isEven)
          } else {
            wsOrders[cellRef].s = isEven ? rowEvenStyle : rowOddStyle
          }
        })
      })
      XLSX.utils.book_append_sheet(wb, wsOrders, '📋 Semua Order')

      // ==========================================
      // SHEET 3: PER LAYANAN
      // ==========================================
      const serviceHeaders = ['Nama Layanan', 'Total Order', 'Total Pendapatan (Rp)', 'Rata-rata per Order (Rp)']
      const serviceRows = report.revenueByService.map(s => [
        s.serviceName,
        s.totalOrders,
        Number(s.totalRevenue),
        s.totalOrders > 0 ? Math.round(s.totalRevenue / s.totalOrders) : 0
      ])
      // Baris total
      const totalOrders = report.revenueByService.reduce((a, s) => a + s.totalOrders, 0)
      const totalRevenue = report.revenueByService.reduce((a, s) => a + Number(s.totalRevenue), 0)
      serviceRows.push(['TOTAL', totalOrders, totalRevenue, totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0])

      const wsService = XLSX.utils.aoa_to_sheet([serviceHeaders, ...serviceRows])
      wsService['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 24 }, { wch: 26 }]
      wsService['!rows'] = [{ hpt: 22 }]

      serviceHeaders.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci })
        if (wsService[cellRef]) wsService[cellRef].s = headerStyle
      })
      serviceRows.forEach((row, ri) => {
        const isLast = ri === serviceRows.length - 1
        const isEven = ri % 2 === 0
        row.forEach((_, ci) => {
          const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci })
          if (!wsService[cellRef]) return
          if (isLast) {
            wsService[cellRef].s = {
              font: { bold: true, sz: 10, color: { rgb: '1E3A8A' } },
              fill: { fgColor: { rgb: 'DBEAFE' } },
              numFmt: ci > 1 ? '#,##0' : undefined,
              border: {
                top: { style: 'medium', color: { rgb: '2563EB' } },
                bottom: { style: 'medium', color: { rgb: '2563EB' } },
                left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                right: { style: 'thin', color: { rgb: 'E5E7EB' } },
              }
            }
          } else if (ci > 1) {
            wsService[cellRef].s = moneyRowStyle(isEven)
          } else {
            wsService[cellRef].s = isEven ? rowEvenStyle : rowOddStyle
          }
        })
      })
      XLSX.utils.book_append_sheet(wb, wsService, '🏷️ Per Layanan')

      // ==========================================
      // SHEET 4: DATA HARIAN
      // ==========================================
      const dailyHeaders = ['Tanggal', 'Hari', 'Jumlah Order', 'Pendapatan (Rp)']
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const dailyRows = report.dailyData.map(d => [
        d.date,
        days[new Date(d.date).getDay()],
        d.orders,
        Number(d.revenue)
      ])
      // Total row
      const totalDailyOrders = report.dailyData.reduce((a, d) => a + d.orders, 0)
      const totalDailyRevenue = report.dailyData.reduce((a, d) => a + Number(d.revenue), 0)
      dailyRows.push(['TOTAL', '', totalDailyOrders, totalDailyRevenue])

      const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows])
      wsDaily['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 20 }]
      wsDaily['!rows'] = [{ hpt: 22 }]

      dailyHeaders.forEach((_, ci) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci })
        if (wsDaily[cellRef]) wsDaily[cellRef].s = headerStyle
      })
      dailyRows.forEach((row, ri) => {
        const isLast = ri === dailyRows.length - 1
        const isEven = ri % 2 === 0
        row.forEach((_, ci) => {
          const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci })
          if (!wsDaily[cellRef]) return
          if (isLast) {
            wsDaily[cellRef].s = {
              font: { bold: true, sz: 10, color: { rgb: '1E3A8A' } },
              fill: { fgColor: { rgb: 'DBEAFE' } },
              numFmt: ci === 3 ? '#,##0' : undefined,
              border: {
                top: { style: 'medium', color: { rgb: '2563EB' } },
                bottom: { style: 'medium', color: { rgb: '2563EB' } },
                left: { style: 'thin', color: { rgb: 'E5E7EB' } },
                right: { style: 'thin', color: { rgb: 'E5E7EB' } },
              }
            }
          } else if (ci === 3) {
            wsDaily[cellRef].s = moneyRowStyle(isEven)
          } else {
            wsDaily[cellRef].s = isEven ? rowEvenStyle : rowOddStyle
          }
        })
      })
      XLSX.utils.book_append_sheet(wb, wsDaily, '📅 30 Hari Terakhir')

      // Export
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Laporan_LaundryFlow_${today}.xlsx`)
      toast.success('Laporan berhasil diexport!')
    } catch (err) {
      console.error(err)
      toast.error('Gagal export laporan')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <LoadingSpinner />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan pendapatan dan performa bisnis</p>
        </div>
        <button onClick={exportExcel} disabled={exporting} className="btn-primary">
          {exporting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowDownTrayIcon className="w-4 h-4" />
          )}
          Export Excel
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardStats title="Pendapatan Hari Ini" value={fmt(report.dailyRevenue)} icon={<CurrencyDollarIcon className="w-5 h-5" />} color="blue" subtitle={`${report.dailyOrders} order hari ini`} />
        <CardStats title="Pendapatan Bulan Ini" value={fmt(report.monthlyRevenue)} icon={<ArrowTrendingUpIcon className="w-5 h-5" />} color="green" subtitle={`${report.monthlyOrders} order bulan ini`} />
        <CardStats title="Total Pendapatan" value={fmt(report.totalRevenue)} icon={<ChartBarIcon className="w-5 h-5" />} color="purple" />
        <CardStats title="Rata-rata per Order" value={fmt(report.averageOrder)} icon={<ShoppingBagIcon className="w-5 h-5" />} color="yellow" subtitle={`dari ${report.totalOrders} total order`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {chartMode === 'daily' ? 'Pendapatan 30 Hari Terakhir' : 'Pendapatan Per Bulan'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Hanya dari order yang sudah selesai</p>
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setChartMode('daily')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  chartMode === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setChartMode('monthly')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  chartMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>
          {report.dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data pendapatan</div>
          ) : (() => {
            const chartData = chartMode === 'daily'
              ? report.dailyData
              : Object.values(
                  report.dailyData.reduce((acc, d) => {
                    const month = d.date.slice(0, 7)
                    if (!acc[month]) acc[month] = { date: month, orders: 0, revenue: 0 }
                    acc[month].orders += d.orders
                    acc[month].revenue += Number(d.revenue)
                    return acc
                  }, {})
                )
            return (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={chartMode === 'monthly' ? 32 : 16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(v) => chartMode === 'daily'
                      ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                      : new Date(v + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
                    }
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    formatter={(v) => [fmt(v), 'Pendapatan']}
                    labelFormatter={(v) => chartMode === 'daily'
                      ? new Date(v).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                      : new Date(v + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                    }
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>

        {/* Pie chart — per kategori */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Per Kategori</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribusi pendapatan per jenis layanan</p>
          </div>
          {report.revenueByService.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>
          ) : (() => {
            // Kelompokkan per kategori untuk pie
            const byCategory = {}
            report.revenueByService.forEach(s => {
              const cat = s.category || 'Umum'
              if (!byCategory[cat]) byCategory[cat] = { name: cat, totalRevenue: 0, totalOrders: 0 }
              byCategory[cat].totalRevenue += Number(s.totalRevenue)
              byCategory[cat].totalOrders += s.totalOrders
            })
            const pieData = Object.values(byCategory)
            return (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="totalRevenue" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={40}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS_CATEGORY[entry.name] || '#8b5cf6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </div>

      {/* Service detail table — grouped per kategori */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Detail per Layanan</h3>
        </div>
        {(() => {
          // Kelompokkan per kategori
          const grouped = {}
          report.revenueByService.forEach(s => {
            const cat = s.category || 'Umum'
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(s)
          })
          return (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, items]) => {
                const catColor = COLORS_CATEGORY[cat] || '#8b5cf6'
                const catTotal = items.reduce((a, s) => a + Number(s.totalRevenue), 0)
                const catOrders = items.reduce((a, s) => a + s.totalOrders, 0)
                return (
                  <div key={cat}>
                    {/* Header kategori */}
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                        <span className="font-semibold text-gray-800 text-sm">{cat}</span>
                        <span className="text-xs text-gray-400">{catOrders} order</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(catTotal)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendapatan</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rata-rata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((item, idx) => {
                            const tierName = item.serviceName.replace(`${cat} — `, '')
                            const avg = item.totalOrders > 0 ? Math.round(item.totalRevenue / item.totalOrders) : 0
                            return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="py-2.5 px-3 text-sm text-gray-700">{tierName}</td>
                                <td className="py-2.5 px-3 text-sm text-right text-gray-600">{item.totalOrders}</td>
                                <td className="py-2.5 px-3 text-sm text-right font-semibold text-gray-900">{fmt(item.totalRevenue)}</td>
                                <td className="py-2.5 px-3 text-sm text-right text-gray-500">{fmt(avg)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default Reports
