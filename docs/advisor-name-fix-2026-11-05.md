# Maslahatchida mahsulot nomini topish — 2026-11-05

Foydalanuvchi “Beko Slim 45cm” deb yozganda kategoriya/tur aniqlanmagani uchun javob yana texnika turini so‘ragan. Jonli katalogni faqat o‘qish bilan tekshirishda shu nomli PROCESS mahsulot borligi tasdiqlandi: $310, zaxira 15; alohida brand/model/width maydonlari yo‘q. Bazaga o‘zgarish kiritilmadi.

Backend endi alohida birinchi xabardagi to‘liq nom yoki modelni katalogdan literal va registrga bog‘liq bo‘lmagan usulda tekshiradi. Mos mahsulotning joriy narxi/zaxirasi va mavjud xususiyatlarini qaytaradi; nomdan specs taxmin qilmaydi. Bunday javob Gemini chaqiruvisiz, caller daily limitini saqlagan holda ishlaydi. Noma’lum nom va kontekstli talablar oldingi Gemini oqimida qoladi. Oldingi byudjet/spec shartlari chetlab o‘tilmaydi.

Tekshiruv: `npm test` — build va 85/85 test o‘tdi. Yangi testlar UZ/RU/EN, nomdagi bo‘shliq/registr, literal regex belgili model, yashirin/nol-stock mahsulotlar, daily quota, oldingi byudjet, refusal hamda guest HTTP/CSRF javob kontraktini tekshiradi. Barcha test yozuvlari isolated replica-setda. Haqiqiy Gemini bu tahrirda chaqirilmadi: tuzatilgan aniq-nom yo‘li unga murojaat qilmaydi. Frontend kodi va dizayn o‘zgarmadi; browser vizual sinovi bu tahrir uchun bajarilmadi.
