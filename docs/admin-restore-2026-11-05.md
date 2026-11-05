# Admin panelni avvalgi ko‘rinish va oqimga qaytarish — 2026-11-05

Foydalanuvchi so‘rovi: oldingi admin panel, Home’ga o‘tishda login yo‘qolmasligi va user statusini yangilashni tiklash. Ish boshlanishidan oldingi fayllar `/Users/omadbek/Desktop/TechHome-admin-before-restore-20261104-235932`ga saqlandi. Oldingi ishlagan EJS manbasi: `/Users/omadbek/Desktop/TechHome-backup-2026-11-04-224602/TechHome`.

## Sabab va tuzatish

1. Home route sessiyadagi memberId/version’ni qayta o‘qimagan; umumiy res.locals.member=null bilan render qilingan. Shuning uchun haqiqiy admin sessiyasi bor paytda ham Login ko‘ringan. Home va GET login’da optional STORE session restore qo‘shildi, joriy DB role/status/version tekshiriladi. Allaqachon kirgan admin GET login’dan Home’ga yo‘naltiriladi. BLOCK/DELETE/revoked/USER session Home’da admin navigatsiyasini olmaydi.
2. User statusini yangilash Axios’dan ketgan, lekin umumiy CSRF sozlamasi faqat jQuery AJAX’ga qo‘llangan. users.js so‘roviga X-CSRF-Token header qo‘shildi. Pending paytida select bloklanadi; xatoda avvalgi qiymat qaytadi, success’dan keyin counter/data-status yangilanadi. Real user statuslari bu ish davomida o‘zgartirilmagan.
3. Home/Login/Users/Products EJS eski nusxadan qaytarildi. Qo‘shilgan inline product edit/specs formalari olib tashlandi; oldingi Products create/status UI qaytdi. Backend optional specs va katalog/order/AI kontraktlari saqlandi, mavjud mahsulotlar o‘zgartirilmadi. Admin CSS eski nusxa bilan bir xil edi; faqat POST logout tugmasi oldingi link ko‘rinishida bo‘lishi uchun scoped qoida bor.

CSRF, HttpOnly cookie, protected STORE va server validation saqlangan. Ochiq admin signup o‘rniga oldingi tasdiqlangan bootstrap tartibi qoladi; raw request/password loglari qaytarilmadi.

## Tekshiruv

`npm test`: build + **80 pass, 0 fail, 0 skipped/TODO**. Yangi HTTP regressiya admin login → Home/Products/Users, login sahifasiga qaytish va blocked sessiyada guest navigatsiyasini tekshiradi. Katalog testlari foydalanuvchi talab qilgan eski formaga moslandi; escape, API orqali validated optional specs, narx/installment va CSRF tekshiruvlari saqlangan.

Brauzer: alohida 4318-portdagi MemoryStore va sintetik model yozuvlari; MongoDBga ulanish yo‘q. Real controller/service/bcrypt/session/CSRF bilan test admin login qildi, Products→Home→Users yo‘lida Login qayta so‘ralmadi. Test customer ACTIVE→BLOCK, active/blocked sonlari 1/1→0/2 bo‘ldi; refresh’da saqlandi. GET login authenticated holatda Home’ga qaytdi. CSS/rasmlar haqiqiy src/public’dan berildi. Test serveri yopildi; foydalanuvchining 3000/3002 jarayonlariga tegilmadi.

Haqiqiy admin paroli kiritilmadi; jonli user/product statuslari test uchun o‘zgartirilmadi. Frontend repository tahrirlanmadi, uning eski test sonlari bu run natijasi deb ko‘rsatilmaydi. Commit/push/deploy yoki keyingi bosqich bajarilmadi.
