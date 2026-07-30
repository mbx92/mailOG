---
title: PRD — MailOG (Sistem Surat Menyurat)
version: 0.1
date: 2026-07-30
status: Draft
design_ref: MiniMax-design-analysis (DESIGN-minimax---075f76f2)
---

# PRD — MailOG: Sistem Surat Menyurat

**Stack:** Nuxt 3 (full JS) + Drizzle ORM + Tailwind CSS & shadcn Vue + PostgreSQL + MinIO, pnpm
**Design System:** MiniMax-inspired (DM Sans, pill UI, monochrome + accent color cards)
**Status:** Draft

---

## 1. Tujuan & Latar Belakang

Membangun aplikasi manajemen surat masuk & keluar yang **standalone, paperless, audit-trail lengkap**. Sistem ini berdiri sendiri tapi di-desain modular sehingga integrasi API ke sistem lain bisa dilakukan tanpa rombak arsitektur.

**Masalah yang dipecahkan:**
- Surat fisik mudah hilang & susah dilacak
- Proses disposisi tidak ter-record
- Lampiran surat tidak terpusat (MinIO sebagai single source of truth)
- Tidak ada RBAC: staff bisa lihat surat internal unit lain
- Audit log manual atau tidak ada

---

## 2. Target User & RBAC

### 2.1 Level & Role

| Level | Role | Deskripsi |
|-------|------|-----------|
| 1 | **Super Admin** | God mode — full akses sistem: manage user, instansi, unit, semua surat, setting, logs |
| 2 | **Direksi / Direktur** | Approval surat keluar, supervisi, lihat semua surat di instansi |
| 3 | **Admin / Sekretaris** | Terima & registrasi surat masuk, disposisi ke unit/staff, tracking alur surat |
| 4 | **Staff Unit** | Terima disposisi, lihat surat masuk, tracking disposisi |
| 5 | **Viewer** | Read-only (bisa di-assign ke eksternal / tamu) |

### 2.2 Permission Matrix

| Action | Super Admin | Direksi | Admin/Sekretaris | Staff | Viewer |
|--------|:-----------:|:-------:|:----------------:|:-----:|:------:|
| Manage User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Instansi | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage Unit | ✅ | ❌ | ✅ | ❌ | ❌ |
| Buat Surat | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Surat (milik sendiri) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Surat (semua) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Hapus Surat | ✅ | ❌ | ❌ | ✅ | ❌ |
| Approve Surat Keluar | ✅ | ✅ | ✅ | ❌ | ❌ |
| Disposisi Surat Masuk | ✅ | ✅ | ✅ | ❌ | ❌ |
| Terima & Registrasi Surat | ✅ | ✅ | ✅ | ❌ | ❌ |
| Terima Disposisi | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lihat Surat (unit sendiri) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat Surat (semua instansi) | ✅ | ✅ | ❌ | ❌ | ✅* |
| Tracking Disposisi | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export Laporan | ✅ | ✅ | ✅ | ✅ | ❌ |
| Akses Log / Audit Trail | ✅ | ❌ | ❌ | ❌ | ❌ |

*Viewer hanya bisa lihat surat yang di-share ke dirinya.

---

## 3. Master Data

### 3.1 Instansi

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `kode` | VARCHAR(20) | Singkatan instansi, unique |
| `nama` | VARCHAR(255) | Nama lengkap instansi |
| `alamat` | TEXT | Alamat |
| `logo` | VARCHAR(255) | Path logo di MinIO (opsional) |
| `kontak` | VARCHAR(100) | Nomor telepon / email |
| `status` | ENUM | `aktif` / `nonaktif` |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

### 3.2 Unit

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `instansi_id` | UUID | FK → instansi |
| `parent_unit_id` | UUID | FK → unit (nullable, untuk hierarki) |
| `kode` | VARCHAR(20) | Kode unit, unique per instansi |
| `nama` | VARCHAR(255) | Nama unit |
| `kepala_unit_id` | UUID | FK → users (nullable) |
| `status` | ENUM | `aktif` / `nonaktif` |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

