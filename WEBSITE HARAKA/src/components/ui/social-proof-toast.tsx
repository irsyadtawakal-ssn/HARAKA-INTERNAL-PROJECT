"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"

const notifications = [
  {
    name: "Sari W.",
    location: "Jakarta",
    action: "Mulai Maklon Skincare",
    product: "Serum Vitamin C 30ml",
    color: "bg-rose-400",
  },
  {
    name: "Rizky A.",
    location: "Bandung",
    action: "Order Maklon",
    product: "Moisturizer Cream 1000 Pcs",
    color: "bg-blue-400",
  },
  {
    name: "Dewi K.",
    location: "Surabaya",
    action: "Konsultasi Maklon",
    product: "Body Lotion Whitening",
    color: "bg-purple-400",
  },
  {
    name: "Ahmad F.",
    location: "Bekasi",
    action: "Kerjasama Maklon",
    product: "Toner Niacinamide 100ml",
    color: "bg-emerald-400",
  },
  {
    name: "Rina P.",
    location: "Tangerang",
    action: "Order Maklon",
    product: "Face Wash 1000 Pcs",
    color: "bg-pink-400",
  },
  {
    name: "Budi S.",
    location: "Medan",
    action: "Mulai Maklon",
    product: "Sunscreen SPF 50+ 60ml",
    color: "bg-amber-400",
  },
  {
    name: "Fitri N.",
    location: "Yogyakarta",
    action: "Kerjasama Brand",
    product: "Lip Serum & Lip Balm",
    color: "bg-fuchsia-400",
  },
  {
    name: "Hendra L.",
    location: "Semarang",
    action: "Order Maklon",
    product: "Eye Cream Anti-Aging",
    color: "bg-cyan-400",
  },
  {
    name: "Yuni M.",
    location: "Depok",
    action: "Maklon Parfum",
    product: "Parfum Extrait 30ml",
    color: "bg-violet-400",
  },
  {
    name: "Doni R.",
    location: "Bogor",
    action: "Konsultasi Produk",
    product: "Hair Serum & Hair Mask",
    color: "bg-teal-400",
  },
  {
    name: "Lestari A.",
    location: "Palembang",
    action: "Order Maklon",
    product: "BB Cream SPF 30",
    color: "bg-orange-400",
  },
  {
    name: "Fajar T.",
    location: "Malang",
    action: "Kerjasama Maklon",
    product: "Men Skincare Series",
    color: "bg-sky-400",
  },
]

function getRandomInterval() {
  return Math.floor(Math.random() * 4000) + 5000
}

function getInitials(name: string) {
  return name.replace(".", "").trim().slice(0, 2).toUpperCase()
}

function timeAgo() {
  const mins = [1, 2, 3, 5, 7, 10, 12, 15]
  return `${mins[Math.floor(Math.random() * mins.length)]} menit lalu`
}

export function SocialProofToast() {
  const [current, setCurrent] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [ago, setAgo] = useState("")

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    function showNext() {
      const idx = Math.floor(Math.random() * notifications.length)
      setCurrent(idx)
      setAgo(timeAgo())
      setVisible(true)

      hideTimer = setTimeout(() => {
        setVisible(false)
        showTimer = setTimeout(showNext, getRandomInterval())
      }, 4500)
    }

    showTimer = setTimeout(showNext, 3000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  const notif = current !== null ? notifications[current] : null

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-4 z-40"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {visible && notif && (
          <motion.div
            key={current}
            initial={{ opacity: 0, x: -16, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-[210px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.09)]"
          >
            {/* Top bar accent */}
            <div className="from-gold-warm to-gold-deep h-0.5 w-full bg-gradient-to-r" />

            <div className="flex items-center gap-2.5 px-3 py-2.5">
              {/* Avatar */}
              <div
                className={`h-8 w-8 flex-shrink-0 rounded-full ${notif.color} flex items-center justify-center`}
              >
                <span className="text-[10px] font-bold tracking-wide text-white">
                  {getInitials(notif.name)}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-1">
                  <p className="text-ink-900 truncate text-[11px] font-bold">
                    {notif.name}
                    <span className="text-ink-500 font-normal"> dari {notif.location}</span>
                  </p>
                </div>
                <p className="text-gold-deep truncate text-[10px] leading-tight font-semibold">
                  {notif.action}
                </p>
                <p className="text-ink-500 truncate text-[10px] leading-tight">{notif.product}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 px-3 pb-2">
              <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-ink-300 text-[9px]">{ago}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
