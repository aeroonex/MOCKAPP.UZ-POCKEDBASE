# Mockapp.uz — Self-hosted deploy

Ikki variant: **A) k3s (Kubernetes)** — hozirgi serverdagi usul; **B) docker compose** — oddiy VPS uchun.

## A) k3s (ingress-nginx + cert-manager)

```bash
cd /opt/edumock                        # loyiha kodi
bash deploy/k8s-deploy.sh              # build → k3s import → apply (namespace: edumock)
kubectl -n edumock get pods,ingress,certificate
```

- Manifestlar: `deploy/k8s/` (namespace, Postgres StatefulSet, API, Web, Ingress)
- Superadmin ma'lumotlari birinchi joylashda `.admin-credentials` fayliga yoziladi (600)
- Yangilash: kodni yangilab yana `bash deploy/k8s-deploy.sh` (yangi TAG bilan rollout)
- Faqat manifest o'zgargan bo'lsa: `SKIP_BUILD=1 bash deploy/k8s-deploy.sh`

## Telegram ro'yxatdan o'tish boti (Ro'yxat bo'limi)

Talabalar CEFR mock imtihoniga Telegram bot orqali ro'yxatdan o'tadi; arizalar platformadagi
**Ro'yxat** sahifasida ko'rinadi (tasdiqlash/rad etish → talabaga bot orqali xabar boradi).

- **Har bir tashkilotchi o'z botini ulaydi**: Ro'yxat → Sozlamalar → "Telegram bot" → BotFather tokeni.
  Botga `/start` bosgan har kim avtomatik shu tashkilotchiga bog'lanadi (deep-link/kod kerak emas).
  Tizim bir vaqtda ko'p botni yuritadi (har biri long polling, API pod ichida); tokenlar
  `registration_settings.bot_token` da. Token boshqa akkauntga ulangan bo'lsa, yangi so'rov uni ko'chirib oladi.
- Umumiy `TELEGRAM_BOT_TOKEN` yo'q — har bir tashkilotchi o'z tokenini Sozlamalar → Telegram bot da kiritadi.
  **Bitta token faqat bitta joyda** ishlashi kerak (lokal + server = 409 Conflict).
