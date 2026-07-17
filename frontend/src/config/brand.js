// Konfigurasi brand per client laundry
// Semua nilai bisa di-override via env var Vercel tanpa ubah kode

const defaultTestimonials = [
  { name: 'Budi S.', text: 'Laundry paling bersih di sini! Baju putih saya jadi kinclong lagi.', rating: 5 },
  { name: 'Sari W.', text: 'Tepat waktu dan harganya terjangkau. Sudah langganan 2 tahun.', rating: 5 },
  { name: 'Andi P.', text: 'Pelayanannya ramah, hasil cucian rapi dan wangi. Recommended!', rating: 5 },
]

const brand = {
  name:     import.meta.env.VITE_BRAND_NAME    || 'Lea Laundry Ampana',
  tagline:  import.meta.env.VITE_BRAND_TAGLINE || 'Laundry Bersih & Wangi, Siap Tepat Waktu',
  address:  import.meta.env.VITE_BRAND_ADDRESS || 'Jl. Tj. Santigi, Dondo, Kec. Ampana Kota, Kabupaten Tojo Una-Una, Sulawesi Tengah 94683',
  hours:    import.meta.env.VITE_BRAND_HOURS   || 'Senin – Minggu, 09.00 – 17.00 WIB',
  phone:    import.meta.env.VITE_BRAND_PHONE   || '0852-4241-1919',
  adminWa:  import.meta.env.VITE_ADMIN_WA      || '6285242411919',
  city:     import.meta.env.VITE_BRAND_CITY    || 'Dondo, Ampana Kota',
  stats: {
    customers: import.meta.env.VITE_STAT_CUSTOMERS || '500+',
    years:     import.meta.env.VITE_STAT_YEARS     || '3 Tahun',
    ontime:    import.meta.env.VITE_STAT_ONTIME    || '100%',
  },
  testimonials: (() => {
    try {
      return JSON.parse(import.meta.env.VITE_TESTIMONIALS || 'null') || defaultTestimonials
    } catch {
      return defaultTestimonials
    }
  })(),
}

export default brand
