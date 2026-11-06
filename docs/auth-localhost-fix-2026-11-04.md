# Lokal signup/login tuzatishi — 2026-11-04

Foydalanuvchi localhost:3000’da signup/login vaqtida «refresh page and try again» xabarini oldi. Frontend env API’ni 127.0.0.1:3002’ga yo‘naltirgan edi. Hostlar turlicha bo‘lgani uchun SameSite=Lax session cookie browser’dan CSRF POST bilan yuborilmaydi; backend CSRF_INVALID qaytaradi. Himoyani o‘chirish o‘rniga lokal hostname moslandi.

`src/lib/config.ts`da `resolveApiUrl`: faqat Vite development rejimida frontend hostname va API hostname ikkalasi localhost/127.0.0.1/[::1] bo‘lsa, API hostname ochilgan sahifaga moslanadi. Port/path saqlanadi; remote API va production build URL’lari o‘zgarmaydi. Credential transport va CSRF qoidalari saqlangan, POST avtomatik retry qilinmaydi. Productionda frontend/API avvalgidek bir sayt ostida aniq sozlanadi.

Ikkinchi muammo: login oynasida signup formasiga o‘tish tugmasi yo‘q edi. Modal ichiga Sign up/Login o‘tish tugmalari, App’da mos open callback’lar qo‘shildi. Mode almashganda parol va xato tozalanadi; submit davomida o‘tish bloklangan. Backend auth API o‘zgarmadi.

Tekshiruv: backend build va 17 auth/CSRF testi o‘tdi; keyin frontendda 61 test (17 fayl) va TypeScript ichidagi build o‘tdi. Yangi regressiyalar: 7 URL/host/production/remote konfiguratsiya holati va App orqali login→signup→login→signup/submit. Katta bundle haqidagi avvalgi Vite warning saqlanadi.

Browser tekshiruvi alohida in-memory Member model/MemoryStore fixture’da amalga oshirildi; MongoDBga ulanish, real account, order/payment yoki Gemini chaqiruvi yo‘q. localhost’da signup, refresh restore, logout va login o‘tdi; 127.0.0.1’da login va refresh restore o‘tdi. Asosiy localhost:3000 sahifasida faqat bo‘sh auth oynalari ochilib, yangi signup tugmasi tasdiqlandi; real signup/login yuborilmadi. Vaqtinchalik 4317/4318 serverlari yopildi; foydalanuvchining 3000/3002 serverlari saqlandi.

Foydalanish: asosiy frontendni yangilash (Cmd+Shift+R), Kirish → Ro‘yxatdan o‘tish. Eski sessiya boshqa hostname’da avtomatik ko‘chmaydi; kerak bo‘lsa yangi hostda login qiling.
