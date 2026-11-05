# Auth, role va upload kontrakti — 2-bosqich

## API va frontend

- `GET /member/csrf`: credential bilan `{ csrfToken }`; `Cache-Control: no-store`. HttpOnly `techhome.sid` cookie’dagi sessionga bog‘langan synchronizer token.
- Barcha state-changing so‘rovlar, jumladan signup/login/logout/order/upload: allowlistdagi `Origin` (yoki admin form uchun `Referer`) va `X-CSRF-Token`. URL-encoded HTML form `_csrf` ishlatishi mumkin. Multipart’da token **header**da bo‘lsin, body tokenini o‘qish uchun avval fayl yuklanmaydi.
- Signup/login javobi `{ member, csrfToken }`. `accessToken` JSON’dan olib tashlangan; JWT faqat HttpOnly cookie. Session ID va CSRF login/signupda yangilanadi, yangi token keyingi yozish uchun ishlatiladi.
- `GET /member/detail`: cookie tekshiruvi va joriy DB member javobi. Backend 401 bo‘lsa guest; network/500 bo‘lsa frontend retry holati, private ekranlar mount qilinmaydi.
- Signup: nick 3–40 harf/son/`_ . -`, phone 7–24 ruxsat etilgan belgi, password minimum 8 belgi va maksimum 72 UTF-8 bayt. Login mavjud account nomidagi bo‘sh joy/punctuation’ni qabul qiladi (nonempty plain string, max 256); yangi signup nick regex’i login’ga qo‘llanmaydi. Login eski account uchun qisqaroq parolni ham tekshirishi mumkin; object/NoSQL input va bcrypt truncation rad etiladi.
- Signup role/status/points’ni USER/ACTIVE/0 deb server belgilaydi. Profil faqat nick/phone/address/desc va validated upload yo‘lini yangilaydi. Bodydagi role/status/points/password/image path authoritative emas.
- JWT faqat subject/revocation version va standart expiry/issuer/audience claimlari; HS256. Joriy ACTIVE status, DB role va version har protected requestda tekshiriladi. Password/hash/authVersion frontend javobida yo‘q.
- `POST /member/logout`: valid JWT bo‘lsa member version oshadi — **barcha API login tokenlari bekor bo‘ladi**; cookie/session tozalanadi. Expired/yo‘q JWT ham CSRF bilan cookie’dan tozalanishi mumkin. Tarmoq/DB xatosida frontend muvaffaqiyatni o‘ylab topmaydi; HttpOnly cookie’ni JS tozalay olmaydi.
- Frontend `src/lib/api/client.ts`: credentials, shared CSRF promise, login rotation, 401 event va identity epoch. Eski identity javoblari tashlanadi; mutatsiya avtomatik retry qilinmaydi. `CSRF_INVALID`dan keyin foydalanuvchi qayta urinsa yangi token olinadi.
- Auth localStorage’da saqlanmaydi. Eski `memberData` o‘chiriladi. Storage’da faqat boshqa tabga auth o‘zgarishini bildiradigan secretsiz signal bo‘lishi mumkin; storage ishlamasa session xotirada ishlaydi. Logout/identity/cross-tab/focus private order/detail cache’ini tozalaydi va sessionni serverdan tekshiradi.

## Cookie, CORS va lokal/production config

- Access cookie: HttpOnly, SameSite=Lax, host-only, `/`, 24h; server session cookie 6h. Productionda Secure va HTTPS majburiy.
- Development’da frontend config faqat ikkala manzil ham loopback bo‘lganda API hostname’ini ochilgan sahifaga moslaydi; localhost/127.0.0.1 aralashuvidagi CSRF xatosi shu bilan tuzatildi. Port/path, remote API va production konfiguratsiya saqlanadi. [Tekshiruv](auth-localhost-fix-2026-11-04.md).
- Frontend/API bir xil sayt doirasida bo‘lsin: lokal `127.0.0.1`ni ikkala URL’da ishlating, productionda bir root domain ostidagi HTTPS originlar. Turli saytlar uchun SameSite=None rejimi bu bosqichda qo‘shilmagan.
- `WEB_ORIGINS`: vergul bilan ajratilgan aniq frontend originlari. `API_ORIGIN`: adminning API origin’i. Wildcard yoki URL path/credential yo‘q. Productionda ikkalasi ham berilishi va HTTPS bo‘lishi kerak.
- `SESSION_SECRET`, `SECRET_TOKEN`: mustaqil kriptografik random, minimum 32 belgi; `.env.example`da bo‘sh. Lokal zaif qiymatlar shu bosqichda yangilandi; serverga yoki production secretlariga tegilmadi.
- `TRUST_PROXY_HOPS`: local 0, Coolify’dagi haqiqiy trusted proxy soniga mos 1/2. HTTPS forwarding/IP rate limit uchun stagingda tekshiriladi; app porti tashqi klientga proxy’ni chetlab ochilmasin.
- Login/signup/admin-login: har IP uchun umumiy 10 urinish/15 minut; upload 30/15 minut, process-local limiter. Qayta startda limit reset bo‘ladi; ko‘p instance kerak bo‘lsa shared store alohida qilinadi. AI uchun kelajak persistent quota bundan alohida.
- Body JSON/urlencoded 16KB, nested form objectlar o‘chirilgan. Security xatolari raw body/DB/credential loglamaydi; umumiy server/session ulanish xatolari ham secretsiz.

