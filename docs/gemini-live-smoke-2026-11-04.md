# Haqiqiy Gemini tekshiruvi — 2026-11-04

Foydalanuvchi API kalitni joylagach, 6-bosqichdagi provider smoke test bajarildi. 7-bosqich boshlanmadi.

## Konfiguratsiya

Kalit foydalanuvchining `/Users/omadbek/Desktop/TechHome/.env` nusxasida bor edi. Yangilashlar bajarilgan repository esa `/Users/omadbek/iCloud Drive (Archive)/Desktop/TechHome`; shu repository’ning lokal `.env` fayliga kalit, `AI_ENABLED=true` va `GEMINI_MODEL=gemini-3.5-flash-lite` yozildi. Desktop nusxasi tahrirlanmadi. Qolgan MongoDB/auth sozlamalari o‘zgartirilmadi. Secret qiymati hujjat yoki logga chiqarilmadi.

Google `models` endpointi HTTP 200 qaytardi va tanlangan modelni mavjud deb ko‘rsatdi. Keyin loyihadagi haqiqiy `GeminiService` (TypeScript source) va amaldagi schema/parser bilan uchta ketma-ket so‘rov yuborildi. Qo‘shimcha SDK yoki dependency o‘rnatilmadi.

## Natija

Uch tilda bir xil sintetik talab: 500 USDgacha, kamida 250 litr sig‘imli muzlatgich.

| Til | Tekshirilgan structured output | Vaqt |
|---|---|---|
| UZ | SEARCH, KITCHEN, REFRIGERATOR, USD, maxPrice=500, capacityLiters MIN 250 | 4.805 s |
| RU | SEARCH, KITCHEN, REFRIGERATOR, USD, maxPrice=500, capacityLiters MIN 250 | 6.023 s |
| EN | SEARCH, KITCHEN, REFRIGERATOR, USD, maxPrice=500, capacityLiters MIN 250 | 6.703 s |

Uchala javob strict parser’dan o‘tdi va kutilgan talabga mos keldi. 12 soniyalik default timeout yetdi. Avtomatik retry bo‘lmadi. Testlarda shaxsiy ma’lumot/profile yoki katalog matni providerga berilmadi.

## Tekshiruv chegarasi

Bu haqiqiy Google API + loyiha provider adapterining uch tilli smoke testi. Jonli MongoDBga ulanilmadi, mahsulot/order/payment/profile yozuvi yaratilmagan. Shu sabab real katalog, HTTP/CSRF, browser va persistent quota oqimi bu run’da birgalikda qayta sinalmagan; ularning oldingi izolyatsiyalangan test natijalari [6-bosqich hisobotida](stage-6-summary.md) saqlangan. Oddiy namunalar barcha savol/injection holatlari yoki uzoq muddatli latency kafolati emas.

Hisobning Google Free/Paid billing holati tekshirilmagan va billing yoqilmagan. [Rasmiy model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [bepul/pullik tariflar](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite). Kalit ishlashi bepul quota miqdori yoki billing holatini o‘zi tasdiqlamaydi.

Frontendga secret kerak emas. Yangilangan backend o‘sha papkadan qayta ishga tushirilganda lokal AI config o‘qiladi. Stagingda runtime env, proxy/IP, real katalog va quota, HTTPS hamda billing limitlarini yana tekshirish zarur.
