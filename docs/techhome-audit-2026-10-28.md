# TechHome: texnik audit, upgrade va AI variantlari

Tekshiruv sanasi: 2026-10-28 (Asia/Seoul).

## Yakuniy qaror

**Hozirgi holatda haqiqiy mijozlar va buyurtmalar uchun production deploy tavsiya etilmaydi.** Backend kompilyatsiyadan o'tadi, frontendning oddiy buildi ham chiqadi, lekin ruxsatlar, narx hisoblash, buyurtma yaxlitligi, testlar va deploy paketida muammolar bor. Izolyatsiyalangan demo uchun asos mavjud; ishonchli savdo tizimi uchun quyidagi bloklovchi kamchiliklar yopilishi kerak.

Audit diskdagi joriy, commit qilinmagan o'zgarishlarni ham o'z ichiga olgan kodga tegishli. Dastur kodi, dependency versiyalari va mavjud o'zgarishlar tahrirlanmadi. Backendning ignored `dist` katalogi build orqali yangilandi; frontend buildi asl konfiguratsiyani o'zgartirmaslik uchun vaqtinchalik nusxada bajarildi. Commit, push, deploy va jonli bazaga yozish bajarilmadi.

## 1. Mavjud arxitektura

| Qism | Hozirgi holat |
|---|---|
| Backend | Express 4, TypeScript 5, Mongoose 6 / MongoDB, REST API |
| Admin | Backend ichidagi EJS sahifalari; STORE roli; MongoDB session store |
| Mijoz autentifikatsiyasi | Cookie ichidagi JWT; browserda `memberData` nusxasi |
| Frontend | React 18, Create React App 5, TypeScript 4.1, React Router 5, Redux Toolkit, Axios |
| UI | MUI 4/5, Joy, styled-components, CSS, Swiper |
| Funksiyalar | Ro'yxatdan o'tish, login, katalog, qidiruv, savat, buyurtma, profil, admin mahsulot/mijoz boshqaruvi |
| Deploy | Frontendda eski `deploy.sh`; ikkala repositoryda Dockerfile va `.github` workflow topilmadi |

Controller/service/schema ajratilgani, parolni bcrypt bilan hash qilish, parol maydonida `select: false`, buyurtma yangilashda egasining ID'sini tekshirish va backenddan mahsulotlarni olish — yaxshi asos. To'liq rewrite talab qilinmaydi.

## 2. Ishga tushirilgan tekshiruvlar

Muhit: Node 22.23.2. Mavjud `node_modules` papkalari bor, ammo `.bin` orqali `tsc` / `react-scripts` topilmaydi. Shu sabab kutubxonalarning mavjud JavaScript entry pointlari bevosita Node orqali bajarildi. Toza dependency install hali tekshirilmadi.

| Tekshiruv | Natija va izoh |
|---|---|
| Backend `npm run build` | Dastlab `tsc: command not found`; lokal executable yo'li muammosi |
| Backend TypeScript `--noEmit` | Mavjud TypeScript entry pointi orqali o'tdi |
| Backend JS build | Mavjud TypeScript entry pointi orqali o'tdi; `dist/server.js` yaratildi |
| Backend `npm test` | Yiqildi: script faqat `no test specified` chiqaradi |
| Frontend TypeScript | Yiqildi: TS 4.1 `moduleResolution: bundler`ni qo'llamaydi; `resolveJsonModule` xatosi ham bor |
| Frontend qo'shimcha diagnostika | `node` resolution bilan urinishda ham `RESTAURANT`, fixture `OrderItem`, `Date`, `productImages` xatolari chiqdi; source tsconfig diagnostikasi ham saqlanib qoldi |
| Frontend test | 1 suite yiqildi, 0 test bajarildi: Jest Swiper ESM `export`ni parse qila olmadi |
| Frontend CI production build | Yiqildi: lint ogohlantirishlari CI rejimida xato deb qabul qilinadi |
| Frontend oddiy production build | Vaqtinchalik nusxada o'tdi, lint ogohlantirishlari bilan; gzip asosiy JS 262.66 kB, CSS 11.45 kB |
| Backend izolyatsiyalangan sinovlar | Quyidagi 7 ta xavfli xatti-harakat tasdiqlandi; model o'rnida stub ishlatildi, DB va tarmoqqa murojaat bo'lmadi |
| Dependency audit | Backend: 19 ta affected package (3 critical, 6 high, 5 moderate, 5 low). Frontend: 85 ta (5 critical, 38 high, 26 moderate, 16 low) |
| Browser tekshiruvi | Alohida builddan bosh sahifa va katalog desktopda ochildi; API uchun ataylab ishlamaydigan test manzili ishlatildi |

