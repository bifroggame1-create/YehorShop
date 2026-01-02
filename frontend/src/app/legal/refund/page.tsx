'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function RefundPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      <Header
        title="Возврат и отмена"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none text-light-text dark:text-dark-text">
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-6">
            Дата публикации: 01.01.2025 | Версия: 1.0
          </p>

          {/* Important Notice */}
          <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-accent-cyan mb-2">Важная информация</p>
            <p className="text-sm text-light-text dark:text-dark-text">
              Платформа Yehor Shop предоставляет цифровые товары. В соответствии со статьёй 26.1 Закона РФ «О защите прав потребителей», возврат цифровых товаров надлежащего качества не производится. Однако мы предоставляем защиту покупателей через систему эскроу и споров.
            </p>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3">1. Общие положения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            1.1. Настоящий документ определяет условия и порядок возврата денежных средств за цифровые товары, приобретённые на платформе Yehor Shop.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.2. Все сделки на Платформе защищены механизмом эскроу: средства покупателя удерживаются до подтверждения успешной доставки товара.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Когда возврат ВОЗМОЖЕН</h2>
          <p className="mb-4 text-sm leading-relaxed">
            2.1. Полный возврат средств производится в следующих случаях:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-2">
            <li>
              <strong>Товар не доставлен</strong> — если в течение установленного срока (до 30 минут для ручной доставки) товар не был доставлен
            </li>
            <li>
              <strong>Товар не соответствует описанию</strong> — если доставленный товар существенно отличается от заявленных характеристик
            </li>
            <li>
              <strong>Товар неработоспособен</strong> — если ключ активации, код или иной цифровой продукт не работает
            </li>
            <li>
              <strong>Товар уже использован</strong> — если доставленный ключ или код был ранее активирован другим пользователем
            </li>
            <li>
              <strong>Технический сбой</strong> — если из-за ошибки Платформы покупка не была завершена корректно
            </li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Когда возврат НЕ производится</h2>
          <p className="mb-4 text-sm leading-relaxed">
            3.1. Возврат средств не производится в следующих случаях:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-2">
            <li>
              <strong>Товар успешно доставлен и работает</strong> — если цифровой товар соответствует описанию и функционирует
            </li>
            <li>
              <strong>Пропущен срок открытия спора</strong> — если покупатель не открыл спор в течение 24 часов с момента доставки
            </li>
            <li>
              <strong>Изменение решения</strong> — если покупатель передумал после получения работающего товара
            </li>
            <li>
              <strong>Несовместимость</strong> — если товар не подходит для устройства или региона покупателя (при условии, что это было указано в описании)
            </li>
            <li>
              <strong>Спор решён в пользу продавца</strong> — если по результатам рассмотрения спора решение принято в пользу продавца
            </li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Порядок возврата</h2>
          <p className="mb-4 text-sm leading-relaxed">
            4.1. Для получения возврата необходимо:
          </p>
          <ol className="list-decimal pl-6 mb-4 text-sm space-y-2">
            <li>
              <strong>Открыть спор</strong> — в течение 24 часов с момента доставки товара через интерфейс Платформы
            </li>
            <li>
              <strong>Описать проблему</strong> — указать причину спора и предоставить доказательства (скриншоты, видео)
            </li>
            <li>
              <strong>Дождаться рассмотрения</strong> — администрация рассмотрит спор в течение 72 часов
            </li>
            <li>
              <strong>Получить решение</strong> — при положительном решении средства будут возвращены
            </li>
          </ol>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Сроки возврата</h2>
          <p className="mb-4 text-sm leading-relaxed">
            5.1. Сроки обработки возврата:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Рассмотрение спора: до 72 часов</li>
            <li>Возврат средств при положительном решении: до 5 рабочих дней</li>
            <li>Зачисление на счёт зависит от платёжной системы</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            5.2. Возврат производится тем же способом, которым была произведена оплата.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Отмена заказа</h2>
          <p className="mb-4 text-sm leading-relaxed">
            6.1. Отмена заказа возможна:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>До момента доставки товара — автоматический возврат средств</li>
            <li>Если продавец не подтвердил заказ в течение установленного времени</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            6.2. После доставки товара отмена заказа невозможна. Для решения проблем используйте систему споров.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Особенности цифровых товаров</h2>
          <p className="mb-4 text-sm leading-relaxed">
            7.1. Цифровые товары имеют следующие особенности:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Мгновенная доставка — товар доставляется сразу после оплаты (автоматическая доставка) или в течение установленного времени (ручная доставка)</li>
            <li>Невозможность возврата использованного товара — после активации ключа или кода возврат невозможен</li>
            <li>Проверка перед использованием — рекомендуется проверить товар до активации</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Защита покупателя</h2>
          <p className="mb-4 text-sm leading-relaxed">
            8.1. Платформа обеспечивает защиту покупателей через:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Систему эскроу — средства защищены до подтверждения доставки</li>
            <li>Период защиты — 24 часа для открытия спора</li>
            <li>Независимое рассмотрение — администрация объективно оценивает доказательства обеих сторон</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">9. Контакты</h2>
          <p className="mb-4 text-sm leading-relaxed">
            9.1. По вопросам возврата обращайтесь:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Через систему споров на Платформе (приоритетный способ)</li>
            <li>Telegram: @teddyxsup</li>
            <li>Email: support@yehorshop.com</li>
          </ul>

          <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Совершая покупку на Платформе, вы подтверждаете, что ознакомились и согласны с условиями возврата.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
