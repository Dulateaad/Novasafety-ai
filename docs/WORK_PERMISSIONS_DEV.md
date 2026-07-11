# Модуль «Разрешения» — комментарий разработчику

## Назначение

При выборе **определённых видов работ** в НДПР система должна автоматически определять, какие **специальные разрешения** нужны, показывать пользователю уведомление, открывать шаг мастера «Разрешения» и включать документы в **общий PDF-пакет** для согласования.

Шаблоны (DOCX, прикреплены заказчиком):

| Вид работ (`SpecialWorkActivity`) | Документ | Стиль |
|-----------------------------------|----------|-------|
| `gas_hazard` | Разрешение на газоопасные работы | оранжевый |
| `open_flame_fire` | Разрешение на проведение огневых работ | красный |
| `confined_space` | Разрешение на вход в замкнутое пространство | синий |

Файлы-образцы: `docs/templates/permissions/` (скопировать из Downloads при необходимости).

---

## Ключевой принцип: JSON → рендер → пакет

**Разрешение хранится как JSON** (`WorkPermissionsBundle` на `PermitDraft` / `Permit`), а PDF — **рендер этого объекта**, а не статичный файл.

```
UI (форма + таблица газотестов)
        ↓ onChange
WorkPermissionDocument.form + gasTests[]   ← источник истины
        ↓ buildWorkPermissionPdf()
PDF разрешения (preview + base64)
        ↓ buildSigningPackagePdf()
Общий пакет: НДПР + АБР + Оценка риска + [разрешения…]
```

Любое изменение в панели (в т.ч. ERT на карточке наряда) должно:

1. Обновить JSON в Firestore (`permit.workPermissions`)
2. Пересобрать PDF разрешения
3. Пересобрать `packagePdf` (или lazy при просмотре)

**Реализовано (v2):** live-sync на `PermitDetailPage` — `ErtGasTestLivePanel` + `syncWorkPermissionsLive()` (debounce 800 ms → PDF разрешения + `packagePdf`).

---

## Маршрут мастера

| Шаг | Маршрут | Gate |
|-----|---------|------|
| 1 | `/ppr` | — |
| 2 | `/new` | `isPprGatePassed()` |
| 3 | `/risk-assessment` | `isNdGatePassed()` |
| 4 | `/permissions` | `isRiskGatePassed()` + виды работ требуют разрешений |

Если **ни один** из видов `gas_hazard`, `open_flame_fire`, `confined_space` не выбран — вкладка «Разрешения» **не показывается**, шаг 3 завершается кнопкой «Отправить на согласование».

Конфигурация маппинга: `src/config/workPermissionsConfig.ts`  
Логика видимости вкладки: `src/lib/workPermissionsNav.ts`

---

## UI / UX

### НДПР (`NewPermitPage`)

При выборе вида работ с разрешением:

- Баннер `WorkPermissionsRequiredNotice` (например: для газоопасных — «необходимо заполнить специальное разрешение»)
- Блок **«Итоговый комплект документов»** (`DocumentKitSummary`) с иконками

### Оценка риска (`RiskAssessmentPage`)

После проверки АБР/NEBOSH:

- Если нужны разрешения → **«Далее — Разрешения»** (`setRiskGatePassed()`)
- Иначе → отправка пакета как раньше

### Разрешения (`PermissionsPage`)

- Карточка на каждый требуемый документ (цвет по шаблону)
- Поля формы + таблица газотестов (`GasTestResultsTable`)
- Кнопка **«Сформировать разрешения»** → `renderWorkPermissionsBundle()`
- **«Посмотреть PDF»** на каждой карточке
- **«Отправить на согласование»** → `executeNdprPackageSubmit()` с `workPermissions` в черновике

Заполнение: **вручную** или **через ИИ** — кнопки «ИИ: разделы 3–5» / «Заполнить все через NOVA» (`generateWorkPermissionFromPpr.ts`, `workPermissionAiPrompt.ts`).

---

## Роли и согласование

| Роль | `UserRole` | Действие |
|------|------------|----------|
| Производитель работ | `performer` | Подпись разрешения (как в цепочке НДПР) |
| Выдающий НД | `issuer` | Подпись |
| Допускающий | `permitter` | Подпись |
| ПАС / газотester | `ert` | Заполнение таблицы отбора проб (LEL, H2S, O2, CO) |

