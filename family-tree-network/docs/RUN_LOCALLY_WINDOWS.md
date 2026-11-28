# تشغيل EZIDINET محلياً على Windows 11

## ما هو المشروع تقنياً
- مستودع واحد (npm workspaces): `packages/relationship-engine` (محرك العلاقات، TypeScript) · `apps/api` (NestJS 10 + Prisma 5.22 + PostgreSQL 16) · `apps/web` (Next.js 15 + React 19) · `apps/android` (غلاف أندرويد).
- الموقع يُخدم على `/` والمنصة على `/app` من نفس خادم Next.js (المنفذ 3000)، والـ API على المنفذ 4000.

## أوامر التشغيل (package.json في الجذر)
| الأمر | الوظيفة |
|---|---|
| `npm run build:engine` | بناء محرك العلاقات (مطلوب قبل التشغيل) |
| `npm run db:migrate` | تطبيق ترحيلات قاعدة البيانات |
| `npm run db:seed` | أنواع العلاقات + بيانات تجريبية (تطوير فقط) |
| `npm run dev:api` | تشغيل الـ API على 4000 |
| `npm run dev:web` | تشغيل الموقع على 3000 |
| `npm test` | كل الاختبارات |

## المتطلبات
- Node.js 22 LTS أو أحدث (`node -v`).
- قاعدة بيانات: Docker Desktop **أو** PostgreSQL 16 (السكربت يعرض تثبيته عبر winget بعد موافقتك).

## متغيرات البيئة (الأسماء فقط — القيم السرية لا تُكتب هنا ولا تُرفع إلى Git)
- `apps/api/.env`: `DATABASE_URL`, `JWT_SECRET`, `QR_TOKEN_KEY`, `PORT`, `CORS_ORIGIN`, `AUTH_RATE_LIMIT_PER_MINUTE`, `MAIL_TRANSPORT`, `APP_URL` (اختياري: `OUTBOX_KEY`).
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SHOW_DEMO` (اختياري: `API_PROXY_TARGET`).
- السكربت ينشئ الملفين **فقط إن لم يكونا موجودين**، ويولّد مفاتيح عشوائية جديدة محلياً. ملفات `.env*` مستثناة في `.gitignore`.

## التشغيل بخطوة واحدة
افتح PowerShell داخل مجلد `family-tree-network` ثم:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\windows\start-local.ps1
```

في المرات التالية (أسرع): أضف `-SkipInstall`. بدون حسابات تجريبية: `-NoDemo`.

## الروابط بعد التشغيل
- الموقع: http://localhost:3000
- المنصة: http://localhost:3000/app
- EZIDINET WORLD: http://localhost:3000/world
- بريد التطوير (رسائل التفعيل واستعادة كلمة المرور): http://localhost:3000/dev/mailbox
- فحص الـ API: http://localhost:4000/api/health
- حساب تجريبي (تطوير فقط): `omar@demo.ftn.local` / `demo-password-2026`

## أخطاء شائعة
| الرسالة | الحل |
|---|---|
| Node.js too old / not installed | ثبّت Node.js 22 LTS ثم افتح نافذة PowerShell جديدة |
| running scripts is disabled | استخدم الأمر أعلاه مع `-ExecutionPolicy Bypass` |
| Could not connect as "postgres" | تأكد من كلمة مرور postgres ومن تشغيل خدمة PostgreSQL (services.msc) |
| Port 3000/4000 already in use | أغلق نوافذ EZIDINET السابقة أو البرنامج الذي يستخدم المنفذ |
| Migrations failed | تأكد أن قاعدة البيانات تعمل وأن `DATABASE_URL` صحيح |

للإيقاف: أغلق النافذتين "EZIDINET API" و"EZIDINET WEB".
