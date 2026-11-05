# UI tillari va error kontrakti — 5-bosqich

## Backend xatolari

Public API va JSON admin xatolari `{ code: string, message: string }` qaytaradi. `code` tarjima kaliti uchun barqaror; `message` inglizcha fallback, UI uni to‘g‘ridan-to‘g‘ri ko‘rsatmaydi. Error javoblari `Cache-Control: no-store` bilan.

- Login: `INVALID_CREDENTIALS`, `ACCOUNT_BLOCKED`, `UNAUTHENTICATED`, `ACCOUNT_EXISTS`, `FORBIDDEN`.
- Input/upload: `INVALID_INPUT`, `INVALID_IMAGE`, `UPLOAD_LIMIT`, `IMAGE_REQUIRED`, `VALIDATION_FAILED`, `INVALID_JSON`, `PAYLOAD_TOO_LARGE`.
- Session/rate: `CSRF_INVALID`, `RATE_LIMITED`, `HTTPS_REQUIRED`, `ORIGIN_DENIED`.
- Katalog/order uchun oldingi barqaror kodlar saqlanadi: `OUT_OF_STOCK`, `INVALID_CART`, `IDEMPOTENCY_CONFLICT`, `INVALID_TRANSITION`, `INVENTORY_CONFLICT`, `HISTORICAL_ORDER_READ_ONLY`, `CATALOG_PRICE_INVALID`, `CHECKOUT_UNAVAILABLE`, `TRANSACTIONS_REQUIRED`, `INVALID_CATALOG_FILTER`, `INVALID_PRODUCT*`, `PRODUCT_CHANGED` va boshqalar.
- 404: `NOT_FOUND`, `RESOURCE_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `ORDER_NOT_FOUND`.
- Takroriy qiymat: `DUPLICATE_VALUE`; kutilmagan xato: `INTERNAL_ERROR`. DB input, stack va parse body chiqarilmaydi.

Legacy service `Errors.code` ichkarida HTTP soni bo‘lib qoladi: auth/session tekshiruvlari buzilmaydi. Faqat response adapter string code beradi. Legacy update failure 304 o‘rniga 409: 304 JSON error body uchun yaroqsiz. Takroriy signup 409 `ACCOUNT_EXISTS`; umumiy DB xatosi yolg‘on “account exists” deb ko‘rsatilmaydi.

`test/error-contract.test.cjs` va haqiqiy HTTP testlari credential, malformed JSON, unknown route, conflict/validation va xatoda maxfiy qiymatlar chiqmasligini tekshiradi. Order/katalog/auth integratsiyalari regressiya sifatida saqlangan.

## Frontend tillari

`src/lib/i18n/index.ts` va `messages.json`: UZ/RU/EN. React 18 `useSyncExternalStore` bilan kichik umumiy til store’i, yangi dependency yo‘q. Standart til UZ; `techhome.language` localStorage’da saqlanadi. Storage ishlamasa ham joriy tabda til almashadi. `document.documentElement.lang` yangilanadi.

Komponentlar `useI18n().t(...)`; React’dan tashqarida `translate(...)`. Dinamik qiymat `{{name}}`, `{{count}}`, `{{amount}}` kabi placeholder orqali. Uch tilda bir xil placeholderlar test bilan tekshiriladi. Yangi UI matni qo‘shilganda uch til ham to‘ldirilsin.

Til setter’i history/navigation, auth yoki API cache’ini o‘zgartirmaydi. Route/query, tanlangan filter, savat va joriy forma state’i saqlanadi. Query/detail effect’lari tilga bog‘lanmagan: faqat tarjima uchun qayta fetch qilinmaydi. Browser reload tanlangan tilni tiklaydi. Bu serverdagi katalog nomi/tavsifini avtomatik tarjima qilish emas; original mahsulot ma’lumoti saqlanadi.

`errorMessage(error)` response code’ni tarjimaga bog‘laydi; unknown/network error uchun umumiy lokal xabar. Raw server message, DB tafsiloti yoki transport error’i UIga chiqmaydi. Local validation tarjima kaliti orqali berilishi mumkin. Sana uchun numeric month format ishlatiladi: browserda UZ uchun uchragan `M11` fallback’i foydalanuvchiga chiqmaydi. Narxlar USD bo‘lib qoladi, server summasi o‘zgartirilmaydi.

## Responsive va accessibility

- Shared Navigation desktopda havolalar, tor ekranda keyboard bilan ishlaydigan Drawer; til/savat/account alohida mavjud. Login/signup Dialog, aniq label/required/autocomplete, pending lock, Escape va focus qaytishi.
- Savat interaktiv Popover dialog’i: keyboard Tab, close/Escape, responsive kenglik; menu-list’dagi Tab bilan erta yopilish olib tashlandi. Cancel icon o‘lchami sabab scroll tuzatildi.
- Katalog/detail grid, filterlar, rasm fallback contain, mobil order item/totals/actions, profil inputlari, footer va map kengliklari moslangan. Tab/carousel/comparison jadvali komponent ichida kerak bo‘lsa scroll qiladi; sahifa gorizontal surilmaydi.
- Profile label/input bog‘lanishi, required nick/phone, optional address/desc; preview object URL tozalanadi, tasdiqlangan server javobidan so‘ng success. Form va image fallback’lari keyboard bilan foydalanishga mos.
- Focus ring, asosiy/active button ranglari, stock/badge matni va kontrast yaxshilangan. Reduced-motion qo‘llanadi. Bu barcha browser/assistive technology uchun to‘liq WCAG sertifikatsiyasi emas.

## Matn va imkoniyat chegaralari

Statik 2.5-star rating olib tashlandi. Umumiy “48 soat”, “kamida 2 yil”, “bepul o‘rnatish”, “0%”, trade-in va pul qaytarish va’dalari neytral demo/katalog ma’lumotiga almashtirildi. Savdo muddati bilan bog‘lanmagan deals/views endi “this week/month” deb va’da bermaydi. Product warranty qiymati bo‘lsa faqat katalogdagi maydon ko‘rsatiladi.

Backend qo‘llamagan contact form yuborish amali olib tashlandi; mavjud email havolasi foydalanuvchining o‘z email dasturini ochadi. FAQ/qoidalar demo, server narxi, stock, cancel va noma’lum specs haqidagi amaldagi oqimni tushuntiradi. Real payment, credit agreement, delivery yoki warranty claim bajarilmaydi. Admin EJS UI’ning uch tilli tarjimasi bu bosqich doirasiga kirmaydi; public frontend tarjima qilindi. Native browser file picker/uchinchi tomon map interfeysi browserning o‘z tilidan foydalanishi mumkin.
