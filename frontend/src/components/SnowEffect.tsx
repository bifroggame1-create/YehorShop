'use client'

import { useEffect, useRef } from 'react'

interface Snowflake {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  wobble: number
  wobbleSpeed: number
}

interface SnowEffectProps {
  density?: number  // количество снежинок
  className?: string
}

export default function SnowEffect({ density = 50, className = '' }: SnowEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snowflakesRef = useRef<Snowflake[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      }
    }

    resize()
    window.addEventListener('resize', resize)

    // Создаём снежинку
    const createSnowflake = (): Snowflake => ({
      x: Math.random() * canvas.width,
      y: -10,
      size: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 1 + 0.5,
      opacity: Math.random() * 0.6 + 0.3,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.03 + 0.01
    })

    // Инициализация снежинок
    snowflakesRef.current = []
    for (let i = 0; i < density; i++) {
      const flake = createSnowflake()
      flake.y = Math.random() * canvas.height
      snowflakesRef.current.push(flake)
    }

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      snowflakesRef.current.forEach((flake, index) => {
        // Движение вниз
        flake.y += flake.speed
        // Покачивание
        flake.wobble += flake.wobbleSpeed
        flake.x += Math.sin(flake.wobble) * 0.5

        // Рисуем снежинку
        ctx.beginPath()
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`
        ctx.fill()

        // Перезапуск снежинки сверху
        if (flake.y > canvas.height + 10) {
          snowflakesRef.current[index] = createSnowflake()
        }
        // Если снежинка вылетела за границы по X
        if (flake.x < -10 || flake.x > canvas.width + 10) {
          snowflakesRef.current[index] = createSnowflake()
        }
      })

      animationRef.current = requestAnimationFrame(update)
    }

    update()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
