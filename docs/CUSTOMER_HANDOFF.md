# Передача NOVA Safety AI заказчику

Дата снимка: **11.07.2026**.  
Word: `docs/CUSTOMER_HANDOFF.docx` (сборка: `node scripts/generate-handoff-docx.mjs`).  
Рабочий стенд: https://naryad-67194.web.app  
Исходники (fork): https://github.com/Dulateaad/Novasafety-ai  
Орг. репозиторий: https://github.com/novasafetykz/Novasafety-ai  
Копия (akmaliyev): https://github.com/akmaliyev-commits/NOVASAFETYAI

## Что передаётся сейчас

| Артефакт | Где |
|----------|-----|
| Полный исходный код (React/Vite + Cloud Functions) | GitHub `main` / ветка `customer-handoff` |
| ТЗ (as-built) | `docs/TZ_NOVA_Safety.md` + `.docx` |
| Акт сдачи-приёмки (шаблон) | `docs/AKT_vypolnennyh_rabot_NOVA_Safety.md` + `.docx` |
| README: локальный запуск и деплой | `README.md` |
| Шаблоны env (без значений) | `.env.example`, `functions/.env.example` |
| Правила Firestore | `firebase/firestore.rules` |

## Что не передаётся в git (секреты)

Секреты передаются **отдельным защищённым каналом** (не в issue/PR/чате).  
После получения секретов заказчик заполняет файлы и деплоит сам (или с сопровождением).

### A. Корневой `.env` (сборка Hosting)

Скопировать из `.env.example`:

| Переменная | Назначение |
|------------|------------|
| `VITE_FIREBASE_API_KEY` | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ID проекта (`naryad-67194` на стенде) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender |
| `VITE_FIREBASE_VAPID_KEY` | Web Push key pair |
| `VITE_AI_PROVIDER` | обычно `claude` |
| `VITE_ANTHROPIC_API_KEY` | только если фронт ещё вызывает Claude напрямую (предпочтительно ключ только в Functions) |
| `VITE_CLAUDE_MODEL` / `VITE_CLAUDE_*_MODEL` | модели (опционально) |

### B. `functions/.env` (Cloud Functions)

Скопировать из `functions/.env.example`:

| Переменная | Назначение |
|------------|------------|
| `ANTHROPIC_API_KEY` | Claude на сервере (ППР, NEBOSH, чат-прокси) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP |
| `SMTP_USER` / `SMTP_PASS` | учётная запись почты |
| `EMAIL_FROM` | тот же mailbox, что `SMTP_USER` (иначе JUNK) |
| `APP_PUBLIC_URL` | публичный URL приложения |
| `SIGEX_BASE_URL` | по умолчанию `https://sigex.kz` |
| `GEMINI_API_KEY` | опционально, если используется Gemini |

### C. Доступы (не файлы)

| Доступ | Зачем |
|--------|--------|
| Firebase Console: Owner/Editor на проект | Hosting, Functions, Auth, Firestore |
| Google Cloud: право деплоя Functions | `firebase deploy --only functions` |
| `firebase login` под учёткой с доступом | CLI-деплой |
| JSON сервисного аккаунта (локально, не в git) | `npm run bootstrap-admin` / роли |
| Anthropic Console | ротация ключа Claude |
| SMTP / почтовый ящик | уведомления |

---

## Как заказчику задеплоить после получения секретов

Требования: Node.js 20+, Firebase CLI (`npm i -g firebase-tools`), доступ к проекту.

```bash
git clone https://github.com/novasafetykz/Novasafety-ai.git
cd Novasafety-ai   # или каталог e-ptw / корень с package.json

npm install
cd functions && npm install && cd ..

# 1) Секреты (получены отдельно)
cp .env.example .env
cp functions/.env.example functions/.env
# заполнить значениями из защищённой передачи

# 2) Проверить .firebaserc → Project ID
# 3) Войти в Firebase
npx firebase login
npx firebase use naryad-67194   # или свой Project ID

# 4) Полный деплой (Hosting + Functions + rules по firebase.json)
npm run deploy:all
```

Только сайт: `npm run deploy:hosting`  
Только Functions: `npm run deploy:functions`  
Только rules: `npm run deploy:rules`

После смены `VITE_*` обязателен новый `npm run build` / `deploy:hosting`.

### Первый админ

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\serviceAccount.json"
npm run bootstrap-admin
```

Или вручную — см. `README.md` (email вида `Admin@nova.local`).

---

## Чеклист приёмки кода

- [ ] Код в `novasafetykz/Novasafety-ai` (через PR из fork)
- [ ] Есть `docs/TZ_NOVA_Safety.docx`, акт, README, `.env.example`
- [ ] Секреты переданы отдельно и сохранены у заказчика
- [ ] Заказчик может `firebase login` + `npm run deploy:all`
- [ ] Стенд открывается; вход и создание НД работают
- [ ] Claude/Functions: ППР или чат отвечает (ключ на сервере)
- [ ] Email (если SMTP заполнен) не уходит только в JUNK

---

## Контакты по передаче секретов

Исполнитель передаёт пакет секретов заказчику по согласованному каналу (защищённый файл / менеджер паролей), **после** доступа заказчика к Firebase/GitHub.  
В этом репозитории секретов нет и быть не должно.
