<script setup>
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { login } = useAuth()
const { enabled: ssoEnabled, loginPath: ssoLoginPath } = useSso()
const email = ref('')
const password = ref('')
const error = ref(humanizeLoginError(route.query.error))
const loading = ref(false)
const sessionExpired = computed(() => route.query.reason === 'session_expired')

function humanizeLoginError(raw) {
  const text = raw ? String(raw) : ''
  if (!text) return ''
  if (
    /failed\s+query|select\s+|insert\s+|update\s+|delete\s+|relation\s+"|params:\s*|ECONNREFUSED|syntax\s+error/i.test(text)
    || text.length > 160
  ) {
    return 'Login gagal. Silakan coba lagi atau hubungi administrator.'
  }
  return text
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  }
  catch (e) {
    error.value = humanizeLoginError(e?.data?.statusMessage || e?.statusMessage || 'Login gagal')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-10 text-center">
      <div class="flex justify-center mb-4">
        <UiAppLogo :size="56" />
      </div>
      <p class="text-display-sm text-ink tracking-tight">
        MailOG
      </p>
      <p class="text-body-sm text-steel mt-2">
        Sistem Surat Menyurat — paperless & audit-trail lengkap
      </p>
    </div>

    <form class="card-base space-y-5" @submit.prevent="onSubmit">
      <div v-if="sessionExpired" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-body-sm text-amber-700">
        <span class="font-semibold">Sesi habis.</span> Silakan masuk kembali.
      </div>

      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Email</label>
        <input v-model="email" type="email" required class="input-field" placeholder="nama@instansi.go.id">
      </div>
      <div>
        <label class="block text-caption-bold text-steel mb-1.5">Password</label>
        <input v-model="password" type="password" required class="input-field" placeholder="••••••••">
      </div>

      <p v-if="error" class="text-body-sm text-error">
        {{ error }}
      </p>

      <UiButton type="submit" block :disabled="loading">
        {{ loading ? 'Masuk...' : 'Masuk' }}
      </UiButton>

      <template v-if="ssoEnabled">
        <div class="relative py-1">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-hairline" />
          </div>
          <div class="relative flex justify-center">
            <span class="bg-canvas px-3 text-caption text-muted">atau</span>
          </div>
        </div>

        <a :href="ssoLoginPath" class="btn-secondary inline-flex w-full items-center justify-center">
          Masuk dengan SSO
        </a>
      </template>
    </form>
  </div>
</template>