### 3.3 Users

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `unit_id` | UUID | FK → unit |
| `nama` | VARCHAR(255) | Nama lengkap |
| `email` | VARCHAR(255) | Unique, login credential |
| `password` | VARCHAR(255) | Hashed |
| `level` | SMALLINT | 1-5 (Super Admin, Direksi, Admin/Sekretaris, Staff, Viewer) |
| `jabatan` | VARCHAR(100) | Jabatan dalam unit |
| `no_telp` | VARCHAR(20) | |
| `avatar` | VARCHAR(255) | Path di MinIO |
| `is_active` | BOOLEAN | |
| `last_login` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

### 3.4 Klasifikasi Surat

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `nama` | VARCHAR(100) | Biasa, Penting, Rahasia, Segera |
| `warna` | VARCHAR(7) | Hex color untuk badge |
| `urutan` | SMALLINT | Urutan prioritas |
| `created_at` | TIMESTAMP | |

---

## 4. Fitur Inti

### 4.1 Manajemen Surat Masuk

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `nomor_surat` | VARCHAR(100) | Nomor surat dari pengirim |
| `perihal` | VARCHAR(255) | |
| `isi_ringkasan` | TEXT | Ringkasan isi surat |
| `asal_instansi_id` | UUID | FK → instansi (pengirim) |
| `asal_unit_id` | UUID | FK → unit (pengirim, opsional) |
| `pengirim` | VARCHAR(255) | Nama pengirim / penandatangan |
| `tanggal_surat` | DATE | Tanggal pada surat |
| `tanggal_diterima` | DATE | Tanggal diterima di sistem |
| `tujuan_unit_id` | UUID | FK → unit (unit penerima) |
| `klasifikasi_id` | UUID | FK → klasifikasi_surat |
| `status` | ENUM | `baru`, `diproses`, `disposisi`, `selesai`, `arsip` |
| `catatan_internal` | TEXT | Catatan untuk internal |
| `created_by` | UUID | FK → users |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

### 4.2 Manajemen Surat Keluar

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `nomor_surat` | VARCHAR(100) | Auto-generated (lihat format) |
| `perihal` | VARCHAR(255) | |
| `isi_surat` | TEXT | Body surat (HTML dari editor) |
| `tujuan_instansi_id` | UUID | FK → instansi |
| `tujuan_unit_id` | UUID | FK → unit (opsional) |
| `penerima` | VARCHAR(255) | Nama penerima |
| `penerima_jabatan` | VARCHAR(100) | |
| `penerima_alamat` | TEXT | Alamat tujuan |
| `template_id` | UUID | FK → template_surat (opsional) |
| `tanggal_surat` | DATE | |
| `unit_id` | UUID | FK → unit (unit pengirim) |
| `klasifikasi_id` | UUID | FK → klasifikasi_surat |
| `status` | ENUM | `draft`, `menunggu_approval`, `disetujui`, `ditolak`, `dikirim`, `arsip` |
| `approved_by` | UUID | FK → users (nullable) |
| `approved_at` | TIMESTAMP | |
| `catatan_internal` | TEXT | |
| `created_by` | UUID | FK → users |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

#### Format Nomor Surat (Auto-generate):
```
XXX / UNIT-KODE / MM / YYYY
```
Contoh: `025 / KEU / 07 / 2026`

Counter bulanan di tabel terpisah (`nomor_counter`).

### 4.3 Template Surat

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `nama` | VARCHAR(255) | Nama template |
| `kode` | VARCHAR(50) | Unique |
| `kop_surat` | TEXT | Header template (HTML) |
| `body_template` | TEXT | Template body (HTML dengan placeholder) |
| `footer` | TEXT | Footer template |
| `kertas` | ENUM | `a4`, `folio`, `legal` |
| `margin` | JSON | `{top, right, bottom, left}` dalam mm |
| `unit_id` | UUID | FK → unit (nullable, global template) |
| `is_default` | BOOLEAN | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `deleted_at` | TIMESTAMP | Soft delete |

