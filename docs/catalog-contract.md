# Katalog va comparison kontrakti — 4-bosqich

## Public API

Yangi `GET /product/catalog` javobi: `{ items, total, page, limit }`. Total va items bitta `$match` + `$facet`dan olinadi; bo‘sh yoki chegaradan tashqari sahifa 200 bilan bo‘sh items qaytaradi, haqiqiy total saqlanadi. Sort teng qiymatlarda `_id` bilan barqaror.

| Query | Qoidasi |
|---|---|
| page | 1–100000, default 1 |
| limit | 1–50, default 8 |
| order | `createdAt` (yangi avval), `productViews` (ko‘p avval), `productPrice` (arzon avval), `priceDesc` (qimmat avval) |
| productCategory | KITCHEN / LAUNDRY / CLIMATE / CLEANING / ENTERTAINMENT |
| search | 100 belgigacha, productName/brand/model ichida literal case-insensitive matn |
| brand | 80 belgigacha, literal case-insensitive exact brand |
| onSale | true/false |

Array/object/duplicate query qiymatlari va noto‘g‘ri enum/page/limit 400 `INVALID_CATALOG_FILTER`. Search regex operator sifatida bajarilmaydi. Faqat PROCESS mahsulotlar ommaviy ko‘rinadi.

Deals sharti: productOldPrice numeric, musbat, chekli ruxsat etilgan diapazonda va productPrice’dan katta. Kategoriya/search/brand va deals birga ishlaydi. `productOldPrice` noto‘g‘ri yoki narxni pasaytirmasa API uni chegirma sifatida ko‘rsatmaydi.

Eski `GET /product/all` array kontrakti saqlangan; bir xil validatsiya/filter ishlatadi. Bo‘sh natija endi 200 `[]`, avvalgi 404 emas. Homepage o‘tish davrida shu endpointda. `GET /product/:id`: noto‘g‘ri ObjectId 400 `INVALID_PRODUCT_ID`, yo‘q/noactive mahsulot 404. Mavjud authenticated view accounting saqlanadi.

## Mahsulot maydonlari

`brand`, `model`, `productOldPrice` optional. Spec maydonlari:

| Maydon | Birlik | Tegishli kategoriya |
|---|---|---|
| widthCm, heightCm, depthCm | cm | Umumiy |
| noiseDb | dB | Umumiy |
| energyKwhPerYear | kWh/yil | Umumiy; per-cycle son yozilmaydi |
| capacityLiters | L | KITCHEN |
| loadKg | kg | LAUNDRY |
| coolingCapacityBtu | BTU | CLIMATE |
| dustCapacityLiters | L | CLEANING |
| screenSizeInches | inch | ENTERTAINMENT |

Specs musbat chekli sonlar, noma’lum maydonlar saqlanmaydi; bir xil o‘lcham/energiya birligi bo‘yicha solishtiriladi. UI’dagi “Not provided” qiymat taxmin qilinmaganini anglatadi. Backend yangi optional maydonlarga default specs qo‘ymaydi, mavjud ma’lumotlarga backfill/migration bajarmaydi.

Admin create/edit allowlist bilan. JSON/Mongo operatorlari va noma’lum maydonlar rad etiladi; views/installmentMonthly/LastMonth client qiymatlari qabul qilinmaydi. Bo‘sh string/null optional maydonni unset qiladi. productOldPrice berilsa joriy narxdan katta bo‘lishi kerak; narx oshsa eski chegirmani ham tahrirlash/tozalash kerak. Kategoriya o‘zgarganda mos kelmaydigan eski category specs tozalanadi. EJS qiymatlari escape qilinadi, update/create CSRF bilan.

Narx/muddat tahririda installment serverda qayta hisoblanadi. 6/12/24 oy: dastlabki oylar integer cents bo‘yicha pastga yaxlitlanadi, oxirgi oy qoldiqni oladi. Cash-only’da monthly/lastMonth yo‘q. Optimistic version check concurrent narx/muddat tahririni bir-birini yo‘qotishdan saqlaydi. Public projection eski stale installment qiymatlarini ham joriy narx/muddatdan hisoblaydi, DB tarixini yoki old order snapshotini o‘zgartirmaydi.

## Frontend

Katalog URL query’dan tiklanadi; parser APIga yuborishdan oldin qiymatlarni tekshiradi. Search/brand URL-encoded; filter/sort o‘zgarishi page=1. Back/forward va reload filterlarni tiklaydi. Sahifa total’dan oshsa oxirgi mavjud sahifaga replace qiladi. Noto‘g‘ri URL qiymatlari xavfsiz defaultga tushadi; noma’lum boshqa query (masalan language) filter o‘zgarishida saqlanadi.

Katalog, detail va homepage bo‘limlarida loading/empty/error/retry ajratilgan. Kechikkan oldingi route/filter javobi joriy ekran ustiga yozmaydi. Detail ID o‘zgarganda old mahsulot yashiriladi. Frontend installmentni o‘zi uydirmaydi; server qiymatini ko‘rsatadi.

Comparison `/products` ichida katalog/detail o‘rtasida saqlanadigan 3 tagacha tanlov. Panel doim ko‘rinadigan pastki qismda; remove/clear, dialog close/Escape. Jadval ochilganda IDlar bo‘yicha current mahsulotlar qayta so‘raladi. Loading paytida eski tanlov narxlari yangi jadval natijasi sifatida ko‘rsatilmaydi; o‘chgan yoki olinmagan mahsulot “Unavailable”, retry mavjud. Kategoriya uchun mos specs ko‘rsatiladi; unknown “Not provided”. Bu doimiy favorites emas: to‘liq reload yoki products bo‘limidan chiqish tanlovni tozalaydi. Price/stock checkout oldidan baribir backendda qayta tekshiriladi.

## Chegaralar

Ushbu bosqich production DBga yozmaydi va yangi indeks/migrationni serverda qo‘llamaydi. Search uchun kengroq indexing/load sinovi va Docker/CI keyingi bosqichlarda. Har bir marka/model/spec admin tomonidan tekshirilgan manbadan kiritilishi kerak; tizim eski mahsulotlarni taxmin bilan boyitmaydi. Statik rating/tasdiqlanmagan marketing matnlari, tillar va to‘liq responsive tekshiruvi 5-bosqichda.

2026-11-05 foydalanuvchi ko‘rsatmasi bilan adminning eski EJS create/status UI qaytarildi, inline edit/specs formalari olib tashlandi. Optional specs API/model kontrakti va mavjud qiymatlar saqlangan. [Admin tiklash hisoboti](admin-restore-2026-11-05.md).

Keyingi 2026-11-05 tasdiqlangan topshiriq: eski create/status UI saqlangan holda Products jadvaliga **Price / deal** tugmasi va kichik current/old price dialogi qo‘shildi. Mavjud protected update API va CSRF ishlatiladi; specs editor qaytarilmadi. [Foydalanish va testlar](admin-deals-2026-11-05.md).
