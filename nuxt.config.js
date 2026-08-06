// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/fonts',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@mbx92/nuxt-sso-client',
  ],

  ssoClient: {
    resolveUser: 'server/sso/resolve-user.js',
    successRedirect: '/',
    loginPath: '/login',
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config',
  },

  fonts: {
    families: [
      { name: 'DM Sans', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    sessionSecret: process.env.SESSION_SECRET || 'mailog-dev-secret-change-me',
    // h3 default cookie.secure=true → browser drop cookie on plain HTTP (--host / LAN IP)
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    storage: {
      // local (default) | minio
      driver: process.env.STORAGE_DRIVER || 'local',
      uploadDir: process.env.UPLOAD_DIR || 'uploads/surat',
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'mailog-admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'mailog-secret',
      bucket: process.env.MINIO_BUCKET || 'mailog',
    },
    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      ssoIssuer: process.env.SSO_ISSUER || 'http://localhost:3010',
    },
  },

  app: {
    head: {
      title: 'MailOG',
      meta: [
        { name: 'description', content: 'Sistem Surat Menyurat — paperless, audit-trail lengkap' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/logo.svg' },
      ],
    },
  },

  nitro: {
    // multipart lampiran (PDF dll.)
    maxRequestBodySize: 25 * 1024 * 1024,
    // Ensure SSO resolve-user runs with full env from .env
    envPrefix: '',
  },
})
