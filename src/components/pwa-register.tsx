'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') {
      // A worker installed by an earlier build can serve stale dev CSS and JS.
      navigator.serviceWorker.getRegistration('/').then(reg => {
        if (reg?.active?.scriptURL === `${window.location.origin}/sw.js`) return reg.unregister()
      }).catch(err => console.warn('[PWA] Dev worker cleanup failed:', err))
      return
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW ready — send SKIP_WAITING so the new version activates on next reload
              newWorker.postMessage('SKIP_WAITING')
            }
          })
        })
      } catch (err) {
        // Silent — SW failure should not break the app
        console.warn('[PWA] Service worker registration failed:', err)
      }
    }

    // Register after the page is fully loaded to avoid blocking first paint
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
