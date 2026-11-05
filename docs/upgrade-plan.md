# TechHome: tasdiqlangan upgrade va deploy rejasi

Sana: 2026-11-01 (Asia/Seoul). Manba: foydalanuvchining “PLEASE IMPLEMENT THIS PLAN” topshirig‘i. Ushbu fayl tasdiqlangan rejaning saqlangan ish nusxasi; bosqichlar tartibi va qabul mezonlari quyida.

## Maqsad va tartib

Birinchi release: xavfsiz Express backend, Vite asosidagi React frontend, aniq demo payment va mehmonlarga ham ochiq Gemini mahsulot maslahatchisi. Coolify mavjud umumiy VPS’da, Hotelia’dan alohida servis/baza/volume bilan. Mavjud dizayn, React/Redux va controller/service/schema saqlanadi; Next.js yoki yangi backend frameworki qo‘shilmaydi.

Har bir bog‘liq funksiyada **backend → backend testlari → frontend → integratsiya → foydalanuvchi review**. Backend/frontend parallel tahrirlanmaydi. Har bosqich oxirida o‘zbekcha o‘zgarish/sabab/test/cheklovlar hisoboti va review uchun to‘xtash; keyingi bosqich faqat foydalanuvchi tasdig‘idan keyin.

Foydalanuvchining keyingi ko‘rsatmasi bilan package manager tartibi yangilandi: **backend npm + package-lock.json; frontend Yarn Classic 1.22.22 + yarn.lock**. Oldingi bosqich hisobotlaridagi npm natijalari tarixiy; joriy frontend buyruqlari README/AGENTS.md’da, [Yarn tekshiruvlari](frontend-yarn.md) alohida. Keyingi “davom etamiz” ko‘rsatmasi bilan 3-bosqich boshlandi.

## Bosqich holati

| Bosqich | Holat |
|---|---|
| 0 — Yo‘riqnoma va boshlang‘ich holat | Foydalanuvchi tasdiqladi |
| 1 — Install, build, test va Vite | Foydalanuvchi tasdiqladi; [tarixiy hisobot](stage-1-summary.md) |
| 2 — Auth, role, upload | Foydalanuvchi tasdiqladi; [tarixiy hisobot](stage-2-summary.md) |
| 3 — Order, stock, demo payment | Foydalanuvchi tasdiqladi; [tarixiy hisobot](stage-3-summary.md) |
| 4 — Katalog, chegirma, comparison | Foydalanuvchi tasdiqladi; [tarixiy hisobot](stage-4-summary.md) |
| 5 — Responsive va tillar | Foydalanuvchi tasdiqladi; [tarixiy hisobot](stage-5-summary.md) |
| 6 — Gemini maslahatchisi | Lokal implementatsiya/testlar yakunlandi; [hisobot](stage-6-summary.md), review kutilmoqda. Haqiqiy provider uch tilli smoke testi 2026-11-04 kuni o‘tdi; umumiy staging oqimi keyin |
| 7 — Docker va CI | Boshlanmagan |
| 8 — Staging va yakuniy review | Boshlanmagan; serverga yozish alohida ko‘rsatma bilan |
| 9 — Production | Boshlanmagan; alohida release tasdig‘i talab qilinadi |

## 0 — Yo‘riqnoma va boshlang‘ich holat

- Backend/frontend ildizlariga alohida, o‘zaro mos `AGENTS.md` qo‘shish: backend kontrakti ustunligi, ish ketma-ketligi, review, testlar, dizayn, secrets, test bazasi va deploy chegaralari.
- [Boshlang‘ich o‘zgarishlar ro‘yxati](upgrade-baseline-2026-11-01.md)ni saqlash; mavjud ishlarni qaytarmaslik.
- Rejani shu faylda saqlash; frontend yo‘riqnomasidan havola.
- Qabul/review: ikki yo‘riqnoma, reja, bosqich chegaralari, mavjud fayllar saqlangani. Dastur kodiga tahrir yo‘q.

## 1 — Takrorlanuvchi install, build va test muhiti

