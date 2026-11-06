# Frontend Yarn, backend npm

2026-11-01: foydalanuvchining keyingi ko‘rsatmasi bilan frontend package manager’i Yarn Classic 1.22.22ga o‘tkazildi. Backend npm 10 va `package-lock.json` bilan saqlanadi. 3-bosqich boshlanmadi.

## Joriy tartib

Frontendda `packageManager: yarn@1.22.22`, yagona `yarn.lock`, `.yarnrc`; eski frontend npm lockfile/config olib tashlangan. `build` script ichida ham `yarn typecheck` ishlaydi. Backend scriptlari, lockfile’i va dastur kodi o‘zgartirilmadi.

```sh
yarn install --frozen-lockfile
yarn typecheck
yarn test --run
yarn build
```

Yarn lock joriy tekshirilgan dependency daraxtidan import qilindi. Asosiy dependency versiyalari saqlandi. Mavjud transitive `react-is` va `@babel/core` versiyalari zarur peer sifatida manifestda aniq qayd etildi. React 18 loyihasida wildcard transitive type’lar React 19 bilan aralashmasligi uchun `@types/react`/`@types/react-dom` joriy 18-versiyalariga `resolutions` qo‘yildi. TypeScript tekshiruvi o‘chirilmagan, app source yoki auth biznes mantiqi o‘zgartirilmagan.

Oldingi bosqich hisobotlaridagi npm test natijalari tarixiy dalil bo‘lib qoladi; ular Yarn bilan bajarilgan deb qayta nomlanmaydi. Yangi tekshiruv natijalari ushbu faylda qayd qilinadi. Yangi security audit bajarilmasa oldingi audit yangi natija deb ko‘rsatilmaydi.

## Bajarilgan tekshiruvlar

- Yarn Classic 1.22.22 bilan bo‘sh `node_modules`dan `yarn install --frozen-lockfile --offline` o‘tdi; oldin yuklangan Yarn cache ishlatildi. Lockfile hash’i o‘zgarmagani tekshirildi. Engine/peer himoyalari o‘chirilmadi.
- `yarn typecheck` — app va config tekshiruvlari o‘tdi.
- `yarn test --run` — 5 faylda **21 test o‘tdi**.
- `CI=true yarn build` — o‘tdi; ichki typecheck ham Yarn orqali. Oldingi katta chunk warning’i saqlandi; warning limiti oshirilmadi.
- Backend scriptlari/package-lock va ikkala loyihadagi dastur kodi o‘zgarmagani, oldingi asosiy dependency versiyalari saqlangani va frontend npm lockfile yo‘qligi tekshirildi. README/AGENTS/reja havolalari va diff whitespace tekshiruvlari o‘tdi.
- Backend testlari bu package-manager o‘zgarishi uchun qayta ishlatilmadi; avvalgi 24 pass/5 TODO tarixiy holat saqlanadi. Yangi dependency security audit yoki browser sinovi bajarilmadi; app source o‘zgarmadi. Sandboxda Yarn global papkasiga yozish haqida muhit ogohlantirishi bo‘ldi, buyruqlar muvaffaqiyatli tugadi.
- Commit, push, deploy va 3-bosqich boshlanmadi.

## CSRF eslatmasi

Cookie browser tomonidan so‘rovga avtomatik qo‘shilishi mumkin. Shu sabab cookie bilan autentifikatsiya qilingan yozish amallari sessionga bog‘langan qo‘shimcha token va allowlisted origin tekshiruvini ham talab qiladi. TechHome `/member/csrf`dan token oladi va POST’da `X-CSRF-Token` bilan yuboradi; noto‘g‘ri token/origin 403 bilan rad etiladi. HttpOnly cookie JS tomonidan o‘qilishini cheklaydi; CSRF himoyasi esa alohida so‘rov tekshiruvlarini bajaradi. [To‘liq auth kontrakti](auth-security.md).
