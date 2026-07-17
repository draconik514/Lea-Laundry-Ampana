import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { StarIcon } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline'

const Feedbacks = () => {
  const [data, setData] = useState({ feedbacks: [], total: 0, avg_rating: 0, total_pages: 1, distribution: {} })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)

  const fetchFeedbacks = () => {
    setLoading(true)
    api.get(`/feedbacks?page=${page}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFeedbacks() }, [page])

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus feedback ini?')) return
    setDeleting(id)
    try {
      await api.delete(`/feedbacks/${id}`)
      fetchFeedbacks()
    } catch {}
    setDeleting(null)
  }

  const ratingCount = (star) => data.distribution?.[star] ?? 0

  const Stars = ({ rating, size = 'w-4 h-4' }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => s <= rating
        ? <StarIcon key={s} className={`${size} text-yellow-400`} />
        : <StarOutline key={s} className={`${size} text-gray-300`} />
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Feedback Pelanggan</h1>
        <p className="text-sm text-gray-500 mt-1">Penilaian dan ulasan dari pelanggan</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-4xl font-extrabold text-yellow-400">{data.avg_rating.toFixed(1)}</p>
              <Stars rating={Math.round(data.avg_rating)} size="w-5 h-5" />
              <p className="text-xs text-gray-400 mt-1">Rating Rata-rata</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-4xl font-extrabold text-blue-600">{data.total}</p>
              <p className="text-xs text-gray-400 mt-2">Total Feedback</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">Distribusi Rating</p>
              <div className="space-y-1">
                {[5,4,3,2,1].map(star => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3">{star}</span>
                    <StarIcon className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-yellow-400 h-1.5 rounded-full transition-all"
                        style={{ width: data.total ? `${(ratingCount(star) / data.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-4">{ratingCount(star)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          {data.feedbacks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-500">Belum ada feedback</p>
              <p className="text-sm text-gray-400 mt-1">Feedback dari pelanggan akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.feedbacks.map(f => (
                <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                        {f.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{f.customer_name}</p>
                        <p className="text-xs text-gray-400">Order: <span className="font-mono text-blue-600">{f.order_code}</span></p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <Stars rating={f.rating} />
                      <p className="text-xs text-gray-400">
                        {new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <button
                        onClick={() => handleDelete(f.id)}
                        disabled={deleting === f.id}
                        className="mt-1 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
                        title="Hapus feedback"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {f.message && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                      "{f.message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-400">Halaman {page} dari {data.total_pages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Feedbacks