Backend avval: Node 22, npm/lockfile; clean install, typecheck, build va haqiqiy test scriptlari; audit xavflari uchun regression testlar; dependency yangilashlari kichik guruhlarda va moslik tekshiruvi bilan. Xavfni qayta ko‘rsatadigan hali yiqiladigan regression test “tuzatildi” deyilmaydi; yashil gate uchun tegishli tuzatish yoki aniq qayd zarur.

Frontend keyin: CRA → Vite, testlar → Vitest/React Testing Library; React 18/Redux/mavjud route/dizayn saqlanadi. TypeScript, enum va fixture xatolari; foydalanuvchining yangi tanloviga ko‘ra Yarn Classic va `yarn.lock`; public `VITE_API_URL`, secretsiz `.env.example`.

Qabul: ikkala loyiha clean install’dan keyin typecheck, test va build’dan o‘tadi. Kerakli dependency ruxsati/muhit cheklovi alohida qayd etiladi.

## 2 — Auth, role va upload xavfsizligi

Backend: signup faqat USER; role/status/ball serverdan; profil allowlist; protected requestda joriy DB role/status. Ochiq admin signup o‘rniga nazoratli STORE bootstrap buyrug‘i. HttpOnly JWT cookie, production HTTPS, CORS origin allowlist, CSRF himoyasi; admin session regenerate; credential loglarini olib tashlash; login va upload limitlari, rasm turi/hajmi tekshiruvi.

Frontend: cookie o‘qish emas, backend profile orqali session tiklash; auth tiklanmaguncha protected request yo‘q; logout/identity o‘zgarishida private cache tozalash.

Qabul: USER STORE bo‘la olmaydi; BLOCK/DELETE eski token bilan kira olmaydi; refresh/logout va upload tekshiruvlari ishlaydi.

## 3 — Order, stock va demo payment

Backend: narx/installment/stock DBdan; musbat butun quantity, bo‘sh savatni rad etish; order/item/stock MongoDB transaction’da. Unique idempotency key; demo `PAUSE → PROCESS → FINISH`, cancellation `PAUSE → DELETE`; cancel stockni bir marta, PROCESS ballni bir marta o‘zgartiradi.

Frontend: submit paytida bloklash; retry’da bir xil key; server total/mavjudlik; karta/CVV maydonlarini olib tashlash; “demo tasdiqlash”, real charge yo‘q.

Qabul: soxta narx/quantity, oxirgi stockka parallel buyurtma, double-submit, transaction rollback, takroriy status/cancel sinovlari. Eski orderlar qayta hisoblanmaydi/stockka qayta ta’sir qilmaydi.

## 4 — Katalog, chegirma va taqqoslash

Backend: deals va `productOldPrice`; haqiqiy total pagination, filter/sort/search validation. Optional brand/model va kategoriya xususiyatlari: o‘lcham, sig‘im, shovqin, energiya sarfi; noma’lumni taxmin bilan to‘ldirmaslik. Narx/months update’da installment qayta hisoblash; EJS admin formalarini moslash.

Frontend: URL filterlari, server pagination; detail ID o‘zgarishida reload; loading/empty/error/retry; uchtagacha mahsulot comparison.

Qabul: chegirmasiz mahsulot deals’da yo‘q; specs uydirilmaydi; pagination/filter/detail mos ishlaydi.

## 5 — Responsive dizayn va tillar

Backend avval: frontend tarjima qiladigan barqaror error code’lar. Frontend keyin: UZ/RU/EN, til almashganda route/query saqlanishi; navbar/katalog/detail/savat/orders/profil responsive. Overflow, fallback, keyboard/focus/label va modal dismissal; statik ratingni olib tashlash, tasdiqlanmagan va’dalarni neytrallashtirish.

Qabul: 360/390/768/1440px asosiy yo‘llar, tillar, keyboard va xato holatlari.

## 6 — Gemini mahsulot maslahatchisi

