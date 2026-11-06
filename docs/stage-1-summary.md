# 1-bosqich — install, build va test muhiti

Sana: 2026-11-01 (Asia/Seoul). Tartib: backend o‘zgarishlari va tekshiruvlari tugagach frontendga o‘tildi. 2-bosqich boshlanmadi.

## O‘zgarishlar va sabab

### Backend

- Node 22/npm 10, `.nvmrc`/`.npmrc`, lockfile va haqiqiy typecheck/test scriptlari. Unit testlar Node’ning built-in runner’ida, qo‘shimcha framework va live DBsiz.
- Express 4/Mongoose 6 oilalari saqlanib patchlari yangilandi; JWT 9, Multer 2, bcryptjs 3 va UUID 11 o‘rnatildi. Keraksiz bevosita `mongodb` dependency’si va o‘z typing’i bor paketlarning eski `@types`lari olib tashlandi. Lockfile transitive/development paketlari ham mos range ichida yangilandi.
- Yangi Mongoose typing’lariga mos `Types.ObjectId`, typed schema/model, persisted order va aggregation type farqi tuzatildi. Nullable natijalar aniqlandi; login natijasida yo‘q member/parol uchun xato qaytariladi. Route/JSON wire formati o‘zgarmadi.
- Auditda topilgan xavflar uchun bajariladigan regression testlar yozildi; tuzatishlari kelishilgan keyingi bosqichlarda qoladi.

### Frontend

- CRA/Jest o‘rniga Vite 7.3.7 / Vitest 5.0.5 / React Testing Library; TypeScript 5.9.3. React 18.3.1, Redux va React Router 5 saqlangan.
- Root `index.html`, Vite config, alohida tooling tsconfig va Vite env typing; `build` doim typecheck’dan keyin bajariladi. `build/` output nomi saqlangan.
- Eski public HTML entry va CRA type reference olib tashlandi; npm yagona package manager, yarn lockfile olib tashlandi. Eski yarn lockfile’ning aynan ishchi nusxasi vaqtinchalik lokal backupga saqlandi.
- MUI 4 faqat authda ishlatilardi va React 18 peer mosligiga xalaqit berardi: o‘sha modal mavjud MUI 5’ga ko‘chirildi, layout/ranglar saqlandi. Qo‘shimcha framework yo‘q.
- Swiper 14.4.0 va Axios 1.21.0; Swiper module importlari va typing’lari to‘g‘rilandi. Haqiqiy ESM import testda ishlaydi.
- Noto‘g‘ri RESTAURANT enum qoldig‘i STORE’ga moslandi. Product fixture’da images maydoni qo‘shildi; presentation-only order fixture’lari yolg‘ondan API Order deb tiplanmaydi.
- Redux logger dependency’si va `@ts-ignore` olib tashlandi; Redux default middleware/devtools saqlangan. API/member/order ma’lumotlarini production logger chiqarishi to‘xtadi.
- Public API endi `VITE_API_URL` orqali; noto‘g‘ri/yo‘q konfiguratsiya rad etiladi. Mavjud `.env` mazmuni saqlanib, lokal API qiymati ignored `.env.local`ga ko‘chirildi; secretsiz `.env.example` qo‘shildi.
- README va ikki AGENTS.md joriy buyruqlarga moslandi.

## Amalda bajarilgan tekshiruvlar

