# Desktop’ga birlashtirish — 2026-11-04

Faol backend: `/Users/omadbek/Desktop/TechHome`.
Faol frontend: `/Users/omadbek/Desktop/TechHome-react`.

Oldingi Desktop nusxalari barcha Git metadata, lokal env, uploads va paketlari bilan `/Users/omadbek/Desktop/TechHome-backup-2026-11-04-224602` ichida saqlangan. Hech bir nusxa o‘chirilmagan. Yangilangan repository’lar Git tarixi va o‘rnatilgan paketlari bilan Desktop’ga ko‘chirildi. Arxivdagi oldingi ikki papkada faqat yangi Desktop joylashuvi haqida eslatma qoldirildi; alohida faol dastur nusxasi yo‘q. Backend hujjatlari uchun eski docs yo‘li Desktop’dagi docs’ga symbolic link, tarixiy hujjat havolalari ishlashda davom etadi.

Boshlang‘ich upgrade baseline bilan solishtirganda Desktop kodida yangi mustaqil o‘zgarish topilmadi. Backend npm install’dan kelgan eski lockfile va Finder metadata zaxirada; faol npm lockfile yangilangan versiya. Frontenddagi eski CRA entry/type fayllari va package-lock zaxirada, faol loyiha Vite/Yarn. Desktop’da keyin qo‘yilgan Gemini kaliti yangilangan backend env’da ham saqlangan; model `gemini-3.5-flash-lite`, AI yoqilgan. MongoDB/port sozlamalari ikki nusxada bir xil. Yangilangan 32+ belgili auth secretlari saqlandi; qayta login talab qilinishi mumkin.

Ko‘chirishdan oldin va keyin barcha manba/asset/env/upload fayllari hash manifest bilan solishtirildi; Git HEAD va ishchi holat saqlandi. node_modules/build/dist/.git ichki fayllari manifestda emas; butun papka rename orqali ko‘chirildi. Backend avval `npm run typecheck`, `npm test`; keyin frontend `yarn test --run`, `yarn build` tekshirildi. Ushbu testlar jonli MongoDB yoki haqiqiy Gemini’ga so‘rov yubormaydi.

Bosqich 7 boshlanmadi; commit/push/deploy yo‘q. Tarixiy hujjatlardagi arxiv yo‘llari ishni o‘sha paytda qayerda bajarganimizni ko‘rsatadi; joriy ishlash joyi Desktop.

## Development tekshiruvi va tuzatish

Desktop’dan backend `npm run start:dev` bilan ishga tushdi, mavjud konfiguratsiyadagi MongoDBga ulanish muvaffaqiyatli; port 3002. Frontend Vite port 3000. Browser’da `http://127.0.0.1:3000/advisor` sahifasi va navbar’dagi AI maslahatchi ko‘rindi, input mavjud/yoqilgan. API konfiguratsiyasi `http://127.0.0.1:3002`; hostname mos. Bu tekshiruvda AI POST/order/payment/profile test yozuvi yuborilmadi.

Development rejimida `createTheme_default is not a function` xatosi topildi; toza Vite cache bilan ham takrorlandi. `src/index.tsx`da MUI styles/theme importlari App komponentidan oldin joylashtirilgach oq sahifa yo‘qoldi. Oldingi fayl va eski Vite cache zaxirada saqlandi. Bu dependency yoki UI dizayn o‘zgarishi emas. Production build oldin ham o‘tgan; dev browser sinovi xatoni aniqladi. [MUI issue](https://github.com/mui/material-ui/issues/43433), [Vite dependency optimizer](https://vite.dev/config/dep-optimization-options.html).

Yakuniy natija: backend 77/77, frontend 53/53, backend typecheck va frontend build muvaffaqiyatli. MUI import tuzatishidan keyin frontend test/build qayta bajarildi. Katta bundle bo‘yicha avvalgi Vite warning saqlanadi. Dev serverlar foydalanuvchi foydalanishi uchun ishga tushirilgan holda qoldirildi; oddiy development server, production deploy emas.
