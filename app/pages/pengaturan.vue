<script setup>
import { toast } from 'vue-sonner'
import { formatDate, formatBytes } from '~/utils/formatters'

const { can, isSuperAdmin } = useRBAC()
if (!isSuperAdmin.value && !can('pengaturan')) {
  await navigateTo('/')
}

const tabs = [
  { id: 'sistem', label: 'Sistem' },
  { id: 'general', label: 'General' },
  { id: 'integrasi', label: 'Integrasi' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'backup', label: 'Backup' },
]

const route = useRoute()
const tab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'sistem')

watch(tab, (v) => {
  navigateTo({ path: '/pengaturan', query: { tab: v } }, { replace: true })
})

const { data, refresh } = await useFetch('/api/pengaturan')
const settings = computed(() => data.value?.data)

const generalForm = reactive({
  appName: '',
  appLogo: '',
  timezone: 'Asia/Makassar',
})
const integrasiForm = reactive({
  storageDriver: 'local',
  uploadDir: 'uploads/surat',
  minioEndpoint: '',
  minioPort: 9000,
  minioUseSsl: false,
  minioAccessKey: '',
  minioSecretKey: '',
  minioBucket: 'mailog',
})

watch(
  settings,
  (s) => {
    if (!s) return
    generalForm.appName = s.general?.appName || 'MailOG'
    generalForm.appLogo = s.general?.appLogo || ''
    generalForm.timezone = s.general?.timezone || 'Asia/Makassar'
    integrasiForm.storageDriver = s.integrasi?.storageDriver || 'local'
    integrasiForm.uploadDir = s.integrasi?.uploadDir || 'uploads/surat'
    integrasiForm.minioEndpoint = s.integrasi?.minioEndpoint || ''
    integrasiForm.minioPort = s.integrasi?.minioPort || 9000
    integrasiForm.minioUseSsl = Boolean(s.integrasi?.minioUseSsl)
    integrasiForm.minioAccessKey = s.integrasi?.minioAccessKey || ''
    integrasiForm.minioSecretKey = ''
    integrasiForm.minioBucket = s.integrasi?.minioBucket || 'mailog'
  },
  { immediate: true },
)

const saving = ref(false)
const activityPage = ref(1)
const { data: activityData, pending: activityPending, refresh: refreshActivity } = await useFetch('/api/pengaturan/activity', {
  query: computed(() => ({ page: activityPage.value, limit: 25 })),
  watch: [activityPage],
  immediate: false,
  lazy: true,
  server: false,
})

const { data: backupData, refresh: refreshBackups } = await useFetch('/api/pengaturan/backup', {
  lazy: true,
  server: false,
  immediate: false,
})

watch(tab, async (v) => {
  if (v === 'activity') await refreshActivity()
  if (v === 'backup') await refreshBackups()
}, { immediate: true })

