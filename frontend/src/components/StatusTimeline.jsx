import React from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

const allStatuses = [
  { key: 'pending_pickup', label: 'Pickup', icon: '📦' },
  { key: 'picked_up', label: 'Dijemput', icon: '🚐' },
  { key: 'washing', label: 'Dicuci', icon: '🫧' },
  { key: 'drying', label: 'Kering', icon: '💨' },
  { key: 'ironing', label: 'Setrika', icon: '👕' },
  { key: 'ready_for_delivery', label: 'Siap Diantar', icon: '📫' },
  { key: 'completed', label: 'Selesai', icon: '✅' },
]

const walkInStatuses = [
  { key: 'washing', label: 'Dicuci', icon: '🫧' },
  { key: 'drying', label: 'Kering', icon: '💨' },
  { key: 'ironing', label: 'Setrika', icon: '👕' },
  { key: 'ready_for_delivery', label: 'Siap Diambil', icon: '📫' },
  { key: 'completed', label: 'Selesai', icon: '✅' },
]

const StatusTimeline = ({ currentStatus, orderSource }) => {
  const statuses = orderSource === 'walk_in' ? walkInStatuses : allStatuses
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-3 py-4 px-4 bg-red-50 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <XMarkIcon className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-red-700">Order Dibatalkan</p>
          <p className="text-sm text-red-400">Order ini telah dibatalkan</p>
        </div>
      </div>
    )
  }

  const currentIndex = statuses.findIndex(s => s.key === currentStatus)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start min-w-max gap-0">
        {statuses.map((status, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <React.Fragment key={status.key}>
              <div className="flex flex-col items-center w-16">
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-300 flex-shrink-0
                  ${done ? 'bg-blue-500 text-white shadow-sm shadow-blue-200' :
                    active ? 'bg-blue-600 text-white shadow-md shadow-blue-300 ring-4 ring-blue-100' :
                    'bg-gray-100 text-gray-400'}
                `}>
                  {done ? <CheckIcon className="w-4 h-4" /> : <span>{status.icon}</span>}
                </div>
                <span className={`
                  text-xs mt-2 text-center leading-tight
                  ${done || active ? 'text-blue-600 font-semibold' : 'text-gray-400'}
                `}>
                  {status.label}
                </span>
              </div>
              {index < statuses.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mt-4 mx-1 min-w-6 transition-all duration-300
                  ${index < currentIndex ? 'bg-blue-400' : 'bg-gray-200'}
                `} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default StatusTimeline
