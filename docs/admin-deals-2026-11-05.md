# Admin narx / chegirma oynasi — 2026-11-05

## Foydalanish

Admin → Products → mahsulot qatoridagi **Price / deal**:

1. **Current price (USD)** — xaridorga ko‘rsatiladigan hozirgi narx, masalan 350.
2. **Old price (USD, optional)** — chegirmadan oldingi narx, masalan 400; hozirgi narxdan katta bo‘lishi shart.
3. **Save prices** — server tasdig‘idan keyin qator yangilanadi, eski narx ustidan chiziladi va Deal belgisi chiqadi.
4. Chegirmani olib tashlash: **Remove deal**, so‘ng **Save prices**. Eski narx bo‘shaydi; hozirgi narx avtomatik oshmaydi. Zarur bo‘lsa Current price ham alohida o‘zgartiriladi.

Public katalog/Deals’da faqat PROCESS mahsulot ko‘rinadi. Narx va oylik summa serverdan; frontend keyingi katalog yuklanishida yangi qiymatlarni oladi. Allaqachon ochiq boshqa browser oynasi avtomatik push bilan yangilanmaydi.

## Amalga oshirish

Yangi route/dependency yoki SPA o‘zgarishi kerak bo‘lmadi. Mavjud `POST /admin/product/:id` STORE/session/CSRF himoyasi va productFields validation’i ishlatildi. Backend biznes qoidalari oldin alohida testdan o‘tkazildi, keyin EJS/CSS/JS oynasi ulandi. Status/create UI va specs editor holati saqlandi.

Narxlar 0–10000000, 0.01 aniqlikda. Bo‘sh old price serverda unset qilinadi. Narxga bog‘liq installment/remainder mavjud server hisobiga muvofiq qayta hisoblanadi. Stock, status va tarixiy orderlar bu amal bilan o‘zgarmaydi. Save pending’da input/tugmalar bloklangan; xatoda qiymatlar saqlanadi va server muvaffaqiyatisiz jadval o‘zgarmaydi. Error matni xavfsiz code mapping bilan. Native dialog focus/Escape va label’lari bor; Bootstrap reset’i yopiq dialogni ko‘rsatmasligi uchun `:not([open])` yashirish qoidasiga ega.

## Tekshiruv

- Avval backend katalog/HTTP testi: **9/9**.
- Yakuniy **npm test: 79/79**, build bilan; fail/skipped/TODO yo‘q.
- Testlar enable → invalid equal/lower/negative/precision → remove, CSRF va mavjud API orqali Deals total hamda installment qiymatlarini tekshiradi. EJS yangi control/label va escape’lari ham tekshirildi.
- `node --check src/public/js/products.js` va `git diff --check` o‘tdi.
- Brauzerda real EJS/session/bcrypt/CSRF/price service va alohida MongoDB replica-set bilan test: $400 → $350, old $400 → Deals total 1, monthly $58.33, stock 15. Reload’da saqlandi; Remove deal + save’dan keyin Deals total 0, current price $350 qoldi. Noto‘g‘ri old price $300 native validation bilan to‘sildi.
- Desktop va 390px modal ko‘rinishi tekshirildi. Mavjud butun admin jadvalining mobil overflow’i bu kichik topshiriqda qayta ishlab chiqilmadi; yangi modal viewportga sig‘adi.
- Barcha yozuvlar faqat `techhome_price_deal_browser_only` va avtomatik test bazalarida. Jonli mahsulot narxlari o‘zgartirilmadi. Test serveri yakunda to‘xtatiladi.

Desktop dalili `/tmp/techhome-admin-price-deal.png` (synthetic test mahsuloti). Backend admin EJS o‘zgargani uchun npm ishlatildi; qo‘shni React frontendda o‘zgarish yo‘q, Yarn suite qayta bajarilmadi. Commit/push/deploy bajarilmadi.
