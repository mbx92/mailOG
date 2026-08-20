# Graph Report - /Users/mbx/Projects/mailOG  (2026-08-04)

## Corpus Check
- 3 files · ~220,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 743 nodes · 1353 edges · 92 communities (58 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Auth & CRUD Routes
- Design System & Infra Docs
- Surat Masuk Detail UI
- Template Editor Page
- Legacy MySQL Migration
- Settings & Branding APIs
- Surat Keluar Detail UI
- MinIO File Storage
- Package Scripts & Tooling
- Nomor Surat Counters UI
- Drizzle Domain Schema
- Laporan Rekap Page
- Surat Keluar Create Form
- Pengaturan Admin Page
- Surat Masuk Create Form
- Klasifikasi Master UI
- App Sidebar Navigation
- Login Page & SSO
- Surat Masuk List Page
- Surat Keluar List Page
- Notification Bell UI
- Disposisi List Page
- Core Runtime Dependencies
- Instansi Master UI
- Unit Master UI
- File Preview Component
- Users Admin UI
- Status Formatters Utils
- Rich Text Editor
- Surat Template Renderer
- Favicon PNG Brand Mark
- Favicon SVG Brand Mark
- Logo SVG Brand Mark
- Database Backup API
- Line Chart Component
- Dashboard Home Page
- Humanized Error Helpers
- Confirm Dialog UI
- Letter Preview UI
- Search Pill Input
- Button Component
- RBAC Permission Matrix
- Favicon Generation Script
- App Header Auth
- Badge Component
- Stat Card Component
- Auth Composable
- clsx Utility Dep
- date-fns Dependency
- drizzle-orm Dependency
- h3 Server Dependency
- Lucide Vue Icons
- Nuxt SSO Client
- Nuxt Framework
- Nuxt Auth Utils
- Nuxt Fonts Module
- Tailwind Nuxt Module
- Pinia Store Library
- Pinia Nuxt Module
- Postgres Driver
- tailwind-merge Utility
- TanStack Vue Table
- Tiptap Text Align
- Tiptap Underline
- Tiptap ProseMirror
- Tiptap Starter Kit
- Tiptap Vue 3
- vee-validate Forms
- vee-validate Zod
- Vue Runtime
- vue-chartjs Charts
- Vue Router
- vue-sonner Toasts
- Zod Validation
- Disposisi Notif Backfill

## God Nodes (most connected - your core abstractions)
1. `useDb()` - 68 edges
2. `requireAuthUser()` - 60 edges
3. `writeAuditLog()` - 41 edges
4. `can()` - 28 edges
5. `requirePermission()` - 28 edges
6. `unit` - 17 edges
7. `users` - 16 edges
8. `scripts` - 15 edges
9. `main()` - 15 edges
10. `suratKeluar` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Uploads Directory Layout` --semantically_similar_to--> `Lampiran`  [INFERRED] [semantically similar]
  uploads/README.md → MailOG-PRD.md
- `mailog-minio` --semantically_similar_to--> `MinIO`  [INFERRED] [semantically similar]
  docker-compose.yml → MailOG-PRD.md
- `MiniMax-inspired UI` --semantically_similar_to--> `MiniMax Design System`  [INFERRED] [semantically similar]
  README.md → DESIGN-minimax.md
- `DM Sans` --semantically_similar_to--> `MiniMax Design Language for MailOG`  [INFERRED] [semantically similar]
  DESIGN-minimax.md → MailOG-PRD.md
- `Black Pill CTA` --semantically_similar_to--> `MiniMax Design Language for MailOG`  [INFERRED] [semantically similar]
  DESIGN-minimax.md → MailOG-PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MailOG Five-Level RBAC Roles** — mailog_prd_rbac, mailog_prd_super_admin, mailog_prd_direksi, mailog_prd_admin_sekretaris, mailog_prd_staff_unit, mailog_prd_viewer [EXTRACTED 1.00]
- **Core Correspondence Domain Model** — mailog_prd_surat_masuk, mailog_prd_surat_keluar, mailog_prd_disposisi, mailog_prd_lampiran, mailog_prd_tracking_log [EXTRACTED 1.00]
- **MailOG Technical Stack** — mailog_prd_nuxt_3, mailog_prd_drizzle_orm, mailog_prd_postgresql, mailog_prd_minio, mailog_prd_tech_architecture [EXTRACTED 1.00]
- **Favicon brand composition** — public_favicon_32_mailog_favicon, public_favicon_32_envelope_symbol, public_favicon_32_circular_border, public_favicon_32_neon_outline_style [INFERRED 0.85]
- **Favicon Visual Composition** — public_favicon_circular_frame, public_favicon_envelope_motif, public_favicon_brand_blue [EXTRACTED 1.00]
- **MailOG App Icon Composition** — public_logo_circular_badge, public_logo_envelope_icon, public_logo_brand_blue [EXTRACTED 1.00]

## Communities (92 total, 34 thin omitted)

### Community 0 - "API Auth & CRUD Routes"
Cohesion: 0.09
Nodes (45): schema, schema, schema, schema, schema, schema, schema, ALLOWED (+37 more)

### Community 1 - "Design System & Infra Docs"
Cohesion: 0.05
Nodes (50): Black Pill CTA, DM Sans, Documentation 3-Column Layout, Dual Identity Branding, Flat Elevation System, MiniMax Design System, Product Color Encoding, Vibrant Product Cards (+42 more)

### Community 2 - "Surat Masuk Detail UI"
Cohesion: 0.07
Nodes (26): actionBusy, actionError, archiveDialogOpen, { can, user }, canArchive, canCreateDisposisi, canUpload, downloadFile() (+18 more)

### Community 3 - "Template Editor Page"
Cohesion: 0.07
Nodes (31): { can }, clearImage(), deleteBusy, deleteId, deleteOpen, editingId, emptyForm(), footerInput (+23 more)

### Community 4 - "Legacy MySQL Migration"
Cohesion: 0.11
Nodes (19): disposisiStatusEnum, statusAktifEnum, klasifikasiSurat, lampiranJenisEnum, notifikasi, notifikasiTipeEnum, kertasEnum, suratKeluarRelations (+11 more)

### Community 5 - "Settings & Branding APIs"
Cohesion: 0.13
Nodes (26): isDeleted(), parseInserts(), parseTuple(), readValueTuples(), toDate(), toDateOnly(), args, basenameFromLegacyPath() (+18 more)

### Community 6 - "Surat Keluar Detail UI"
Cohesion: 0.16
Nodes (17): schema, schema, schema, generalSchema, integrasiSchema, appSettings, DEFAULT_SETTINGS, nomorCounter (+9 more)

### Community 7 - "MinIO File Storage"
Cohesion: 0.08
Nodes (19): actionBusy, actionError, busy, { can, user }, canApprove, canEdit, canKirim, canSubmit (+11 more)

### Community 8 - "Package Scripts & Tooling"
Cohesion: 0.20
Nodes (19): ALLOWED, schema, ensureBucket(), useMinio(), buildObjectPath(), candidateLocalPaths(), ensureMinioBucket(), findLocalFile() (+11 more)

### Community 9 - "Nomor Surat Counters UI"
Cohesion: 0.09
Nodes (21): drizzle-kit, devDependencies, drizzle-kit, name, private, scripts, build, db:backfill-notif (+13 more)

### Community 10 - "Drizzle Domain Schema"
Cohesion: 0.10
Nodes (16): addForm, bulan, bulanOptions, { can }, contohLive, counters, editBusy, editValues (+8 more)

### Community 11 - "Laporan Rekap Page"
Cohesion: 0.12
Nodes (11): bulan, BULAN_SINGKAT, bulanOptions, { can }, isOps, now, rekap, ringkasan (+3 more)

### Community 12 - "Surat Keluar Create Form"
Cohesion: 0.15
Nodes (15): { can, user }, defaultTemplate, dragOver, error, fileInput, files, form, livePreview (+7 more)

### Community 13 - "Pengaturan Admin Page"
Cohesion: 0.13
Nodes (11): activityPage, backupLoading, { can, isSuperAdmin }, generalForm, integrasiForm, route, saving, settings (+3 more)

### Community 14 - "Surat Masuk Create Form"
Cohesion: 0.20
Nodes (12): { can }, dragOver, error, fileInput, files, form, loading, onDrop() (+4 more)

### Community 15 - "Klasifikasi Master UI"
Cohesion: 0.15
Nodes (8): { can }, canManage, editingId, filtered, form, loading, q, showForm

### Community 16 - "App Sidebar Navigation"
Cohesion: 0.18
Nodes (9): bottomNav, brandName, { can, isSuperAdmin }, emit, mainNav, masterNav, open, props (+1 more)

### Community 17 - "Login Page & SSO"
Cohesion: 0.20
Nodes (10): email, { enabled: ssoEnabled, loginPath: ssoLoginPath }, error, humanizeLoginError(), loading, { login }, onSubmit(), password (+2 more)

### Community 18 - "Surat Masuk List Page"
Cohesion: 0.20
Nodes (9): { can }, isMonitor, meta, page, q, route, rows, status (+1 more)

### Community 19 - "Surat Keluar List Page"
Cohesion: 0.20
Nodes (9): { can }, isOps, meta, page, q, route, rows, status (+1 more)

### Community 20 - "Notification Bell UI"
Cohesion: 0.22
Nodes (4): items, open, root, unread

### Community 21 - "Disposisi List Page"
Cohesion: 0.22
Nodes (8): { can }, meta, page, q, route, rows, status, statusFilters

### Community 22 - "Core Runtime Dependencies"
Cohesion: 0.22
Nodes (9): chart.js, minio, dependencies, chart.js, minio, @tiptap/extension-placeholder, vue, vue (+1 more)

### Community 23 - "Instansi Master UI"
Cohesion: 0.25
Nodes (5): { can }, form, loading, q, showForm

### Community 24 - "Unit Master UI"
Cohesion: 0.25
Nodes (5): { can }, form, loading, q, showForm

### Community 25 - "File Preview Component"
Cohesion: 0.33
Nodes (6): downloadUrl, emit, kind, onKey(), previewUrl, props

### Community 26 - "Users Admin UI"
Cohesion: 0.29
Nodes (5): { can }, form, loading, q, showForm

### Community 27 - "Status Formatters Utils"
Cohesion: 0.29
Nodes (3): STATUS_DISPOSISI, STATUS_SURAT_KELUAR, STATUS_SURAT_MASUK

### Community 28 - "Rich Text Editor"
Cohesion: 0.33
Nodes (3): editor, emit, props

### Community 29 - "Surat Template Renderer"
Cohesion: 0.67
Nodes (5): applyPlaceholders(), normalizeNewlines(), renderSuratKeluarHtml(), templateAssetUrl(), toHtmlBlock()

### Community 30 - "Favicon PNG Brand Mark"
Cohesion: 0.47
Nodes (6): Circular Border, Email Communication, Envelope Symbol, MailOG Brand Mark, MailOG Favicon, Neon Outline Style

### Community 31 - "Favicon SVG Brand Mark"
Cohesion: 0.60
Nodes (6): Brand Blue #1456f0, Circular Frame, Email Product Identity, Envelope Motif, MailOG Favicon Mark, Outlined Line-Art Style

### Community 32 - "Logo SVG Brand Mark"
Cohesion: 0.67
Nodes (6): Brand Blue #1456f0, Circular Badge Frame, Email / Mail Motif, Envelope Icon, MailOG, MailOG Logo

### Community 33 - "Database Backup API"
Cohesion: 0.40
Nodes (4): BACKUP_DIR, parseDatabaseUrl(), ROOT, runPgDump()

### Community 34 - "Line Chart Component"
Cohesion: 0.40
Nodes (3): chartData, chartOptions, props

### Community 35 - "Dashboard Home Page"
Cohesion: 0.40
Nodes (4): { can }, isOps, recent, stats

### Community 36 - "Humanized Error Helpers"
Cohesion: 0.90
Nodes (3): humanizeError(), looksLikeTechnicalError(), throwHumanError()

### Community 37 - "Confirm Dialog UI"
Cohesion: 0.70
Nodes (4): autoCreateUnitFromSso(), deriveUnitCode(), resolveSsoUser(), setMailogSession()

### Community 38 - "Letter Preview UI"
Cohesion: 0.67
Nodes (3): emit, onKey(), props

### Community 39 - "Search Pill Input"
Cohesion: 0.50
Nodes (3): padStyle, paperClass, props

### Community 40 - "Button Component"
Cohesion: 0.50
Nodes (3): emit, props, value

## Knowledge Gaps
- **335 isolated node(s):** `{ user, logout }`, `route`, `{ can, isSuperAdmin }`, `brandName`, `props` (+330 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Core Runtime Dependencies` to `Nomor Surat Counters UI`, `date-fns Dependency`, `drizzle-orm Dependency`, `h3 Server Dependency`, `Lucide Vue Icons`, `Nuxt SSO Client`, `Nuxt Framework`, `Nuxt Auth Utils`, `Nuxt Fonts Module`, `Tailwind Nuxt Module`, `Pinia Store Library`, `Pinia Nuxt Module`, `Postgres Driver`, `tailwind-merge Utility`, `TanStack Vue Table`, `Tiptap Text Align`, `Tiptap Underline`, `Tiptap ProseMirror`, `Tiptap Starter Kit`, `Tiptap Vue 3`, `vee-validate Forms`, `vee-validate Zod`, `Vue Runtime`, `vue-chartjs Charts`, `Vue Router`, `vue-sonner Toasts`, `Zod Validation`, `Disposisi Notif Backfill`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `useDb()` connect `API Auth & CRUD Routes` to `Surat Keluar Detail UI`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `requireAuthUser()` connect `API Auth & CRUD Routes` to `Package Scripts & Tooling`, `Database Backup API`, `Surat Keluar Detail UI`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `{ user, logout }`, `route`, `{ can, isSuperAdmin }` to the rest of the system?**
  _335 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Auth & CRUD Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.0856991712220067 - nodes in this community are weakly interconnected._
- **Should `Design System & Infra Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._
- **Should `Surat Masuk Detail UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._