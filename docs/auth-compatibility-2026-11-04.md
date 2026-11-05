# Eski account login mosligi va auth dizayni — 2026-11-04

Foydalanuvchining mavjud admin hisobi login vaqtida INVALID_INPUT oldi. Sabab: signup uchun qo‘shilgan bo‘sh joysiz nick qoidasi login’da ham qo‘llangan. Bu oldin ishlagan bo‘sh joyli account nomlarini DB/password tekshiruvigacha yetkazmagan.

Tuzatish: login nonempty plain string nick’ni 256 belgigacha qabul qiladi (control belgilar rad etiladi); nick regex’i faqat yangi signup uchun. Parol/bcrypt tekshiruvi, cookie/CSRF, role/status/revocation talablari saqlangan. Account nick/parol/rolini bazada o‘zgartirish yoki yangi admin yaratish bajarilmadi.

Mavjud hisob faqat read-only MongoDB client orqali nom/rol/status projection bilan tekshirildi: `TechHome Admin`, STORE, ACTIVE. Password/hash, telefon yoki boshqa private profile maydonlari o‘qilmadi. Account login nomi case-sensitive exact lookup bo‘yicha saqlangan; nomni aynan yozish kerak. Haqiqiy hisob paroli bilan agent login qilmadi.

Backend: 79 test o‘tdi. Yangi regressiyalar legacy bo‘sh joy/punctuation/uzunroq nom, malformed/NoSQL/control/overlong input, signup cheklovlari va haqiqiy MemberService+bcrypt bilan SPA/admin cookie loginni tekshiradi. Noto‘g‘ri parol 401, to‘g‘ri parol SPA 200 va admin 302/protected check 200. Persistence MemoryStore/model stub yoki isolated replica-set; jonli bazaga test yozuvi yo‘q.

Frontend: avvalgi `/img/auth1.webp` rasmi chapda, login/signup formasi o‘ngda bo‘lgan ko‘rinish MUI 5 Dialog’da tiklandi. Mobil ekranda rasm tepada; password masking, submit lock, error, form switch, focus/Escape va tarjimalar saqlangan. Boshqa sahifalar dizayni bu tuzatishda o‘zgartirilmagan. Login input maxLength 256, signup 40.

Frontend 62 test va TypeScript/build o‘tdi; katta chunk warning oldingi holatida. Yangi regression rasm manbasi va `Techhome Admin` kabi bo‘sh joyli login inputi o‘zgartirmasdan yuborilishini tekshiradi. Desktop login va 360px signup browser’da ko‘rildi: 360px’da modal 328px, dialog scroll/client width bir xil (324px), gorizontal overflow yo‘q. Production deploy/commit/push yoki 7-bosqich boshlanmadi.
