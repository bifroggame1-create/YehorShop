'use client'

import { useEffect, useRef } from 'react'

interface FireworkParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  type: 'ray' | 'star'
  rotation: number
  rotationSpeed: number
}

export default function AnimatedTreeLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<FireworkParticle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 96
    const height = 105
    canvas.width = width
    canvas.height = height

    // Салют из звезды (оптимизировано для избежания конфликтов со снегом)
    const MAX_PARTICLES = 30  // лимит частиц для производительности

    const spawnFirework = () => {
      // Не спавнить если уже много частиц
      if (particlesRef.current.length > MAX_PARTICLES) return

      const cx = 48  // центр (позиция звезды)
      const cy = 42  // позиция звезды
      const count = 6 + Math.random() * 4  // меньше частиц

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const speed = 1 + Math.random() * 0.8  // медленнее
        const isRay = Math.random() > 0.5

        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.8,  // короче живут
          size: isRay ? 6 : 3,  // меньше
          type: isRay ? 'ray' : 'star',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2
        })
      }
    }

    // Рисуем звёздочку
    const drawStar = (x: number, y: number, size: number, rotation: number, opacity: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2
        const outerX = Math.cos(angle) * size
        const outerY = Math.sin(angle) * size
        const innerAngle = angle + Math.PI / 5
        const innerX = Math.cos(innerAngle) * (size * 0.4)
        const innerY = Math.sin(innerAngle) * (size * 0.4)

        if (i === 0) {
          ctx.moveTo(outerX, outerY)
        } else {
          ctx.lineTo(outerX, outerY)
        }
        ctx.lineTo(innerX, innerY)
      }
      ctx.closePath()
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(opacity * 1.5, 1)})`  // Золотой яркий
      ctx.fill()
      ctx.restore()
    }

    // Рисуем луч
    const drawRay = (x: number, y: number, size: number, rotation: number, opacity: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)

      const gradient = ctx.createLinearGradient(0, -size/2, 0, size/2)
      const brightOpacity = Math.min(opacity * 1.5, 1)
      gradient.addColorStop(0, `rgba(180, 60, 255, 0)`)  // Ярче фиолетовый
      gradient.addColorStop(0.5, `rgba(180, 60, 255, ${brightOpacity})`)
      gradient.addColorStop(1, `rgba(180, 60, 255, 0)`)

      ctx.beginPath()
      ctx.ellipse(0, 0, 1.5, size, 0, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()
    }

    const update = () => {
      ctx.clearRect(0, 0, width, height)

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.015
        p.life -= 0.03  // быстрее угасают
        p.rotation += p.rotationSpeed

        if (p.type === 'star') {
          drawStar(p.x, p.y, p.size * p.life, p.rotation, p.life)
        } else {
          drawRay(p.x, p.y, p.size * p.life, p.rotation, p.life)
        }

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1)
        }
      }

      animationRef.current = requestAnimationFrame(update)
    }

    const fireworkInterval = setInterval(() => {
      spawnFirework()
    }, 2500 + Math.random() * 1500)  // реже, чтобы не конфликтовать со снегом

    update()

    return () => {
      clearInterval(fireworkInterval)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div className="logo-wrap">
      {/* Canvas для салюта */}
      <canvas ref={canvasRef} className="effect-canvas" />

      {/* Ёлка */}
      <div className="tonplay-logo">
        {/* STAR */}
        <svg className="tp-star" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M7.58789 1.48633C7.7865 1.19667 8.2135 1.19667 8.41211 1.48633L10.208 4.10645C10.403 4.39088 10.6907 4.59975 11.0215 4.69727L14.0674 5.59473C14.4043 5.69403 14.5362 6.10048 14.3223 6.37891L12.3857 8.89648C12.1753 9.16993 12.0657 9.50765 12.0752 9.85254L12.1621 13.0273C12.1718 13.3785 11.8261 13.6294 11.4951 13.5117L8.50293 12.4482C8.17785 12.3326 7.82215 12.3326 7.49707 12.4482L4.50488 13.5117C4.17389 13.6294 3.82825 13.3785 3.83789 13.0273L3.9248 9.85254C3.93429 9.50765 3.82465 9.16993 3.61426 8.89648L1.67773 6.37891C1.46376 6.10048 1.59574 5.69403 1.93262 5.59473L4.97852 4.69727C5.30933 4.59975 5.59695 4.39088 5.79199 4.10645L7.58789 1.48633Z"
                fill="#FF2B00" stroke="#B40300"/>
        </svg>

        {/* TOP */}
        <svg className="tp-top" xmlns="http://www.w3.org/2000/svg" width="21" height="17" viewBox="0 0 21 17" fill="none">
          <path d="M6.87821 12.8423L6.88905 10.5754L5.40274 11.8148C3.97629 13.0031 1.88708 12.7844 0.736074 11.3264C-0.414985 9.86824 -0.191575 7.72307 1.23488 6.53457L8.15823 0.765969L8.39367 0.586276C9.6005 -0.251407 11.2114 -0.191334 12.3514 0.765969L19.2195 6.53457C20.6346 7.72307 20.8375 9.86824 19.6725 11.3264C18.5075 12.7844 16.4162 13.0031 15.0011 11.8148L13.5267 10.5754L13.5158 12.8423C13.5068 14.7234 12.0136 16.2484 10.1807 16.2484C8.34778 16.2484 6.86921 14.7234 6.87821 12.8423Z"
                fill="url(#gtop)"/>
          <defs>
            <linearGradient id="gtop" x1="10.2798" y1="-4.45741" x2="10.2798" y2="12.8423">
              <stop stopColor="#EFFF00"/><stop offset="1" stopColor="#76ED08"/>
            </linearGradient>
          </defs>
        </svg>

        {/* MID */}
        <svg className="tp-mid" xmlns="http://www.w3.org/2000/svg" width="25" height="20" viewBox="0 0 25 20" fill="none">
          <path d="M8.03251 15.1526L8.03701 13.8824L7.14867 14.5975C5.22117 16.1466 2.43971 15.8041 0.936168 13.8329C-0.567303 11.8615 -0.223221 9.00741 1.70422 7.458L9.77466 0.970262L10.0831 0.74341C11.6636 -0.318372 13.7437 -0.242801 15.2444 0.970262L23.2689 7.458C25.1853 9.00741 25.5092 11.8615 23.9917 13.8329C22.4742 15.8041 19.6903 16.1466 17.7738 14.5975L16.8905 13.8824L16.886 15.1526C16.8772 17.66 14.8878 19.693 12.4432 19.693C9.99855 19.693 8.02362 17.66 8.03251 15.1526Z"
                fill="url(#gmid)"/>
          <defs>
            <linearGradient id="gmid" x1="12.4969" y1="4.54002" x2="12.4969" y2="15.1526">
              <stop stopColor="#74E20F"/><stop offset="1" stopColor="#43A203"/>
            </linearGradient>
          </defs>
        </svg>

        {/* BOTTOM */}
        <svg className="tp-bottom" xmlns="http://www.w3.org/2000/svg" width="30" height="21" viewBox="0 0 30 21" fill="none">
          <path d="M10.3505 15.3747V13.2635L7.0745 15.3171C4.88374 16.6897 2.02234 15.9821 0.683119 13.7366C-0.656138 11.491 0.0342853 8.55815 2.22509 7.18541L12.5753 0.699853L12.8583 0.535239C14.296 -0.229826 16.0292 -0.174494 17.4247 0.699853L27.7749 7.18541C29.9657 8.55815 30.6561 11.491 29.3169 13.7366C27.9777 15.9821 25.1163 16.6897 22.9255 15.3171L19.6495 13.2635V15.3747C19.6495 18.0066 17.5677 20.1404 15 20.1404C12.4323 20.1404 10.3505 18.0066 10.3505 15.3747Z"
                fill="url(#gbot)"/>
          <defs>
            <linearGradient id="gbot" x1="15" y1="4.7657" x2="15" y2="15.3747">
              <stop stopColor="#19B500"/><stop offset="1" stopColor="#217201"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style jsx>{`
        .logo-wrap {
          position: relative;
          width: 26px;
          height: 35px;
          transform: scale(0.9);
        }

        .effect-canvas {
          position: absolute;
          inset: -35px;
          pointer-events: none;
          z-index: 1;
        }

        .tonplay-logo {
          position: relative;
          z-index: 2;
          width: 26px;
          height: 35px;
        }

        .tonplay-logo :global(svg) {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .tp-star {
          top: 0;
          z-index: 10;
          animation: starRotate 2s linear infinite;
          transform-origin: 50% 50%;
        }

        .tp-top {
          top: 6px;
          z-index: 3;
          transform-origin: center top;
          animation: swing 2.4s ease-in-out infinite;
        }

        .tp-mid {
          top: 14px;
          z-index: 2;
          transform-origin: center top;
          animation: swing 2.4s ease-in-out 0.2s infinite;
        }

        .tp-bottom {
          top: 24px;
          z-index: 1;
        }

        @keyframes swing {
          0% { transform: translateX(-50%) rotate(0deg); }
          50% { transform: translateX(-50%) rotate(3deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }

        @keyframes starRotate {
          from { transform: translateX(-50%) rotate(0deg); }
          to   { transform: translateX(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
