# TechHome Product Assistant — 2026-11-05

## Tasdiqlangan o‘zgarish

Foydalanuvchi katalog qidiruvini takrorlaydigan advisor o‘rniga foydalanish, parvarish va xarid oldidan tushuntirish beradigan yordamchini tanladi. Provider nomisiz sahifa nomi so‘raldi.

- Brend: **TechHome Product Assistant**. EN sarlavha: **Get to know your appliances**; UZ: **Texnikangizni yaxshiroq biling**; RU: **Узнайте больше о вашей технике**. Menyu ham moslandi.
- Backend endi structured, bounded plain-text guidance qaytaradi; katalog querysi va mahsulot kartalari yo‘q. Javob kodlari ANSWERED/CLARIFY/SAFETY/SCOPE; odatiy savolga byudjet/kategoriya so‘rash talab qilinmaydi.
- Foydalanish/parvarish va xarid mezonlari; model xususiyati yoki manual ko‘rilgandek taxmin yo‘q. Xavfli DIY/safety bypass ko‘rsatmalari rad etiladi. Aniqlanadigan gaz/elektr alomatlari lokal xavfsizlik javobi oladi.
- Frontend savol namunalari va suhbat matnini ko‘rsatadi. Savol tanlash avtomatik submit qilmaydi. Oldingi user konteksti, til, abort/reset/identity va double-submit himoyasi saqlangan. Javob HTML/Markdown sifatida bajarilmaydi.
- CSRF/cookie auth, persistent daily quota, 30s provider timeout va 45s frontend timeout saqlangan. API key/model/dependencylar o‘zgarmadi.

## Tekshiruv

- Backend **npm test: 78/78**, build bilan. Eski katalog-extraction sinovlari yangi guidance, hazard, multilingual context, plain-text validatsiyasi va HTTP/CSRF sinovlariga almashtirildi; quota/parallel limit va provider timeout sinovlari saqlangan. Test sonining avvalgi 85dan kamayishi vazifa o‘zgargani bilan bog‘liq; yangi suite’da fail/skipped/TODO yo‘q.
- Frontend **yarn test --run: 64/64**, 17 test fayli.
- **yarn build**: TypeScript va Vite build o‘tdi. Vite mavjud katta chunk ogohlantirishini beradi; build xatosi yo‘q.
- Haqiqiy Gemini bilan UZ parvarish, RU xarid mezoni va EN safety-lock bypass savollari tekshirildi; bypassga ko‘rsatma berilmadi. Birinchi parvarish javobidan keyin promptda manual, xavfsiz power-off va manufacturer ruxsatisiz harorat/kimyoviy vositalarni buyurmaslik talabi kuchaytirildi va backend suite qayta o‘tdi.
- To‘liq brauzer → cookie/CSRF → isolated MongoDB replica-set quota → haqiqiy Gemini → matnli javob ishladi. Inglizcha savolga javob va suhbatni hisobga olgan o‘zbekcha davomiy javob ko‘rindi. Bir dastlabki provider urinishida vaqtinchalik unavailable holati chiqdi; keyingi qo‘lda urinish muvaffaqiyatli bo‘ldi. Avtomatik retry qo‘shilmadi.
- Desktop/mobile 360, 390, 768, 1440px ko‘rinishlar tekshirildi; tekshirilgan o‘lchamlarda gorizontal overflow kuzatilmadi.
- Bazadagi mijoz order/profile/stock yozuvlari o‘zgartirilmadi. Browser test quota faqat alohida `techhome_guidance_browser_only` bazasida. Test serverlari yakunda to‘xtatiladi.

## Chegaralar

Bu manual lookup, katalog assistant yoki repair diagnosis kafolati emas. AI faktik xato qilishi va provider vaqtincha ishlamasligi mumkin. Exact manual/model tasdig‘i bo‘lmasa umumiy yo‘l-yo‘riq berishi kerak; lokal hazard detection ham exhaustive emas. UI shuni eslatadi. Transcript saqlanmaydi; eski javoblar til almashganda qayta generatsiya/tarjima qilinmaydi. Keyingi savol joriy tilda yuboriladi.

Route saqlangan, response semantikasi o‘zgargan: backend va frontend mos versiyada ishlashi kerak. Admin/auth dizayni va boshqa sahifalarga tahrir kiritilmadi. Commit/push/deploy yoki keyingi upgrade bosqichi bajarilmadi. [Amaldagi kontrakt](advisor-contract.md).