async function saveGeneral() {
  saving.value = true
  try {
    await $fetch('/api/pengaturan', {
      method: 'PUT',
      body: { section: 'general', ...generalForm },
    })
    toast.success('Pengaturan general disimpan')
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

async function saveIntegrasi() {
  saving.value = true
  try {
    await $fetch('/api/pengaturan', {
      method: 'PUT',
      body: {
        section: 'integrasi',
        ...integrasiForm,
        minioSecretKey: integrasiForm.minioSecretKey || undefined,
      },
    })
    toast.success('Pengaturan integrasi disimpan')
    await refresh()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan')
  }
  finally {
    saving.value = false
  }
}

const backupLoading = ref(false)
async function createBackup() {
  backupLoading.value = true
  try {
    const res = await $fetch('/api/pengaturan/backup', { method: 'POST' })
    toast.success(`Backup dibuat (${res.data.mode})`)
    await refreshBackups()
  }
  catch (e) {
    toast.error(e?.data?.statusMessage || e?.message || 'Backup gagal')
  }
  finally {
    backupLoading.value = false
  }
}

const timezones = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'UTC',
]
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <h1 class="text-display-md text-ink tracking-tight">
        Pengaturan
      </h1>
      <p class="text-body-sm text-steel mt-1">
        Konfigurasi sistem — hanya Super Admin
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="pill-tab"
        :class="{ 'pill-tab-active': tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Sistem -->
    <section v-if="tab === 'sistem'" class="card-base space-y-4">
      <h2 class="text-title-md text-ink">
        Informasi sistem
      </h2>
      <dl class="grid sm:grid-cols-2 gap-4">
        <div>
          <dt class="text-caption text-muted">
            Aplikasi
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.general?.appName || 'MailOG' }}
          </dd>
        </div>
        <div>
          <dt class="text-caption text-muted">
            Versi
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.sistem?.version || '0.1.0' }}
          </dd>
        </div>
        <div>
          <dt class="text-caption text-muted">
            Environment
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.sistem?.nodeEnv }}
          </dd>
        </div>
        <div>
          <dt class="text-caption text-muted">
            Database
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.sistem?.databaseConfigured ? 'Terkonfigurasi' : 'Belum ada DATABASE_URL' }}
          </dd>
        </div>
        <div>
          <dt class="text-caption text-muted">
            Storage aktif
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.integrasi?.storageDriver }}
          </dd>
        </div>
        <div>
          <dt class="text-caption text-muted">
            Timezone
          </dt>
          <dd class="text-body-sm text-ink mt-0.5">
            {{ settings?.general?.timezone }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- General -->
    <section v-else-if="tab === 'general'" class="card-base space-y-4">
      <h2 class="text-title-md text-ink">
        General
      </h2>
      <p class="text-body-sm text-steel">
        Nama aplikasi, logo, dan zona waktu.
      </p>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Nama aplikasi</label>
        <input v-model="generalForm.appName" class="input-field" maxlength="100">
      </div>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">URL logo</label>
        <input
          v-model="generalForm.appLogo"
          class="input-field"
          placeholder="/logo.png atau https://..."
        >
        <p class="text-caption text-muted mt-1">
          Path relatif atau URL absolut
        </p>
      </div>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Timezone</label>
        <select v-model="generalForm.timezone" class="input-field">
          <option v-for="tz in timezones" :key="tz" :value="tz">
            {{ tz }}
          </option>
        </select>
      </div>
      <div class="flex justify-end pt-2">
        <UiButton :disabled="saving" @click="saveGeneral">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </div>
    </section>

    <!-- Integrasi -->
    <section v-else-if="tab === 'integrasi'" class="card-base space-y-4">
      <h2 class="text-title-md text-ink">
        Integrasi penyimpanan
      </h2>
      <p class="text-body-sm text-steel">
        Driver file (local / MinIO) dan kredensial object storage.
      </p>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Storage driver</label>
        <select v-model="integrasiForm.storageDriver" class="input-field">
          <option value="local">
            local (folder uploads)
          </option>
          <option value="minio">
            minio
          </option>
        </select>
      </div>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Upload directory</label>
        <input v-model="integrasiForm.uploadDir" class="input-field">
      </div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">MinIO endpoint</label>
          <input v-model="integrasiForm.minioEndpoint" class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Port</label>
          <input v-model.number="integrasiForm.minioPort" type="number" class="input-field">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Access key</label>
          <input v-model="integrasiForm.minioAccessKey" class="input-field" autocomplete="off">
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Secret key</label>
          <input
            v-model="integrasiForm.minioSecretKey"
            type="password"
            class="input-field"
            :placeholder="settings?.integrasi?.minioSecretKeySet ? '•••••••• (biarkan kosong jika tidak diubah)' : ''"
            autocomplete="new-password"
          >
        </div>
        <div>
          <label class="block text-caption-bold text-steel mb-1.5">Bucket</label>
          <input v-model="integrasiForm.minioBucket" class="input-field">
        </div>
        <div class="flex items-end pb-2">
          <label class="inline-flex items-center gap-2 text-body-sm text-ink">
            <input v-model="integrasiForm.minioUseSsl" type="checkbox" class="rounded border-hairline">
            Gunakan SSL
          </label>
        </div>
      </div>
      <div class="flex justify-end pt-2">
        <UiButton :disabled="saving" @click="saveIntegrasi">
          {{ saving ? 'Menyimpan...' : 'Simpan' }}
        </UiButton>
      </div>
    </section>

    <!-- Activity -->
    <section v-else-if="tab === 'activity'" class="card-base !p-0 overflow-hidden">
      <div class="px-6 py-4 border-b border-hairline-soft">
        <h2 class="text-title-md text-ink">
          Activity log
        </h2>
        <p class="text-body-sm text-steel mt-1">
          Audit trail dari tracking_log
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-surface">
            <tr>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Waktu
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                User
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Aksi
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                Detail
              </th>
              <th class="px-4 py-3 text-caption-bold text-steel">
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="activityPending">
              <td colspan="5" class="px-4 py-8 text-center text-body-sm text-steel">
                Memuat...
              </td>
            </tr>
            <tr v-else-if="!(activityData?.data || []).length">
              <td colspan="5" class="px-4 py-8 text-center text-body-sm text-steel">
                Belum ada aktivitas
              </td>
            </tr>
            <tr
              v-for="row in activityData?.data || []"
              :key="row.id"
              class="border-t border-hairline-soft"
            >
              <td class="px-4 py-3 text-caption text-steel whitespace-nowrap">
                {{ formatDate(row.createdAt, true) }}
              </td>
              <td class="px-4 py-3 text-body-sm text-ink">
                {{ row.userNama || row.userEmail || '—' }}
              </td>
              <td class="px-4 py-3">
                <span class="badge-muted">
                  {{ row.aksi }}
                </span>
              </td>
              <td class="px-4 py-3 text-caption text-steel max-w-xs truncate">
                {{ row.detail ? JSON.stringify(row.detail) : '—' }}
              </td>
              <td class="px-4 py-3 text-caption text-muted">
                {{ row.ipAddress || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4">
        <UiPagination
          :page="activityData?.meta?.page || 1"
          :total-pages="activityData?.meta?.totalPages || 1"
          :total="activityData?.meta?.total || 0"
          :limit="activityData?.meta?.limit || 25"
          @update:page="activityPage = $event"
        />
      </div>
    </section>

    <!-- Backup -->
    <section v-else-if="tab === 'backup'" class="card-base space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-title-md text-ink">
            Backup database
          </h2>
          <p class="text-body-sm text-steel mt-1">
            Membuat dump PostgreSQL (pg_dump) atau fallback SQL ke folder
            <code class="text-caption">backups/</code>
          </p>
        </div>
        <UiButton :disabled="backupLoading" @click="createBackup">
          {{ backupLoading ? 'Memproses...' : 'Buat backup' }}
        </UiButton>
      </div>

      <ul v-if="(backupData?.data || []).length" class="divide-y divide-hairline-soft border border-hairline rounded-lg">
        <li
          v-for="b in backupData.data"
          :key="b.filename"
          class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p class="text-body-sm font-medium text-ink">
              {{ b.filename }}
            </p>
            <p class="text-caption text-muted">
              {{ formatBytes(b.size) }} · {{ formatDate(b.createdAt, true) }}
            </p>
          </div>
          <a :href="b.downloadUrl" class="btn-tertiary" download>
            Unduh
          </a>
        </li>
      </ul>
      <p v-else class="text-body-sm text-steel">
        Belum ada file backup
      </p>
    </section>
  </div>
</template>
