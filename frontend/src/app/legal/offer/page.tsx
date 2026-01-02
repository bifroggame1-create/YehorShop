'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function OfferPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      <Header
        title="Публичная оферта"
        showBack
        onBack={() => router.back()}
      />

      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none text-light-text dark:text-dark-text">
          <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm mb-6">
            Дата публикации: 01.01.2025 | Версия: 1.0
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">1. Общие положения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            1.1. Настоящий документ является публичной офертой (далее — «Оферта») и определяет условия использования платформы Yehor Shop (далее — «Платформа») для приобретения цифровых товаров.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.2. Платформа является посредником между продавцами цифровых товаров и покупателями. Платформа не является продавцом товаров и не несёт ответственности за качество товаров, предоставляемых продавцами.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.3. Совершая покупку на Платформе, Пользователь подтверждает своё согласие с условиями настоящей Оферты.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.4. Платформа оставляет за собой право изменять условия Оферты без предварительного уведомления. Актуальная версия всегда доступна на данной странице.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Термины и определения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            2.1. <strong>Платформа</strong> — сервис Yehor Shop, предоставляющий техническую возможность для совершения сделок между продавцами и покупателями цифровых товаров.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            2.2. <strong>Цифровой товар</strong> — любой нематериальный продукт, передаваемый в электронной форме: ключи активации, коды доступа, цифровой контент, подписки и иные цифровые продукты.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            2.3. <strong>Покупатель</strong> — физическое лицо, использующее Платформу для приобретения цифровых товаров.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            2.4. <strong>Продавец</strong> — физическое или юридическое лицо, размещающее цифровые товары для продажи на Платформе.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            2.5. <strong>Эскроу</strong> — механизм защиты сделки, при котором средства покупателя удерживаются Платформой до подтверждения успешной доставки товара.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Предмет оферты</h2>
          <p className="mb-4 text-sm leading-relaxed">
            3.1. Платформа предоставляет Пользователям техническую возможность:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Просматривать каталог цифровых товаров</li>
            <li>Совершать покупки цифровых товаров</li>
            <li>Получать цифровые товары через автоматическую или ручную доставку</li>
            <li>Открывать споры в случае проблем с товаром</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            3.2. Платформа выступает исключительно как посредник и не является стороной сделки купли-продажи между Покупателем и Продавцом.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Механизм эскроу и защита покупателя</h2>
          <p className="mb-4 text-sm leading-relaxed">
            4.1. При совершении покупки средства Покупателя поступают на эскроу-счёт Платформы.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            4.2. Средства переводятся Продавцу только после:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Успешной доставки товара Покупателю, и</li>
            <li>Истечения периода защиты (24 часа), в течение которого Покупатель не открыл спор</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            4.3. Если Покупатель открывает спор в течение периода защиты, средства удерживаются до разрешения спора.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Разрешение споров</h2>
          <p className="mb-4 text-sm leading-relaxed">
            5.1. Покупатель может открыть спор в течение 24 часов с момента доставки товара в следующих случаях:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Товар не был доставлен</li>
            <li>Доставленный товар не соответствует описанию</li>
            <li>Товар неработоспособен или недействителен</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            5.2. При открытии спора администрация Платформы рассматривает предоставленные доказательства и принимает решение в течение 72 часов.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            5.3. Решение администрации является окончательным в рамках Платформы.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Условия возврата средств</h2>
          <p className="mb-4 text-sm leading-relaxed">
            6.1. Возврат средств возможен в следующих случаях:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Товар не был доставлен в установленный срок</li>
            <li>По результатам рассмотрения спора решение принято в пользу Покупателя</li>
            <li>Техническая ошибка Платформы, повлекшая невозможность получения товара</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            6.2. Возврат средств не производится, если:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Товар успешно доставлен и соответствует описанию</li>
            <li>Покупатель не открыл спор в установленный срок</li>
            <li>Спор разрешён в пользу Продавца</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            6.3. Подробные условия возврата указаны в разделе «Возврат и отмена».
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Ограничение ответственности</h2>
          <p className="mb-4 text-sm leading-relaxed">
            7.1. Платформа не несёт ответственности за:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Качество и работоспособность цифровых товаров, предоставляемых Продавцами</li>
            <li>Действия или бездействие Продавцов</li>
            <li>Убытки, возникшие в результате использования приобретённых товаров</li>
            <li>Нарушение Продавцами прав третьих лиц</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            7.2. Ответственность Платформы в любом случае ограничена суммой комиссии, полученной за конкретную сделку.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Конфиденциальность</h2>
          <p className="mb-4 text-sm leading-relaxed">
            8.1. Обработка персональных данных осуществляется в соответствии с Политикой конфиденциальности, размещённой на Платформе.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">9. Заключительные положения</h2>
          <p className="mb-4 text-sm leading-relaxed">
            9.1. Настоящая Оферта вступает в силу с момента её акцепта Пользователем и действует до полного исполнения сторонами своих обязательств.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            9.2. Все споры, не урегулированные в рамках Платформы, подлежат разрешению в соответствии с применимым законодательством.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            9.3. Недействительность отдельных положений Оферты не влечёт недействительности остальных её положений.
          </p>

          <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              По вопросам, связанным с настоящей Офертой, обращайтесь в службу поддержки через раздел «Контакты».
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
