<script setup>
const props = defineProps({
  /** result of renderSuratKeluarHtml() */
  rendered: { type: Object, default: null },
  /** fallback when no template body */
  perihal: { type: String, default: '' },
  showMeta: { type: Boolean, default: true },
})

const paperClass = computed(() => {
  const k = props.rendered?.kertas || 'a4'
  if (k === 'folio') return 'max-w-[210mm]'
  if (k === 'legal') return 'max-w-[216mm]'
  return 'max-w-[210mm]'
})

const padStyle = computed(() => {
  const m = props.rendered?.margin || {}
  return {
    paddingTop: `${m.top ?? 20}mm`,
    paddingRight: `${m.right ?? 20}mm`,
    paddingBottom: `${m.bottom ?? 20}mm`,
    paddingLeft: `${m.left ?? 25}mm`,
  }
})
</script>

<template>
  <div class="overflow-x-auto bg-surface rounded-xl border border-hairline p-4 sm:p-6">
    <article
      class="mx-auto bg-white shadow-card border border-hairline-soft min-h-[297mm] text-[12pt] leading-relaxed text-ink font-serif"
      :class="paperClass"
      :style="padStyle"
    >
      <!-- Kop image -->
      <div v-if="rendered?.kopImageUrl" class="mb-4">
        <img
          :src="rendered.kopImageUrl"
          alt="Kop surat"
          class="w-full max-h-36 object-contain object-top"
        >
      </div>
      <div
        v-else-if="rendered?.kopText"
        class="mb-4 text-center border-b border-ink pb-3"
        v-html="rendered.kopText"
      />
      <div v-else class="mb-4 text-center border-b-2 border-ink pb-3">
        <p class="text-lg font-semibold tracking-wide uppercase">
          Surat Keluar
        </p>
      </div>

      <!-- Meta surat -->
      <div v-if="showMeta && rendered?.meta" class="mb-6 space-y-1 text-[11pt]">
        <div class="flex gap-2">
          <span class="w-28 shrink-0">Nomor</span>
          <span>: {{ rendered.meta.nomorSurat }}</span>
        </div>
        <div class="flex gap-2">
          <span class="w-28 shrink-0">Tanggal</span>
          <span>: {{ rendered.meta.tanggal }}</span>
        </div>
        <div class="flex gap-2">
          <span class="w-28 shrink-0">Perihal</span>
          <span>: {{ rendered.meta.perihal || perihal || '—' }}</span>
        </div>
      </div>

      <div v-if="rendered?.meta?.penerima && !rendered.hasBodyTemplate" class="mb-6 text-[11pt]">
        <p>Kepada Yth.</p>
        <p class="font-semibold">
          {{ rendered.meta.penerima }}
        </p>
        <p v-if="rendered.meta.penerimaJabatan">
          {{ rendered.meta.penerimaJabatan }}
        </p>
        <p v-if="rendered.meta.penerimaAlamat" class="whitespace-pre-wrap">
          {{ rendered.meta.penerimaAlamat }}
        </p>
        <p class="mt-1">
          di Tempat
        </p>
      </div>

      <!-- Body -->
      <div
        class="surat-body min-h-[8rem] text-justify"
        v-html="rendered?.body || '<p class=\'text-steel\'>—</p>'"
      />

      <!-- TTD -->
      <div
        v-if="rendered?.meta?.pengirimNama && !rendered.hasBodyTemplate"
        class="mt-10 ml-auto w-[45%] text-center text-[11pt]"
      >
        <p>Hormat kami,</p>
        <div class="h-16" />
        <p class="font-semibold underline">
          {{ rendered.meta.pengirimNama }}
        </p>
        <p v-if="rendered.meta.pengirimJabatan">
          {{ rendered.meta.pengirimJabatan }}
        </p>
      </div>

      <!-- Footer image / text -->
      <div v-if="rendered?.footerImageUrl" class="mt-10 pt-4 border-t border-hairline-soft">
        <img
          :src="rendered.footerImageUrl"
          alt="Footer surat"
          class="w-full max-h-24 object-contain object-bottom"
        >
      </div>
      <div
        v-else-if="rendered?.footerText"
        class="mt-10 pt-3 border-t border-hairline-soft text-center text-[9pt] text-steel"
        v-html="rendered.footerText"
      />
    </article>
  </div>
</template>

<style>
.surat-body p { margin: 0.6em 0; }
.surat-body ul { list-style: disc; padding-left: 1.25rem; margin: 0.5em 0; }
.surat-body ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5em 0; }
.surat-body h2 { font-size: 1.1em; font-weight: 600; margin: 0.75em 0 0.4em; }
.font-serif { font-family: 'Times New Roman', Times, Georgia, serif; }
</style>
