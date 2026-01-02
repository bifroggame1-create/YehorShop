'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  isVisible: boolean
  show: (message: string, type?: 'success' | 'error' | 'info') => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: '',
  type: 'success',
  isVisible: false,
  show: (message, type = 'success') => {
    set({ message, type, isVisible: true })
    // Auto hide after 3 seconds
    setTimeout(() => {
      set({ isVisible: false })
    }, 3000)
  },
  hide: () => set({ isVisible: false })
}))

export default function Toast() {
  const { message, type, isVisible, hide } = useToast()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!isAnimating && !isVisible) return null

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-accent-cyan'
  }[type]

  const icon = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }[type]

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}
        onClick={hide}
      >
        {icon}
        <span className="flex-1 font-medium">{message}</span>
        <button onClick={hide} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
