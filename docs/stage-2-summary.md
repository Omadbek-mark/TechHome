# 2-bosqich — auth, role va upload

Sana: 2026-11-01 (Asia/Seoul). Backend kontrakti/HTTP testlari avval, frontend integratsiyasi keyin bajarildi. 3-bosqich boshlanmadi. [To‘liq auth kontrakti va sozlash](auth-security.md).

Keyingi foydalanuvchi ko‘rsatmasi: frontend Yarn Classic, backend npm’da ishlaydi. Quyidagi bosqich tekshiruvlari npm bilan bajarilgan tarixiy natijalar; [Yarn migratsiyasi va yangi tekshiruvlar](frontend-yarn.md) alohida qayd etilgan.

## Nima o‘zgardi

- Public signup USER/ACTIVE/0 bilan cheklangan; profil allowlist; admin account status uchun alohida DTO/validation. NoSQL/object input va bcrypt 72-byte truncation cheklangan; password hashing/redaction saqlangan.
- JWT HttpOnly/SameSite cookie’da, JSON/token/localStorage identity yo‘q. Minimal token, joriy DB role/status/version; logout revocation. Admin session regenerate, DB’dan qayta authorization, CSRF’li POST logout, ochiq signup o‘rniga qo‘lda bootstrap va single-STORE indeksi.
- CORS origin allowlist, CSRF synchronizer token/rotation, production HTTPS/Secure cookie va trusted proxy config. Rate limit, request body va upload limitlari. Password/body/auth token loglari olib tashlangan.
- Rasm haqiqiy decoder bilan tekshirilib qayta encode qilinadi; safe UUID filename, JPEG/PNG-only static serving, xato javobdan keyin yangi fayl cleanup. Admin EJS form/ajax CSRF bilan moslandi.
- App factory va DB/store ulanishi ajratildi: testlar import tufayli jonli bazaga ulanmaydi.
- Frontend server profile orqali loading/guest/auth/error session holatlari, protected route mount gate va retry bilan ishlaydi. Logout/identity/tab/focus private cache va eskirgan response’larni bekor qiladi. Login/profile double-submit bloklangan; cookie-reader dependency olib tashlangan.
- API client CSRF requestni bo‘lishadi va rotation’ni qabul qiladi; 401 auth’ni tozalaydi, POST avtomatik qayta yuborilmaydi. Order mutatsiyalari ham CSRF clientdan foydalanadi, order biznes mantiqi 3-bosqichda qolgan.
- Backend ignored lokal `.env`dagi faqat kuchsiz JWT/session secretlari random qiymatlarga yangilandi, qiymatlar chiqarilmadi, fayl permission’i 0600. Frontend ignored lokal API hostname’i cookie bilan mos 127.0.0.1ga moslandi; tracked frontend `.env` saqlandi.

## Tekshiruv natijalari

| Tekshiruv | Natija |
|---|---|
| Backend typecheck/build | O‘tdi |
| Backend Node/Supertest suite | 29 test: **24 pass, 0 fail, 5 TODO** |
| Frontend typecheck | O‘tdi |
| Frontend Vitest | 5 fayl: **21 pass** |
| Frontend CI production build | O‘tdi; katta chunk warning’i saqlangan (~266kB gzip asosiy JS) |
| Backend dependency audit | 5 moderate, 0 high/critical |
| Frontend dependency audit | 0 advisory |
| Lokal security config | Secret qiymatlarini chiqarmasdan validatsiyadan o‘tdi; DBga ulanilmadi |
| Browser integratsiyasi | Xotiradagi fixture account bilan login → My Page → refresh/session restore → logout → private route’dan homepage’ga qaytish o‘tdi |

HTTP testlari haqiqiy middleware/cookie/session/CORS/CSRF oqimini loopback’da tekshiradi, ammo model operatsiyalari stub va MemoryStore bilan. Production proxy sinovi haqiqiy TLS emas, forwarded HTTPS header bilan config sinovi. Browser fixture server `.env`/MongoDBni ishlatmagan; u va preview testdan keyin to‘xtatilgan.

Test qamrovi: signup role injection, profile role/points/password/image injection; JWT tampering/expiry/revocation va BLOCK/DELETE; session fixation/CSRF rotation; origin/CSRF rad etish; admin role/status, bootstrap existing-store rad etilishi; Secure cookie/HTTPS config; brute-force limiter; valid/fake/oversize rasmlar va active-content blocking. Frontendda auth pending/error/retry, corrupt storage, private cache/logout, late identity responses, CSRF concurrency/rotation va no automatic replay tekshirilgan.

## Qolgan ishlar

- 5 TODO: bo‘sh order, browser narxi, manfiy quantity/price, takroriy PROCESS balli (3-bosqich), deals pipeline (4-bosqich). Ular o‘tgan xavfsizlik testlari deb hisoblanmaydi.
- Real MongoDB session persistence, partial unique index/data audit, STORE bootstrap, production TLS/CORS/cookie, distributed limiter va mobile visual staging/keyingi bosqichlarda. MongoDBga yoki productionga yozilmadi.
- Logout barcha API tokenlarini bekor qiladi; eski JWT/admin cookie qayta login talab qiladi. Haqiqiy DBdagi eski STORE’lar avtomatik o‘zgartirilmadi; productiondan oldin alohida tekshiriladi.
- Mavjud 5 moderate dependency advisory (EJS/nodemon daraxtlari), katta image/chunk, demo payment UI va responsive/til ishlari hali ochiq. Docker/assets/start/CI to‘liq release gate 7-bosqich ishi.
- Commit, push, merge, deploy va bootstrap bajarilmadi. Review’dan keyingi ish: **3-bosqich — server narxi, stock transaction, idempotency va demo payment**.