#### Placeholder template:
- `{{nomor_surat}}`
- `{{tanggal}}`
- `{{perihal}}`
- `{{penerima}}`
- `{{penerima_jabatan}}`
- `{{penerima_alamat}}`
- `{{isi_surat}}`
- `{{pengirim_nama}}`
- `{{pengirim_jabatan}}`
- `{{kop_surat}}`

### 4.4 Lampiran (MinIO Integration)

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `surat_id` | UUID | FK → surat |
| `nama_file` | VARCHAR(255) | Nama asli file |
| `path` | VARCHAR(255) | Path di MinIO bucket |
| `mime_type` | VARCHAR(100) | `application/pdf`, `image/*`, dll |
| `size` | BIGINT | Ukuran file dalam bytes |
| `is_public` | BOOLEAN | Bisa diakses via link publik |
| `uploaded_by` | UUID | FK → users |
| `created_at` | TIMESTAMP | |

**Struktur Bucket MinIO:**
```
mailog/
├── instansi-kode/
│   ├── 2026/
│   │   ├── 01/
│   │   │   ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── templates/
    └── default-kop-surat.png
```

**File Access:** Via presigned URL (expired 1 jam) — bukan public bucket.

### 4.5 Disposisi

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `surat_id` | UUID | FK → surat |
| `dari_user_id` | UUID | FK → users (pemberi disposisi) |
| `ke_user_id` | UUID | FK → users (penerima disposisi) |
| `ke_unit_id` | UUID | FK → unit (alternatif ke unit) |
| `instruksi` | TEXT | Instruksi / arahan |
| `batas_waktu` | DATE | Deadline |
| `status` | ENUM | `diterima`, `diproses`, `selesai`, `diteruskan` |
| `parent_id` | UUID | FK → disposisi (untuk rantai disposisi) |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### 4.6 Tracking Log / Audit Trail

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `surat_id` | UUID | FK → surat |
| `user_id` | UUID | FK → users |
| `aksi` | VARCHAR(50) | `buat`, `baca`, `edit`, `hapus`, `upload`, `download`, `disposisi`, `approve`, `reject`, `kirim`, `arsip` |
| `detail` | JSONB | Metadata aksi (old_value, new_value, dll) |
| `ip_address` | VARCHAR(45) | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMP | Indexed |

### 4.7 Notifikasi

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `surat_id` | UUID | FK → surat (nullable) |
| `judul` | VARCHAR(255) | |
| `pesan` | TEXT | |
| `tipe` | ENUM | `info`, `disposisi`, `approval`, `system` |
| `is_read` | BOOLEAN | Default false |
| `read_at` | TIMESTAMP | |
| `created_at` | TIMESTAMP | |

---

## 5. ERD (Entity Relationship Diagram)

```
instansi ──< unit ──< user
  │                    │
  ├──< surat_masuk     ├──< disposisi (dari_user_id)
  │     │              └──< notifikasi
  │     ├──< lampiran
  │     ├──< disposisi
  │     └──< tracking_log
  │
  └──< surat_keluar
          │
          ├──< lampiran
          └──< tracking_log

template_surat ──< surat_keluar
klasifikasi_surat ──< surat

nomor_counter (tabel terpisah, no FK)
```

**Catatan:** `surat_masuk` dan `surat_keluar` bisa digabung jadi satu tabel `surat` dengan kolom `jenis: 'masuk' | 'keluar'` + kolom spesifik masing-masing via nullable fields. Alternatif: tabel terpisah. Untuk fase awal, **tabel terpisah** lebih clean secara Drizzle schema.

---

## 6. Arsitektur Teknis

### 6.1 Stack Detail

