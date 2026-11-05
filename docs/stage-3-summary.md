# 3-bosqich — order, stock va demo payment

Sana: 2026-11-01. Holat: lokal implementatsiya yakunlandi; foydalanuvchi review’i kutilmoqda. 4-bosqich boshlanmadi. Backend → backend testlari → frontend → integratsiya tartibida bajarildi.

## O‘zgarish va sabab

- Narx, installment va stock browserdan emas, DBdagi active mahsulotdan olinadi. Quantity va savat serverda tekshiriladi; cents hisoblash floating-point summalarni cheklaydi. Mahsulot snapshoti buyurtma tarixini katalog tahriridan saqlaydi.
- Order/item/stock transaction’da. Oxirgi stockka parallel xarid oversell qilmaydi; xatoda qisman order/reservation qolmaydi.
- Unique member/key index va canonical cart hash takroriy submitni bitta orderga bog‘laydi. Turli cart bilan bir key — 409. Index yo‘q bo‘lsa checkout yozishdan oldin to‘xtaydi.
- Demo `PAUSE → PROCESS → FINISH`, cancel `PAUSE → DELETE`; stock cancel’da bir marta, USER balli PROCESS’da bir marta o‘zgaradi. Owner va joriy ACTIVE member tekshiriladi. Eski orderlar read-only, total/stock/ball qayta hisoblanmaydi.
- Frontend Yarn’da tekshirildi. Submit/status tugmalari bloklanadi, retry key tab sessionStorage’da saqlanadi. Client narxi yuborilmaydi; server total ko‘rsatiladi. Xatoda savat/key qoladi; muvaffaqiyatdan keyingi kech javob tahrirlangan savatni tozalamaydi.
- Order kartalari snapshotdan foydalanadi, o‘chirilgan mahsulot order qatorini yashirmaydi. Card/CVV maydonlari va payment logotiplari olib tashlandi. Demo tasdiqlashda pul yechilmasligi ochiq aytiladi.

Kontrakt va deploy oldi talablar: [order-checkout.md](order-checkout.md).

## Joriy tekshiruv natijalari

| Tekshiruv | Natija |
|---|---|
| Backend `npm run typecheck` | O‘tdi |
| Backend `npm test` (build + unit/HTTP + real replica-set) | 41 test: 40 pass, 0 fail, 1 TODO |
| Frontend `yarn test --run` | 10 fayl, 28 test pass |
| Frontend `yarn build` (ichida `yarn typecheck`) | O‘tdi |
| Backend/frontend `git diff --check` | O‘tdi |
| Bosqichdan oldingi fayl hashlarini solishtirish | Faqat bosqichga tegishli fayllar o‘zgargan; boshqa mavjud ishlar saqlangan |

Backend integratsiyasi MongoDB 7.0.24’ning alohida vaqtinchalik replica-setida ishladi. Test `.env` yoki `MONGO_URL`ni o‘qimaydi; unit stub testlari bilan cheklanilmagan. Price spoof, invalid qty/key, cents/shipping/installment, snapshot, concurrent last stock, identical/different-cart key, rollback, repeat cancel/confirm/finish, confirm-vs-cancel, legacy read-only, missing index va haqiqiy HTTP auth/CSRF/order tekshirildi.

Frontend testlari retry/reload/account/cart key ajratilishi, corrupt cart va stock clamp, double-submit, network failure’dan keyingi retry, server total, kech javobda tahrirlangan savatni saqlash, status action lock, snapshot/fallback va card/CVV yo‘qligini qamraydi. Jonli API ishlatilmaydi.

## Brauzer integratsiyasi

Loopback preview (4317) + alohida Express fixture (4318) + o‘zining `techhome_stage3_browser_only` replica-set bazasi. Synthetic account va mahsulot; real foydalanuvchi/order/payment yo‘q.

- Login va katalog/detail’dan savatga qo‘shish ishladi.
- Server narxi $42.25, delivery $5, total $47.25 bilan order yaratildi; savat tozalandi, server total va demo eslatma ko‘rindi.
- Birinchi order demo tasdiqlanib `FINISH`ga o‘tdi; ikkinchisi `DELETE` qilindi.
- Yakuniy fixture DB tekshiruvi: orderlar `[FINISH, DELETE]`, har biri $47.25; boshlang‘ich stock 3, yakuniy 2; ball 1. Demak tasdiqlangan order stocki sarflangan, cancellation qaytargan va ball takrorlanmagan.
- Native confirm oynalari sabab browser avtomatizatsiyasi ayrim clicklarda interruption/timeout qaytardi; amal ko‘r-ko‘rona takrorlanmadi. Natija UI va yakuniy DB holati bilan tasdiqlandi.
- Functional browser sinovidan keyin savat summasi ikki kasrga moslandi, bo‘sh rasm fallback’i va order totals wrap’i qo‘shildi; yakuniy typecheck/build/test o‘tdi. Bu kichik ko‘rinish tahrirlari uchun qayta browser screenshot olinmadi. 360/390/768/1440 responsive to‘liq tasdig‘i 5-bosqichda.
- Preview/fixture jarayonlari to‘xtatilgani tekshirildi. Fixture shutdown’da bir vaqtning o‘zida mongod signal olgani uchun cleanup connection-refused xabari chiqdi; yakuniy DB tekshiruvi undan oldin olingan, jarayon qolmagan.

## Qolgan cheklovlar

- Yagona TODO: chegirmasiz mahsulot deals’ga tushmasligi, 4-bosqichga tegishli. Bu passing check emas.
- Production replica-set, unique index va eski ma’lumot audit/backup’i hali tekshirilmadi; jonli DBga yozish yoki migration bajarilmadi. Standalone/indekssiz checkout xavfsiz tarzda rad etiladi.
- Legacy orderlar faqat ko‘rish uchun. Stock reservation avtomatik expiry’si va real payment bu release’da yo‘q. Browser storage tozalansa retry key yo‘qoladi; noaniq holatda Orders tekshiriladi.
- Order listining kengroq loading/error/pagination UX’i keyingi katalog/UX bosqichlarida; yangi barcha tillar 5-bosqichda.
- Vite bundle taxminan 772 kB JS (246 kB gzip), chunk-size warning saqlanadi; xato emas, optimizatsiya keyingi bosqichlarda.
- Docker/CI, HTTPS production cookie, staging, backup/restore va rollback hali bajarilmagan. **Production deployga tayyor deb hisoblanmaydi.**
- Commit, push, merge, serverga yozish va deploy bajarilmadi. Backend npm, frontend Yarn Classic 1.22.22 tartibi saqlangan.

Keyingi bosqich faqat foydalanuvchi tasdig‘idan keyin: 4 — katalog, deals, pagination va comparison; backenddan boshlanadi.