Dependency sonlari `npm audit`ning lockfile bo'yicha dependency daraxti natijasidir; ular development/transitive paketlarni ham o'z ichiga oladi. Bu sonlar shuncha alohida ishlaydigan hujum tasdiqlandi degani emas. Qaysi advisory browser/runtime'da tegishli ekanini upgrade vaqtida alohida tekshirish kerak. `npm audit fix --force` avtomatik qo'llanmasin: major va nomuvofiq o'zgarishlar taklif qilinmoqda.

## 3. Productionni bloklaydigan kamchiliklar

### P0 — foydalanuvchi rolini o'zi yubora oladi

Public signup `req.body`ni servicega uzatadi, service esa `create(input)` qiladi. `memberType: STORE` serverda USER qilib majburlanmagan. Profil yangilash ham body'ni maydonlar ro'yxati bilan cheklamasdan `findByIdAndUpdate`ga uzatadi. TypeScript interface HTTP so'rovini runtime'da tozalamaydi.

**Dalil:** stublangan model bilan signupda `STORE` saqlanib qolishi, profil update'da `memberType: STORE` va `memberPoints: 999` modelga o'tishi tasdiqlandi. Bu jonli admin panelga kirib ko'rilgan penetration test emas, ammo himoya yo'qligi service va route zanjirida ko'rinadi.

**Tuzatish:** public signupda rol/status/ballni server belgilashi; profil uchun faqat nick/phone/address/desc/image maydonlari; alohida admin update sxemasi. Admin login va har bir protected so'rovda bazadagi joriy role/status tekshiruvi.

Kod: [signup va profil service](../src/models/Member.service.ts), [member controller](../src/controllers/member.controller.ts), [admin role gate](../src/controllers/store.controller.ts).

### P0 — buyurtma narxi browserdan olinadi

`createOrder` yig'indini mijoz yuborgan `itemPrice * itemQuantity`dan hisoblaydi. Mahsulotning bazadagi narxi, faol holati va qoldig'i qayta tekshirilmaydi; stock kamaytirilmaydi.

**Dalil:** service sinovida `$0.01` narx qabul qilindi va delivery bilan `$5.01` total hosil bo'ldi. Bo'sh buyurtma ham `$5` delivery bilan qabul qilindi. OrderItem schema manfiy narx va miqdorni ham valid deb topdi.

**Tuzatish:** browser faqat product ID va musbat butun quantity yuborsin; backend narx/stock/chegirmani bazadan olsin, quantity limitini tekshirsin, qoldiqni atomik kamaytirsin. Pul hisobida integer minor units yoki kelishilgan decimal yondashuv ishlatilsin.

Kod: [OrderService](../src/models/Order.service.ts), [OrderItem schema](../src/schema/OrderItem.model.ts), [frontend order payload](../../TechHome-react/src/app/services/OrderService.ts).

### P1 — order holati va yozuvlari yaxlitligi

Status update oldingi statusni tekshirmaydi; mijoz yuborgan status qabul qilinadi. Har bir `PROCESS` so'rovida qayta ball qo'shiladi. Order avval, itemlar keyin yoziladi; transaction yoki qisman xatoni tiklash yo'q. Barqaror idempotency key va frontend double-submit blokirovkasi yo'q.

**Dalil:** bir xil `PROCESS` update ikki marta yuborilganda ikki marta ball qo'shildi.

**Tuzatish:** ruxsat etilgan status o'tishlari va actor vakolatlarini aniq belgilash; oldingi statusni atomik filterga qo'shish; transaction/rollback; unique idempotency key. Transaction uchun MongoDB deployment turi tekshirilsin.

### P1 — autentifikatsiya va maxfiylik

- JWT cookie `httpOnly: false`; `secure` va aniq `sameSite` sozlanmagan. Buni tuzatish frontenddagi cookie o'qish asosidagi session tiklanishi bilan birga bajarilishi kerak.
- `verifyAuth` JWTni tekshiradi, lekin har safar bazadagi BLOCK/DELETE holatini tekshirmaydi. Eski JWTdagi identity/statusga ishonib qolish xavfi bor.
- CORS `origin: true, credentials: true`; production origin allowlist yo'q. Cookie topologiyasiga mos CSRF himoyasi kerak.
- Admin login controller `req.body`ni logga chiqaradi; bu parolni ham logga tushirishi mumkin. Darhol olib tashlash kerak.
- Admin session gate saqlangan roldan foydalanadi; admin login current role/statusni tekshirishi, sessionni login paytida regenerate qilishi kerak.
- Login rate limit, markaziy request validation va upload limit/filter topilmadi. Uploader asl extensionni saqlaydi va fayl turi/hajmini cheklamaydi.