```
┌─────────────────────────────────────────────────────┐
│                    Nuxt 3 (SSR)                      │
│  Pages / Server Routes / API Middleware / Auth       │
├─────────────────────────────────────────────────────┤
│                Drizzle ORM (JS)                       │
│  Schema / Migrations / Queries / Relations            │
├──────────────────┬──────────────────────────────────┤
│   PostgreSQL     │         MinIO (S3-compat)         │
│   (Relational)   │         (Object Storage)          │
└──────────────────┴──────────────────────────────────┘
```

### 6.2 Nuxt 3

| Concern | Approach |
|---------|----------|
| **Auth** | `nuxt-auth-utils` (session-based) atau custom with JWT + httpOnly cookie |
| **State** | Pinia (global) + `useState` (per-page) |
| **Routing** | File-based (vite-plugin-pages / Nuxt pages) |
| **Forms** | `vee-validate` + `zod` |
| **HTTP** | `ofetch` untuk client → server routes |
| **Data Table** | TanStack Table (React Table tapi versi vanilla/vue: `@tanstack/vue-table`) |

### 6.3 Drizzle ORM

- **Schema:** Zod-inferable, type-safe
- **Migrations:** `drizzle-kit generate` + `drizzle-kit migrate`
- **Relations:** `relations` API untuk joins (tanpa raw SQL)
- **Query:** Relational queries (`findMany`, `findFirst` dengan include)

```js
// Example schema pattern
import { pgTable, uuid, varchar, text, timestamp, date, foreignKey } from 'drizzle-orm/pg-core';

export const suratMasuk = pgTable('surat_masuk', {
  id: uuid('id').defaultRandom().primaryKey(),
  nomorSurat: varchar('nomor_surat', { length: 100 }).notNull(),
  perihal: varchar('perihal', { length: 255 }).notNull(),
  // ...
});
```

### 6.4 MinIO Integration

```js
// Server utility untuk MinIO
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

export async function generatePresignedUploadUrl(bucket, fileName, expiry = 3600) {
  return minioClient.presignedPutObject(bucket, fileName, expiry);
}

export async function generatePresignedDownloadUrl(bucket, fileName, expiry = 3600) {
  return minioClient.presignedGetObject(bucket, fileName, expiry);
}
```

