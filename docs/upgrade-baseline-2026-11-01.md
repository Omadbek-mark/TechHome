# TechHome upgrade: boshlang‘ich ishchi holat

Sana: 2026-11-01 (Asia/Seoul). Ushbu ro‘yxat 0-bosqich fayllari yaratilishidan oldin olindi.

`M` — o‘zgartirilgan, `D` — o‘chirilgan, `??` — Git hali kuzatmayotgan fayl. Bular avvaldan mavjud ishlar; upgrade vaqtida qaytarilmaydi yoki avtomatik commit qilinmaydi. Ro‘yxatda faqat yo‘llar bor; env qiymatlari, parollar va tokenlar yo‘q.

Bu Git commit/snapshot emas. Tekshiruv uchun mavjud tracked va untracked fayllarning mazmuni lokal vaqtinchalik nazorat yozuvi bilan solishtiriladi; maxfiy mazmun yoki uning hash qiymatlari ushbu hujjatga kiritilmaydi.

## TechHome

```text
 M src/controllers/product.controller.ts
 M src/libs/types/product.ts
 M src/models/Product.service.ts
 M src/public/css/products.css
?? docs/techhome-audit-2026-10-28.md
```

## TechHome-react

```text
 M .env
 M deploy.sh
 M package.json
 M public/icons/favicon.svg
 D public/img/banner.png
 D public/img/banner.webp
 D public/img/coming.webp
 D public/img/cutlet.webp
 D public/img/default-user.png
 D public/img/discount.webp
 D public/img/doner.png
 D public/img/doner.webp
 D public/img/food-city.webp
 D public/img/fresh.webp
 D public/img/gurme.png
 D public/img/gurme.webp
 D public/img/justin.webp
 D public/img/kebab-fresh.webp
 D public/img/kebab.webp
 D public/img/lavash.webp
 D public/img/logo.png
 D public/img/logo.webp
 D public/img/martin.webp
 D public/img/nusret.webp
 D public/img/rose.webp
 D public/img/seafood.png
 D public/img/seafood.webp
 D public/img/sweets.png
 D public/img/sweets.webp
 M public/index.html
 M public/manifest.json
 M src/app/components/auth/index.tsx
 M src/app/components/footer/index.tsx
 M src/app/components/headers/Basket.tsx
 M src/app/components/headers/HomeNavbar.tsx
 M src/app/components/headers/OtherNavbar.tsx
 M src/app/screens/helpPage/index.tsx
 D src/app/screens/homePage/ActiveUsers.tsx
 D src/app/screens/homePage/Events.tsx
 D src/app/screens/homePage/NewDishes.tsx
 D src/app/screens/homePage/PopularDishes.tsx
 M src/app/screens/homePage/Statistics.tsx
 M src/app/screens/homePage/index.tsx
 M src/app/screens/homePage/selector.ts
 M src/app/screens/homePage/slice.ts
 M src/app/screens/productsPage/ChosenProduct.tsx
 M src/app/screens/productsPage/Products.tsx
 M src/app/screens/productsPage/selector.ts
 M src/app/screens/productsPage/slice.ts
 M src/app/screens/userPage/Settings.tsx
 M src/app/screens/userPage/index.tsx
 M src/app/services/MemberService.ts
 M src/app/services/ProductService.ts
 M src/css/app.css
 M src/css/footer.css
 M src/css/help.css
 M src/css/home.css
 M src/css/navbar.css
 M src/css/order.css
 M src/css/products.css
 M src/css/userPage.css
 M src/global.d.ts
 M src/lib/data/faq.ts
 M src/lib/data/plans.ts
 M src/lib/data/terms.ts
 M src/lib/enums/member.enum.ts
 M src/lib/enums/order.enum.ts
 M src/lib/enums/product.enum.ts
 D src/lib/enums/view.enum.ts
 M src/lib/types/member.ts
 M src/lib/types/product.ts
 M src/lib/types/screen.ts
 M yarn.lock
?? package-lock.json
?? public/icons/TechHome.svg
?? public/icons/default-user.png
?? public/img/Artel2.png
?? public/img/TechHomeLogo.svg
?? public/img/artel.png
?? public/img/artel1.png
?? public/img/artel11.png
?? public/img/artel3.png
?? public/img/auth.png
?? public/img/auth1.webp
?? public/img/bannerTech.png
?? public/img/beko.png
?? public/img/bosch.png
?? public/img/bosch1.png
?? public/img/bosch2.png
?? public/img/footer.png
?? public/img/footer1.png
?? "public/img/lg brand.png"
?? public/img/lg.png
?? public/img/lg1.png
?? public/img/lg11.png
?? public/img/lg2.png
?? public/img/lg3.png
?? public/img/midea.png
?? public/img/navbarTech.png
?? public/img/samsung.png
?? public/img/samsung1.png
?? public/img/samsung11.png
?? public/img/samsung2.png
?? public/img/samsung3.png
?? public/img/xiaomi.png
?? public/img/xiaomi1.png
?? public/img/xiaomi2.png
?? src/app/components/ProductTile.tsx
?? src/app/screens/homePage/Deals.tsx
?? src/app/screens/homePage/PopularProducts.tsx
?? src/app/screens/homePage/PromoBanner.tsx
?? src/css/app2.css
?? src/lib/data/brands.ts
?? src/lib/data/member.ts
?? src/lib/data/orders.ts
?? src/lib/data/products.ts
```
