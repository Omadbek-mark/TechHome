# TechHome production tayyorgarligi

Coolify’da backend va frontend uchun ikkita Dockerfile application ishlatiladi. Har birida repository ildizi build context bo‘ladi. [Coolify Dockerfile qo‘llanmasi](https://coolify.io/docs/applications/builds/dockerfile)

| Servis | Ichki port | Probe | Sozlama |
| --- | --- | --- | --- |
| Backend | 3002 | `/ready` | Runtime env va doimiy uploads |
| Frontend | 8080 | `/health` | Build argument `VITE_API_URL` |

Backend image Node 22 bilan compiled JS’ni ishga tushiradi. Build EJS va public fayllarni `dist` ichiga ko‘chiradi. `/health` HTTP jarayonini, `/ready` esa app va session MongoDB ulanishlarini tekshiradi. Ular ichki HTTP orqali ham ishlaydi. Biznes endpointlari production’da HTTPS talab qiladi. Coolify proxy ortidagi hop sonini staging’da tekshiring. To‘xtatish uchun Docker grace period’ni kamida 20 soniya qilib belgilang.

Backend runtime env:

- `NODE_ENV=production`, `PORT=3002`, `UPLOADS_ROOT=/app/uploads`.
- `MONGO_URL` tranzaksiya ishlaydigan replica set yoki sharded cluster’dagi TechHome bazasiga yo‘naltiriladi. App va session store kerakli kolleksiya va indekslarni ishlata olishi kerak. Amaldagi ma’lumotlarda unique indekslarga zid yozuvlar bor-yo‘qligini staging’da tekshiring. [Order kontrakti](order-checkout.md)
- `WEB_ORIGINS` frontendning aniq HTTPS origin’i, `API_ORIGIN` backendning aniq HTTPS origin’i. Frontend va API cookie ishlashi uchun bir saytga tegishli HTTPS domenlarda joylashadi.
- `TRUST_PROXY_HOPS` real proxy zanjiriga mos bo‘lsin. Backend portiga ommaviy kirish proxy orqali o‘tsin.
- `SESSION_SECRET` va `SECRET_TOKEN` alohida tasodifiy kamida 32 belgilik qiymatlar bo‘lsin. AI ishlatilsa `AI_ENABLED`, `GEMINI_API_KEY` va `GEMINI_MODEL` backend runtime env’da beriladi. Kalitlar Coolify’da runtime qiymat sifatida saqlanadi.

Backend uchun `/app/uploads`ga doimiy volume ulang. Bind mount tanlansa konteynerdagi Node foydalanuvchisiga yozish huquqi bering (UID 1000). Eski uploads fayllari kerak bo‘lsa, katalogdagi saqlangan URL tuzilishini saqlab ko‘chiring. MongoDB va uploads zaxira nusxalarini alohida saqlang. [Coolify persistent storage](https://coolify.io/docs/applications/configuration/persistent-storage)

Frontend uchun `VITE_API_URL`ni public backend HTTPS origin’iga teng build argument sifatida bering. Bu qiymat brauzer bundle’ida bo‘ladi. Manzil o‘zgarsa image qayta quriladi. Dockerfile healthcheck’lari mavjud. [Coolify health checks](https://coolify.io/docs/applications/configuration/health-checks)

## Staging va release tartibi

1. Ikki repositorydan chiqariladigan Git versiyalarini belgilang. GitHub CI natijalarini tekshiring.
2. Staging uchun alohida domenlar, MongoDB bazasi va uploads volume tayyorlang. Backendni ishga tushirib `/ready`, admin login, statik fayllar va HTTPS’ni tekshiring. So‘ng frontendni chiqaring va katalog, sahifa refresh, login/CSRF, upload, chegirma, demo checkout va AI oqimlarini staging’da sinang.
3. Staging bazasi va uploads nusxasidan restore mashqini bajaring. Keyingi image nosoz bo‘lsa oldingi image/tag’ga qaytishni tekshiring. Katalog indekslari va mavjud ma’lumot mosligini tasdiqlang.
4. Release tasdiqlangach, avval backendni chiqarib smoke tekshiruvini bajaring, keyin frontendni chiqaring. Auto-deploy alohida tasdiqdan keyin yoqiladi.

## Lokal tekshiruv

- Backend typecheck va 79 test o‘tdi. Production image alohida MongoDB replica set bilan `/health`, `/ready`, EJS/CSS/JS, Secure/HttpOnly session cookie, CORS, uploads yozish huquqi va SIGTERM tekshiruvlaridan o‘tdi.
- Frontend 64 test va production build’dan o‘tdi. Image SPA yo‘llari, assetlar, mavjud bo‘lmagan asset uchun 404 va public API origin orqali tekshirildi. Vite bundle hajmi bo‘yicha ogohlantirish berdi.
- Ikkala CI workflow actionlint’dan o‘tdi. GitHub Actions run, Coolify staging, production TLS hamda backup/restore va rollback tasdig‘i release oldida qoladi.