Backend: mehmon/auth AI endpoint; Gemini strukturali talab → tekshirilgan katalog querysi → haqiqiy mahsulotlar. Yetarli data bo‘lmasa aniqlashtirish/no-result; model/kalit faqat runtime env’da. Mehmon 10 so‘rov/kun/IP, hisob 30 so‘rov/kun, loyiha 100 provider chaqiruvi/kun; serverda saqlanadigan sozlanadigan limitlar. Timeout, xarajat chegarasi va oddiy katalog fallback’i.

Frontend: maslahatchi oynasi, kartalar/comparison, limit/error/fallback; shaxsiy ma’lumot yubormaslik eslatmasi. AI order/payment bajarmaydi.

Qabul: UZ/RU/EN, zero stock, unknown specs, prompt injection, noto‘g‘ri javob/ID, quota, provider timeout/error. Model aytgan narx/stock/IDga tekshirmasdan ishonilmaydi.

## 7 — Docker va CI

Backend: compiled JS start, EJS/public assets copy, health/readiness, graceful shutdown, uploads volume. Frontend: static image, SPA fallback, public API build config. CI: clean install → lint/typecheck → test → build → Docker. Eski destruktiv deploy scriptini almashtirish; secrets Git/image context’iga kirmaydi.

Qabul: lokal ikkala image ishlaydi, admin assetlari/rasmlar/route refresh tekshiriladi; umumiy VPS’da buildlar ketma-ket.

## 8 — Staging va yakuniy review

Serverga yozish uchun alohida ko‘rsatma olingach Coolify’da alohida TechHome servislar, test bazasi/domen/volume. Backend avval va health, so‘ng frontend. Auth/admin/upload/stock/demo order/AI E2E; HTTPS/cookie, cheklangan yuklama, backup/restore va oldingi image’ga rollback mashqi.

Qabul/review: yakuniy test jadvali, ochiq cheklovlar va production tayyorligi xulosasi. Kerakli domen, resurslar, MongoDB/Gemini env’lar yo‘q bo‘lsa lokal ish davom etadi, release to‘xtaydi.

## 9 — Production release

Faqat alohida release tasdig‘i bilan backend → health/smoke → frontend → health/smoke. Muammo bo‘lsa oldingi ishlagan versiyaga qaytish. Auto-deploy faqat birinchi muvaffaqiyatli qo‘lda release’dan so‘ng alohida ko‘rsatma bilan.

## API mosligi va chegaralar

- Mavjud member/order route’lari saqlanadi; browser yuborgan narx authoritative emas.
- Yangi katalog endpointi `{ items, total, page, limit }`; eski javob o‘tish davrida saqlanadi.
- Order yaratishda `Idempotency-Key`; frontend retry uchun barqaror.
- Yangi product maydonlari optional; eski orderlar va stock tarixini avtomatik o‘zgartirish yo‘q.
- Testlar production bazasida emas; transaction sinovi alohida replica-set test bazasida. Demo order ham jonli bazada oddiy test sifatida yaratilmaydi.
- Commit/push/merge/serverga yozish/deploy alohida ko‘rsatma bilan; Hotelia va umumiy proxy/firewallga tegilmaydi.
- Keyingi release: favorites, verified reviews, admin AI kontent assistenti, image search va real online payment.
- Yakuniy mezon: typecheck/test/build/CI yashil; asosiy xavfsizlik xatolari yopiq; desktop/mobile, AI limitlari va rollback amalda tekshirilgan. Bajarilmagan tekshiruv ochiq ko‘rsatiladi.

## 0-bosqich tekshiruvi

- Faqat ikki yo‘riqnoma, ushbu reja va baseline hujjati yaratildi.
- Lokal Markdown havolalari va 4 yangi hujjatning whitespace tekshiruvi o‘tdi. Backenddagi 63, frontenddagi 178 oldindan mavjud fayl holati lokal nazorat yozuvi bilan solishtirildi va saqlangani tasdiqlandi.
- Backend `git diff --check` o‘tdi. Frontendning avvaldan mavjud diff’ida whitespace muammolari bor; bu bosqichda o‘sha fayllar tahrirlanmadi va muammolar tuzatilmadi.
- Install, dependency/code o‘zgarishi, yangi funksiyalar, test/build qayta ishlatish va deploy bu bosqichga kirmaydi.