- Narx, karta, imtihon ma'lumotlari Ro'yxat → Sozlamalar da.
- Mock Test: biror qismda 2 soat ichida ishlatilmagan savol qolmasa, kutish vaqti avtomatik tiklanadi.
- **Bepul rejim** (sozlamalarda): yoqilsa bot to'lov qadamlarini (karta/chek/vaqt) so'ramaydi — 3 qadam.
- **Admin bot paneli**: Ro'yxat → Sozlamalar → "Yangi admin havolasi" (bir martalik, 24 soat). Admin uni
  Telegram'da ochib Start bossa adminlar ro'yxatiga qo'shiladi; havola shu zahoti bekor bo'ladi. Adminlar bir nechta
  bo'lishi mumkin (hammasiga bir vaqtda yuboriladi), har birini alohida o'chirish mumkin. Har bir yuklangan Speaking
  videosi (o'quvchi, telefon, markaz, tashkilotchi, imtihon) adminlarga keladi — zaxira. 50 MB dan katta videolar
  faqat havola bilan yuboriladi (Bot API chegarasi).
- **Arxiv**: Natijalar tabida o'quvchilarni tanlab "Arxivga ko'chirish" — kunlik pack'lar (Arxiv tabi), ochib
  to'liq ma'lumot ko'rish, CSV, qaytarish.
- **Billing (obuna)**: admin.edumock.uz → Billing — narx, karta, muddat (sukut 30 kun), eslatma (5 kun).
  Foydalanuvchi Sozlamalar → To'lov da chek yuklaydi → admin To'lovlar tabida tasdiqlaydi → `users.paid_until`
  +30 kun. Muddati tugagan/bloklangan foydalanuvchi uchun API 402 qaytaradi (auth/billing/sozlamalar ochiq),
  UI kulrang + popup. Developer roli cheklanmaydi. Yangilanganda mavjud foydalanuvchilarga 30 kun berildi.
- **Imtihon stansiyasi** `cefr.edumock.uz` (ingress'da alohida host, xuddi shu web image): frontend host nomi
  `cefr.` bilan boshlansa qisqartirilgan rejim — faqat parol bilan kirish, Mock Test va Yozuvlar. Parol
  Ro'yxat → Sozlamalar → "Imtihon stansiyasi" da o'rnatiladi; token cheklangan (`station: true`, 12 soat):
  boshqaruv API'lari 403 qaytaradi. Stansiyada har bir Speaking videosi avtomatik serverga yuklanadi va
  adminlarga boradi. DNS: `cefr.edumock.uz` → server (Cloudflare proxied bo'lsa ham ishlaydi).
- **Avtomatik tozalash**: Telegram'ga zaxiralangan videolar `video_retention_days` (sukut 15) kundan keyin
  serverdan o'chiriladi (har 6 soatda tekshiriladi); zaxiralanmaganlar o'chirilmaydi.
- **Mock test**: "Ro'yxatdan qidirish" — tasdiqlangan o'quvchini tanlab topshirilsa video avtomatik yuklanadi.
- **Natijalar**: Ro'yxat → Natijalar tabi — L/R/W/S ballari, "topshirilmagan" belgisi, Overall (topshirilganlar
  o'rtachasi, yaxlitlangan). "Natijalarni e'lon qilish" → tasdiqlash → to'liq belgilanganlarga bot orqali
  individual (ballar + Speaking video). `PUBLIC_BASE_URL` — xabarlardagi havolalar uchun.
- Chek rasmlari `DATA_DIR/uploads/receipts/` ga saqlanadi (`/files/receipts/...`).

## B) docker compose

Arxitektura (bitta domen ostida):

```
Internet → Cloudflare → Nginx Proxy Manager (SSL) → web:80 (nginx, SPA)
                                                     ├─ /api/*   → api:4000 (Fastify)
                                                     └─ /files/* → api:4000 (video/rasm)
                                                          api → db:5432 (PostgreSQL 16)
```

Konteynerlar: `db` (PostgreSQL 16), `api` (Node 22 + Fastify), `web` (nginx + Vite build).
Ma'lumotlar: `db_data` (baza) va `uploads` (videolar/rasmlar) Docker volume'larida.

## 1. Serverga joylash

```bash
mkdir -p /opt/edumock && cd /opt/edumock
git clone https://github.com/aeroonex/MOCKAPP.UZ-POCKEDBASE.git .
cp .env.deploy.example .env.deploy
nano .env.deploy   # POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL/ADMIN_PASSWORD
```

## 2. Ishga tushirish

```bash
docker compose --env-file .env.deploy up -d --build
docker compose --env-file .env.deploy ps
curl -s http://127.0.0.1:8087/api/health   # {"message":"API is healthy.","code":200}
```

Birinchi ishga tushishda `api` konteyneri jadvallarni yaratadi (`server/src/migrations/*.sql`)
va `ADMIN_EMAIL`/`ADMIN_PASSWORD` bo'yicha superadmin (`role=developer`) yaratadi.

## 3. Nginx Proxy Manager'da host

- Domain: `edumock.uz` (va `www.edumock.uz`)
- Scheme: `http`, Forward host: server IP yoki `127.0.0.1`, port: `8087` (WEB_PORT)
- SSL: Let's Encrypt (yoki Cloudflare Origin sertifikat), **Force SSL**, HTTP/2
- Advanced (katta video yuklash uchun):
  ```
  client_max_body_size 2100m;
  proxy_request_buffering off;
  proxy_read_timeout 3600s;
  proxy_send_timeout 3600s;
  ```

Cloudflare orqali proksi qilinsa: SSL/TLS rejimi **Full (strict)**. Eslatma: Cloudflare bepul
tarifida bitta so'rov hajmi 100 MB bilan cheklangan — katta videolar uchun `edumock.uz`
DNS yozuvini "DNS only" qiling yoki alohida subdomen (`files.edumock.uz`, DNS only) ishlating.

## 4. Yangilash

```bash
cd /opt/edumock && git pull
docker compose --env-file .env.deploy up -d --build
```

## 5. Zaxira nusxa

```bash
# Baza
docker compose --env-file .env.deploy exec db pg_dump -U mockapp mockapp | gzip > backup_$(date +%F).sql.gz
# Fayllar
docker run --rm -v edumock_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%F).tgz -C /data .
```

## 6. Loglar

```bash
docker compose --env-file .env.deploy logs -f api
docker compose --env-file .env.deploy logs -f web
```

## Lokal ishlab chiqish

```bash
# 1) PostgreSQL (lokal yoki docker: docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16-alpine)
# 2) Backend
cd server && cp .env.example .env && nano .env && pnpm install && pnpm dev     # :4000
# 3) Frontend (Vite /api va /files ni :4000 ga proxy qiladi)
pnpm install && pnpm dev                                                       # :8080
```
