'use client'

import { useAppStore } from '@/lib/store'

const popularServices = [
  { id: 'gaming', name: 'Steam пополнение', image: '/brands/steam.webp' },
  { id: 'gaming', name: 'PlayStation Store', image: '/brands/Platstation.webp' },
  { id: 'gaming', name: 'Xbox / Microsoft Store', image: '/brands/xbox.webp' },
  { id: 'streaming', name: 'App Store & iTunes', image: '/brands/apple.webp' },
  { id: 'ai-subscriptions', name: 'Claude AI', image: '/brands/claude.webp' },
  { id: 'ai-subscriptions', name: 'ChatGPT', image: '/brands/openai.webp' },
  { id: 'streaming', name: 'Spotify', image: '/brands/spotify.webp' },
  { id: 'vpn', name: 'VLESS конфиг', image: '/brands/nord.webp' },
  { id: 'software', name: 'Adobe', image: '/brands/adobe.webp' },
  { id: 'ai-subscriptions', name: 'Gemini', image: '/brands/gemini.webp' },
]

export default function PopularServices() {
  const { setSelectedCategory } = useAppStore()

  const handleServiceClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    // Scroll to products section
    const productsSection = document.getElementById('products-section')
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">
        Популярное
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {popularServices.map((service) => (
          <button
            key={`${service.id}-${service.name}`}
            onClick={() => handleServiceClick(service.id)}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative bg-cover bg-center shadow-md hover:shadow-lg transition-all"
              style={{ backgroundImage: `url(${service.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <span className="text-xs text-center text-light-text dark:text-dark-text font-medium line-clamp-2">
              {service.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
