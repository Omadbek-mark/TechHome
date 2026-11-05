# TechHome backend

Faol papka: `/Users/omadbek/Desktop/TechHome`. Arxivdagi eski papkada ko‘chirilganlik eslatmasi bor; alohida dastur nusxasi yo‘q.

Express / TypeScript / MongoDB API va EJS admin UI. Ish tartibi: [AGENTS.md](AGENTS.md), [upgrade rejasi](docs/upgrade-plan.md).

## Muhit va tekshiruv

Node 22 (`nvm use`), npm 10; `package-lock.json` — dependency manbasi. Yarn ishlatilmaydi.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

`npm test` avval TypeScript build qiladi, so‘ng unit/HTTP va haqiqiy transaction integratsiya testlarini bajaradi. `.env` yoki `MONGO_URL` o‘qilmaydi. Unit/HTTP testlar MemoryStore va stub modellar bilan; `test/*.integration.cjs` esa o‘zining vaqtinchalik, loopback MongoDB 7.0.24 replica-setini ochadi va yakunda yopadi. Jonli DB ishlatilmaydi. Birinchi integratsiya run’da MongoDB binary rasmiy manbadan yuklanadi; keyingilar OS temp cache’dan foydalanadi. Lokal socket/process va dastlabki download ruxsati kerak bo‘lishi mumkin.

```sh
npm run test:unit
npm run test:integration
```

6-bosqich natijasi: 77 pass, 0 fail, 0 TODO. [Joriy hisobot](docs/stage-6-summary.md).

## Lokal server

`npm run start:dev` yoki `npm start` `.env`dagi MongoDBga ulanadi. Faqat alohida development bazasi bilan ishlating; test uchun jonli serverni boshlamang. `.env.example`dagi sozlamalar, mustaqil kamida 32 belgilik JWT/session secretlari, frontend/API uchun bir xil hostname va production HTTPS shart. [Auth sozlash va kontrakt](docs/auth-security.md). Env qiymatlarini log, hujjat yoki Gitga chiqarmang.

Bu bosqichda `npm run build` faqat JS chiqaradi; EJS/public assets va compiled production start 7-bosqichda tayyorlanadi. Hozir build’dan o‘tish deployga tayyorlik emas.

## Ma’lumot va API mosligi

1-bosqichda Mongoose typing va build muhiti moslandi. 2-bosqichda auth kontrakti yangilandi: HttpOnly JWT, CSRF, serverdan identity tiklash va nazoratli admin bootstrap. 3-bosqichda server narxi, stock transaction’i, idempotency va demo status oqimi qo‘shildi. [Order kontrakti va replica-set/index talablari](docs/order-checkout.md). Eski orderlar view-only, qayta hisoblanmaydi. 4-bosqich: [katalog API, specs va admin tahriri](docs/catalog-contract.md).

5-bosqich: [barqaror xato kodlari va frontend tillari](docs/ui-language-errors.md). Xato javoblarida string `code` va safe fallback `message` saqlanadi; raw DB/input tafsilotini qaytarmang.

6-bosqich: [Gemini advisor kontrakti va server sozlamalari](docs/advisor-contract.md). Public `/ai/status` va CSRF bilan `/ai/advisor`; persistent MongoDB quota replica-set talab qiladi. Standart AI o‘chiq, kalit faqat server runtime env’da. 2026-11-04 kuni haqiqiy provider UZ/RU/EN smoke testi o‘tdi; [natija va chegaralar](docs/gemini-live-smoke-2026-11-04.md). Lokal backendda AI yoqilgan, yangi muhitlarda server env alohida beriladi.
