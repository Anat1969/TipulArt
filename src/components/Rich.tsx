import { Fragment, type ReactNode } from 'react'

// טקסט עשיר: **מילה** מודגשת, ==תובנה== מסומנת. nums מדגיש מספרים, אחוזים וערכים סטטיסטיים.
const TOKEN = /(\*\*[^*]+\*\*|==[^=]+==)/g
const NUM = /((?:SMD|N|n)\s?[−-]?\d+(?:[.,]\d+)?|[−-]?\d+(?:[.,]\d+)*%?(?:–\d+%?)?)/g

function numbers(text: string, key: string): ReactNode[] {
  return text.split(NUM).map((part, i) =>
    i % 2 ? <b key={`${key}-${i}`} className="num">{part}</b> : <Fragment key={`${key}-${i}`}>{part}</Fragment>,
  )
}

export function Rich({ text, nums = false }: { text: string; nums?: boolean }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('==') && part.endsWith('==')) return <mark key={i} className="hl">{part.slice(2, -2)}</mark>
        return nums ? <Fragment key={i}>{numbers(part, String(i))}</Fragment> : <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

// לחיפוש ולטקסט פשוט: מסיר את סימני ההדגשה
export const plain = (text: string) => text.replace(/\*\*|==/g, '')
