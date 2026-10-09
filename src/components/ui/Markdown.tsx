import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for companion replies: paragraphs, "- " bullets,
 * **bold**, *italic*. Deliberately small so no HTML from a model is ever
 * injected into the page.
 */

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={`prose-ht ${className ?? ""}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim() === "");
        if (isList) {
          return (
            <ul key={i}>
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{inline(l.trim().slice(2))}</li>
                ))}
            </ul>
          );
        }
        // paragraph that may contain a heading line followed by list lines
        const headIdx = lines.findIndex((l) => l.trim().startsWith("- "));
        if (headIdx > 0) {
          return (
            <Fragment key={i}>
              <p>{inline(lines.slice(0, headIdx).join(" "))}</p>
              <ul>
                {lines.slice(headIdx).map((l, j) => (
                  <li key={j}>{inline(l.trim().replace(/^- /, ""))}</li>
                ))}
              </ul>
            </Fragment>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
