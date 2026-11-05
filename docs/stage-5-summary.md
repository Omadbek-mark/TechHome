# 5-bosqich — UZ/RU/EN, responsive va foydalanuvchi matnlari

Sana: 2026-11-01 (Asia/Seoul). Holat: yakunlandi, foydalanuvchi review’i kutilmoqda. 6-bosqich boshlanmadi. Ish upgrade qilingan `iCloud Drive (Archive)/Desktop/TechHome` va yonidagi `TechHome-react` nusxalarida bajarildi.

## Nima o‘zgardi va sababi

Backend avval: legacy va yangi xatolar frontend tarjima qila oladigan string code’ga keltirildi; malformed JSON/payload, duplicate/validation va 404 JSON kontrakti qo‘shildi. Kutilmagan xato maxfiy body yoki DB tafsilotini qaytarmaydi. Failed update endi JSON body’siz 304 emas, 409. Auth/member identity va order/stock kontrakti saqlangan.

Backend testlaridan keyin frontend:

- Public navbar, home, katalog/detail/comparison, savat, login/signup, orders, profil, help/footer va xatolarga UZ/RU/EN. Til saqlanadi, route/query/filter/auth state o‘zgarmaydi.
- Desktop/mobile uchun bitta shared Navigation; mobil Drawer va til tanlash. Login/signup aniq label/autocomplete/pending lock bilan Dialog’ga moslandi.
- Katalog/detail grid, filterlar, footer/map, savat dialog’i, order total/tugmalari va profil formasi moslashuvchan. Singan rasm/rasm yo‘qligi uchun mavjud fallback; barcha katalog xususiyatlari taxminsiz.
- Keyboard focus, close/Escape, form label’lari, tugma va matn kontrasti, reduced-motion. Savatning 6px scroll sababi topilib tuzatildi; final cart ichki scroll tekshiruvi ham toza.
- Profil required/optional maydonlari serverga mos; preview URL revoke qilinadi; saqlash server tasdig‘i bilan. Orders loading/error/retry bo‘sh natijadan ajratildi.
- Statik rating, tasdiqlanmagan delivery/warranty/installment/trade-in/return va’dalari, qo‘llanmaydigan contact form olib tashlandi/neytrallashtirildi. Demo payment eslatmalari uch tilda saqlandi.

[Amaldagi error, til va responsive kontrakti](ui-language-errors.md).

## Tekshiruv natijalari

| Tekshiruv | Natija |
|---|---|
| Backend `npm run typecheck` | O‘tdi |
| Backend `npm test` (build, unit/HTTP, alohida replica-set) | 52 pass, 0 fail, 0 TODO |
| Frontend `yarn test --run` | 15 fayl, 44 pass |
| Frontend `yarn build` (ichida typecheck) | O‘tdi |
| Diff whitespace, lokal Markdown linklar, oldingi o‘zgarishlar hash tekshiruvi | O‘tdi |
| Yangi dependency/lockfile o‘zgarishi | Yo‘q; backend npm, frontend Yarn Classic saqlangan |

Yangi backend sinovlari: barqaror credential/blocked/auth/conflict code’lari, 304 → 409, parse/oversize/validation/duplicate/unknown error’da maxfiy marker chiqmasligi, public HTTP credential/404/JSON kontrakti. Oldingi order, stock, upload va katalog sinovlari ham o‘tgan.

Yangi frontend sinovlari: uch tilda matn va interpolation qamrovi, error code tarjimasi/transport tafsilotini yashirish, til o‘zgarganda URL/query/filter saqlanishi va fetch takrorlanmasligi, focus restore va Escape, profile label/optional field/save. Oldingi 38 regression testi moslangan va saqlangan.

## Brauzer integratsiyasi va o‘lchamlar

Production emas: 4317 preview + 4318 Express + `techhome_stage5_browser_only` vaqtinchalik replica-set. 10 sun’iy mahsulot, test USER/STORE va uchta boshlang‘ich demo order. `.env` yoki jonli DB ishlatilmagan.

Yakuniy build’da 6 ekran × 4 o‘lcham va alohida savat × 4 o‘lcham: **28 tekshiruv, 0 sahifa overflow**. Client width browser scrollbariga qarab requested viewport’dan 15px kichik bo‘lishi mumkin; taqqoslash shu client width bilan bajarilgan.

| Requested width | Home | Katalog | Detail | Orders | Profil | Help | Savat |
|---|---|---|---|---|---|---|---|
| 360px | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi |
| 390px | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi |
| 768px | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi |
| 1440px | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi | O‘tdi |

Carousel/tab/comparison jadvalining o‘z ichidagi scroll’i saqlangan; bu sahifa overflow’i emas. O‘lcham override’i tekshiruvdan keyin reset qilindi.

Amaliy oqimlar:

- 360px ruscha login: label/focus va noto‘g‘ri credential xabari tarjimasi, keyin synthetic user bilan muvaffaqiyatli login.
- Mobil Drawer, protected orders va profil ko‘rindi. 390px profil saqlash server tasdig‘i va ruscha success bilan ishladi.
- Filterlangan katalogda RU → EN → UZ til almashganda URL va Deals/Kitchen filtrlari saqlandi; oxirgi screenshot’da qidiruv placeholder’i ham o‘zbekcha.
- 360px savatda Tab focus close tugmasiga o‘tdi; close/Escape ishladi. Yakuniy savat o‘lchamlarida ichki overflow ham qolmadi.
- Faqat test bazasida yangi demo order yaratildi: server total $15.01, savat tozalandi, o‘zbekcha tasdiq/orders ko‘rindi. Haqiqiy pul yoki real delivery yo‘q.
- Numeric oy formati browserda uchragan UZ `M11` fallback’ini yo‘qotdi; final order sanasi tushunarli numeric formatda.

Lokal dalillar: `/tmp/techhome-stage5-viewport-metrics.json`, `/tmp/techhome-stage5-orders-360.png`, `/tmp/techhome-stage5-cart-360.png`, `/tmp/techhome-stage5-catalog-1440.png`. Test preview/fixture to‘xtatildi, yangi browser o‘lchami saqlab qolinmadi.

## Qolgan cheklovlar va review chegarasi

- Tekshiruv IAB/Chromium viewport’lari va jsdom’da. Haqiqiy telefon/Safari/VoiceOver hamda to‘liq WCAG audit o‘tkazildi deb hisoblanmaydi.
- UI uch tilda; server katalogidagi nom/tavsif/brendlar avtomatik tarjima qilinmaydi. Admin EJS va native browser/uchinchi tomon interfeyslari alohida.
- Vite JS 825.02 kB / gzip 261.00 kB; chunk-size warning va katta mavjud banner/footer rasmlari saqlanadi. Build muvaffaqiyatli, optimizatsiya deploy ishlari bilan baholanadi.
- Docker/CI, staging, HTTPS production cookie, backup/restore/rollback va real qurilma tekshiruvi hali release gate’da. Productionga tayyorlik tasdiqlanmadi.
- Secrets/env va boshqa oldingi ishlar o‘zgartirilmadi. Commit, push, merge, serverga yozish va deploy bajarilmadi.

Keyingi bosqich faqat foydalanuvchi tasdig‘idan so‘ng: 6 — Gemini mahsulot maslahatchisi, backenddan boshlanadi.
