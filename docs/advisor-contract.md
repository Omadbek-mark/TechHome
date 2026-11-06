# TechHome Product Assistant — amaldagi kontrakt

2026-11-05 kuni foydalanuvchi tasdiqlagan yo‘nalish: katalogni qayta qidirish o‘rniga texnikadan foydalanish, parvarish, oddiy alomatlar va xarid oldidan tushuntirish beradigan suhbat yordamchisi. Oldingi 6-bosqich katalog tavsiyasi hujjatlari tarixiy; joriy kontrakt shu fayl.

## API

`GET /ai/status`: public, no-store; `{ available, guestDaily, memberDaily }`. Availability konfiguratsiya mavjudligini bildiradi, provider health kafolati emas. Kalit/model chiqmaydi.

`POST /ai/advisor`: oldingi route, origin allowlist, session, guest/member identity va synchronizer CSRF saqlangan. Avval `/member/csrf`; frontend cookie/CSRF klientidan foydalanadi. Input: `{ language: "uz" | "ru" | "en", messages: string[] }`. Faqat user matnlari; 1–4 xabar, har biri NFKC/trimdan so‘ng 2–600 belgi, jami 1600. Role/system matni, qo‘shimcha maydonlar, control/format belgilar va aniqlanadigan contact/card/credential namunalari rad etiladi. Bu barcha shaxsiy ma’lumotni aniqlash kafolati emas.

Javob: `{ replyCode, answer, products: [], allowance }`. `replyCode`: `AI_ANSWERED`, `AI_CLARIFY`, `AI_SAFETY`, `AI_SCOPE_ONLY`. `answer` foydalanuvchi so‘ragan tildagi plain text, 2–3000 belgi. HTML/URL/control belgilar va ortiqcha provider maydonlari rad etiladi. `products` har doim bo‘sh; katalog tavsiyasi yoki `requirements` endi qaytarilmaydi. Eski frontend yangi backend bilan birga yangilanishi kerak.

Xatolar: 400 `AI_INVALID_INPUT`, `AI_PRIVATE_INPUT`; 429 `AI_LIMIT_REACHED`, `AI_RATE_LIMITED`; 503 `AI_UNAVAILABLE`, `AI_BUSY`, `AI_RESPONSE_INVALID`; 504 `AI_TIMEOUT`. Raw provider/DB xatosi, secret yoki request matni log/javobga chiqmaydi. Status va javoblar no-store.

## Suhbat va ishonch chegaralari

Gemini strict schema `{ kind: ANSWER | CLARIFY | SAFETY | REFUSE, answer }` bilan ishlaydi; backend runtime tekshiradi va barqaror replyCodega xaritalaydi. Catalog, profile, manual yoki web ma’lumoti providerga uzatilmaydi, tools yo‘q. Mahsulot nomi yozilsa yordamchi qanday ma’lumot kerakligini so‘rashi mumkin; aniq model specs/sozlama/error-code ma’nosini uydirmasligi va haqiqiy manualni ko‘rgan deb aytmasligi kerak.

Prompt oddiy foydalanish, foydalanuvchi tozalashi mumkin bo‘lgan qismlar, parvarish va umumiy xarid mezonlariga yo‘naltirilgan. Har bir cleaning javobida xavfsiz o‘chirish/tokdan ajratish va model manualiga tayanish talab qilinadi. Manufacturer ko‘rsatmasisiz harorat yoki kimyoviy vosita buyurilmaydi. Elektr/gaz/sovitish tizimini ochish, safety-lock/grounding/thermal cutoffni chetlab o‘tish ko‘rsatmalari taqiqlangan. AI noto‘g‘ri javob berishi mumkin; schema validatsiyasi maslahatning faktik to‘g‘riligini kafolatlamaydi.

Aniqlanadigan gaz hidi/sizishi, tutun, uchqun, kuygan hid/tok urishi uchun lokal UZ/RU/EN xavfsizlik javobi bor. Bu to‘liq hazard detector emas. Instruction override/secret so‘rovlari lokal scope javobi oladi. Boshqa xavfli/unrelated so‘rovlar provider promptidagi SAFETY/REFUSE qoidalari bilan chegaralanadi. Xavfsizlik javobi ustaga/favqulodda xizmatga yo‘naltiradi; tekshirilmagan telefon raqami berilmaydi.

Order, stock, payment, profil, ball va admin amallari yo‘q; katalog querysi ham bajarilmaydi. Faqat mavjud CSRF session va usage bucket yozilishi mumkin.

## Limitlar va konfiguratsiya

Oldingi limitlar saqlangan: guest 10/UTC kun/IP (IPv6 /64), member 30/UTC kun, jami 100 provider attempt/UTC kun; HMAC identity, MongoDB replica-set transaction, unique bucket/TTL. Raw IP/member ID/suhbat usagega saqlanmaydi. Lokal refusal/hazard caller limitini ishlatadi, provider slotini ishlatmaydi. Invalid/private input va disabled assistant quota/providerga bormaydi. Timeout/error uchun refund yoki avtomatik retry yo‘q. Burst limit 5/min/IP; memorydagi hisob restartda reset bo‘lishi mumkin, daily hisob persistent.

Default provider timeout 30s, umumiy deadline 36s, frontend 45s. Max output 768 token (256–1536), response 32 KiB, input bounded. Gemini fixed HTTPS endpoint/header key/strict structured output, Node built-in fetch. Secretlar faqat backend env’da; mavjud model/kalit o‘zgarmadi.

```dotenv
AI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
AI_TIMEOUT_MS=30000
AI_MAX_OUTPUT_TOKENS=768
AI_GUEST_DAILY_LIMIT=10
AI_MEMBER_DAILY_LIMIT=30
AI_PROVIDER_DAILY_LIMIT=100
```

## Frontend

Public `/advisor` saqlangan; menyu `Product Assistant`, sahifa brendi `TechHome Product Assistant`, sarlavha `Get to know your appliances` va UZ/RU variantlari. Provider nomi UI/error matnlarida ko‘rsatilmaydi. Uchta savol namunasi inputni to‘ldiradi, avtomatik yubormaydi. Javoblar plain text sifatida, HTML/Markdown execution’siz ko‘rsatiladi. SAFETY javobining alohida urg‘usi bor.

Oxirgi to‘rtta user utterance konteksti; savol/javoblar sahifa xotirasida, browser storage yoki server transcriptga yozilmaydi. Til almashganda yangi UI tarjima bo‘ladi, oldingi javob qayta providerga yuborilmaydi. Reset, identity change, unmount so‘rovni abort qiladi va kech javobni chiqarishga yo‘l qo‘ymaydi. Double submit bloklangan. Availability/session/error/retry/daily limit va katalog linki saqlangan. Mahsulot kartalari yordamchidan olib tashlandi; katalogning mavjud comparison funksiyasi o‘z joyida.
