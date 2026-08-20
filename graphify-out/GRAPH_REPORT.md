# Graph Report - mailog  (2026-08-20)

## Corpus Check
- 155 files · ~223,557 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 785 nodes · 1429 edges · 93 communities (59 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac0c7e3b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schema/index.js
- MiniMax Design System
- surat-masuk/[id].vue
- template/index.vue
- surat-keluar.js
- migrate-legacy.js
- settings.js
- surat-keluar/[id].vue
- storage.js
- scripts
- nomor-surat.vue
- laporan/index.vue
- surat-keluar/baru.vue
- pengaturan.vue
- surat-masuk/baru.vue
- klasifikasi.vue
- AppSidebar.vue
- login.vue
- disposisi/index.vue
- surat-masuk/index.vue
- NotificationBell.vue
- surat-keluar/index.vue
- dependencies
- instansi.vue
- unit.vue
- FilePreview.vue
- users.vue
- formatters.js
- RichEditor.vue
- template-render.js
- MailOG Favicon
- MailOG Favicon Mark
- MailOG Logo
- backup/index.post.js
- LineChart.vue
- pages/index.vue
- resolve-user.js
- cleanup-minio.mjs
- ConfirmDialog.vue
- LetterPreview.vue
- SearchPill.vue
- Button.vue
- useRBAC.js
- gen-favicon.ps1
- AppHeader.vue
- Badge.vue
- StatCard.vue
- default.vue
- bcryptjs
- clsx
- date-fns
- drizzle-orm
- h3
- @lucide/vue
- @mbx92/nuxt-sso-client
- nuxt
- nuxt-auth-utils
- @nuxt/fonts
- @nuxtjs/tailwindcss
- pinia
- @pinia/nuxt
- postgres
- tailwind-merge
- @tanstack/vue-table
- @tiptap/extension-text-align
- @tiptap/extension-underline
- @tiptap/pm
- @tiptap/starter-kit
- @tiptap/vue-3
- vee-validate
- @vee-validate/zod
- vue-chartjs
- vue-router
- vue-sonner
- zod

## God Nodes (most connected - your core abstractions)
1. `useDb()` - 72 edges
2. `requireAuthUser()` - 63 edges
3. `writeAuditLog()` - 44 edges
4. `requirePermission()` - 31 edges
5. `can()` - 28 edges
6. `unit` - 18 edges
7. `users` - 18 edges
8. `scripts` - 17 edges
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

## Communities (93 total, 34 thin omitted)

### Community 0 - "schema/index.js"
Cohesion: 0.07
Nodes (57): schema, schema, schema, schema, schema, schema, schema, ALLOWED (+49 more)

### Community 1 - "MiniMax Design System"
Cohesion: 0.05
Nodes (50): Black Pill CTA, DM Sans, Documentation 3-Column Layout, Dual Identity Branding, Flat Elevation System, MiniMax Design System, Product Color Encoding, Vibrant Product Cards (+42 more)

### Community 2 - "surat-masuk/[id].vue"
Cohesion: 0.07
Nodes (26): actionBusy, actionError, archiveDialogOpen, { can, user }, canArchive, canCreateDisposisi, canUpload, downloadFile() (+18 more)

### Community 3 - "template/index.vue"
Cohesion: 0.07
Nodes (31): { can }, clearImage(), deleteBusy, deleteId, deleteOpen, editingId, emptyForm(), footerInput (+23 more)

### Community 4 - "surat-keluar.js"
Cohesion: 0.24
Nodes (9): instansi, statusAktifEnum, klasifikasiSurat, kertasEnum, suratKeluarRelations, suratKeluarStatusEnum, suratMasukRelations, suratMasukStatusEnum (+1 more)

### Community 5 - "migrate-legacy.js"
Cohesion: 0.13
Nodes (26): isDeleted(), parseInserts(), parseTuple(), readValueTuples(), toDate(), toDateOnly(), args, basenameFromLegacyPath() (+18 more)

### Community 6 - "settings.js"
Cohesion: 0.16
Nodes (17): schema, schema, schema, generalSchema, integrasiSchema, appSettings, DEFAULT_SETTINGS, nomorCounter (+9 more)

### Community 7 - "surat-keluar/[id].vue"
Cohesion: 0.08
Nodes (19): actionBusy, actionError, busy, { can, user }, canApprove, canEdit, canKirim, canSubmit (+11 more)

### Community 8 - "storage.js"
Cohesion: 0.13
Nodes (24): client, db, ALLOWED, schema, makeMinioClient(), ensureBucket(), useMinio(), buildObjectPath() (+16 more)

### Community 9 - "scripts"
Cohesion: 0.07
Nodes (27): drizzle-kit, devDependencies, drizzle-kit, name, packageManager, pnpm, onlyBuiltDependencies, private (+19 more)

### Community 10 - "nomor-surat.vue"
Cohesion: 0.10
Nodes (16): addForm, bulan, bulanOptions, { can }, contohLive, counters, editBusy, editValues (+8 more)

### Community 11 - "laporan/index.vue"
Cohesion: 0.12
Nodes (11): bulan, BULAN_SINGKAT, bulanOptions, { can }, isOps, now, rekap, ringkasan (+3 more)

### Community 12 - "surat-keluar/baru.vue"
Cohesion: 0.15
Nodes (15): { can, user }, defaultTemplate, dragOver, error, fileInput, files, form, livePreview (+7 more)

### Community 13 - "pengaturan.vue"
Cohesion: 0.10
Nodes (15): activityPage, backupLoading, { can, isSuperAdmin }, generalForm, integrasiForm, minioStatus, minioSyncing, minioTesting (+7 more)

### Community 14 - "surat-masuk/baru.vue"
Cohesion: 0.20
Nodes (12): { can }, dragOver, error, fileInput, files, form, loading, onDrop() (+4 more)

### Community 15 - "klasifikasi.vue"
Cohesion: 0.15
Nodes (8): { can }, canManage, editingId, filtered, form, loading, q, showForm

### Community 16 - "AppSidebar.vue"
Cohesion: 0.18
Nodes (9): bottomNav, brandName, { can, isSuperAdmin }, emit, mainNav, masterNav, open, props (+1 more)

### Community 17 - "login.vue"
Cohesion: 0.20
Nodes (10): email, { enabled: ssoEnabled, loginPath: ssoLoginPath }, error, humanizeLoginError(), loading, { login }, onSubmit(), password (+2 more)

### Community 18 - "disposisi/index.vue"
Cohesion: 0.20
Nodes (9): { can }, isMonitor, meta, page, q, route, rows, status (+1 more)

### Community 19 - "surat-masuk/index.vue"
Cohesion: 0.20
Nodes (9): { can }, isOps, meta, page, q, route, rows, status (+1 more)

### Community 20 - "NotificationBell.vue"
Cohesion: 0.22
Nodes (4): items, open, root, unread

### Community 21 - "surat-keluar/index.vue"
Cohesion: 0.22
Nodes (8): { can }, meta, page, q, route, rows, status, statusFilters

### Community 22 - "dependencies"
Cohesion: 0.22
Nodes (9): chart.js, minio, dependencies, chart.js, minio, @tiptap/extension-placeholder, vue, vue (+1 more)

### Community 23 - "instansi.vue"
Cohesion: 0.25
Nodes (5): { can }, form, loading, q, showForm

### Community 24 - "unit.vue"
Cohesion: 0.25
Nodes (5): { can }, form, loading, q, showForm

### Community 25 - "FilePreview.vue"
Cohesion: 0.33
Nodes (6): downloadUrl, emit, kind, onKey(), previewUrl, props

### Community 26 - "users.vue"
Cohesion: 0.18
Nodes (11): { can }, editingId, editingProvider, form, LEVEL_OPTIONS, loading, openCreate(), q (+3 more)

### Community 27 - "formatters.js"
Cohesion: 0.29
Nodes (3): STATUS_DISPOSISI, STATUS_SURAT_KELUAR, STATUS_SURAT_MASUK

### Community 28 - "RichEditor.vue"
Cohesion: 0.33
Nodes (3): editor, emit, props

### Community 29 - "template-render.js"
Cohesion: 0.67
Nodes (5): applyPlaceholders(), normalizeNewlines(), renderSuratKeluarHtml(), templateAssetUrl(), toHtmlBlock()

### Community 30 - "MailOG Favicon"
Cohesion: 0.47
Nodes (6): Circular Border, Email Communication, Envelope Symbol, MailOG Brand Mark, MailOG Favicon, Neon Outline Style

### Community 31 - "MailOG Favicon Mark"
Cohesion: 0.60
Nodes (6): Brand Blue #1456f0, Circular Frame, Email Product Identity, Envelope Motif, MailOG Favicon Mark, Outlined Line-Art Style

### Community 32 - "MailOG Logo"
Cohesion: 0.67
Nodes (6): Brand Blue #1456f0, Circular Badge Frame, Email / Mail Motif, Envelope Icon, MailOG, MailOG Logo

### Community 33 - "backup/index.post.js"
Cohesion: 0.40
Nodes (4): BACKUP_DIR, parseDatabaseUrl(), ROOT, runPgDump()

### Community 34 - "LineChart.vue"
Cohesion: 0.40
Nodes (3): chartData, chartOptions, props

### Community 35 - "pages/index.vue"
Cohesion: 0.40
Nodes (4): { can }, isOps, recent, stats

### Community 36 - "resolve-user.js"
Cohesion: 0.38
Nodes (7): autoCreateUnitFromSso(), deriveUnitCode(), resolveSsoUser(), setMailogSession(), humanizeError(), looksLikeTechnicalError(), throwHumanError()

### Community 37 - "cleanup-minio.mjs"
Cohesion: 0.20
Nodes (9): c, dupes, legacyFiles, legacySet, objects, onlyInRoot, rootFiles, s2 (+1 more)

### Community 38 - "ConfirmDialog.vue"
Cohesion: 0.67
Nodes (3): emit, onKey(), props

### Community 39 - "LetterPreview.vue"
Cohesion: 0.50
Nodes (3): padStyle, paperClass, props

### Community 40 - "SearchPill.vue"
Cohesion: 0.50
Nodes (3): emit, props, value

## Knowledge Gaps
- **357 isolated node(s):** `{ user, logout }`, `route`, `{ can, isSuperAdmin }`, `brandName`, `props` (+352 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `scripts`, `bcryptjs`, `clsx`, `date-fns`, `drizzle-orm`, `h3`, `@lucide/vue`, `@mbx92/nuxt-sso-client`, `nuxt`, `nuxt-auth-utils`, `@nuxt/fonts`, `@nuxtjs/tailwindcss`, `pinia`, `@pinia/nuxt`, `postgres`, `tailwind-merge`, `@tanstack/vue-table`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/vue-3`, `vee-validate`, `@vee-validate/zod`, `vue-chartjs`, `vue-router`, `vue-sonner`, `zod`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `useDb()` connect `schema/index.js` to `resolve-user.js`, `settings.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `requireAuthUser()` connect `schema/index.js` to `storage.js`, `backup/index.post.js`, `settings.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `{ user, logout }`, `route`, `{ can, isSuperAdmin }` to the rest of the system?**
  _357 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schema/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0692063492063492 - nodes in this community are weakly interconnected._
- **Should `MiniMax Design System` be split into smaller, more focused modules?**
  _Cohesion score 0.053877551020408164 - nodes in this community are weakly interconnected._
- **Should `surat-masuk/[id].vue` be split into smaller, more focused modules?**
  _Cohesion score 0.0659536541889483 - nodes in this community are weakly interconnected._