# 4-bosqich — katalog, chegirma, xususiyatlar va comparison

Sana: 2026-11-01. Yakunlandi, foydalanuvchi review’i kutilmoqda. Backend → backend testlari → frontend → integratsiya tartibi saqlandi. 5-bosqich boshlanmadi.

## Nima va nega o‘zgardi

- Deals uchun avval tuzilgan, lekin aggregate’ga qo‘shilmagan shart tuzatildi. Faqat haqiqiy numeric eski narx > joriy narx bo‘lgan mahsulot deals’da; kategoriya/search/brand bilan birga ishlaydi.
- Yangi `/product/catalog`: `{ items, total, page, limit }`. Items va total bitta filterdan, stabil sort; frontenddagi taxminiy page+1 olib tashlandi. Eski `/product/all` array javobi saqlangan.
- Query runtime validation; regex sifatida bajarilmaydigan literal qidiruv; brand/model bo‘yicha qidiruv. Noto‘g‘ri query va IDlar aniq 400/404.
- Optional brand/model/specs: cm, L, kg, dB, kWh/yil, BTU va inch. Kategoriyaga mos maydonlar, unknown qiymatlar bo‘sh; eski katalogga taxminiy backfill yo‘q.
- Admin create/edit formalari oldPrice va specs’ni boshqaradi; categoryga mos bo‘lmagan maydonlar yashiriladi/disabled. Server allowlist va validation, CSRF saqlangan. Status ajax requestiga ham CSRF header qo‘shildi.
- Narx/muddat o‘zgarsa installment qayta hisoblanadi, oxirgi oy cents qoldig‘ini oladi. Concurrent tahrirlar version check bilan moslanadi; frontend monthlyni o‘zi hisoblamaydi.
- Frontend URL filter/search/sort/deals/brand/page holatini tiklaydi. Out-of-range sahifa totalga moslanadi. Loading/empty/error/retry va kech javobdan himoya katalog/detail/homepage’da qo‘shildi.
- Detail ID almashganda yangi mahsulot yuklanadi, eski qiymat yashiriladi. Specs va installment oxirgi oy summasi ko‘rsatiladi, fallback rasm mavjud.
- Uchtagacha comparison: tanlash/olib tashlash/tozalash, ko‘rinadigan pastki panel, current server ma’lumotlarini qayta yuklaydigan jadval. Unknown va unavailable alohida, retry mavjud.

[API, maydon birliklari va moslik hujjati](catalog-contract.md).

## Joriy tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| Backend `npm run typecheck` | O‘tdi |
| Backend `npm test` (build + unit/HTTP + isolated real replica-set) | 49 pass, 0 fail, 0 TODO |
| Frontend `yarn test --run` | 13 fayl, 38 test pass |
| Frontend `yarn typecheck` | O‘tdi |
| Frontend `yarn build` | O‘tdi; JS 793.03 kB / gzip 250.97 kB, chunk-size warning |
| Admin JavaScript syntax, ikki repo diff whitespace | O‘tdi |
| Markdown linklar va oldingi fayl hashlarini solishtirish | Tekshirildi; bosqichga tegishli tahrirlar, boshqa mavjud ishlar saqlangan |

Backend catalog integratsiyasida real vaqtinchalik MongoDB replica-set: deals+category/search/count, equal/string/null/infinite old price, bo‘sh/out-of-range sahifalar, stabil sort, literal regex belgilar, brand/model, invalid query/admin operators, optional specs/unset/category change, cash/price/month recalculation, concurrent edits, legacy array/detail HTTP, admin EJS escape/edit va haqiqiy multipart rasmli create. Oldingi auth/order/stock testlari ham o‘tdi. Endi oldingi deals TODO ham passing test.

Frontendda URL round-trip/encoding/invalid input, real pagination total, back navigation, error-vs-empty/retry, kech katalog javobi, out-of-range redirect, detail ID/error/retry, 3-product limit/remove, current comparison narxi, unknown/unavailable/retry va category-spec/zero qiymatlar tekshirildi. Oldingi auth/CSRF/order testlari ham saqlangan.

## Brauzer integratsiyasi

Production emas: localhost frontend 4317 + Express 4318 + `techhome_stage4_browser_only` vaqtinchalik replica-set. 10 sun’iy mahsulot va bitta test STORE, `.env`/jonli DB ishlatilmagan.

- Mehmon katalogida 10 natija: page 1’da 8, page 2’da 2 va next disabled.
- Deals+Kitchen: dastlab faqat 3 haqiqiy chegirma; page filterda 1’ga qaytdi, URL saqlandi.
- 3 ta comparison tanlandi; to‘rtinchisi bloklandi. Jadval current qiymatlar va “Not provided”ni to‘g‘ri ko‘rsatdi; tegishli bo‘lmagan kategoriya specs jadvaldan chiqarildi.
- Admin login va mahsulot edit formasi: test mahsulot narxi $10.01 → $12.01, old price $20, capacity 110 → 125 L saqlandi. Reload qiymatlarni tasdiqladi.
- Keyingi public reload’da shu mahsulot yangi haqiqiy deal sifatida ko‘rindi (Kitchen deals total 4). Comparison/detail’da $12.01, 125 L va 6 oy uchun $2.00/oy, final $2.01 ko‘rindi.
- Test fixture va preview to‘xtatildi; vaqtinchalik baza 10 mahsulot bilan yopildi. Screenshot `/tmp/techhome-stage4-comparison.png`da, repositoryga test account yoki test DB kiritilmadi.

## Qolgan cheklovlar

- 360/390/768/1440 bo‘yicha to‘liq responsive, UZ/RU/EN, statik rating va marketing matnlari 5-bosqichda. Hozirgi tekshiruv ularning tasdig‘i emas.
- Comparison tanlovi products bo‘limi ichidagi xotirada; reload yoki boshqa bo‘limga chiqishda tozalanadi. Doimiy favorites emas. Katalogga qo‘shilmagan specs admin tomonidan ishonchli ma’lumot bilan to‘ldirilmaguncha unknown qoladi.
- Faqat lokal fixture EJS renderida source views/static path berildi. Compiled production image assets/start, CI, index/load audit, backup/restore/rollback va staging 7–8-bosqichlarda; productionga tayyorlik tasdiqlanmagan.
- Yangi dependency yo‘q, backend npm va frontend Yarn Classic saqlangan. Jonli DB migration, commit, push, merge va deploy bajarilmadi.

Keyingi ish faqat tasdiqdan so‘ng: 5-bosqich — avval backend error code’lari, keyin frontend tillar va responsive.
