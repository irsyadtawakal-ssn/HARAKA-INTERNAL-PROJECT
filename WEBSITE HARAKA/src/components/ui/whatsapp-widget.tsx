"use client"

import Link from "next/link"
import { trackWhatsAppClick } from "@/lib/facebook-pixel"

export function WhatsAppWidget() {
  const waUrl =
    "https://wa.me/6283137030656?text=Hallo%20Admin%2C%20saya%20butuh%20info%20seputar%20maklon%20kosmetik%20di%20Haraka%20Erfi.%20Bisa%20bantu%3F"

  return (
    <div className="group fixed right-6 bottom-6 z-50 flex items-center">
      {/* Tooltip Label */}
      <span className="bg-cream-50 text-ink-900 border-border pointer-events-none mr-3 hidden translate-x-2 rounded-lg border px-3 py-1.5 font-mono text-xs tracking-wide uppercase opacity-0 shadow-md transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:inline-block">
        Tanya Admin Maklon
      </span>

      {/* Widget Button */}
      <Link
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick("whatsapp-widget")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-300 hover:scale-110 hover:bg-[#128C7E] active:scale-95"
        aria-label="Hubungi Haraka Erfi melalui WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.328 1.971 13.881 1.04 11.29 1.04c-5.408 0-9.803 4.364-9.807 9.795-.001 1.83.49 3.61 1.424 5.16l-.971 3.546 3.65-.947zm11.022-7.14c-.305-.152-1.803-.89-2.08-.99-.278-.101-.48-.152-.68.152-.2.303-.775.99-.95 1.189-.175.199-.35.224-.655.073-1.2-.6-2.083-1.03-2.923-2.47-.22-.38.22-.353.63-1.17.075-.152.038-.285-.019-.387-.057-.102-.48-1.157-.657-1.584-.173-.417-.365-.36-.5-.367-.13-.006-.279-.007-.428-.007-.15 0-.395.056-.602.285-.207.23-.79.773-.79 1.884 0 1.11.807 2.183.92 2.336.113.152 1.587 2.424 3.844 3.4c.537.232.957.37 1.283.474.54.172 1.03.147 1.416.09.43-.064 1.802-.738 2.053-1.452.25-.713.25-1.325.175-1.452-.075-.127-.278-.203-.583-.355z" />
        </svg>
      </Link>
    </div>
  )
}
