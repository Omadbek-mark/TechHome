# Order checkout kontrakti — 3-bosqich

## API

Mavjud auth cookie/CSRF talablari saqlanadi. POST `/order/create`: `Idempotency-Key` (16–128 belgi, harf/raqam bilan boshlanadi, qolganlari harf/raqam/`_`/`-`) va `[{ productId, itemQuantity }]`. Client `itemPrice` hisoblashga olinmaydi. Savat 1–50 qator, quantity 1–99 butun son; bir xil product ID jamlanadi va 99 bilan cheklanadi. IDlar canonical tartibda hash qilinadi.

Server active mahsulotning narxi va stockini o‘qiydi; stockni transaction’da atomik kamaytiradi. Narx USD integer cents’da, shipping subtotal $100 dan past bo‘lsa $5, aks holda $0. Mahsulot nomi, rasmi, narxi va installment qiymatlari order item’da snapshot. Installment per-unit: dastlabki oylar cents bo‘yicha pastga yaxlitlanadi, oxirgi oy qoldiqni oladi. Bu kredit yoki real payment emas.

201 javob persisted order va `readOnly: false`, `paymentMode: DEMO`, server totals. Ichki key/hash/workflow/stock flaglari response’da yo‘q. GET `/order/all?orderStatus=PAUSE&page=1&limit=5` snapshot itemlar va mavjud productData bilan array qaytaradi; limit 1–50. Frontend snapshotni ustun oladi; o‘chirilgan mahsulot order qatorini yo‘qotmaydi.

POST `/order/update`: `{ orderId, orderStatus }`. Faqat egasi va joriy ACTIVE hisob. Demo o‘tishlar: `PAUSE → PROCESS → FINISH`, cancellation `PAUSE → DELETE`. Bir xil status qayta yuborilishi no-op. Boshqa o‘tish 409. Cancel stockni bir marta qaytaradi; PROCESS USER ballini bir marta +1 qiladi. Barcha yozuvlar bitta transaction’da. Mahsulotni qaytarib bo‘lmasa cancellation ham rollback bo‘ladi.

## Retry va legacy

Unique `{ memberId: 1, idempotencyKey: 1 }` partial string index bitta niyatni bir marta yaratadi. O‘sha key + canonical cart oldingi orderni qaytaradi; boshqa cart 409 `IDEMPOTENCY_CONFLICT`. Retry stockni/ballni qayta o‘zgartirmaydi. Yangi niyat yangi key oladi.

Frontend tab sessionStorage’da member/cart signature/key saqlaydi; reload/network failure’da o‘sha key. Submit va status tugmalari pending paytida bloklanadi. Faqat product ID/quantity yuboriladi. Muvaffaqiyatdan keyin snapshotga mos savat tozalanadi; tarmoq xatosida savat/key saqlanadi. Edit/member o‘zgarishi yangi niyat; avtomatik POST replay yo‘q. Brauzer storage butunlay tozalansa retry key ham yo‘qoladi — avval Orders’ni tekshirish kerak.

`workflowVersion: 1`/DEMO bo‘lmagan eski orderlar view-only (`HISTORICAL_ORDER_READ_ONLY`). Eski total/status/itemlar o‘zgartirilmaydi, stock/ballga qayta ta’sir yo‘q. Avtomatik migration yo‘q.

## Deploy oldidan

- MongoDB replica-set (yoki transaction qo‘llovchi sharded cluster) zarur. Standalone’da xavfli fallback yo‘q; 503 `TRANSACTIONS_REQUIRED`.
- Yuqoridagi unique index mavjud bo‘lishi shart; yo‘q bo‘lsa checkout 503 `CHECKOUT_UNAVAILABLE`. Production index yaratish/schema audit/backup alohida serverga yozish ko‘rsatmasi bilan, 7–8-bosqichda tayyorlanadi. Hozir jonli DBga migration bajarilmadi.
- Eski klient yangi `Idempotency-Key` yubormasa 400; backend va frontend mos versiyalari ketma-ket chiqarilsin.
- PAUSE stockni band qiladi; ushbu release’da avtomatik reservation expiry yo‘q. Bekor qilish stockni bo‘shatadi.
- Real payment, refund va provider integratsiyasi mavjud emas. Card/CVV yig‘ilmaydi.

## Tekshiruv

`npm test`: auth/input regressiyalar, real isolated replica-set’da narx spoof, cents/shipping/installment snapshot, parallel oxirgi stock, parallel identical/different cart key, rollback, repeat cancel/confirm, status race, legacy, missing index va HTTP auth/CSRF/order integratsiyasi. Live DB URI/env ishlatilmaydi.
