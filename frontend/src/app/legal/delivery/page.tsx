'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function DeliveryPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      <Header
        title="Условия доставки"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none text-light-text dark:text-dark-text">
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-6">
            Дата публикации: 01.01.2025 | Версия: 1.0
          </p>

          {/* Key Info */}
          <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-accent-cyan mb-2">Только цифровая доставка</p>
            <p className="text-sm text-light-text dark:text-dark-text">
              Платформа Yehor Shop осуществляет доставку исключительно цифровых товаров. Физическая доставка не предусмотрена. Все товары доставляются в электронном виде через Telegram.
            </p>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3">1. Общие положения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            1.1. Настоящий документ определяет условия и порядок доставки цифровых товаров, приобретённых на платформе Yehor Shop.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.2. Все товары на Платформе являются цифровыми и доставляются в электронном виде.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.3. Физическая доставка товаров не осуществляется.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Способы доставки</h2>
          <p className="mb-4 text-sm leading-relaxed">
            2.1. На Платформе используются два способа доставки цифровых товаров:
          </p>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-light-text dark:text-dark-text">Автоматическая доставка</span>
            </div>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Товар доставляется мгновенно после подтверждения оплаты</li>
              <li>Доставка осуществляется автоматически системой без участия продавца</li>
              <li>Время доставки: от нескольких секунд до 1 минуты</li>
              <li>Товары с автоматической доставкой отмечены значком ⚡</li>
            </ul>
          </div>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 mb-4 border border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⏳</span>
              <span className="font-bold text-light-text dark:text-dark-text">Ручная доставка</span>
            </div>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li>Товар доставляется продавцом вручную</li>
              <li>Максимальное время доставки: до 30 минут</li>
              <li>Продавец получает уведомление о заказе и отправляет товар</li>
              <li>Если товар не доставлен в срок — автоматический возврат средств</li>
            </ul>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Канал доставки</h2>
          <p className="mb-4 text-sm leading-relaxed">
            3.1. Цифровые товары доставляются через Telegram:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>В личный чат с ботом Платформы</li>
            <li>Или в чат с продавцом (при ручной доставке)</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            3.2. Для получения товара необходимо:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Иметь активный аккаунт Telegram</li>
            <li>Не блокировать бота Платформы</li>
            <li>Проверять входящие сообщения после оплаты</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Сроки доставки</h2>
          <p className="mb-4 text-sm leading-relaxed">
            4.1. Сроки доставки зависят от типа товара:
          </p>

          <table className="w-full text-sm mb-4 border-collapse">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                <th className="text-left py-2 font-medium">Тип доставки</th>
                <th className="text-left py-2 font-medium">Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-light-border dark:border-dark-border">
                <td className="py-2">Автоматическая</td>
                <td className="py-2">Мгновенно (до 1 минуты)</td>
              </tr>
              <tr className="border-b border-light-border dark:border-dark-border">
                <td className="py-2">Ручная</td>
                <td className="py-2">До 30 минут</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-4 text-sm leading-relaxed">
            4.2. Указанные сроки являются максимальными. В большинстве случаев доставка происходит быстрее.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Что доставляется</h2>
          <p className="mb-4 text-sm leading-relaxed">
            5.1. Примеры цифровых товаров на Платформе:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Ключи активации программного обеспечения</li>
            <li>Коды доступа к сервисам и подпискам</li>
            <li>Цифровой контент (инструкции, файлы, данные)</li>
            <li>Виртуальные товары для игр и приложений</li>
            <li>Иные нематериальные продукты</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Формат доставки</h2>
          <p className="mb-4 text-sm leading-relaxed">
            6.1. Товар может быть доставлен в виде:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Текстового сообщения с ключом или кодом</li>
            <li>Изображения с данными</li>
            <li>Файла (документ, архив)</li>
            <li>Ссылки для скачивания</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Подтверждение доставки</h2>
          <p className="mb-4 text-sm leading-relaxed">
            7.1. Доставка считается выполненной, когда:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Товар отправлен покупателю в Telegram</li>
            <li>Сообщение с товаром доставлено (статус «доставлено»)</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            7.2. После доставки начинается период защиты покупателя (24 часа), в течение которого можно открыть спор при проблемах с товаром.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Проблемы с доставкой</h2>
          <p className="mb-4 text-sm leading-relaxed">
            8.1. Если товар не доставлен в установленный срок:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Средства автоматически возвращаются покупателю</li>
            <li>Заказ отменяется</li>
            <li>Покупатель может оформить новый заказ</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            8.2. При других проблемах используйте систему споров или обратитесь в поддержку.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">9. Ограничения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            9.1. Платформа не осуществляет:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Физическую доставку товаров</li>
            <li>Доставку почтой или курьером</li>
            <li>Доставку в другие мессенджеры (только Telegram)</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">10. Контакты</h2>
          <p className="mb-4 text-sm leading-relaxed">
            10.1. По вопросам доставки обращайтесь:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Telegram: @teddyxsup</li>
            <li>Email: support@yehorshop.com</li>
          </ul>

          <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Совершая покупку на Платформе, вы подтверждаете, что ознакомились и согласны с условиями доставки цифровых товаров.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
