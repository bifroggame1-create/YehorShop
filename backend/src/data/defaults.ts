// Default products and promo codes for initial seeding
// This data is only used when MongoDB is empty

export const defaultProducts = [
  {
    _id: '1',
    name: 'ChatGPT Plus',
    price: 1790,
    images: ['/brands/openai.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '8588913643', name: 'Teddy', avatar: '/default-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 CHATGPT PLUS:
➖ GPT-4o — флагманская модель 🔥
➖ GPT-4 Turbo с Vision
➖ DALL-E 3 для генерации изображений
➖ Приоритетный доступ 24/7
➖ Плагины и Code Interpreter`,
    inStock: true,
    createdAt: '2025-12-26T02:30:00',
    deliveryType: 'auto',
    variants: [
      { id: 'gpt-1m', name: 'Plus (1 месяц)', price: 1790, period: '1 месяц', features: ['GPT-4o', 'DALL-E 3', 'Плагины'] },
      { id: 'gpt-3m', name: 'Plus (3 месяца)', price: 4990, period: '3 месяца', features: ['GPT-4o', 'DALL-E 3', 'Экономия 7%'] },
    ]
  },
  {
    _id: '2',
    name: 'SuperGrok Premium',
    price: 1490,
    images: ['/brands/grok.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '8588913643', name: 'Teddy', avatar: '/default-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 SUPERGROK PREMIUM:
➖ Grok-2 — мощный ИИ от xAI 🔥
➖ Без цензуры и ограничений
➖ Доступ к X (Twitter) данным
➖ Генерация изображений
➖ Приоритетная скорость`,
    inStock: true,
    createdAt: '2025-12-26T02:49:00',
    deliveryType: 'auto',
    variants: [
      { id: 'grok-1m', name: 'Premium (1 месяц)', price: 1490, period: '1 месяц', features: ['Grok-2', 'Без цензуры', 'X данные'] },
      { id: 'grok-3m', name: 'Premium (3 месяца)', price: 3990, period: '3 месяца', features: ['Grok-2', 'Без цензуры', 'Экономия 11%'] },
    ]
  },
  {
    _id: '3',
    name: 'Cursor PRO',
    price: 1990,
    images: ['/brands/cursor.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '8588913643', name: 'Teddy', avatar: '/default-avatar.png', rating: 5.0 },
    rating: 4.9,
    description: `🟢 CURSOR PRO:
➖ AI-редактор кода #1 🔥
➖ GPT-4 и Claude встроены
➖ Автодополнение кода
➖ Чат с кодовой базой
➖ Рефакторинг одной командой`,
    inStock: true,
    createdAt: '2025-12-26T09:30:00',
    deliveryType: 'auto',
    variants: [
      { id: 'cursor-1m', name: 'PRO (1 месяц)', price: 1990, period: '1 месяц', features: ['GPT-4', 'Claude', 'Автодополнение'] },
      { id: 'cursor-3m', name: 'PRO (3 месяца)', price: 5490, period: '3 месяца', features: ['GPT-4', 'Claude', 'Экономия 8%'] },
    ]
  },
  {
    _id: '4',
    name: 'Suno PRO',
    price: 990,
    images: ['/brands/suno.webp'],
    condition: 'new',
    category: 'ai-subscriptions',
    seller: { id: '8588913643', name: 'Teddy', avatar: '/default-avatar.png', rating: 5.0 },
    rating: 4.8,
    description: `🟢 SUNO PRO:
➖ Генерация музыки ИИ 🔥
➖ Неограниченные треки
➖ Коммерческое использование
➖ Приоритетная генерация
➖ Высокое качество звука`,
    inStock: true,
    createdAt: '2025-12-26T10:00:00',
    deliveryType: 'auto',
    variants: [
      { id: 'suno-1m', name: 'PRO (1 месяц)', price: 990, period: '1 месяц', features: ['Безлимит', 'Коммерция', 'HD'] },
      { id: 'suno-3m', name: 'PRO (3 месяца)', price: 2490, period: '3 месяца', features: ['Безлимит', 'Коммерция', 'Экономия 16%'] },
    ]
  },
]

export const defaultPromoCodes = [
  {
    code: 'WELCOME10',
    discountType: 'percentage' as const,
    discountValue: 10,
    minOrderAmount: 500,
    maxUses: 1000,
    usedCount: 0,
    isActive: true,
    description: 'Скидка 10% на первый заказ от 500₽',
    createdAt: new Date().toISOString()
  },
  {
    code: 'YEHOR20',
    discountType: 'percentage' as const,
    discountValue: 20,
    minOrderAmount: 2000,
    maxUses: 500,
    usedCount: 0,
    isActive: true,
    description: 'Скидка 20% на заказ от 2000₽',
    createdAt: new Date().toISOString()
  },
]