## Admin

- Ochiq `/admin/signup` GET/POST yopilgan. Admin login faqat joriy ACTIVE STORE’ga ruxsat; session regenerate, faqat member ID/version saqlanadi. Har admin route DB role/status/version’ni qayta tekshiradi.
- Admin logout faqat `POST /admin/logout` + CSRF; eski GET linklari formga almashtirilgan. `check-me` protected safe JSON, user matnidan inline script yasamaydi.
- Admin account update faqat USER accountining valid statusini o‘zgartiradi va authVersion’ni oshiradi. Role/password/points yoki STORE accountni shu endpoint orqali o‘zgartirib bo‘lmaydi.
- Admin multipart form JS orqali CSRF header bilan yuboradi; product create javobi `{ created: true }`. Muvaffaqiyatdan keyin admin katalogiga qaytiladi; server bergan script eval qilinmaydi.
- Birinchi STORE: faqat **alohida ko‘rsatma bilan** `BOOTSTRAP_NICK`, `BOOTSTRAP_PHONE`, `BOOTSTRAP_PASSWORD`ni xavfsiz lokal/runtime env’da berib, `npm run bootstrap:store -- --confirm-bootstrap`. Bu buyruq DBga yozadi va avtomatik ishlamaydi. Existing STORE bo‘lsa rad etadi; partial unique STORE indeksi concurrent creation’ni cheklaydi.
- Existing bazadagi avval yaratilgan STORE accountlari va duplicate index holati real DBda tekshirilmadi. Ularni avtomatik downgrade/delete qilish yo‘q; stagingdan oldin alohida audit/migratsiya kerak. Bootstrap bu ish davomida bajarilmadi.

## Upload

- JPEG/PNG, har fayl maksimum 5MiB, profil 1 ta, mahsulot 5 tagacha. Auth/CSRF tekshiruvlari fayl parsidan oldin.
- Memory parserdan keyin sharp haqiqiy rasmni decode qiladi: maksimum 20M pixel, format/MIME mosligi, animatsiyasiz; JPEG/PNG’ga qayta encode qilib metadata va qo‘shimcha payload olib tashlanadi. Natija maksimum 10MiB.
- Original filename ishlatilmaydi: random UUID va tekshirilgan `.jpg`/`.png`. URL `uploads/members/...` yoki `uploads/products/...`; `UPLOADS_ROOT` faqat storage uchun.
- Hamma rasm valid bo‘lmaguncha diskka yozilmaydi. Controller saqlash muvaffaqiyatini belgilamasa yangi fayllar response tugagach tozalanadi. Eski profil fayllari avtomatik o‘chirilmaydi.
- Static uploads faqat members/products ostidagi JPEG/PNG yo‘llarga ruxsat, `nosniff`; oldindan qolgan SVG/HTML ham serve qilinmaydi. Real production disk rasmlari bu bosqichda skan qilinmadi.

## O‘tish tartibi

Auth backend va frontend birga release qilinadi: eski JS cookie reader yangi HttpOnly bilan mos emas. Eski JWT/admin sessionlar qayta login talab qiladi. Bu bosqichda serverga deploy qilinmadi. Lokal tekshiruvlar stub DB/MemoryStore, vaqtinchalik uploadlar va loopback server bilan; haqiqiy Mongo session/index va Coolify HTTPS sinovi staging bosqichida.

[Eski account mosligi va rasmli auth tuzatishi](auth-compatibility-2026-11-04.md).