### 6.5 Environment Config

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/mailog"
MINIO_ENDPOINT="minio.local"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="mailog-admin"
MINIO_SECRET_KEY="***"
MINIO_BUCKET="mailog"
MINIO_PUBLIC_BASE_URL="https://minio.public.local/mailog"
SESSION_SECRET="***"
APP_URL="https://mailog.local"
```

---

## 7. User Interface (MiniMax Design Language)

Visual identity mengadaptasi **MiniMax Design System** untuk konteks formal pemerintahan/instansi. Monochrome dominant dengan aksen warna untuk status.

### 7.1 Design Tokens (Tailwind Config)

#### Colors

```javascript
// tailwind.config.js
colors: {
  // Primary — hitam sebagai anchor formal
  primary: {
    DEFAULT: '#0a0a0a',    // {colors.primary}
    soft: '#181e25',       // {colors.primary-soft}
    active: '#222222',     // {colors.charcoal}
  },
  // Canvas
  canvas: '#ffffff',       // {colors.canvas}
  surface: {
    DEFAULT: '#f7f8fa',    // {colors.surface}
    soft: '#f2f3f5',       // {colors.surface-soft}
  },
  // Text
  ink: '#0a0a0a',          // {colors.ink}
  charcoal: '#222222',     // {colors.charcoal}
  slate: '#45515e',        // {colors.slate}
  steel: '#5f5f5f',        // {colors.steel}
  muted: '#a8aab2',        // {colors.muted}
  // Accent — MiniMax coral sebagai brand accent untuk aksi utama
  brand: {
    coral: '#ff5530',
    blue: '#3b82f6',
    purple: '#a855f7',
    magenta: '#ea5ec1',
  },
  // Semantic
  success: {
    bg: '#e8ffea',
    text: '#1ba673',
  },
  error: '#d45656',
  warning: '#f59e0b',
  // Hairlines
  hairline: {
    DEFAULT: '#e5e7eb',    // {colors.hairline}
    soft: '#eaecf0',       // {colors.hairline-soft}
  },
}
```

#### Typography

```javascript
fontFamily: {
  sans: ['DM Sans', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
}
```

Hierarki font size mengikuti MiniMax:

| Token | Size | Weight | Line Height | Use Case di MailOG |
|-------|------|--------|-------------|--------------------|
| `display-lg` | 56px / 3.5rem | 600 | 1.10 | Dashboard hero (total surat) |
| `display-md` | 36px / 2.25rem | 600 | 1.15 | Page title utama |
| `display-sm` | 28px / 1.75rem | 600 | 1.20 | Section headers |
| `title-lg` | 22px / 1.375rem | 600 | 1.30 | Card title |
| `title-md` | 18px / 1.125rem | 600 | 1.40 | Sub-section header |
| `body-md` | 16px / 1rem | 400 | 1.50 | Body text, table content |
| `body-sm` | 14px / 0.875rem | 400 | 1.50 | Table cell, sidebar nav |
| `caption` | 13px / 0.8125rem | 400 | 1.70 | Metadata, help text |
| `caption-bold` | 13px / 0.8125rem | 600 | 1.50 | Badge, table header |
| `micro` | 12px / 0.75rem | 400 | 1.50 | Footer, chip label |
| `button` | 14px / 0.875rem | 600 | 1.40 | Button label |

#### Button Tokens (Tailwind - diadaptasi)

```css
/* Primary — black pill (MiniMax signature) */
.btn-primary {
  @apply bg-[#0a0a0a] text-white rounded-full px-6 py-[11px] text-sm font-semibold;
}
.btn-primary:hover {
  @apply bg-[#222222];
}

/* Secondary — outline pill */
.btn-secondary {
  @apply bg-transparent text-[#0a0a0a] border border-[#0a0a0a] rounded-full px-6 py-[11px] text-sm font-semibold;
}

/* Tertiary — white pill */
.btn-tertiary {
  @apply bg-white text-[#0a0a0a] border border-[#e5e7eb] rounded-full px-6 py-[11px] text-sm font-semibold;
}

/* Status badges — MiniMax badge style */
.badge-success {
  @apply bg-[#e8ffea] text-[#1ba673] rounded-full px-[10px] py-[4px] text-xs font-semibold;
}
.badge-new {
  @apply bg-[#ff5530] text-white rounded-full px-[10px] py-[4px] text-xs font-semibold;
}
```

### 7.2 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Status Bar (black promo banner) — optional instansi info │
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│ Sidebar│           Main Content Area                     │
│ Nav    │           (max-width ~1280px)                   │
│        │                                                │
│ ~220px │  ┌─ Stats Cards ─────┐ ┌─ Activity ─────────┐ │
│        │  │ Total Surat 1,234 │ │ Surat Masuk Baru   │ │
│        │  │ ↑ 12% dari bln    │ │ 5 disposisi perlu  │ │
│        │  │ lalu              │ │ ditindaklanjuti    │ │
│        │  └───────────────────┘ └────────────────────┘ │
│        │                                                │
│        │  ┌──────────────── Filter ──────────────────┐  │
│        │  │ [Cari surat...] [Instansi ▼] [Status ▼]  │  │
│        │  └────────────────────────────────────────────┘ │
│        │                                                │
│        │  ┌── Data Table (TanStack) ──────────────────┐  │
│        │  │ No │ Perihal │ Asal │ Tgl │ Status │ Aksi │  │
│        │  ├────┼─────────┼──────┼─────┼────────┼──────┤  │
│        │  │ 1  │ ...     │ ...  │ ... │ badge  │ ...  │  │
│        │  └────────────────────────────────────────────┘ │
└────────┴────────────────────────────────────────────────┘
```

#### Navigation Structure

**Sidebar (left rail):**
```
📬 MAILOG
────────────────────
📊 Dashboard
📥 Surat Masuk
📤 Surat Keluar
📋 Template Surat
────────────────────
📦 Master Data
├── Instansi
├── Unit
├── Klasifikasi
└── Users
────────────────────
📈 Laporan
⚙️ Pengaturan
```

### 7.3 Key UI Components

#### Status Cards (Dashboard)
- Background white `card-base` style (16px rounding, 1px hairline border)
- Angka besar `display-md`, label `body-sm` muted
- Warna aksen: coral untuk surat masuk, blue untuk surat keluar, purple untuk disposisi

#### Data Table
- Header: `caption-bold`, background `surface`, text `steel`
- Rows: `body-sm`, `ink`, alternating row dengan `hairline-soft` divider
- Rounded: `rounded-md`, border `1px hairline`
- Server-side pagination (info "Page 2 of 15, showing 10 of 148")

#### Search & Filter
- Search: `search-pill` style (surface bg, steel text, rounded-md, 36px height)
- Filter chip: `pill-tab` style (white bg, steel text, border hairline, rounded-full)
- Active filter chip: black-pill (primary bg, white text)

#### Form Inputs (Surat Form)
- Height 40px, `rounded-md`, border `1px hairline`
- Focus state: `2px solid brand-blue`
- Error state: `1px solid #d45656`
- Label: `caption-bold`, steel color

#### Detail Surat (Slide-over Panel)
- Sama kayak MiniMax doc sidebar — panel slide dari kanan
- Header dengan judul + close button (icon-circular)
- Body: label-value pairs dengan `hairline-soft` divider
- Footer: action buttons (primary, secondary)

#### Badges
- Status surat → `badge-*` pill (success/new/blue etc.)
- Klasifikasi → `badge-code` atau variant colored pill

#### Upload Area (Lampiran)
- Dropzone: dashed border, `rounded-xl`, icon + "Seret file ke sini atau klik untuk upload"
- File list: nama, size, status (uploading/uploaded/error), delete button
- Upload langsung ke MinIO lewat presigned URL (fetch PUT)

### 7.4 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| < 768px | Sidebar collapsed ke hamburger menu + bottom nav |
| 768px - 1024px | Sidebar sebagai drawer overlay |
| ≥ 1024px | Sidebar fixed, 3-column detail view pada surat |

---

## 8. Security

### 8.1 Keamanan Data
- **Password:** bcrypt/argon2 hashing
- **Session:** httpOnly cookie, signed, secure flag di production
- **SQL Injection:** Drizzle ORM parameterized query (built-in)
- **XSS:** Nuxt 3 auto-escaping, jangan gunakan `v-html` tanpa sanitasi
- **CSRF:** SameSite cookie + CSRF token pada form mutations

### 8.2 File Security (MinIO)
- Tidak ada public bucket — semua akses via presigned URL
- Expiry presigned URL: 1 jam (upload & download)
- Validasi mime type di server sebelum upload
- Scan virus? Pasang ClamAV di endpoint terpisah (phase 2)
- Rate limit upload: max 10 file per menit per user

### 8.3 Audit
- **WAJIB:** Setiap mutasi data tercatat di `tracking_log`
- Tidak ada hard delete — semua soft delete dengan `deleted_at`
- IP address & user agent tercatat di setiap aksi

---

## 9. Fase Pengembangan

| Fase | Fitur | Estimasi |
|------|-------|----------|
| **Fase 1** | Setup proyek Nuxt 3 + Drizzle schema + migrasi | 3 hari |
| | Auth (login/logout/register) + middleware RBAC | 3 hari |
| | Master Instansi & Unit CRUD | 2 hari |
| | CRUD Surat Masuk + upload MinIO (presigned) | 4 hari |
| **Fase 2** | Surat Keluar (editor, template, auto-number) | 5 hari |
| | Approval workflow (staff → kepala unit) | 3 hari |
| | Disposisi (multi-level, forward) | 3 hari |
| **Fase 3** | Tracking Log & Audit Trail | 2 hari |
| | Search & Filter (full-text search, filter chip) | 3 hari |
| | Notifikasi (in-app) | 2 hari |
| **Fase 4** | Dashboard & Grafik | 3 hari |
| | Export Laporan (PDF, Excel) | 3 hari |
| | Dashboard admin | 2 hari |
| **Fase 5** | Public API (kalau butuh integrasi eksternal) | 4 hari |
| | Dark mode? (bisa pakai Tailwind class-based) | 2 hari |
| | Performance optimization & testing | 3 hari |

**Total estimasi: ~45 hari kerja**

---

## 10. Struktur Proyek (Nuxt 3)

```
mailog/
├── .env
├── nuxt.config.js
├── tailwind.config.js
├── app.config.js
├── drizzle.config.js
├── package.json
│
├── server/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.js
│   │   │   ├── instansi.js
│   │   │   ├── unit.js
│   │   │   ├── users.js
│   │   │   ├── surat-masuk.js
│   │   │   ├── surat-keluar.js
│   │   │   ├── lampiran.js
│   │   │   ├── disposisi.js
│   │   │   ├── tracking-log.js
│   │   │   ├── notifikasi.js
│   │   │   ├── klasifikasi.js
│   │   │   └── nomor-counter.js
│   │   ├── migrations/
│   │   └── index.js
│   ├── middleware/
│   │   └── auth.js
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.js
│   │   │   ├── logout.post.js
│   │   │   └── me.get.js
│   │   ├── instansi/
│   │   ├── unit/
│   │   ├── surat-masuk/
│   │   ├── surat-keluar/
│   │   ├── disposisi/
│   │   ├── lampiran/
│   │   └── laporan/
│   ├── utils/
│   │   ├── minio.js
│   │   ├── nomor-generator.js
│   │   ├── rbac.js
│   │   └── pdf.js
│   └── plugins/
│       └── drizzle.js
│
├── app/
│   ├── pages/
│   │   ├── index.vue              → Dashboard
│   │   ├── login.vue
│   │   ├── surat-masuk/
│   │   │   ├── index.vue          → List
│   │   │   ├── [id].vue           → Detail
│   │   │   └── baru.vue           → Create
│   │   ├── surat-keluar/
│   │   │   ├── index.vue
│   │   │   ├── [id].vue
│   │   │   └── baru.vue
│   │   ├── master/
│   │   │   ├── instansi.vue
│   │   │   ├── instansi/[id].vue
│   │   │   ├── unit.vue
│   │   │   └── users.vue
│   │   ├── laporan/
│   │   │   └── index.vue
│   │   └── pengaturan.vue
│   ├── layouts/
│   │   ├── default.vue            → Sidebar layout
│   │   └── auth.vue                → Login page layout
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.vue
│   │   │   ├── DataTable.vue
│   │   │   ├── SearchPill.vue
│   │   │   ├── FilterChip.vue
│   │   │   ├── Badge.vue
│   │   │   ├── Dropzone.vue
│   │   │   ├── SlidePanel.vue
│   │   │   ├── StatCard.vue
│   │   │   ├── Sidebar.vue
│   │   │   └── Pagination.vue
│   │   ├── surat/
│   │   │   ├── SuratMasukForm.vue
│   │   │   ├── SuratKeluarForm.vue
│   │   │   ├── SuratTable.vue
│   │   │   ├── DetailSurat.vue
│   │   │   └── DisposisiForm.vue
│   │   └── layout/
│   │       ├── AppHeader.vue
│   │       ├── AppSidebar.vue
│   │       └── PromoBanner.vue
│   ├── composables/
│   │   ├── useAuth.js
│   │   ├── useRBAC.js
│   │   ├── useMinio.js
│   │   └── useNotification.js
│   └── utils/
│       └── formatters.js
│
└── public/
    └── favicon.ico
```

---

## 11. API Endpoints (Server Routes)

### Auth
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user info |

### Master Data
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/instansi` | List instansi |
| POST | `/api/instansi` | Create instansi |
| GET | `/api/instansi/:id` | Detail instansi |
| PUT | `/api/instansi/:id` | Update instansi |
| DELETE | `/api/instansi/:id` | Soft delete instansi |
| GET | `/api/unit` | List unit |
| POST | `/api/unit` | Create unit |
| PUT | `/api/unit/:id` | Update unit |
| DELETE | `/api/unit/:id` | Soft delete unit |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |

### Surat Masuk
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/surat-masuk` | List (filterable, pageable) |
| POST | `/api/surat-masuk` | Create |
| GET | `/api/surat-masuk/:id` | Detail + lampiran + disposisi |
| PUT | `/api/surat-masuk/:id` | Update |
| DELETE | `/api/surat-masuk/:id` | Soft delete |

### Surat Keluar
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/surat-keluar` | List |
| POST | `/api/surat-keluar` | Create (draft) |
| PUT | `/api/surat-keluar/:id/approve` | Approve |
| PUT | `/api/surat-keluar/:id/reject` | Reject |
| PUT | `/api/surat-keluar/:id/kirim` | Mark as sent |
| PUT | `/api/surat-keluar/:id` | Update |
| DELETE | `/api/surat-keluar/:id` | Soft delete |

### Disposisi
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/disposisi?surat_id=x` | List disposisi per surat |
| POST | `/api/disposisi` | Create disposisi |
| PUT | `/api/disposisi/:id` | Update status |

### Lampiran
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/lampiran/upload-url` | Generate presigned upload URL |
| POST | `/api/lampiran` | Save lampiran record (after upload) |
| GET | `/api/lampiran/:id/download` | Generate presigned download URL |
| DELETE | `/api/lampiran/:id` | Delete lampiran + file di MinIO |

### Laporan
| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/laporan/rekap-bulanan?tahun=2026&bulan=7` | Rekap |
| GET | `/api/laporan/export-pdf?type=xxx` | Export PDF |

---

## 12. Dependencies (package.json)

```json
{
  "dependencies": {
    "nuxt": "^3.x",
    "vue": "latest",
    "pinia": "^2.x",
    "drizzle-orm": "^0.36.x",
    "postgres": "^3.x",
    "minio": "^8.x",
    "zod": "^3.x",
    "vee-validate": "^4.x",
    "bcryptjs": "^2.x",
    "@tanstack/vue-table": "^8.x",
    "reka-ui": "^1.x",
    "vue-sonner": "^1.x",
    "date-fns": "^4.x",
    "lucide-vue-next": "^0.x"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.x",
    "tailwindcss": "^4.x",
    "nuxt-auth-utils": "^0.x"
  }
}
```

---

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| MinIO down → file gak bisa diakses | Tinggi | Backup MinIO ke secondary. Cache file info di DB untuk fallback |
| File besar upload lambat | Sedang | Chunked upload, limit 20MB/file, notifikasi progress |
| RBAC kompleks — salah konfigurasi bocor data | Tinggi | Middleware on every route + unit test RBAC |
| Surat keluar kehilangan isi karena editor crash | Sedang | Auto-save draft ke localStorage setiap 30 detik |
| Migration conflict di production | Sedang | Gimme Drizzle: migration versioning, rollback plan |

---

## 14. Glossary

| Istilah | Arti |
|---------|------|
| **Surat Masuk** | Surat yang diterima dari instansi/unit eksternal |
| **Surat Keluar** | Surat yang dibuat dan dikirim ke instansi/unit eksternal |
| **Disposisi** | Proses pengarahan surat masuk ke unit/pegawai tertentu |
| **RBAC** | Role-Based Access Control |
| **Presigned URL** | URL sementara dari MinIO untuk upload/download file aman |
| **Soft Delete** | Data tidak benar-benar dihapus, hanya ditandai `deleted_at` |
| **Drizzle ORM** | ORM untuk PostgreSQL — schema-driven, migration via drizzle-kit |

---

**File:** `/home/mbx/projects/mailog/PRD.md`
**Next:** Lanjut ke pembuatan Drizzle schema & setup proyek setelah PRD di-ACC.
