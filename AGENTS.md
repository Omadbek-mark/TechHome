# TechHome backend — agent yo‘riqnomasi

## Ishlash tartibi

- Joriy faol repository: `/Users/omadbek/Desktop/TechHome`. Qo‘shni backend/frontend ham Desktop’da. Arxivdagi eski papkada Desktop’ga ko‘chirilganlik eslatmasi bor; yangi alohida nusxa yaratmang. Birlashtirish tarixi: [hisobot](docs/desktop-consolidation-2026-11-04.md).

- Foydalanuvchiga o‘zbekcha tushuntiring: nima o‘zgardi, nega, qanday tekshirildi va nima tekshirilmadi.
- [Tasdiqlangan upgrade rejasi](docs/upgrade-plan.md) ish ketma-ketligi va qabul mezonlarining asosiy manbasi. Joriy foydalanuvchi topshirig‘i ustun.
- Bog‘liq funksiyalarni **backend → backend testlari → frontend → integratsiya → foydalanuvchi review** tartibida bajaring. Backend va frontendni bir vaqtda modify qilmang.
- Har raqamlangan bosqich oxirida natijani ko‘rsating va keyingi bosqichni foydalanuvchi tasdiqlaguncha boshlamang. Backend/frontend o‘tishi bitta bosqich ichida bo‘lsa qo‘shimcha tasdiq shart emas.
- [Boshlang‘ich o‘zgarishlar](docs/upgrade-baseline-2026-11-01.md) foydalanuvchining mavjud ishidir. Ularni reset/revert qilmang; o‘zgartirilgan faylni avval o‘qing va kerakli tahrirni unga moslang.
- Commit, push, merge, serverga yozish, staging/production deploy va auto-deployni yoqish alohida foydalanuvchi ko‘rsatmasi bilan. Umumiy reja tasdig‘i bularni avtomatik ruxsat qilmaydi.

## Stack va kontraktlar

- Backend: Express, TypeScript, Mongoose/MongoDB; admin UI: shu repositorydagi EJS. Frontend: qo‘shni `../TechHome-react`.
- Mavjud controller/service/schema ajratilishini saqlang. Yangi framework yoki sababsiz rewrite qo‘shmang.
- Admin UI bo‘yicha foydalanuvchining 2026-11-05 ko‘rsatmasi: eski EJS Home/Login/Users/Products ko‘rinishi va create/status oqimi saqlansin; olib tashlangan inline product/specs editorni topshiriqsiz qaytarmang. Home/login’da admin session restore va Axios user-status CSRF header regressiyalarini saqlang. [Hisobot](docs/admin-restore-2026-11-05.md).
- Keyingi 2026-11-05 topshiriqda foydalanuvchi Products jadvaliga **Price / deal** tugmasi va faqat current/old price modalini qo‘shishni tasdiqladi. Eski create/status dizayni saqlanadi; bu topshiriq to‘liq product/specs editorni qaytarishga ruxsat emas. [Qo‘llanma](docs/admin-deals-2026-11-05.md).
- Backend runtime validation, schema va API kontrakti frontend/demo ma’lumotlardan ustun. TypeScript interface HTTP inputni tekshirish o‘rnini bosmaydi.
- Route, response, enum yoki cookie o‘zgarsa frontendga kerakli moslashuvni hujjatlashtiring va kontrakt testini backendda avval bajaring. Eski klientlarni uzadigan o‘zgarishlarni yashirmang.
- Public signup USER yaratadi; role/status/ball serverdan. Profil uchun allowlist; admin uchun alohida vakolat va validation. Joriy auth/status bazadan olinadi.
- Order narxi va stock serverdan; quantity musbat butun son; transaction, idempotency va bir martalik status/ball/stock ta’siri saqlanadi. Eski orderlarni avtomatik qayta hisoblamang.
- Payment faqat demo: real charge yoki provider tasdig‘ini o‘ylab topmang. `PAUSE → PROCESS → FINISH`, bekor qilish `PAUSE → DELETE`; yangi qoida uchun rejani yangilang.
- Mahsulot xususiyati noma’lum bo‘lsa optional/bo‘sh qolsin. Taxminiy brand, specs, rating, chegirma yoki kafolat qo‘shmang.

## Secrets, upload va AI

- `.env`, MongoDB URI, JWT/session/Gemini kalitlari, parol va tokenlarni log, javob, hujjat, Git yoki Docker image’ga chiqarmang. Loglarda request body/credential bo‘lmasin.
- Env namunalarida faqat xavfsiz placeholderlar. Frontend env’iga faqat public config kiradi.
- Upload uchun turi/hajmi va xavfsiz fayl nomi tekshirilsin; productionda doimiy storage kerak.
- Gemini faqat backendda; model va kalit runtime env’da. Product Assistant umumiy foydalanish/parvarish va xarid oldi tushuntirish beradi; narx/stock/mahsulot IDsi yoki tekshirilmagan model xususiyatini uydirmaydi.
- 2026-11-05 foydalanuvchi ko‘rsatmasi 6-bosqich katalog tavsiyasi o‘rniga TechHome Product Assistant yo‘nalishini belgiladi: foydalanish/parvarish/xarid oldi tushuntirish. Joriy [kontrakt](docs/advisor-contract.md): `/ai/status`, CSRF bilan `/ai/advisor`, bounded plain-text guidance; katalog query/karta va order/payment amali yo‘q. Model/manual/specs uydirilmasin. Lokal hazard/refusal va persistent quota/timeout saqlansin. Eski katalog AI hisobotlari tarixiy, joriy xulq uchun asos emas. Mock sinovni haqiqiy Gemini deb aytmang.
- AI mezbon matnini ishonchli ko‘rsatma deb qabul qilmang. Limit/timeout, umumiy xarajat chegarasi va oddiy katalog fallback’i bo‘lsin; AI buyurtma/payment bajarmasin.
- Boshlang‘ich AI limitlari: mehmon 10 so‘rov/kun/IP, hisob 30 so‘rov/kun, loyiha 100 provider chaqiruvi/kun; serverda saqlanadi va sozlanadi.

