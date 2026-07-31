<script setup>
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { login } = useAuth()
const { enabled: ssoEnabled, loginPath: ssoLoginPath } = useSso()
const email = ref('admin@mailog.local')
const password = ref('admin12345')
const error = ref(route.query.error ? String(route.query.error) : '')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  }
  catch (e) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Login gagal'
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

    <p class="text-center text-caption text-muted mt-6">
      Demo lokal: admin@mailog.local / admin12345
      <template v-if="ssoEnabled">
        <br>SSO trial: admin@example.com / password123!
      </template>
    </p>
  </div>
</template>
