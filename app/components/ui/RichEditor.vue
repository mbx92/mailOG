<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Heading2,
  Pilcrow,
} from '@lucide/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Tulis isi surat...' },
  minHeight: { type: String, default: '180px' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue || '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      underline: false,
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  editorProps: {
    attributes: {
      class: 'mailog-editor prose prose-sm max-w-none focus:outline-none px-3 py-2 text-ink',
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if (val !== current) {
      editor.value.commands.setContent(val || '', { emitUpdate: false })
    }
  },
)

watch(
  () => props.disabled,
  (v) => {
    editor.value?.setEditable(!v)
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})

function run(cmd, attrs) {
  if (!editor.value || props.disabled) return
  const chain = editor.value.chain().focus()
  if (attrs) chain[cmd](attrs).run()
  else chain[cmd]().run()
}

function isActive(name, attrs) {
  if (!editor.value) return false
  if (typeof name === 'object') return editor.value.isActive(name)
  return editor.value.isActive(name, attrs)
}
</script>

<template>
  <div class="rounded-md border border-hairline bg-canvas overflow-hidden" :class="disabled && 'opacity-70'">
    <div class="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-hairline-soft bg-surface">
      <button type="button" class="btn-icon !w-8 !h-8" title="Undo" :disabled="disabled" @click="run('undo')">
        <Undo2 class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="btn-icon !w-8 !h-8" title="Redo" :disabled="disabled" @click="run('redo')">
        <Redo2 class="w-3.5 h-3.5" />
      </button>
      <span class="w-px h-6 bg-hairline mx-1 self-center" />
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Heading"
        :class="isActive('heading', { level: 2 }) && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleHeading', { level: 2 })"
      >
        <Heading2 class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Paragraf"
        :class="isActive('paragraph') && !isActive('heading') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('setParagraph')"
      >
        <Pilcrow class="w-3.5 h-3.5" />
      </button>
      <span class="w-px h-6 bg-hairline mx-1 self-center" />
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Bold"
        :class="isActive('bold') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleBold')"
      >
        <Bold class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Italic"
        :class="isActive('italic') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleItalic')"
      >
        <Italic class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Underline"
        :class="isActive('underline') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleUnderline')"
      >
        <UnderlineIcon class="w-3.5 h-3.5" />
      </button>
      <span class="w-px h-6 bg-hairline mx-1 self-center" />
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Bullet list"
        :class="isActive('bulletList') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleBulletList')"
      >
        <List class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Numbered list"
        :class="isActive('orderedList') && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('toggleOrderedList')"
      >
        <ListOrdered class="w-3.5 h-3.5" />
      </button>
      <span class="w-px h-6 bg-hairline mx-1 self-center" />
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Align left"
        :class="isActive({ textAlign: 'left' }) && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('setTextAlign', 'left')"
      >
        <AlignLeft class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Align center"
        :class="isActive({ textAlign: 'center' }) && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('setTextAlign', 'center')"
      >
        <AlignCenter class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Align right"
        :class="isActive({ textAlign: 'right' }) && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('setTextAlign', 'right')"
      >
        <AlignRight class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="btn-icon !w-8 !h-8"
        title="Justify"
        :class="isActive({ textAlign: 'justify' }) && '!bg-ink !text-white'"
        :disabled="disabled"
        @click="run('setTextAlign', 'justify')"
      >
        <AlignJustify class="w-3.5 h-3.5" />
      </button>
    </div>
    <ClientOnly>
      <EditorContent
        :editor="editor"
        :style="{ minHeight }"
        class="mailog-editor-wrap"
      />
    </ClientOnly>
  </div>
</template>

<style>
.mailog-editor-wrap .ProseMirror {
  min-height: inherit;
}
.mailog-editor-wrap .ProseMirror p.is-editor-empty:first-child::before {
  color: #a3a3a3;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
.mailog-editor-wrap .ProseMirror h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.5em 0;
}
.mailog-editor-wrap .ProseMirror ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.5em 0;
}
.mailog-editor-wrap .ProseMirror ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.5em 0;
}
.mailog-editor-wrap .ProseMirror p {
  margin: 0.4em 0;
}
</style>
