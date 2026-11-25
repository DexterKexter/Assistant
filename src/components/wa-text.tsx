import { Fragment } from 'react'

// Renders WhatsApp's *bold* and _italic_ the way the client's phone shows them. Keeps line breaks.
export function WaText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g)
  return (
    <span className={`whitespace-pre-wrap break-words ${className ?? ''}`}>
      {parts.map((p, i) =>
        /^\*[^*]+\*$/.test(p) ? <b key={i} className="font-semibold">{p.slice(1, -1)}</b>
        : /^_[^_]+_$/.test(p) ? <i key={i}>{p.slice(1, -1)}</i>
        : <Fragment key={i}>{p}</Fragment>)}
    </span>
  )
}
