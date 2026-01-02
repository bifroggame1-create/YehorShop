// Transliteration map: Russian -> English
const RU_TO_EN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

const EN_TO_RU: Record<string, string> = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
  'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л',
  'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с',
  't': 'т', 'u': 'у', 'f': 'ф', 'h': 'х', 'ts': 'ц', 'ch': 'ч',
  'sh': 'ш', 'sch': 'щ', 'yu': 'ю', 'ya': 'я'
}

// Common brand name translations
const BRAND_TRANSLATIONS: Record<string, string[]> = {
  'claude': ['клод', 'клауд', 'клод'],
  'chatgpt': ['чатгпт', 'чат гпт', 'chatgpt'],
  'openai': ['опенаи', 'опен аи', 'openai'],
  'microsoft': ['майкрософт', 'микрософт', 'майкрасофт'],
  'github': ['гитхаб', 'гит хаб', 'github'],
  'google': ['гугл', 'гугл', 'google'],
  'gemini': ['джемини', 'гемини', 'gemini'],
  'midjourney': ['миджорни', 'мидджорни', 'midjourney'],
  'spotify': ['спотифай', 'spotify'],
  'netflix': ['нетфликс', 'netflix'],
  'discord': ['дискорд', 'discord'],
  'youtube': ['ютуб', 'ютьюб', 'youtube'],
  'adobe': ['адоб', 'адобе', 'adobe'],
  'vless': ['влесс', 'vless'],
  'shadowsocks': ['шадоусокс', 'shadowsocks'],
  'copilot': ['копилот', 'copilot'],
  'roblox': ['роблокс', 'roblox']
}

// Transliterate Russian to English
export function transliterateRuToEn(text: string): string {
  return text.toLowerCase().split('').map(char => RU_TO_EN[char] || char).join('')
}

// Transliterate English to Russian
export function transliterateEnToRu(text: string): string {
  let result = text.toLowerCase()
  // Replace multi-character combinations first
  Object.entries(EN_TO_RU).sort((a, b) => b[0].length - a[0].length).forEach(([en, ru]) => {
    result = result.replace(new RegExp(en, 'g'), ru)
  })
  return result
}

// Get all possible variants of a search query
export function getSearchVariants(query: string): string[] {
  const variants = new Set<string>()
  const normalized = query.toLowerCase().trim()

  variants.add(normalized)

  // Add transliterated variant
  const hasRussian = /[а-яё]/i.test(normalized)
  const hasEnglish = /[a-z]/i.test(normalized)

  if (hasRussian) {
    variants.add(transliterateRuToEn(normalized))
  }
  if (hasEnglish) {
    variants.add(transliterateEnToRu(normalized))
  }

  // Add brand translation variants
  for (const [brand, translations] of Object.entries(BRAND_TRANSLATIONS)) {
    for (const translation of translations) {
      if (normalized.includes(translation)) {
        variants.add(normalized.replace(translation, brand))
      }
      if (normalized.includes(brand)) {
        translations.forEach(t => variants.add(normalized.replace(brand, t)))
      }
    }
  }

  return Array.from(variants)
}

// Enhanced search function
export function searchProducts(products: any[], query: string): any[] {
  if (!query || !query.trim()) return products

  const variants = getSearchVariants(query)

  return products.filter(product => {
    const searchText = `${product.name} ${product.description} ${product.category}`.toLowerCase()

    // Check if any variant matches
    return variants.some(variant => searchText.includes(variant))
  })
}

// Get search suggestions
export function getSearchSuggestions(products: any[], query: string, limit: number = 5): string[] {
  if (!query || query.length < 2) return []

  const variants = getSearchVariants(query)
  const suggestions = new Set<string>()

  products.forEach(product => {
    const productName = product.name.toLowerCase()

    // Check if product name starts with or contains any variant
    variants.forEach(variant => {
      if (productName.includes(variant)) {
        suggestions.add(product.name)
      }
    })
  })

  return Array.from(suggestions).slice(0, limit)
}