Kod: [app sozlamalari](../src/app.ts), [auth controller](../src/controllers/member.controller.ts), [admin login](../src/controllers/store.controller.ts), [upload](../src/libs/utils/uploader.ts).

### P1 — dependency yangilash

Backend auditida EJS/Mongoose, frontendda Swiper kabi bevosita paketlarda ham advisory bor. JWT, Express, Axios va boshqa eski paketlar ham rejalashtirilgan upgrade talab qiladi. Qulflangan versiyalar, runtime va test mosligini tekshirib, kichik guruhlarda yangilash kerak. Package auditida ko'rsatilgan xavf uchun tegishli advisory shartlari alohida baholansin.

## 4. API va mahsulot funksiyalaridagi xatolar

1. **Deals filter ishlamaydi.** `getProducts` ichida chegirma sharti `matchPrices`ga yozilgan, ammo aggregation `$match: match`ni ishlatadi. Izolyatsiyalangan sinov `onSale=true` pipeline'ga chegirma shartini qo'shmasligini tasdiqladi. Bundan tashqari `productOldPrice` Product schema'da yo'q. Frontenddagi deals ro'yxati haqiqiy chegirmalar deb qabul qilinmasin.
2. **Filter validation yo'q.** Page/limit chegaralari, sort allowlist, kategoriya enum tekshiruvi kerak. Search to'g'ridan-to'g'ri regexga aylanadi; matnni escape qilish va uzunligini cheklash kerak. Frontend query qiymatlarini URLSearchParams bilan encode qilsin.
3. **Pagination taxmin qilinadi.** UI keyingi sahifani joriy natija bo'sh emasligidan chiqaradi. Backend `{ items, total, page, limit }` yoki ishonchli `hasNextPage` qaytarsin.
4. **Product detail yangilanishi.** Effect dependency ro'yxati bo'sh: detail route'da ID almashganda eski mahsulot qolishi mumkin. ID o'zgarsa query va stale state tozalansin.
5. **Narxga bog'liq maydonlar.** Installment monthly yaratishda hisoblanadi, mahsulot narxi/months update'ida qayta hisoblanmaydi. Qoidalar serverda bitta joyda bo'lsin.
6. **Payment integratsiyasi yo'q.** UI karta/CVV inputlarini ko'rsatadi, lekin payment tugmasi order statusini `PROCESS`ga o'zgartiradi. Buni real to'lov deb taqdim etmaslik kerak. Demo uchun aniq belgi yoki payment inputlarini olib tashlash; haqiqiy to'lov keyinchalik provider tasdig'i va tekshirilgan callback bilan.
7. **Mahsulot haqidagi ishonch belgisi.** Detail rating statik `2.5`; review tizimi topilmadi. Backend tasdiqlamagan rating ko'rsatilmasin. 48-hour delivery, 0% installment va trade-in va'dalari biznes siyosati bilan tasdiqlansin.

Kod: [katalog service](../src/models/Product.service.ts), [Product schema](../src/schema/Product.model.ts), [frontend katalog](../../TechHome-react/src/app/screens/productsPage/Products.tsx), [detail](../../TechHome-react/src/app/screens/productsPage/ChosenProduct.tsx), [orders UI](../../TechHome-react/src/app/screens/ordersPage/index.tsx).

## 5. Frontendni upgrade qilish

