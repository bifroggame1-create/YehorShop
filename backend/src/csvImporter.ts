import { Product } from './database'
import { addProduct, loadSellers } from './dataStore'

// CSV column names (Russian and English)
const COLUMN_MAP: Record<string, keyof Product | 'sellerName'> = {
  // Russian
  'название': 'name',
  'цена': 'price',
  'старая_цена': 'oldPrice',
  'категория': 'category',
  'состояние': 'condition',
  'описание': 'description',
  'в_наличии': 'inStock',
  'изображения': 'images',
  'продавец': 'sellerName',
  'теги': 'tags',
  // English
  'name': 'name',
  'price': 'price',
  'old_price': 'oldPrice',
  'oldprice': 'oldPrice',
  'category': 'category',
  'condition': 'condition',
  'description': 'description',
  'in_stock': 'inStock',
  'instock': 'inStock',
  'images': 'images',
  'seller': 'sellerName',
  'tags': 'tags'
}

interface CSVImportResult {
  success: boolean
  imported: number
  errors: { row: number; error: string }[]
  products: Product[]
}

// Parse CSV string
function parseCSV(content: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',' || char === ';') {
        currentLine.push(currentField.trim())
        currentField = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentLine.push(currentField.trim())
        if (currentLine.some(f => f)) { // Skip empty lines
          lines.push(currentLine)
        }
        currentLine = []
        currentField = ''
        if (char === '\r') i++ // Skip \n after \r
      } else if (char !== '\r') {
        currentField += char
      }
    }
  }

  // Add last field and line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim())
    if (currentLine.some(f => f)) {
      lines.push(currentLine)
    }
  }

  return lines
}

// Parse value based on expected type
function parseValue(value: string, field: string): any {
  if (!value) return undefined

  switch (field) {
    case 'price':
    case 'oldPrice':
      const num = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'))
      return isNaN(num) ? undefined : num

    case 'inStock':
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'да' || value.toLowerCase() === 'yes'

    case 'condition':
      const cond = value.toLowerCase()
      if (cond === 'new' || cond === 'новый' || cond === 'новое') return 'new'
      if (cond === 'used' || cond === 'б/у' || cond === 'бу') return 'used'
      return 'new'

    case 'images':
    case 'tags':
      // Split by | or comma (if no |)
      if (value.includes('|')) {
        return value.split('|').map(s => s.trim()).filter(Boolean)
      }
      return value.split(',').map(s => s.trim()).filter(Boolean)

    default:
      return value
  }
}

// Import products from CSV
export async function importProductsFromCSV(csvContent: string, tenantId?: string): Promise<CSVImportResult> {
  const DEFAULT_TENANT_ID = tenantId || process.env.DEFAULT_TENANT_ID || 'yehorshop'
  const result: CSVImportResult = {
    success: true,
    imported: 0,
    errors: [],
    products: []
  }

  try {
    const lines = parseCSV(csvContent)

    if (lines.length < 2) {
      result.success = false
      result.errors.push({ row: 0, error: 'CSV должен содержать заголовок и хотя бы одну строку данных' })
      return result
    }

    // Parse header
    const header = lines[0].map(h => h.toLowerCase().trim())
    const columnIndices: Record<string, number> = {}

    header.forEach((col, idx) => {
      const mapped = COLUMN_MAP[col]
      if (mapped) {
        columnIndices[mapped] = idx
      }
    })

    // Check required fields
    if (columnIndices['name'] === undefined) {
      result.success = false
      result.errors.push({ row: 0, error: 'Отсутствует обязательная колонка: name/название' })
      return result
    }
    if (columnIndices['price'] === undefined) {
      result.success = false
      result.errors.push({ row: 0, error: 'Отсутствует обязательная колонка: price/цена' })
      return result
    }

    // Load sellers for matching
    const sellers = await loadSellers()
    const defaultSeller = sellers[0] || {
      id: 'default',
      name: 'Магазин',
      avatar: undefined,
      rating: 5
    }

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]
      const rowNum = i + 1

      try {
        const getValue = (field: string) => {
          const idx = columnIndices[field]
          return idx !== undefined && row[idx] ? parseValue(row[idx], field) : undefined
        }

        const name = getValue('name')
        const price = getValue('price')

        if (!name) {
          result.errors.push({ row: rowNum, error: 'Пустое название товара' })
          continue
        }
        if (!price || price <= 0) {
          result.errors.push({ row: rowNum, error: 'Некорректная цена' })
          continue
        }

        // Find seller
        const sellerName = getValue('sellerName')
        let seller = defaultSeller
        if (sellerName) {
          const found = sellers.find(s =>
            s.name.toLowerCase() === sellerName.toLowerCase()
          )
          if (found) {
            seller = found
          }
        }

        const product: Omit<Product, '_id'> = {
          tenantId: DEFAULT_TENANT_ID,
          name,
          price,
          oldPrice: getValue('oldPrice'),
          images: getValue('images') || [],
          condition: getValue('condition') || 'new',
          category: getValue('category') || 'Другое',
          description: getValue('description'),
          inStock: getValue('inStock') !== false,
          seller: {
            id: seller.id,
            name: seller.name,
            avatar: seller.avatar,
            rating: seller.rating
          },
          tags: getValue('tags'),
          deliveryType: 'manual',
          createdAt: new Date().toISOString()
        }

        const savedProduct = await addProduct(product)
        result.products.push(savedProduct)
        result.imported++

      } catch (error: any) {
        result.errors.push({ row: rowNum, error: error.message || 'Неизвестная ошибка' })
      }
    }

    result.success = result.imported > 0

  } catch (error: any) {
    result.success = false
    result.errors.push({ row: 0, error: `Ошибка парсинга CSV: ${error.message}` })
  }

  return result
}

// Generate CSV template
export function getCSVTemplate(): string {
  const headers = [
    'название',
    'цена',
    'старая_цена',
    'категория',
    'состояние',
    'описание',
    'в_наличии',
    'изображения',
    'продавец',
    'теги'
  ]

  const example = [
    'Пример товара',
    '1990',
    '2990',
    'Подписки',
    'новый',
    'Описание товара',
    'да',
    'https://example.com/img1.jpg|https://example.com/img2.jpg',
    'Магазин',
    'премиум|популярное'
  ]

  return headers.join(',') + '\n' + example.join(',')
}

console.log('[CSV] Importer module loaded')
