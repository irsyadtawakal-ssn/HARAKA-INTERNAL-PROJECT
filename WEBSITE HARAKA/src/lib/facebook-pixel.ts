declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

export const FB_PIXEL_ID = "4051059365186903"

export const pageview = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView")
  }
}

// Custom events for business tracking
export const trackLead = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead")
  }
}

export const trackContact = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Contact")
  }
}

export const trackInitiateCheckout = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout")
  }
}

export const trackCompleteRegistration = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "CompleteRegistration")
  }
}

// Custom event for WhatsApp clicks (important for lead tracking)
export const trackWhatsAppClick = (source?: string) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("trackCustom", "WhatsAppClick", {
      source: source || "unknown",
    })
  }
}
