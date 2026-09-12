# Mockapp.uz — CEFR Speaking platformasi

O'quv markazlari uchun CEFR Speaking imtihonini tashkil etish va sinov (mock) testlarini
yozib olish platformasi. To'liq self-hosted: React (Vite) frontend + Fastify backend + PostgreSQL.

- `src/` — frontend (React 18, TypeScript, Tailwind, shadcn/ui, i18n: uz/en/ru/tr/ar)
- `server/` — backend API (Node 22, Fastify 5, PostgreSQL 16, JWT, fayl saqlash)
- `nginx/`, `Dockerfile.web`, `docker-compose.yml` — deploy

Deploy bo'yicha qo'llanma: [DEPLOY.md](DEPLOY.md)
