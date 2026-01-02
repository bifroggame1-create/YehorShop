// Translation system
export const translations = {
  ru: {
    // Header
    support: 'Поддержка',
    chats: 'Чаты',

    // Search
    searchPlaceholder: 'Поиск: Claude, GPT, Клауд...',
    catalog: 'Каталог',

    // Product Card
    buy: 'Купить',
    guarantee: 'Гарантия',

    // Categories
    all: 'Все',
    ai: 'AI сервисы',
    vpn: 'VLESS + Shadowsocks',
    streaming: 'Стриминг',
    gaming: 'Игры',
    software: 'Софт',
    other: 'Другое',

    // Filters
    new: 'Новое',
    used: 'Б/У',

    // Profile
    profile: 'Профиль',
    favorites: 'Избранное',
    myProducts: 'Мои товары',
    balance: 'Баланс',
    referrals: 'Рефералы',
    settings: 'Настройки',
    logout: 'Выйти',

    // Common
    seller: 'Продавец',
    contactSeller: 'Связаться с продавцом',
    description: 'Описание',
    reviews: 'Отзывы',

    // Settings Modal
    settingsTitle: 'Настройки',
    language: 'Язык',
    currency: 'Валюта',

    // Main page
    forYou: 'Специально для тебя',
    noProducts: 'Товары не найдены',

    // Checkout
    checkout: 'Оформление заказа',
    totalPrice: 'Итого',
    pay: 'Оплатить',
    yourOrder: 'Ваш заказ',
    promoCode: 'Промокод',
    enterPromo: 'Введите промокод',
    apply: 'Применить',
    discount: 'Скидка',
    bonusBalance: 'Бонусный баланс',
    available: 'Доступно',
    canUse: 'Можно использовать до',
    forThisOrder: 'для этого заказа',
    paymentMethod: 'Способ оплаты',
    selectCrypto: 'Выберите криптовалюту',
    productPrice: 'Цена товара',
    promoDiscount: 'Скидка по промокоду',
    total: 'Итого',
    proceedToPayment: 'Перейти к оплате',
    securePayment: 'Безопасная оплата через защищённое соединение',
    qrCodeSBP: 'QR код СБП',
    fastPaymentSystem: 'Система быстрых платежей',
    bankCard: 'Банковская карта',
  },
  en: {
    // Header
    support: 'Support',
    chats: 'Chats',

    // Search
    searchPlaceholder: 'Search: Claude, GPT, ChatGPT...',
    catalog: 'Catalog',

    // Product Card
    buy: 'Buy',
    guarantee: 'Warranty',

    // Categories
    all: 'All',
    ai: 'AI Services',
    vpn: 'VLESS + Shadowsocks',
    streaming: 'Streaming',
    gaming: 'Games',
    software: 'Software',
    other: 'Other',

    // Filters
    new: 'New',
    used: 'Used',

    // Profile
    profile: 'Profile',
    favorites: 'Favorites',
    myProducts: 'My Products',
    balance: 'Balance',
    referrals: 'Referrals',
    settings: 'Settings',
    logout: 'Logout',

    // Common
    seller: 'Seller',
    contactSeller: 'Contact Seller',
    description: 'Description',
    reviews: 'Reviews',

    // Settings Modal
    settingsTitle: 'Settings',
    language: 'Language',
    currency: 'Currency',

    // Main page
    forYou: 'For You',
    noProducts: 'No products found',

    // Checkout
    checkout: 'Checkout',
    totalPrice: 'Total',
    pay: 'Pay',
    yourOrder: 'Your Order',
    promoCode: 'Promo Code',
    enterPromo: 'Enter promo code',
    apply: 'Apply',
    discount: 'Discount',
    bonusBalance: 'Bonus Balance',
    available: 'Available',
    canUse: 'Can use up to',
    forThisOrder: 'for this order',
    paymentMethod: 'Payment Method',
    selectCrypto: 'Select cryptocurrency',
    productPrice: 'Product Price',
    promoDiscount: 'Promo Discount',
    total: 'Total',
    proceedToPayment: 'Proceed to Payment',
    securePayment: 'Secure payment via encrypted connection',
    qrCodeSBP: 'QR Code SBP',
    fastPaymentSystem: 'Fast Payment System',
    bankCard: 'Bank Card',
  }
}

export type TranslationKey = keyof typeof translations.ru
export type Language = 'ru' | 'en'

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.ru[key]
}
