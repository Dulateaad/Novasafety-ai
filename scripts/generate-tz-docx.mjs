/**
 * Генерация TZ_NOVA_Safety.docx из структурированного содержимого.
 * Запуск: node scripts/generate-tz-docx.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'docs', 'TZ_NOVA_Safety.docx')

function t(text, opts = {}) {
  return new TextRun({ text, font: 'Times New Roman', size: 24, ...opts })
}

function p(children, opts = {}) {
  const runs = typeof children === 'string' ? [t(children)] : children
  return new Paragraph({ spacing: { after: 120 }, children: runs, ...opts })
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [t(text, { bold: true, size: 32 })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [t(text, { bold: true, size: 28 })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 80 },
    children: [t(text, { bold: true, size: 26 })],
  })
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [t(text)],
  })
}

function numbered(text, ref = 'num') {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [t(text)],
  })
}

function table(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
          children: [p([t(h, { bold: true })])],
        }),
    ),
  })
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
              children: [p(cell)],
            }),
        ),
      }),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  })
}

function codeBlock(lines) {
  return lines.map((line) =>
    p([t(line, { font: 'Consolas', size: 20 })]),
  )
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'num',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
          },
        ],
      },
      {
        reference: 'steps',
        levels: [
          {
            level: 0,
            format: 'decimal',
            text: '%1.',
            alignment: AlignmentType.LEFT,
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            t('ТЕХНИЧЕСКОЕ ЗАДАНИЕ', { bold: true, size: 36 }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            t('Система электронного наряд-допуска NOVA Safety (e-PTW)', {
              bold: true,
              size: 28,
            }),
          ],
        }),
        p([
          t('Заказчик: ', { bold: true }),
          t('ТОО «Урал Ойл энд Газ» (UOG)'),
        ]),
        p([t('Исполнитель: ', { bold: true }), t('[указать организацию-разработчик]')]),
        p([t('Версия документа: ', { bold: true }), t('1.0')]),
        p([t('Дата: ', { bold: true }), t('27.05.2026')]),
        p([
          t('Статус: ', { bold: true }),
          t('действующая спецификация на базе развёрнутого прототипа'),
        ]),
        p([t('URL прототипа: ', { bold: true }), t('https://naryad-67194.web.app')]),
        p([t('Firebase-проект: ', { bold: true }), t('naryad-67194')]),

        h1('1. Назначение и цели'),
        h2('1.1. Назначение'),
        p(
          'Веб-приложение NOVA Safety автоматизирует полный цикл оформления наряд-допуска (НД) на опасные работы в соответствии с внутренними процедурами UOG (PR-007, UOG-HSE-PR-001 и связанные формы):',
        ),
        numbered('ППР — программа производства работ (загрузка документа, извлечение данных ИИ).', 'steps'),
        numbered('НДПР — наряд-допуск на производство работ (реквизиты, сроки, бригада, фотофиксация участка).', 'steps'),
        numbered('АСОР / ОТ·ТБ·ООС — оценка рисков, мероприятия по охране труда.', 'steps'),
        numbered('Согласование — поэтапная ЭЦП через SIGEX / eGov Mobile (роли 10.1–10.4).', 'steps'),
        numbered('PDF-пакет — официальный бланк с таблицами ППР, опасными факторами, фото и подписями.', 'steps'),

        h2('1.2. Цели внедрения'),
        table(
          ['№', 'Цель', 'Критерий успеха'],
          [
            ['1', 'Сократить время оформления НД', 'Один пакет ППР→НДПР→АСОР без бумажного дублирования'],
            ['2', 'Юридически значимая ЭЦП', 'Подписи permitter → issuer → performer → leadExpert'],
            ['3', 'Фиксация состояния участка', 'До 6 фото с подписью, в карточке наряда и PDF'],
            ['4', 'Работа на объекте с телефона', 'PWA, камера, офлайн-кэш Firestore'],
            ['5', 'Аудит и хранение', 'Журнал нарядов, статусы, отклонения, хэш PDF'],
          ],
        ),
        p(''),

        h2('1.3. Пользователи'),
        table(
          ['Роль', 'Функции'],
          [
            ['Производитель работ', 'Создание пакета, фото, подпись 10.3'],
            ['Допускающий', 'Подпись 10.1'],
            ['Выдающий НД', 'Подпись 10.2, выдача'],
            ['Ведущий специалист (кат. 1)', 'Утверждение 10.4'],
            ['Координатор HSE', 'Создание, согласование текущего шага очереди'],
            ['Администратор', 'Управление пользователями, журнал'],
            ['Работник бригады', 'Ознакомление (планируется — учётные записи)'],
          ],
        ),
        p(''),

        h1('2. Область работ (функциональные требования)'),
        h2('2.1. Журнал нарядов'),
        bullet('Список нарядов с фильтрами по статусу.'),
        bullet('Кнопки «Создать (с ППР)» / «Начать с ППР» → сброс сессии, переход на /ppr?fresh=1.'),
        bullet('Карточка наряда: реквизиты, статус, PDF, очередь подписей, отклонение.'),

        h2('2.2. Шаг 1 — ППР'),
        bullet('Загрузка DOC/DOCX/PDF (до 15 МБ).'),
        bullet('ИИ (Google Gemini): описание работ, этапы, объём, меры контроля.'),
        bullet('Сохранение вложения в сессии и в документе наряда.'),
        bullet('Кнопка «Далее — НДПР» после заполнения gate.'),

        h2('2.3. Шаг 2 — НДПР'),
        bullet('Поля: организация, объект, вид работ, зона, описание, этапы, объём, инструменты.'),
        bullet('Фотофиксация места работ: кнопки «Сфотографировать» и «Из галереи».'),
        bullet('До 6 снимков, сжатие до ~1280 px, JPEG ~82 %, лимит 900 КБ на фото.'),
        bullet('Подпись к каждому фото (необязательно). Хранение в sitePhotos[] Firestore.'),
        bullet('Назначение ролей, сроки работ, бригада (F03), регистрационный номер.'),
        bullet('Автосохранение черновика в sessionStorage.'),

        h2('2.4. Шаг 3 — АСОР / ОТ·ТБ·ООС'),
        bullet('Матрица рисков, задания, опасные факторы, меры защиты.'),
        bullet('Блок согласований 10.1–10.4.'),
        bullet('Отправка на согласование → генерация PDF-пакета.'),

        h2('2.5. Электронная подпись (SIGEX / eGov)'),
        bullet('Порядок: permitter (10.1) → issuer (10.2) → performer (10.3) → leadExpert (10.4).'),
        bullet('QR-код в модальном окне, проверка CMS на сервере (submitEgovSignature).'),
        bullet('Координатор может подписать только текущий шаг очереди.'),
        bullet('Серверные функции: getSigningDocument, submitEgovSignature, extractPprControlMeasures.'),

        h2('2.6. PDF-пакет'),
        bullet('Генерация на клиенте (pdfmake) и/или на сервере (Cloud Functions).'),
        bullet('Разделы: сводка, данные ППР, ОТ·ТБ·ООС, опасные факторы, бригада, фотофиксация, блок 10.1–10.4.'),
        bullet('Скачивание из карточки наряда.'),

        h2('2.7. Планируемые доработки (этап 2)'),
        bullet('Вкладка сертификатов (PR-012, PR-001, PR-007-R, PR-055, PL-003).'),
        bullet('ABR в PDF + AI-панель.'),
        bullet('Реестр НД (переименование «Матрица НД»).'),
        bullet('Учётные записи бригады для ознакомления.'),
        bullet('Миграция фото в Firebase Storage.'),

        h1('3. Нефункциональные требования'),
        table(
          ['Параметр', 'Требование'],
          [
            ['Язык UI', 'Русский'],
            ['Браузеры', 'Chrome 100+, Safari iOS 15+, Edge 100+'],
            ['Мобильность', 'Адаптивная вёрстка, PWA, доступ к камере (HTTPS)'],
            ['Доступность', 'HTTPS обязателен для камеры и ЭЦП'],
            ['Производительность', 'Открытие журнала < 3 с при ≤ 500 нарядов'],
            ['Безопасность', 'Firestore Rules, проверка ролей на Functions'],
            ['Резервирование', 'Firebase + ежедневный экспорт Firestore (опционально на VPS)'],
            ['Логирование', 'Firebase Console, Cloud Functions logs'],
          ],
        ),
        p(''),

        h1('4. Архитектура решения'),
        p(
          'Клиент (PWA: React 19 + Vite, pdfmake, камера) → Firebase Hosting → Firestore / Auth / Cloud Functions (europe-west1). Внешние сервисы: Google Gemini API, SIGEX / eGov Mobile. VPS (PS.kz) опционально: мониторинг, бэкап, reverse proxy.',
        ),

        h2('4.1. Стек технологий'),
        table(
          ['Слой', 'Технология'],
          [
            ['Frontend', 'React 19, TypeScript, Vite 8, React Router 7'],
            ['PWA', 'vite-plugin-pwa, Service Worker'],
            ['Backend', 'Firebase Cloud Functions (Node.js 20), europe-west1'],
            ['БД', 'Cloud Firestore'],
            ['Файлы', 'Base64 в Firestore (фото, ППР); Storage — этап 2'],
            ['PDF', 'pdfmake (клиент), pdfkit (сервер)'],
            ['ИИ', 'Google Gemini (клиент + Functions)'],
            ['ЭЦП', 'sigex-qr-signing-client, SIGEX REST API'],
            ['CI/CD', 'npm run deploy:hosting, deploy:functions, deploy:all'],
          ],
        ),
        p(''),

        h2('4.2. Модель данных (ключевые поля наряда)'),
        ...codeBlock([
          'permits/{id}',
          '  title, siteName, workDescription, workStages, workVolume',
          '  permitType, category, zoneClass, specialWorkActivity',
          '  f02 { company, startDate, endDate, ... }',
          '  executors[], ppr { attachment, workTitle, ... }',
          '  asor { tasks[], approvals[], ... }',
          '  sitePhotos[] { id, caption, dataUrl, capturedAtIso, sizeBytes }',
          '  egovSignatures { permitter, issuer, performer, leadExpert }',
          '  packagePdf { fileName, documentHash, generatedAtIso }',
          '  status, registrationRefNo, ...',
        ]),

        h1('5. Инфраструктура и VPS'),
        h2('5.1. Текущая схема (облако Firebase)'),
        p('Основное приложение размещено в Google Firebase (план Blaze).'),
        table(
          ['Компонент', 'Ресурс', 'Регион'],
          [
            ['SPA', 'Firebase Hosting', 'CDN global'],
            ['API / ЭЦП / ИИ', 'Cloud Functions', 'europe-west1'],
            ['Данные', 'Firestore', 'multi-region'],
            ['Аутентификация', 'Firebase Auth', '—'],
          ],
        ),
        p(''),
        p('Преимущества: не требует собственного сервера приложений, автоскейлинг, SSL из коробки.'),
        p('Ограничения: зависимость от Google Cloud; для compliance может потребоваться резерв на VPS в РК.'),

        h2('5.2. Роль VPS (PS.kz или аналог)'),
        p('VPS не заменяет Firebase в текущей архитектуре, а дополняет:'),
        table(
          ['Задача на VPS', 'Описание'],
          [
            ['Мониторинг uptime', 'Uptime Kuma / Healthchecks → алерт в Telegram'],
            ['Резервное копирование', 'Экспорт Firestore → S3/локальный диск (gcloud / Admin SDK)'],
            ['Прокси для API', 'Nginx reverse proxy к SIGEX/Gemini при корпоративных ограничениях'],
            ['Зеркало статики', 'Копия dist/ для доступа по внутреннему DNS (опционально)'],
            ['CI runner', 'Self-hosted runner для npm run build && firebase deploy'],
            ['Журнал аудита', 'Централизованный сбор логов Functions (опционально)'],
          ],
        ),
        p(''),

        h2('5.3. Рекомендуемые тарифы VPS (PS.kz, ориентир 2026)'),
        table(
          ['Профиль', 'CPU/RAM/SSD', 'Назначение', 'Ориентир ₸/мес'],
          [
            ['Basic-2', '2 vCPU / 2 GB / 40 GB', 'Мониторинг + nightly backup', '~7 000'],
            ['Basic-3', '2 vCPU / 4 GB / 80 GB', '+ CI runner, прокси', '~14 000'],
            ['Basic-4', '4 vCPU / 8 GB / 160 GB', 'Полный контур резервирования', '~28 000'],
          ],
        ),
        p(''),
        p('Минимальная рекомендация для UOG: Basic-3 (4 GB RAM).'),

        h2('5.4. Сетевая схема с VPS'),
        ...codeBlock([
          'Пользователи (объект / офис) → HTTPS → naryad-67194.web.app (Firebase Hosting)',
          '  ├── Firestore / Auth / Functions (Google)',
          '  └── SIGEX, Gemini (интернет)',
          'VPS (Алматы/Астана, PS.kz):',
          '  ├── cron: firestore-export.sh (03:00 daily)',
          '  ├── uptime: ping web.app + functions health',
          '  └── optional: nginx → зеркало dist или API proxy',
        ]),

        h2('5.5. Требования к VPS (технические)'),
        table(
          ['Параметр', 'Значение'],
          [
            ['ОС', 'Ubuntu 22.04 LTS'],
            ['Node.js', '20 LTS (для скриптов бэкапа)'],
            ['ПО', 'nginx, certbot, gcloud CLI или firebase-tools, docker (опционально)'],
            ['Firewall', 'UFW: 22 (SSH ограничен), 80/443 (если прокси)'],
            ['SSH', 'Только ключи, отключить root login'],
            ['Диск', '≥ 80 GB (бэкапы Firestore + логи 90 дней)'],
            ['DNS', 'A-запись backup.uog.local или внешний поддомен при зеркале'],
          ],
        ),
        p(''),

        h2('5.6. Скрипт резервного копирования (эталон)'),
        ...codeBlock([
          '#!/bin/bash',
          '# /opt/nova/backup-firestore.sh',
          'export GOOGLE_APPLICATION_CREDENTIALS=/opt/nova/sa-firestore.json',
          'BUCKET=gs://naryad-67194-backups',
          'DATE=$(date +%Y%m%d)',
          'gcloud firestore export $BUCKET/$DATE --project=naryad-67194',
          'find /var/backups/nova -mtime +30 -delete',
          'Cron: 0 3 * * * /opt/nova/backup-firestore.sh',
        ]),

        h2('5.7. Стоимость эксплуатации (ориентир, месяц)'),
        table(
          ['Статья', 'Сумма'],
          [
            ['Firebase Blaze (Hosting + Firestore + Functions)', '15 000 – 45 000 ₸*'],
            ['VPS Basic-3 (PS.kz)', '~14 000 ₸'],
            ['SIGEX (платный тариф при > 40 подписей/мес)', 'от 10 000 ₸'],
            ['Gemini API', 'по объёму запросов'],
            ['Домен + SSL', '3 000 – 5 000 ₸'],
          ],
        ),
        p('* Зависит от числа нарядов, размера фото и вызовов Functions.'),

        h2('5.8. Деплой и доступы'),
        table(
          ['Действие', 'Команда / инструмент'],
          [
            ['Сборка', 'npm run build'],
            ['Hosting', 'npm run deploy:hosting'],
            ['Functions', 'npm run deploy:functions (требует IAM Cloud Build)'],
            ['Правила Firestore', 'npm run deploy:rules'],
            ['Полный деплой', 'npm run deploy:all'],
          ],
        ),
        p(''),
        p('Требуемые IAM-роли: Firebase Admin, Cloud Functions Developer, Service Account User для Cloud Build.'),

        h1('6. Безопасность и соответствие'),
        bullet('Все запросы по HTTPS.'),
        bullet('Firestore Security Rules: чтение/запись по auth.uid и роли в users/{uid}.'),
        bullet('Секреты (Gemini, SIGEX) — только в Functions environment / Secret Manager.'),
        bullet('Фото содержат данные объекта — хранение в Firestore с теми же правилами, что и наряд.'),
        bullet('Персональные данные в ФИО работников — политика хранения согласно регламентам UOG.'),
        bullet('ЭЦП — проверка CMS через SIGEX на сервере перед записью в egovSignatures.'),

        h1('7. Приёмочные испытания'),
        h2('7.1. Сценарий «Полный пакет с фото»'),
        numbered('Войти как координатор → Журнал → «Создать (с ППР)».', 'num'),
        numbered('Загрузить ППР (PDF), дождаться извлечения ИИ → «Далее — НДПР».', 'num'),
        numbered('Заполнить НДПР, сделать 2 фото с телефона, добавить подписи.', 'num'),
        numbered('Перейти в ОТ·ТБ·ООС, заполнить АСОР, отправить на согласование.', 'num'),
        numbered('Скачать PDF — раздел «Фотофиксация места работ».', 'num'),
        numbered('Подписать 10.1–10.4 под соответствующими учётными записями.', 'num'),
        numbered('Проверить статус «Согласован» и наличие ЭЦП в карточке.', 'num'),

        h2('7.2. Сценарий «Мобильная камера»'),
        bullet('Открыть /new на смартфоне (HTTPS).'),
        bullet('Нажать «Сфотографировать» — системная камера открывается.'),
        bullet('Фото появляется в сетке, сохраняется после создания наряда.'),

        h2('7.3. Сценарий «VPS бэкап»'),
        bullet('На VPS выполнить тестовый экспорт Firestore.'),
        bullet('Проверить наличие архива в bucket / локальной папке.'),
        bullet('Симулировать недоступность Hosting — алерт от мониторинга за ≤ 5 мин.'),

        h1('8. Этапы реализации'),
        table(
          ['Этап', 'Содержание', 'Срок*'],
          [
            ['1', 'ППР → НДПР → АСОР, журнал, PDF', 'Выполнено'],
            ['2', 'ЭЦП 10.1–10.4, очередь подписей', 'Выполнено'],
            ['3', 'Фотофиксация при НДПР, PDF', 'Выполнено'],
            ['4', 'Деплой Functions, исправление IAM', '3–5 дней'],
            ['5', 'VPS: мониторинг + бэкап', '5–7 дней'],
            ['6', 'Firebase Storage для фото, сертификаты', '15–20 дней'],
          ],
        ),
        p('* Ориентировочно, уточняется календарным планом проекта.'),

        h1('9. Передаваемые артефакты'),
        numbered('Исходный код репозитория e-ptw (React + Functions).', 'num'),
        numbered('Данное ТЗ и инструкция по деплою.', 'num'),
        numbered('Firebase-проект с настроенными Rules и Hosting.', 'num'),
        numbered('Документация по ролям пользователей (bootstrap-admin, bootstrap-roles).', 'num'),
        numbered('Скрипты резервного копирования для VPS.', 'num'),
        numbered('Реестр сторонних лицензий (THIRD-PARTY-LICENSES).', 'num'),

        h1('10. Глоссарий'),
        table(
          ['Термин', 'Определение'],
          [
            ['НД / НДПР', 'Наряд-допуск на производство работ'],
            ['ППР', 'Программа производства работ'],
            ['АСОР', 'Анализ безопасности операций работ'],
            ['ЭЦП', 'Электронная цифровая подпись (НУЦ РК, eGov)'],
            ['SIGEX', 'Платформа подписания документов'],
            ['PWA', 'Progressive Web App — веб-приложение с офлайн-кэшем'],
            ['VPS', 'Виртуальный сервер (выделен для бэкапов и мониторинга)'],
          ],
        ),
        p(''),

        h1('Утверждение'),
        table(
          ['', 'Заказчик', 'Исполнитель'],
          [
            ['Должность', '', ''],
            ['ФИО', '', ''],
            ['Подпись', '', ''],
            ['Дата', '', ''],
          ],
        ),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, buffer)
console.log('Создан:', OUT)
