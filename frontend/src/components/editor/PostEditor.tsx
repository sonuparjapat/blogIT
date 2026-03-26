"use client"

import { useCallback, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from '@tiptap/react/menus'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from "@tiptap/starter-kit"
import LinkExt from "@tiptap/extension-link"
import Highlight from "@tiptap/extension-highlight"
import Color from "@tiptap/extension-color"
// import TextStyle from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import ImageExt from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import api from "@/lib/axios"

type Props = {
  content: any
  onChange: (data: any) => void
  onImageUploaded?: (url: string) => void
}

/* ─── tiny icon helper ────────────────────────────────────────────────── */
const Icon = ({ d, size = 15 }: { d: string | React.ReactNode; size?: number }) =>
  typeof d === "string" ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  ) : <>{d}</>

/* ─── toolbar button ──────────────────────────────────────────────────── */
const TB = ({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean; onClick?: () => void; title: string; children: React.ReactNode
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    data-active={active || undefined}
    className="pe-tb"
  >
    {children}
  </button>
)

/* ─── separator ───────────────────────────────────────────────────────── */
const Sep = () => <div className="pe-sep" />

export default function PostEditor({ content, onChange, onImageUploaded }: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      TextStyleKit,
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "pe-link", rel: "noopener noreferrer", target: "_blank" },
      }),
      Highlight.configure({ multicolor: true }),
      ImageExt.configure({
        HTMLAttributes: { class: "pe-img" },
        inline: false,
        allowBase64: true,
      }),
      Color,

      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Tell your story — every great post starts with one sentence…" }),
    ],
    content: content || "",
    immediatelyRender: false,
    onUpdate({ editor }) { onChange(editor.getJSON()) },
  })

  /* ── inline image upload ─────────────────────────────────────────────── */
  const handleInlineImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !editor) return

    // Show base64 preview immediately so the image is visible right away
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      editor.chain().focus().setImage({ src: base64 }).run()
    }
    reader.readAsDataURL(file)

    // Then upload and replace base64 with real URL
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
      const url: string = res.data.url
      onImageUploaded?.(url)

      // Replace the base64 src with the real URL in the editor JSON
      const json = editor.getJSON()
      const replaceBase64 = (node: any): any => {
        if (node.type === "image" && node.attrs?.src?.startsWith("data:")) {
          return { ...node, attrs: { ...node.attrs, src: url } }
        }
        if (node.content) return { ...node, content: node.content.map(replaceBase64) }
        return node
      }
      editor.commands.setContent(replaceBase64(json), false)
      onChange(editor.getJSON())
    } catch {
      // base64 stays if upload fails — still visible to user
    }
  }, [editor, onChange, onImageUploaded])

  /* ── insert link ─────────────────────────────────────────────────────── */
  const insertLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href || ""
    const url = window.prompt("Enter URL", prev)
    if (url === null) return
    if (url === "") { editor?.chain().focus().unsetLink().run(); return }
    editor?.chain().focus().setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="pe-root">
      {/* ── Bubble menu — appears on text selection ─────────────────────── */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }} className="pe-bubble">
        <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <strong style={{ fontSize: 12 }}>B</strong>
        </TB>
        <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <em style={{ fontSize: 12 }}>I</em>
        </TB>
        <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <span style={{ fontSize: 12, textDecoration: "underline" }}>U</span>
        </TB>
        <div className="pe-bubble-sep" />
        <TB active={editor.isActive("link")} onClick={insertLink} title="Link">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </TB>
        <TB active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} title="Highlight">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l-6 6v3h9l3-3" /><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
          </svg>
        </TB>
      </BubbleMenu>

      {/* ── Fixed toolbar ───────────────────────────────────────────────── */}
      <div className="pe-toolbar" role="toolbar" aria-label="Text formatting">

        {/* Paragraph style dropdown */}
        <select
          className="pe-style-select"
          value={
            editor.isActive("heading", { level: 1 }) ? "h1"
            : editor.isActive("heading", { level: 2 }) ? "h2"
            : editor.isActive("heading", { level: 3 }) ? "h3"
            : editor.isActive("blockquote") ? "quote"
            : "para"
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run()
            else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run()
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run()
            else if (v === "quote") editor.chain().focus().toggleBlockquote().run()
            else editor.chain().focus().setParagraph().run()
          }}
        >
          <option value="para">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Quote</option>
        </select>

        <Sep />

        {/* Format */}
        <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          </svg>
        </TB>
        <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
          </svg>
        </TB>
        <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (⌘U)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/>
          </svg>
        </TB>
        <TB active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
          </svg>
        </TB>
        <TB active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </TB>

        <Sep />

        {/* Lists */}
        <TB active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
        </TB>
        <TB active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
          </svg>
        </TB>
        <TB active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </TB>

        <Sep />

        {/* Align */}
        <TB active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>
          </svg>
        </TB>
        <TB active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/>
          </svg>
        </TB>
        <TB active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>
          </svg>
        </TB>

        <Sep />

        {/* Link & image */}
        <TB active={editor.isActive("link")} onClick={insertLink} title="Insert / Edit Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </TB>

        <label className="pe-tb" title="Insert Image" style={{ cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <input ref={imgInputRef} type="file" accept="image/*" hidden onChange={handleInlineImage} />
        </label>

        <Sep />

        {/* History */}
        <TB disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="Undo (⌘Z)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </TB>
        <TB disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="Redo (⌘⇧Z)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
          </svg>
        </TB>

      </div>

      {/* ── Editor surface ─────────────────────────────────────────────── */}
      <EditorContent editor={editor} className="pe-content" />

      {/* ── Styles ─────────────────────────────────────────────────────── */}
      <style>{`
        .pe-root {
          display: flex;
          flex-direction: column;
          min-height: 480px;
          height: 100%;
        }

        /* toolbar */
        .pe-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1px;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.055);
          background: rgba(10,10,16,0.6);
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 10;
          flex-shrink: 0;
        }

        .pe-tb {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 28px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: rgba(255,255,255,0.38);
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
          flex-shrink: 0;
        }
        .pe-tb:hover:not(:disabled) { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.82); }
        .pe-tb[data-active] { background: rgba(168,162,255,0.15); color: #a5b4fc; }
        .pe-tb[data-active]:hover { background: rgba(168,162,255,0.22); }
        .pe-tb:disabled { opacity: 0.25; cursor: not-allowed; }

        .pe-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.07); margin: 0 5px; flex-shrink: 0; }

        .pe-style-select {
          height: 28px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          color: rgba(255,255,255,0.65);
          font-size: 12px;
          font-family: inherit;
          padding: 0 8px;
          outline: none;
          cursor: pointer;
        }
        .pe-style-select option { background: #111118; }

        /* bubble menu */
        .pe-bubble {
          display: flex;
          align-items: center;
          gap: 1px;
          background: #1c1c28;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .pe-bubble .pe-tb { width: 28px; height: 26px; }
        .pe-bubble-sep { width: 1px; height: 14px; background: rgba(255,255,255,0.1); margin: 0 3px; }

        /* editor content */
        .pe-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 36px 48px;
        }

        .pe-content .ProseMirror {
          outline: none;
          min-height: 400px;
          font-size: 17px;
          line-height: 1.85;
          color: rgba(255,255,255,0.80);
          font-family: 'Lora', 'Georgia', serif;
          caret-color: #a5b4fc;
        }

        .pe-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.14);
          pointer-events: none;
          float: left;
          height: 0;
          font-style: italic;
        }

        .pe-content .ProseMirror h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.4em;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: rgba(255,255,255,0.95);
          margin: 1.6em 0 0.4em;
          line-height: 1.15;
        }
        .pe-content .ProseMirror h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75em;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          margin: 1.4em 0 0.4em;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .pe-content .ProseMirror h3 {
          font-size: 1.2em;
          font-weight: 600;
          color: rgba(255,255,255,0.88);
          margin: 1.2em 0 0.3em;
          letter-spacing: -0.01em;
        }

        .pe-content .ProseMirror p { margin: 0 0 1.1em; }

        .pe-content .ProseMirror strong { color: rgba(255,255,255,0.95); font-weight: 650; }
        .pe-content .ProseMirror em { font-style: italic; }
        .pe-content .ProseMirror s { opacity: 0.5; }

        /* LINKS — visible, clickable looking */
        .pe-content .ProseMirror a,
        .pe-content .ProseMirror .pe-link {
          color: #a5b4fc !important;
          text-decoration: underline !important;
          text-underline-offset: 3px !important;
          text-decoration-color: rgba(165,180,252,0.45) !important;
          cursor: pointer;
          transition: color 0.15s, text-decoration-color 0.15s;
        }
        .pe-content .ProseMirror a:hover {
          color: #c7d2fe !important;
          text-decoration-color: rgba(199,210,254,0.7) !important;
        }

        /* IMAGES — fully visible */
        .pe-content .ProseMirror img,
        .pe-content .ProseMirror .pe-img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          border-radius: 10px !important;
          margin: 28px auto !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          box-shadow: 0 4px 32px rgba(0,0,0,0.4) !important;
        }
        .pe-content .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid #a5b4fc !important;
          outline-offset: 3px !important;
        }

        /* blockquote */
        .pe-content .ProseMirror blockquote {
          border-left: 2px solid #a5b4fc;
          padding: 6px 0 6px 22px;
          margin: 1.4em 0;
          color: rgba(255,255,255,0.52);
          font-style: italic;
          font-size: 1.05em;
        }

        /* code */
        .pe-content .ProseMirror code {
          background: rgba(165,180,252,0.1);
          color: #c4b5fd;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.87em;
          font-family: 'Fira Code', 'Cascadia Code', monospace;
        }

        .pe-content .ProseMirror pre {
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 20px 24px;
          margin: 1.4em 0;
          overflow-x: auto;
        }
        .pe-content .ProseMirror pre code {
          background: none;
          padding: 0;
          color: #c4b5fd;
          font-size: 13.5px;
          line-height: 1.7;
        }

        /* lists */
        .pe-content .ProseMirror ul { list-style: disc; padding-left: 1.6em; margin: 0.8em 0; }
        .pe-content .ProseMirror ol { list-style: decimal; padding-left: 1.6em; margin: 0.8em 0; }
        .pe-content .ProseMirror li { margin: 0.35em 0; }

        /* highlight */
        .pe-content .ProseMirror mark {
          background: rgba(254,240,138,0.2);
          color: #fef08a;
          border-radius: 3px;
          padding: 1px 3px;
        }

        /* horizontal rule */
        .pe-content .ProseMirror hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 2.5em 0;
        }
      `}</style>
    </div>
  )
}
