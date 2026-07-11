# NOVA e-PTW — roadmap (EN, mobile, offline, IP)

## 2. English language

- **Done (scaffold):** `LanguageProvider`, RU/EN locales, language switch in header.
- **Next:** migrate UI strings module-by-module (`Layout`, journal, permit card, PDF labels).

## 8. Push notifications (started)

| Step | Description |
|------|-------------|
| 1 | Enable FCM in Firebase project, add VAPID key |
| 2 | Service worker `firebase-messaging-sw.js` |
| 3 | Store tokens in `fcmTokens/{uid}` on login |
| 4 | Cloud Function: on `permitNotices` / `signingInvites` create → FCM multicast |
| 5 | User settings: opt-in per notification type |

Stub: `functions/src/notifications/fcmStub.ts`

In-app notifications already work via Firestore `permitNotices` (issued, closure_saved).

## 9. Mobile — Samsung Galaxy XCover (EX) / tablet EX

**Concept:**

- PWA installed to home screen; full-screen, no browser chrome.
- Touch targets ≥ 44px; tab bar bottom navigation (already present).
- eGov Mobile deep link for signing on phone.
- ERT: gas test form optimized for one-hand input (numeric keypad for LEL/O₂).
- Camera for work-stop photos (already supported).
- Coordinator: journal filters + task panels first screen.

**Tablet:** same PWA; split view optional later (journal + permit side-by-side).

## 10. Offline mode

**Current:** Firestore persistence banner in `Layout`; local demo mode.

**Target:**

| Layer | Offline behaviour |
|-------|-------------------|
| Read | Cached permits, PDFs viewed once |
| Write | Queue in IndexedDB; sync on reconnect |
| Sign | Requires network (eGov Mobile) |
| AI fill | Requires network |

Use Firestore `enableIndexedDbPersistence` + outbox queue for NDPR drafts and gas tests.

## 11. Product rights & handover

**Recommended package for transfer:**

1. Source code repository + Firebase project ownership
2. Domain / hosting (`naryad-*.web.app` or custom)
3. Firebase Auth user list export procedure
4. `.env` template (Anthropic API, SIGEX) — secrets via Secret Manager
5. Operator manual (roles, signing order, ERT flow)
6. IP assignment document: copyright + license to operator

Contact legal for Kazakhstan-specific PTW / e-signature compliance (eGov, SIGEX).

---

## Implemented in this iteration

1. Broadcast notice when permit **issued** (after lead expert / auto-issue)
4. Broadcast notice after **closure PDF save**
3. ERT gas test **tasks on journal**
5. **Nova Save fill** button moved to top of Permissions tab
6. **Loading splash** with safety tips + mascot
7. GOD MODE skips **producer, ERT, safety inspector**
8. Push stub + this roadmap doc
