/**
 * Акт выполненных работ → DOCX
 * Запуск: node scripts/generate-akt-docx.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlign,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'docs', 'AKT_vypolnennyh_rabot_NOVA_Safety.docx')

const FONT = 'Times New Roman'
const SZ = 24 // 12pt
const SZ_SM = 20
const SZ_TITLE = 28
const PAGE_W = 11906
const MARGIN = 850
const CONTENT_W = PAGE_W - MARGIN * 2

function t(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SZ, ...opts })
}

function p(children, opts = {}) {
  const runs = typeof children === 'string' ? [t(children)] : children
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: runs,
    ...opts,
  })
}

function center(children, opts = {}) {
  return p(children, { alignment: AlignmentType.CENTER, ...opts })
}

function blank() {
  return p('')
}

function cell(text, widthPct, opts = {}) {
  const { bold = false, center: c = false, fill } = opts
  return new TableCell({
    width: { size: Math.round((CONTENT_W * widthPct) / 100), type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    children: [
      new Paragraph({
        alignment: c ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40, before: 40 },
        children: [t(String(text), { bold, size: SZ_SM })],
      }),
    ],
  })
}

function makeTable(headers, rows, widths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => cell(h, widths[i], { bold: true, center: true, fill: 'E8E8E8' })),
  })
  const body = rows.map(
    (r) =>
      new TableRow({
        children: r.map((v, i) => cell(v, widths[i], { center: i === 0 || i === 2 || i === 3 })),
      }),
  )
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: [headerRow, ...body],
  })
}

const works = [
  ['1', 'Разработка веб-приложения NOVA Safety (PWA): журнал нарядов, роли, адаптивный UI (RU/EN)', 'усл.', '1'],
  ['2', 'Модуль ППР: загрузка DOC/DOCX/PDF, извлечение данных ИИ, сохранение вложения', 'усл.', '1'],
  ['3', 'Модуль НДПР: реквизиты, бригада, сроки, фотофиксация участка, автосохранение', 'усл.', '1'],
  ['4', 'Модуль оценки рисков (АСОР / NEBOSH): матрица, задания, факторы, меры защиты', 'усл.', '1'],
  ['5', 'Модуль АБР: PDF, реестры опасных факторов и средств защиты, ежедневное ознакомление', 'усл.', '1'],
  ['6', 'Электронная подпись: очередь ролей, eGov Mobile (QR) и NCALayer, проверка ФИО', 'усл.', '1'],
  ['7', 'PDF-пакеты: наряд-допуск, АБР, ознакомление бригады, пакет согласования', 'усл.', '1'],
  ['8', 'Workflow: согласование, отклонение, повторная подача после отклонения', 'усл.', '1'],
  ['9', 'Остановка работ (work stop): фиксация, уведомления, разрешение инспектором', 'усл.', '1'],
  ['10', 'Газоанализ ERT: ввод результатов, связь с выдачей / подписями', 'усл.', '1'],
  ['11', 'Уведомления: push (FCM) и e-mail (SMTP); настройка адресов', 'усл.', '1'],
  ['12', 'Администрирование: пользователи, роли, email, журнал событий', 'усл.', '1'],
  ['13', 'Инфраструктура Firebase: Auth, Firestore, Hosting, Functions, правила', 'усл.', '1'],
  ['14', 'Развёртывание рабочего стенда (Hosting)', 'усл.', '1'],
  ['15', 'Передача исходного кода Заказчику (GitHub)', 'усл.', '1'],
  ['16', 'Документация: ТЗ, .env.example, инструкция по запуску', 'усл.', '1'],
]

const results = [
  ['1', 'Рабочий стенд (Hosting)', 'https://naryad-67194.web.app'],
  ['2', 'Репозиторий исходного кода', 'https://github.com/novasafetykz/Novasafety-ai'],
  ['3', 'Pull Request передачи кода', 'https://github.com/novasafetykz/Novasafety-ai/pull/1'],
  ['4', 'Firebase-проект', 'naryad-67194'],
]

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{ id: 'Normal', run: { font: FONT, size: SZ } }],
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children: [
        center([t('АКТ № ______', { bold: true, size: SZ_TITLE })]),
        center([t('сдачи-приёмки выполненных работ', { bold: true, size: SZ_TITLE })]),
        center([t('(оказанных услуг)', { bold: true })]),
        blank(),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            t('г. _______________'),
            t('\t\t\t\t\t'),
            t('«10» июля 2026 г.'),
          ],
        }),
        p([
          t('Заказчик: ', { bold: true }),
          t('_______________________________________________'),
        ]),
        p('(наименование организации, БИН)'),
        p('в лице _____________________________________________________, действующего на основании _________________,'),
        blank(),
        p([
          t('Исполнитель: ', { bold: true }),
          t('_____________________________________________'),
        ]),
        p('(наименование организации / ФИО ИП, БИН/ИИН)'),
        p('в лице _____________________________________________________, действующего на основании _________________,'),
        blank(),
        p('совместно именуемые Стороны, а по отдельности — Сторона, составили настоящий Акт о нижеследующем.'),
        blank(),
        p([t('1. Основание', { bold: true })]),
        p('1.1. Работы (услуги) выполнены в соответствии с: договором № __________ от «___» __________ 20___ г.; техническим заданием «Система электронного наряд-допуска NOVA Safety (e-PTW)» (версия 1.0 от 27.05.2026); согласованными доработками в ходе приёмки.'),
        p('1.2. Предмет: разработка, настройка, развёртывание и передача исходного кода веб-системы NOVA Safety AI (электронный наряд-допуск).'),
        blank(),
        p([t('2. Перечень выполненных работ', { bold: true })]),
        blank(),
        makeTable(
          ['№', 'Наименование работ / результат', 'Ед.', 'Кол-во'],
          works,
          [6, 74, 10, 10],
        ),
        blank(),
        p('Итого по объёму: работы по п. 1–16 выполнены в полном объёме, предусмотренном согласованным ТЗ и доработками приёмки.'),
        blank(),
        p([t('3. Результаты передачи', { bold: true })]),
        blank(),
        makeTable(
          ['№', 'Результат', 'Реквизиты / ссылка'],
          results,
          [6, 34, 60],
        ),
        blank(),
        p([
          t('Не передаются (по соображениям безопасности): ', { italics: true }),
          t('файлы .env, пароли SMTP, API-ключи ИИ, ключи сервисного аккаунта Firebase. Передаются шаблоны .env.example.', { italics: true }),
        ]),
        blank(),
        p([t('4. Стоимость', { bold: true })]),
        p('4.1. Стоимость выполненных работ (услуг) по настоящему Акту составляет:'),
        p([t('_________________________________ (_________________________________) тенге,', { bold: true })]),
        p('в том числе НДС ______ % — ________________ тенге / без НДС (нужное подчеркнуть).'),
        p('4.2. Оплата производится в порядке и сроки, установленные договором № __________ от «___» __________ 20___ г.'),
        p('4.3. Претензий по объёму, качеству и срокам выполнения работ Заказчик не имеет / имеет (нужное подчеркнуть).'),
        blank(),
        p([t('5. Заключительные положения', { bold: true })]),
        p('5.1. Настоящий Акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.'),
        p('5.2. С момента подписания Акта работы считаются принятыми Заказчиком, обязательства Исполнителя по объёму настоящего Акта — исполненными (за исключением гарантийных обязательств, если они предусмотрены договором).'),
        p('5.3. Приложения (при наличии): перечень учётных записей тестового стенда; акт передачи доступов (Firebase / GitHub).'),
        blank(),
        p([t('6. Подписи сторон', { bold: true })]),
        blank(),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          rows: [
            new TableRow({
              children: [
                cell('ЗАКАЗЧИК', 50, { bold: true, center: true, fill: 'F5F5F5' }),
                cell('ИСПОЛНИТЕЛЬ', 50, { bold: true, center: true, fill: 'F5F5F5' }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: Math.round(CONTENT_W * 0.5), type: WidthType.DXA },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  },
                  children: [
                    p('Должность: ____________________'),
                    p('ФИО: __________________________'),
                    p('Подпись: __________  М.П.'),
                    p('Дата: «___» __________ 20___ г.'),
                  ],
                }),
                new TableCell({
                  width: { size: Math.round(CONTENT_W * 0.5), type: WidthType.DXA },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                  },
                  children: [
                    p('Должность: ____________________'),
                    p('ФИО: __________________________'),
                    p('Подпись: __________  М.П.'),
                    p('Дата: «___» __________ 20___ г.'),
                  ],
                }),
              ],
            }),
          ],
        }),
        blank(),
        p([
          t(
            'Документ подготовлен для оформления сдачи-приёмки системы NOVA Safety AI. Поля с подчёркиванием заполняются Сторонами перед подписанием.',
            { italics: true, size: SZ_SM },
          ),
        ]),
      ],
    },
  ],
})

const buf = await Packer.toBuffer(doc)
fs.writeFileSync(OUT, buf)
console.log('Wrote', OUT)
