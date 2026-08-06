<script setup>
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { login } = useAuth()
const { enabled: ssoEnabled, loginPath: ssoLoginPath } = useSso()
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

    <div class="card-base space-y-5">
      <div v-if="sessionExpired" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-body-sm text-amber-700">
        <span class="font-semibold">Sesi habis.</span> Silakan masuk kembali.
      </div>

      <p v-if="error" class="text-body-sm text-error text-center">
        {{ error }}
      </p>

      <template v-if="ssoEnabled">
        <a :href="ssoLoginPath" class="btn-primary inline-flex w-full items-center justify-center">
          Masuk dengan SSO
        </a>
      </template>
      <template v-else>
        <div class="text-center text-body-sm text-steel py-4">
          SSO tidak terkonfigurasi. Hubungi administrator.
        </div>
      </template>
    </div>
  </div>
</template>
