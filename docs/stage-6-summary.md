# 6-bosqich — Gemini mahsulot maslahatchisi

Holat: lokal implementatsiya va izolyatsiyalangan tekshiruvlar yakunlandi, foydalanuvchi review’i kutilmoqda. 2026-11-04 kuni haqiqiy provider UZ/RU/EN smoke testi ham o‘tdi: [qo‘shimcha hisobot](gemini-live-smoke-2026-11-04.md). 7-bosqich boshlanmadi; commit/push/deploy yo‘q.

## Natija va sabab

- Backend avval: public status/advisor API, strict structured requirements, backend katalog querysi va public DTO. Providerga mahsulot ID/narx yaratish vazifasi berilmaydi; narx, zaxira va specs serverdan tekshiriladi. USD yoki texnika turi noaniq bo‘lsa clarify, mos stock bo‘lmasa no-match.
- MongoDB’da persistent caller/global daily quota va parallel transaction himoyasi; 10 guest / 30 member / 100 provider default. Burst limit, token/context/response cap, timeout va retry’siz bitta provider urinish. Raw suhbat/IP/profile usage kolleksiyasiga yozilmaydi.
- Backend testlari o‘tgach frontend: mehmonlarga ochiq `/advisor`, UZ/RU/EN, max 600 belgilik savol, xotiradagi bounded context, privacy eslatmasi, safe error va katalog fallback’i. Double-submit, abort va identity reset; kartalar va umumiy comparison. AI’da order/payment amali yo‘q.
- Dependency/lockfile o‘zgarmadi. Node built-in fetch ishlatildi. Dastlabki implementatsiyada haqiqiy `.env` tahrirlanmagan; 2026-11-04 kuni foydalanuvchi kalit bergach lokal AI env sozlandi. [To‘liq kontrakt va sozlash](advisor-contract.md).

## Tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| Backend `npm run typecheck` | O‘tdi |
| Backend `npm test` (build + unit/HTTP + isolated replica set) | **77 pass, 0 fail, 0 skipped/TODO** |
| Frontend `yarn test --run` | **53 pass, 0 fail**, 17 test fayli |
| Frontend `yarn build` (typecheck ichida) | O‘tdi; katta chunk warning saqlanadi |
| Browser: real build → REST/CSRF → test MongoDB | O‘tdi; synthetic requirement provider, jonli Gemini emas |
| AI route 360 / 390 / 768 / 1440px | document/body gorizontal overflow yo‘q |
| UZ→RU→EN va route/context saqlanishi | Browser va komponent testlarida o‘tdi |
| Haqiqiy Gemini kaliti/modeli bilan so‘rov | **2026-11-04: UZ/RU/EN extraction, 3/3 o‘tdi**; browser bilan to‘liq jonli provider oqimi bu run’da sinalmadi |

Backend yangi 25 test: UZ/RU/EN input, private data/roles, schema/unknown field/invented IDs, local injection refusal, HTTP request schema/key header, upstream/truncated/oversized/invalid/timeout, unknown specs/stock/narx o‘zgarishi, persistent UTC quota, caller/global parallel race/rollback, identity/CSRF/burst, legacy yaroqsiz katalog maydonlari. Gemini javobi injectable provider yoki HTTP mock bilan boshqarildi; modelning haqiqiy til/niyat talqini tasdiqlangani emas.

Frontend yangi 9 test: malformed/unavailable mahsulotni rad etish, user-only payload/transport/no retry, context budget, status validation, guest double-submit/server narxi va comparison → katalog, disabled fallback, clarify/no-match/uch til, timeout/daily limit safe message, identity/reset/unmount’dagi kech javobni bekor qilish. Avvalgi 44 test ham o‘tdi.

Browser fixture alohida vaqtinchalik MongoDB replica-set va sintetik mahsulotlar bilan ishladi. Mehmon savoli → USD clarify → uchta in-stock tavsiya (zero-stock chiqmagan), comparison tanlovini katalogga olib o‘tish va joriy narx/spec jadvali, Escape bilan yopish, no-match, synthetic timeout, o‘chiq config fallback tekshirildi. Hech qanday haqiqiy Gemini chaqiruvi/order/payment bajarilmadi. Preview/test serverlari va vaqtinchalik baza yopildi, viewport qaytarildi.

## Cheklovlar va release oldi shartlari

- `AI_ENABLED` namunada standart false; 2026-11-04 kuni yangilangan lokal backendda foydalanuvchi kaliti bilan yoqildi. Haqiqiy structured response uch tilda oddiy test savollari bilan tekshirildi. Real browser/katalog/quota bilan umumiy staging oqimi va billing limitlari hali tekshirilishi kerak.
- Prompt injection uchun himoya qatlamlari va testlar bor; barcha niyatni model doim to‘g‘ri tushunishi kafolat emas. Qidiruv ma’lum maydon/tur sinonimlari bilan chegaralangan; unknown ma’lumot taxmin qilinmaydi.
- Transaction quota replica-set talab qiladi. Production indekslari, proxy/IP hisoblash, tashqi provider egress va runtime secretlar stagingda tekshirilishi kerak. Daily provider attempt cap puldagi mutlaq xarajat kafolati emas.
- UI savol/mahsulotlar xotirada; route’dan chiqilganda suhbat tozalanadi. Foydalanuvchi qayta yuborsa yangi urinish hisoblanadi; avtomatik retry yo‘q.
- CI/Docker, HTTPS, persistent uploads, backup/restore, rollback va staging tekshiruvlari keyingi bosqichlar. **Productionga tayyor degan xulosa hali berilmaydi.**

Review: `/advisor` oqimi, server limitlari, privacy va xato/fallback matnlari. Foydalanuvchi tasdiqlagach 7-bosqich — Docker va CI.
