# NOVA Safety (MVP)

**NOVA Safety** — веб-приложение нарядов-допусков: React, Vite, TypeScript, Firebase (Firestore + Hosting).  
Каталог исходников в репозитории может называться `e-ptw`; при желании переименуйте его в `NOVA-Safety`, когда среда не держит файлы открытыми.

## Локально

Перейдите в каталог с `package.json` (например `D:\gp_2026_cad26\e-ptw` или `...\NOVA-Safety`).

```bash
npm install
npm run dev
```

Без файла `.env` приложение работает в **демо-режиме** (данные в `localStorage`).

## Firebase: хостинг и БД

1. В [Firebase Console](https://console.firebase.google.com/) создайте проект или выберите существующий.
2. Включите **Firestore**.
3. В разделе **Authentication** включите провайдер **Email/Password** (только вход по паролю, без саморегистрации в проде).
4. Зарегистрируйте **веб-приложение** и скопируйте `firebaseConfig`.
5. В корне приложения **NOVA Safety** создайте `.env` по образцу `.env.example`, заполните `VITE_FIREBASE_*`.
6. В **`.firebaserc`** укажите реальный **Project ID**.

### Учётная запись администратора (Admin)

Firebase для входа по паролю принимает только **формат email**, не произвольный логин «Admin». Стандартная учётка администратора:

| Поле на странице входа | Значение |
|------------------------|----------|
| Email | **`Admin@nova.local`** |
| Пароль | **`Admin123`** |
| Роль в приложении | **`coordinator`** (полномочия координатора) |

**Автоматическое создание** (Auth + документ `users/{uid}`), если у вас есть JSON ключ сервисного аккаунта проекта (не храните его в git):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\path\to\serviceAccount.json"
npm run bootstrap-admin
```

Скрипт создаёт пользователя или обновляет пароль, если email уже занят.

**Вручную:** Authentication → пользователь с email **`Admin@nova.local`** и паролем **`Admin123`** → Firestore → **`users/{UID}`** с полями `displayName`: «Администратор», `role`: `coordinator`, `email`: `Admin@nova.local`.

### Учётные записи (остальные пользователи)

Пароли и доступ вы выдаёте сотрудникам дальше так же:

1. В **Authentication → Users** создайте пользователя (email + пароль), скопируйте **UID**.
2. В **Firestore** создайте документ **`users/{UID}`** (ID документа = UID), поля:
   - **`displayName`** (string), например «Иванов И.И.»;
   - **`role`** (string), одна из ролей приложения: `issuer`, `permitter`, `performer`, `executor`, `coordinator`, `contractor`, `safety`, `leadExpert`;
   - **`email`** (string, опционально) — удобная копия email для справочника.

Для каждого пользователя НД в формах должен быть свой документ в **`users`**. Справочник участников при создании НД строится из этой коллекции.

3. В консоли из каталога приложения:

   ```bash
   npm install
   npx firebase login
   npm run deploy
   ```

   Только сайт: `npm run deploy:hosting`. Только правила: `npm run deploy:rules`.

4. Откройте URL из раздела **Hosting** (например `https://<id>.web.app`).  
   Переменные `VITE_*` подставляются при **`npm run build`** — пересоберите после изменения `.env`.

### SPA

В `firebase.json` для Hosting настроен fallback на `index.html` для всех путей (React Router).

### Правила Firestore

В `firebase/firestore.rules`: чтение/запись **`permits`** и **`journal`** только для **`request.auth != null`**; коллекция **`users`** — чтение вошедшим пользователям, запись с клиента отключена (профили правятся в консоли или через админские средства). Дальнейшая приёмка: Cloud Functions, проверка `role` в rules, неизменяемый журнал.

### ИИ (виджет)

Ассистент доступен через **плавающую кнопку «ИИ»** на любом экране (компактный чат без отдельного маршрута).  
Ответ модели получается только через **ваш HTTPS-прокси** (например Cloud Function или небольшой backend), чтобы **не класть API-ключ LLM в фронтенд**.

1. Задайте в `.env` переменную **`VITE_AI_CHAT_URL`** на абсолютный адрес POST-обработчика.
2. Клиент шлёт тело **`{ "messages": [ … ] }`**, где первое сообщение с ролью `system` — контекст NOVA Safety (его можно переопределить на сервере).
3. Ответ успешный: JSON поле **`reply`** или **`content`**, или структура как у OpenAI: **`choices[0].message.content`**.
4. При входе через Firebase браузер добавляет **`Authorization: Bearer <Firebase ID Token>`** — прокси может проверять `request.auth` через Admin SDK или стороннюю верификацию JWT.

На стороне прокси добавьте CORS **`Access-Control-Allow-Origin`** вашему домену (`https://<id>.web.app`).

## Дорожная карта по ТЗ (кратко)

| Этап | Задачи |
|------|--------|
| Сейчас | Hosting + Firestore, пилотные rules, клиентская валидация |
| MVP-A+ | `matrix` в Firestore, Excel по журналу, версии НД |
| MVP-B | Storage, АСОР/АБР, маршрут подрядчика/ОТ |
| Приёмка | Cloud Functions на статусы, rules без обхода согласования, журнал append-only через бэкенд |