| Tekshiruv | Joriy natija |
|---|---|
| Backend `npm ci` | O‘tdi; yangi lockfile’dan clean install |
| Backend `npm run typecheck` | O‘tdi, clean install’dan keyin |
| Backend `npm test` | Build o‘tdi; 6 pass, 0 fail, 7 TODO |
| Frontend `npm ci --offline` | O‘tdi; oldin yuklangan npm cache’dan toza install, legacy peer/force yo‘q |
| Frontend `npm run typecheck` | O‘tdi; app va Vite config |
| Frontend `npm test -- --run` | 3 fayl, 11 test o‘tdi; 0 fail |
| Frontend `CI=true npm run build` | O‘tdi; TypeScript ham majburiy |
| Backend dependency audit | 5 moderate; 0 high/critical |
| Frontend dependency audit | 0 ta advisory qaytdi; bu application security auditi o‘rnini bosmaydi |
| Desktop browser | Vite build bosh sahifa va MUI login modal ochildi, Escape bilan yopildi; katalog navigatsiyasi va `/products` refresh o‘tdi |
| Browser API muhiti | Alohida build ishlamaydigan `https://api.test.invalid` bilan; live API/DBga ulanilmadi, credential yuborilmadi |
| Diff tekshiruvi | Joriy tracked diff’da whitespace xatosi qolmagan; oldingi auth whitespace’i o‘sha fayl migratsiyasi ichida tozalandi |

Backend testlari order query/update’ning member bilan cheklanishi, blocked login, parol hash/redaction, faol katalog filtri, JWT expiry/tampering’ni tekshiradi. Frontend testlari route, product detail/Swiper, modal dismissal, konfiguratsiya va API error/data’ni tekshiradi.

## Ochiq xavflar — passing test emas

7 ta TODO testi mavjud kodga qarshi bajariladi va hozir kutilgan himoya assertion’larini bajarmaydi. Runner ularni TODO sifatida hisoblaydi, exit code 0 bo‘ladi. **6 pass + 7 TODO = 13 xavfsizlik testi o‘tdi degani emas.**

| Regression | Tuzatish bosqichi |
|---|---|
| Signup’da mijoz STORE rolini yubora olishi | 2 |
| Profile update’da role/points allowlist yo‘qligi | 2 |
| Bo‘sh order qabul qilinishi | 3 |
| Browser narxiga ishonish | 3 |
| Manfiy item price/quantity schema’da qabul qilinishi | 3 |
| Takroriy PROCESS’da ball qayta qo‘shilishi | 3 |
| Deals sharti haqiqiy aggregation’ga qo‘shilmasligi | 4 |

TODO belgisi faqat tegishli tuzatish va passing assertion bilan olib tashlanadi; bu ro‘yxat barcha kelajak xavfsizlik testlarining to‘liq qamrovi emas. Production uchun TODO’siz regression gate zarur.

Qolgan 5 moderate dependency advisory: EJS/filelist/jake va nodemon/minimatch daraxti. Audit taklif qilgan major/downgrade’lar ko‘r-ko‘rona qo‘llanmadi; alohida moslik tekshiruvi kerak. MUI Base va jsdom ichki dependency’sida deprecation xabarlari bor; hozirgi auditda frontend advisory yo‘q.

Build katta chunk haqida ogohlantirdi: asosiy JS taxminan 264.46 kB gzip. Mavjud katta PNG’lar ham saqlangan. Warning limitini oshirib yashirilmadi; code splitting va image optimizatsiyasi keyingi UX/performance ishi.

## Cheklovlar va review

- Auth HttpOnly/role/upload hardening, stock transaction/idempotency, demo payment UI, deals, responsive/til va Gemini hali keyingi bosqichlarda.
- Live API E2E, real DB, mobile browser, production Docker/VPS/CI va deploy tekshirilmadi. Vitest/jsdom layout tekshiruvi emas.
- `.env` avvaldan Gitda tracked: `.gitignore` qo‘shilishi kuzatuvni avtomatik bekor qilmaydi. Mavjud ishchi mazmun saqlandi; kelajakdagi commit tayyorlashda env’ni indexdan chiqarish kerak. Bu bosqichda index, commit, push yoki serverga yozish bajarilmadi.
- `start:prod` hozir faqat lokal Vite preview alias’i. Production static server, assets packaging va xavfsiz deploy scripti 7-bosqich ishi. Eski `deploy.sh` ishga tushirilmadi.
- Mavjud foydalanuvchi o‘zgarishlari saqlandi; faqat bosqichga kerak bo‘lgan fayllar tahrirlandi. Keyingi bosqich — backenddan boshlanadigan auth/role/upload, foydalanuvchi reviewingizdan keyin.