Цепочка eGov для разрешений — **реализована (v2):** `WorkPermissionSignaturesSection` + `WorkPermissionEgovSignModal` (SIGEX QR, PDF одного разрешения). Подписи в `doc.egovSignatures` и `doc.signatures`. Роли: performer, issuer, permitter.

Газотесты на шаге «Разрешения» доступны всем участникам пакета; на карточке выданного наряда — **только ERT** (`user.role === 'ert'`).

---

## Схема данных (пример)

```typescript
// src/types/workPermissions.ts
interface WorkPermissionsBundle {
  documents: WorkPermissionDocument[]
  updatedAtIso: string
}

interface WorkPermissionDocument {
  kind: 'gas_hazard' | 'open_flame_fire' | 'confined_space'
  title: string
  form: WorkPermissionForm
  gasTests: GasTestReading[]
  signatures: WorkPermissionSignature[]
  generatedAtIso?: string
  documentHash?: string
  pdfBase64?: string  // только клиент
}

interface GasTestReading {
  atIso: string
  location: string
  lelPercent: string
  h2sPpm: string
  o2Percent: string
  coPpm: string
  testerUid: string
  testerName: string
  instrumentNo: string
}
```

Поле на наряде: `PermitDraft.workPermissions` / `Permit.workPermissions`.

---

## Файлы реализации (v1 + v2)

| Область | Путь |
|---------|------|
| Типы | `src/types/workPermissions.ts` |
| Чеклисты DOCX | `src/config/workPermissionChecklists.ts` |
| Конфиг шаблонов | `src/config/workPermissionsConfig.ts` |
| ИИ | `src/config/workPermissionAiPrompt.ts`, `src/lib/generateWorkPermissionFromPpr.ts`, `parseWorkPermissionAiJson.ts` |
| Live-sync | `src/lib/syncWorkPermissionsLive.ts`, `normalizeWorkPermissions.ts` |
| Логика | `src/lib/workPermissions.ts`, `workPermissionsNav.ts`, `workPermissionsAutosave.ts` |
| PDF | `src/lib/buildWorkPermissionPdf.ts`, доработка `buildSigningPackagePdf.ts` |
| UI мастер | `src/pages/PermissionsPage.tsx`, `WorkPermissionFormEditor.tsx`, `DocumentKitSummary`, `GasTestResultsTable` |
| Карточка наряда | `ErtGasTestLivePanel.tsx`, `WorkPermissionSignaturesSection.tsx`, `WorkPermissionEgovSignModal.tsx` |
| Gates | `src/lib/riskGate.ts`, `permissionsGate.ts` |
| Навигация | `Layout.tsx`, `navGates.ts`, `App.tsx` |

---

## TODO (следующие итерации)

~~1. **ИИ-заполнение** разделов 3–5 по ППР~~ ✅ v2  
~~2. **Live ERT-панель** на `PermitDetailPage` с debounced пересборкой PDF~~ ✅ v2  
~~3. **Подписи ЭЦП** на каждое разрешение (performer / issuer / permitter)~~ ✅ v2  
~~4. **Полное соответствие DOCX** — чеклисты разделов 2–5, аварийные контакты, `preWorkChecks`, поля ЗП~~ ✅ v2  
5. **Firestore rules** — `ert` может patch только `workPermissions.documents[].gasTests`
6. **Уведомления** ERT при выдаче наряда с газоопасными/замкнутым пространством/огневыми работами
7. **Демо-режим** подписей разрешений (сейчас ЭЦП только при `authMode === 'firebase'`)

---

## Проверка

1. НДПР → выбрать «Газоопасные работы» → баннер + комплект документов
2. Пройти оценку риска → «Дalее — Разрешения»
3. Заполнить форму и газотест → «Сформировать разрешения» → PDF
4. Отправить пакет → на карточке наряда полный PDF включает разрешение
5. Войти как `ert@nova.local` — на карточке выданного наряда: live-панель газотестов, изменения сразу в PDF
6. Подписать разрешение (performer / issuer / permitter) через SIGEX QR на карточке наряда
7. На шаге «Разрешения» — «ИИ: разделы 3–5» по тексту