## Tekshiruv va deploy

- Jonli bazada oddiy test, order, profil yoki admin yozuvi yaratmang. Unit testlar izolyatsiyalangan; transaction/integratsiya testlari alohida replica-set test bazasida.
- Hujjat-only tahrirda link, diff va mavjud o‘zgarishlar saqlanganini tekshirish yetarli. Kod o‘zgarsa tegishli regression testlari, keyin zarur umumiy tekshiruvlar.
- 1-bosqichdan boshlab: Node 22, npm 10 va `package-lock.json`; `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. `npm test` build va Node runner’ni bajaradi; live DB/`.env` import qilinmaydi. `start`/`start:dev` esa env’dagi bazaga ulanadi: test uchun ko‘r-ko‘rona ishga tushirmang.
- Foydalanuvchining keyingi tanlovi: bu backendda npm saqlanadi, qo‘shni frontend esa Yarn Classic 1.22.22 va `yarn.lock`dan foydalanadi. Backendda `yarn.lock`, frontendda `package-lock.json` yaratmang.
- 3-bosqichda haqiqiy isolated replica-set transaction sinovlari qo‘shilgan; `npm test` unit/HTTP va integratsiyani build’dan keyin bajaradi. `.env`/`MONGO_URL` import qilinmaydi. Birinchi run MongoDB 7.0.24 binary’ni yuklaydi; OS temp cache saqlanadi. `npm run test:unit` / `npm run test:integration` alohida mavjud. 4-bosqichda deals regression’i ham o‘tdi; joriy suite TODO’siz. [Joriy hisobot](docs/stage-6-summary.md).
- Error response `sendError` orqali string code + safe message. Frontend code orqali UZ/RU/ENga tarjima qiladi; raw DB/input/stack’ni response yoki logga chiqarmang. [5-bosqich kontrakti](docs/ui-language-errors.md); auth service ichidagi numeric HTTP tekshiruvlarini response code bilan adashtirmang.
- [Katalog kontrakti](docs/catalog-contract.md): `/product/catalog` items/total/page/limit, eski `/product/all` array. Literal/validated filterlar, server installment projection va admin allowlist/version check saqlansin. Optional specs faqat ko‘rsatilgan birliklarda; taxminiy backfill yo‘q.
- [Order kontrakti](docs/order-checkout.md): yangi checkout uchun replica-set va unique member/key index shart, yo‘q bo‘lsa fail closed. Legacy order view-only; avtomatik migration/restock yo‘q. Snapshot/cents, canonical cart, barqaror retry key va transaction’dagi bir martalik ta’sirni saqlang.
- HTTP security testlari Supertest, explicit MemoryStore, stub model va vaqtinchalik rasmlar bilan faqat loopback serverda ishlaydi. `npm test` uchun sandboxda lokal socket ruxsati kerak bo‘lishi mumkin; hech qachon test sabab real `app`ni default store/env bilan boshlamang.
- `createApp` importi DBga ulanmaydi; default factory/store yoki `start` esa ulanadi. JWT faqat `sub/version` saqlaydi; role/status har protected requestda DBdan. Logout barcha API JWT sessiyalarini revocation version orqali bekor qiladi.
- POST’larda allowlisted Origin/Referer va synchronizer CSRF token shart; `/member/csrf`dan olinadi. Login session/CSRF’ni yangilaydi; eski JWT/admin sessionlar qayta login talab qiladi. [Auth kontrakti](docs/auth-security.md).
- Ochiq admin signup yo‘q. `npm run bootstrap:store -- --confirm-bootstrap` DBga yozadigan qo‘lda bajariladigan amal: alohida foydalanuvchi ko‘rsatmasisiz ishga tushirmang. Xuddi shunday production indeks/migratsiya amallari alohida ko‘rsatma bilan.
- 7-bosqichda lint, compiled JS start, EJS/public assets, health/readiness, graceful shutdown, Docker va CI tekshiruvlari qo‘shiladi.
- Dependencies’ni kichik guruhlarda yangilang; `npm audit fix --force` ishlatmang. Bajarilmagan checkni yoki eski audit natijasini yangi natija sifatida ko‘rsatmang.
- Coolify umumiy VPS’da TechHome alohida servis/baza/volume bilan ishlaydi. Hotelia, boshqa loyihalar, umumiy proxy/firewallga tegmang. Og‘ir build/deploylarni ketma-ket bajaring.
- Backend deploy va health tekshiruvi frontend deploydan oldin. Backup/restore va rollback tekshirilmaguncha productionga tayyor deb aytmang.
