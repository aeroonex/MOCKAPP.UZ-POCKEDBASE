# Mockapp.uz — Self-hosted deploy (Docker)

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
