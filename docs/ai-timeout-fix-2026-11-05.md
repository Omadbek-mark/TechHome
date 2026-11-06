# AI timeout tuzatishi — 2026-11-05

## Sabab va o‘zgarish

Backend Gemini javobini default 12 soniya kutgan. Xuddi foydalanuvchi yozgan “a refrigerator under 500 USD, at least 250 L” savoli joriy Gemini adapteri va haqiqiy provider bilan 21.034 soniyada to‘g‘ri strukturali javob berdi. Shuning uchun 12 soniyalik chegara bu javobni muddatidan oldin bekor qilgan.

`src/libs/ai/config.ts`, `.env.example` va lokal `.env`dagi `AI_TIMEOUT_MS` 30000 msga moslandi. Umumiy backend deadline 36 soniya; frontendning mavjud 45 soniyalik chegarasi yetarli. Model, kalit, dependency, frontend mantiqi va dizayn o‘zgartirilmadi; avtomatik retry qo‘shilmadi.

## Tekshiruv

- `npm test`: build va 81/81 test muvaffaqiyatli, fail/skipped/TODO yo‘q.
- Yangi fake-timer regression testi 21 soniyadan keyingi provider javobi qabul qilinishini tekshiradi; oldingi 12 soniyalik default bilan test o‘tmaydi. Mavjud timeout/abort testi saqlangan.
- Haqiqiy Gemini bilan brauzer → CSRF → alohida MongoDB replica-set quota → katalog → frontend tavsiya kartasi oqimi o‘tdi. Savol uchun $400, 300 L, stock 3 bo‘lgan test mahsuloti ko‘rsatildi; hajmi noma’lum arzon test mahsuloti tavsiyaga kirmadi. Bu test katalogi, jonli mijoz bazasiga yozilmadi.
- Frontend vaqtinchalik test API manzili bilan Yarn/Vite orqali build qilindi. Frontend kodiga tahrir kiritilmadi.
- Jonli bazaning faqat o‘qish diagnostikasi taxminan 470 ms bo‘ldi; asosiy kechikish provider javobida kuzatildi.

Provider kechikishi o‘zgaruvchan: boshqa dastlabki urinish 30 soniyada ham tugamadi. Tuzatish barcha so‘rovlarga javob kafolati bermaydi; 30 soniyadan oshsa mavjud timeout va katalog fallback saqlanadi. Limitlar o‘zgarmadi.

Brauzer dalili: `/tmp/techhome-ai-timeout-fixed.png` (vaqtinchalik, test katalogi). Alohida fixture serverlari sinovdan keyin to‘xtatiladi; foydalanuvchining 3000/3002 dev serverlariga tegilmaydi.