- Hozirgi forest/amber/paper uslubi va reusable ProductTile saqlansin. UI'ni qayta yozish shart emas.
- Loading, haqiqiy empty, network error va retry alohida holatlar bo'lsin. Browser testida ataylab ishlamaydigan API ham oddiy “products not available”ga aylantirildi; foydalanuvchi muammoni farqlay olmaydi.
- Desktop katalogida gorizontal scrollbar ko'rindi. Navbar `min-width: 650px`, orders esa 860/360px kabi fixed o'lchamlardan foydalanadi; mobil moslashuv alohida tekshirilsin. Ushbu auditda mobile emulation bajarilmadi.
- `default-product.svg` fallback manzili kodda bor, lekin fayl yo'q. Image error fallback ham qo'shilsin.
- Savat stock limitini hisobga olsin; nol qoldiqda qo'shish bloklansin. LocalStorage JSON parse validation va noto'g'ri ma'lumotdan tiklanish bo'lsin.
- Browserdagi cached member sessionning yakuniy manbasi bo'lmasin. Backenddan session/profile tekshirib tiklash; logout/account change paytida shaxsiy Redux state ham tozalansin. Redux logger productionda o'chirilsin.
- `MemberType.RESTAURANT` qoldig'i va fixture kontraktlari tuzatilsin. Har bir route uchun loading/error/unauthorized testlari qo'shilsin.
- Bir nechta UI avlodini yangi qismlarda ko'paytirmasdan, bosqichma-bosqich MUI 5 asosida birxillashtirish ma'qul.
- UZ/RU/EN, URLda filterlarni saqlash, klaviatura bilan ishlaydigan product linklar, input label va alt textlar; keyin comparison, favorites va verified review kabi foydali imkoniyatlar.
- CRA'dan Vite'ga o'tish kichikroq modernizatsiya varianti: mavjud React/Router/Redux qoladi. SEO va server rendering savdo uchun zarur bo'lsa Next.js alohida katta variant. Avval build/test muammolarini tuzatib baseline yaratiladi. React jamoasi CRA'ni deprecated qilgan va mavjud loyihalarni framework yoki zamonaviy build toolga ko'chirishni tavsiya qiladi: [rasmiy manba](https://react.dev/blog/2025/02/14/sunsetting-create-react-app).

## 6. AI uchun variantlar

### Tavsiya: katalogga tayangan mahsulot tanlash va taqqoslash yordamchisi

Misol: “Kichik oshxona uchun, 500 dollargacha, elektrni kam sarflaydigan muzlatgich kerak.” Yordamchi talabni aniqlashtiradi, backend katalogidan mos mahsulotlarni oladi va 2–3 variantni havola hamda tushuntirish bilan taqqoslaydi.

**MVP oqimi:** foydalanuvchi matni → backend AI endpoint → tekshirilgan filterlar → mavjud katalog querysi → ruxsat etilgan product IDlar va izoh → frontend product kartalari. Dastlab oddiy filter/qidiruv yetadi; alohida vector baza shart emas. Narx, qoldiq, installment va mavjudlik AI matnidan emas, backenddan olinadi. Model tavsiya qilgan product IDlar tekshirilsin.

Hozirgi sxemada kategoriya/narx/energyClass/warranty/installment bor, ammo alohida brand/model, o'lcham, litr/kg sig'im, shovqin dB va kWh/yil yo'q. Shu maydonlar bo'lmasa “jim” yoki “kichik joyga sig'adi” degan tavsiyani ishonchli berib bo'lmaydi. Avval strukturali mahsulot xususiyatlari va ularning birliklarini qo'shish kerak.

| Variant | Foyda | Murakkablik | Shart va cheklov |
|---|---|---|---|
| **AI mahsulot maslahatchisi + taqqoslash** | Mijozga mos tanlovni tezlashtiradi | O'rta | Toza katalog va strukturali specs; birinchi tanlov |
| **Admin uchun AI kontent assistenti** | Tavsif yozish, UZ/RU/EN draft, specsni tartiblash | Past–o'rta | Admin tasdiqlaydi; AI narx/warranty/specni o'ylab topmaydi |
| **AI FAQ/manual yordamchisi** | Yetkazish, kafolat va qo'llanmalardan manbali javob | O'rta | Tasdiqlangan hujjatlar, manba havolasi, topilmasa operatorga yo'naltirish |
| **Tabiiy tildagi smart search** | Nomi aniq bo'lmagan ehtiyoj bo'yicha qidiruv | O'rta–yuqori | MVP filter parser; kattaroq katalogda keyword + vector/hybrid search |
| **Rasm orqali mahsulot topish** | Rasmga o'xshash katalog variantlarini beradi | Yuqori | Rasm sifati va catalog matching baholanishi kerak; keyingi bosqich |
| **Demand forecasting** | Qoldiq/xarid rejasini yaxshilaydi | Yuqori | Yetarli toza savdo tarixi kerak; hozir birinchi AI vazifa emas |

Gemini structured output yordamida model javobini belgilangan JSON shaklida olish mumkin, ammo bu fakt to'g'riligini ta'minlamaydi; server validatsiyasi baribir zarur: [rasmiy hujjat](https://ai.google.dev/gemini-api/docs/structured-output). Provider va modelni tanlash UZ/RU/EN sifat sinovi, latency, budjet va ma'lumot siyosati asosida bajarilsin; hozir biror modelni majburiy tanlashga dalil yo'q.

Keyinchalik hybrid search uchun MongoDBning mavjud ekotizimi ko'rib chiqilishi mumkin; deployment talablari alohida tekshiriladi: [MongoDB hujjati](https://www.mongodb.com/docs/search/tutorial/hybrid-search/).

AI server tarafida ishlasin; API key frontend env'ga kirmasin. Limit, timeout, xarajat chegarasi va AI ishlamasa oddiy katalog fallback bo'lsin. Birinchi versiyada yordamchi o'zi buyurtma yoki payment qilmasin. Sinov to'plami UZ/RU/EN so'rovlar, mavjud bo'lmagan mahsulot, nol qoldiq, noto'g'ri ID, prompt injection va API xatosini qamrasin. Tavsiya sifatini baholashda topilgan mahsulotning filterlarga mosligi, uydirma specs/narxlar yo'qligi, response vaqti va xarajat o'lchansin.

## 7. Deploy tayyorligi

| Yo'nalish | Holat |
|---|---|
| JS/static artifact chiqishi | Qisman: backend va oddiy frontend build chiqadi |
| Toza muhitda takrorlanuvchi install | Tasdiqlanmadi; lokal `.bin` muammoli; frontendda npm va yarn lockfile birga bor |
| Typecheck / CI / test gate | Tayyor emas |
| Role / checkout xavfsizligi | Tayyor emas |
| Backend production assets | Tayyor emas: `tsc` EJS va public fayllarni `dist`ga ko'chirmaydi; `dist/views`, `dist/public` yo'q |
| Production start | Backend `start` ts-node orqali source ishlatadi; compiled JS uchun alohida start strategiyasi kerak. Frontend `serve`ga global dependency bilan bog'langan |
| Secrets va URLlar | Backend env Gitda kuzatilmaydi; frontend `.env` kuzatiladi va API lokal manzilga yo'naltirilgan. Browser env'ga faqat public config kirishi kerak |
| Deploy script | `git reset --hard`, global install, frozen bo'lmagan install va `set -e` yo'qligi sabab almashtirilishi kerak; bajarilmadi |
| Health/readiness/shutdown | Alohida endpointlar va graceful shutdown oqimi topilmadi |
| Upload/storage | Lokal disk; doimiy volume yoki object storage, backup va limitlar kerak |
| Infratuzilma | VPS, DNS, HTTPS, reverse proxy, MongoDB connectivity, backup/restore, monitoring va rollback amalda tekshirilmadi |

Frontend static hostingda SPA fallback kerak: `/products/...`ga bevosita kirish va refresh ham index.htmlga tushishi lozim. Haqiqiy API origin bilan frontend qayta build qilinadi; reverse proxy va cookie domain/sameSite siyosati birgalikda sinovdan o'tadi.

Frontendning `.env` fayli Gitda ekanligi o'z-o'zidan secret sizganini anglatmaydi; mazmuni bu hisobotda oshkor qilinmadi. Joriy public konfiguratsiyani `.env.example`ga ajratish va haqiqiy lokal/production env fayllarni ignore qilish ma'qul. Tarixdagi maxfiy ma'lumot bo'yicha alohida audit bu ishga kiritilmadi.

## 8. Tavsiya etilgan ish tartibi va qabul mezonlari

1. **Xavfsizlik va savdo yaxlitligi.** Role escalation, server-side narx/stock, order transaction/idempotency/status, cookie/session va password log muammolarini yopish. Qabul: oddiy user STORE bo'la olmaydi; soxta narx/quantity va ortiqcha stock rad etiladi; takroriy so'rov order/ballni ko'paytirmaydi.
2. **Ishonchli tekshiruv va deployment.** Bitta package manager/lockfile, Node versiyasi, clean install, frontend typecheck/Jest/CI, backend regression testlari, assets copy va production start. Qabul: toza muhitdan build/test/start o'tadi, EJS/CSS/rasmlar mavjud, health/readiness ishlaydi.
3. **Mahsulot va UX upgrade.** Deals kontrakti, filter/pagination, loading/error/retry, responsive layout, fallback rasmlar, haqiqiy payment/demo chegarasi, strukturali specs va comparison. Qabul: desktop/mobile asosiy yo'llar va API error holatlari tekshiriladi.
4. **Staging release.** Faqat alohida test bazasida auth, admin, upload, order/stock, logout va kerak bo'lsa sandbox payment end-to-end sinovi; HTTPS, backup/restore va rollback mashqi. So'ng production qarori.
5. **AI MVP.** Katalog maslahatchisi va comparison; keyin admin draft assistenti. Qabul: faqat mavjud productlar, haqiqiy narx/stock, asoslangan izohlar, til testlari, belgilangan latency/xarajat chegaralari va AI ishlamasa fallback.

Jonli MongoDB, real login/order/payment, haqiqiy VPS deploy, mobil browser va load test bajarilmadi. Shuning uchun backend kompilyatsiyasi yoki frontend oddiy buildining o'tishini to'liq deploy sertifikati sifatida talqin qilish mumkin emas.
