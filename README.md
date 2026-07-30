# MailOG

Sistem surat menyurat standalone — paperless, audit-trail lengkap.  
Stack: **Nuxt** + **Drizzle ORM** + **PostgreSQL** + **MinIO** · Design: MiniMax-inspired (DM Sans, pill UI).

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (PostgreSQL + MinIO)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Start Postgres + MinIO
pnpm docker:up

# 3. Push schema & seed
pnpm db:push
pnpm db:seed

# 4. Dev server
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000)

Postgres Docker memakai port **5433** (hindari bentrok dengan Postgres lokal di 5432).

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@mailog.local` | `admin12345` |
| Sekretaris | `sekretaris@mailog.local` | `sekretaris123` |

MinIO console: [http://localhost:9001](http://localhost:9001) (`mailog-admin` / `mailog-secret`)

## Fase 1 (saat ini)

- Auth session (`nuxt-auth-utils`) + RBAC middleware
- Master: Instansi, Unit, Users, Klasifikasi
- CRUD Surat Masuk (list, detail, registrasi)
- Lampiran: presigned upload/download MinIO
- Dashboard statistik
- UI MiniMax (DM Sans, black-pill CTA, status cards)

## Fase berikutnya

Lihat `MailOG-PRD.md` §9 — Surat Keluar, disposisi multi-level, audit UI, laporan, public API.

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `pnpm dev` | Dev server |
| `pnpm db:push` | Sync schema ke Postgres |
| `pnpm db:generate` | Generate migration SQL |
| `pnpm db:migrate` | Jalankan migrations |
| `pnpm db:seed` | Data demo |
| `pnpm docker:up` | Start Postgres + MinIO |

## Env

Salin `.env.example` → `.env`. `NUXT_SESSION_PASSWORD` minimal 32 karakter.
