'use client'

import Header from '@/components/Header'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg pb-8">
      <Header
        title="Политика конфиденциальности"
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
            1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей платформы Yehor Shop (далее — «Платформа»).
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.2. Используя Платформу, Пользователь выражает согласие с условиями настоящей Политики.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            1.3. Если Пользователь не согласен с условиями Политики, он должен прекратить использование Платформы.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Какие данные мы собираем</h2>
          <p className="mb-4 text-sm leading-relaxed">
            2.1. При использовании Платформы через Telegram мы получаем следующие данные:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Идентификатор пользователя Telegram (ID)</li>
            <li>Имя и фамилия (если указаны в профиле Telegram)</li>
            <li>Имя пользователя (username, если установлено)</li>
            <li>Фотография профиля (если доступна)</li>
            <li>Языковые настройки</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            2.2. При совершении покупок мы дополнительно обрабатываем:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Историю заказов и покупок</li>
            <li>Выбранные способы оплаты (без сохранения платёжных реквизитов)</li>
            <li>Историю переписки со службой поддержки</li>
            <li>Информацию об открытых спорах</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            2.3. Техническая информация:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>IP-адрес (для обеспечения безопасности)</li>
            <li>Тип устройства и операционной системы</li>
            <li>Дата и время посещения</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Цели обработки данных</h2>
          <p className="mb-4 text-sm leading-relaxed">
            3.1. Мы обрабатываем персональные данные для следующих целей:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Идентификация пользователя на Платформе</li>
            <li>Обработка заказов и доставка цифровых товаров</li>
            <li>Связь с пользователем по вопросам заказов</li>
            <li>Рассмотрение споров и обращений в поддержку</li>
            <li>Предотвращение мошенничества и обеспечение безопасности</li>
            <li>Улучшение качества сервиса</li>
            <li>Исполнение требований законодательства</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Хранение данных</h2>
          <p className="mb-4 text-sm leading-relaxed">
            4.1. Персональные данные хранятся на защищённых серверах с использованием современных методов шифрования.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            4.2. Данные о заказах хранятся в течение срока, необходимого для исполнения обязательств и разрешения возможных споров, но не менее 3 лет с момента совершения заказа.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            4.3. Техническая информация (IP-адреса, логи) хранится не более 12 месяцев.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Передача данных третьим лицам</h2>
          <p className="mb-4 text-sm leading-relaxed">
            5.1. Мы не продаём и не передаём персональные данные третьим лицам для маркетинговых целей.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            5.2. Данные могут быть переданы:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Платёжным провайдерам — для обработки оплаты (передаётся минимально необходимый объём данных)</li>
            <li>Продавцам — идентификатор покупателя для доставки товара</li>
            <li>Государственным органам — по законному требованию</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Права пользователя</h2>
          <p className="mb-4 text-sm leading-relaxed">
            6.1. Пользователь имеет право:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Получить информацию о своих персональных данных, которые обрабатывает Платформа</li>
            <li>Требовать исправления неточных данных</li>
            <li>Требовать удаления данных (с учётом ограничений, связанных с исполнением обязательств)</li>
            <li>Отозвать согласие на обработку данных</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            6.2. Для реализации указанных прав необходимо обратиться в службу поддержки через раздел «Контакты».
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            6.3. Запрос будет рассмотрен в течение 30 дней с момента получения.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Файлы cookie и аналитика</h2>
          <p className="mb-4 text-sm leading-relaxed">
            7.1. Платформа может использовать файлы cookie для:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Сохранения сессии пользователя</li>
            <li>Запоминания языковых предпочтений</li>
            <li>Сбора обезличенной статистики использования</li>
          </ul>
          <p className="mb-4 text-sm leading-relaxed">
            7.2. Пользователь может отключить cookie в настройках браузера, однако это может повлиять на функциональность Платформы.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Безопасность данных</h2>
          <p className="mb-4 text-sm leading-relaxed">
            8.1. Мы применяем организационные и технические меры для защиты персональных данных:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Шифрование данных при передаче (HTTPS/TLS)</li>
            <li>Ограничение доступа к данным</li>
            <li>Регулярный аудит безопасности</li>
            <li>Защита от несанкционированного доступа</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">9. Изменения в Политике</h2>
          <p className="mb-4 text-sm leading-relaxed">
            9.1. Мы можем обновлять настоящую Политику. Актуальная версия всегда доступна на данной странице.
          </p>
          <p className="mb-4 text-sm leading-relaxed">
            9.2. При существенных изменениях мы уведомим пользователей через Платформу.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">10. Контакты</h2>
          <p className="mb-4 text-sm leading-relaxed">
            10.1. По вопросам обработки персональных данных обращайтесь:
          </p>
          <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
            <li>Telegram: @teddyxsup</li>
            <li>Email: support@yehorshop.com</li>
          </ul>

          <div className="mt-8 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Продолжая использовать Платформу, вы подтверждаете, что ознакомились и согласны с настоящей Политикой конфиденциальности.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
