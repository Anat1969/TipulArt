// הערכה אוטומטית: ציון לכל סולם לפי השיטה שנבחרה, מתוך מדידות ממוחשבות של התמונה ושל תהליך הציור.
// דטרמיניסטי ושקוף: אותה יצירה תמיד מקבלת אותה הערכה, ולכל ציון מוצגים המדידות, הכלל שתרגם אותן לציון והמגבלה.
// זו לא אבחנה. זה בסיס להשוואה מול ההערכה של המטפלת.
import { FEATS, type Computed } from '../content/feats'
import type { ProcessRecord, Stroke } from '../studio/engine'

export type MethodId = 'feats' | 'etc'
export type Confidence = 'low' | 'medium' | 'high'
export type Measure = { label: string; value: string }
export type AutoItem = {
  id: string
  label: string
  en: string
  score: number | null // null: הסולם לא נמדד ממוחשבית
  confidence: Confidence
  meaning: string // מה הסולם בודק
  measures: Measure[] // מה נמדד ביצירה הזו
  rule: string // איך המדידות הפכו לציון
  limits: string // מה המדידה לא רואה
}
export type AutoResult = { method: MethodId; version: 1; at: string; items: AutoItem[]; summary: string }

export const METHODS: { id: MethodId; label: string; en: string; what: string; needsProcess: boolean }[] = [
  {
    id: 'feats',
    label: 'FEATS: יסודות צורניים',
    en: 'Formal Elements Art Therapy Scale',
    what: 'איך הציור עשוי: צבע, שטח, קו, אינטגרציה, פרטים. 0 עד 5 לכל סולם. סולמות שתלויים בזיהוי מה מצויר נשארים למטפלת.',
    needsProcess: false,
  },
  {
    id: 'etc',
    label: 'ETC: רצף התרפיות ההבעתיות',
    en: 'Expressive Therapies Continuum',
    what: 'באיזו רמה התרחשה העבודה: תנועה ומגע, צבע וצורה, תכנון ומבנה, והשילוב ביניהם. נשען על תהליך הציור בסטודיו.',
    needsProcess: true,
  },
]

export const CONF_LABEL: Record<Confidence, string> = { low: 'ביטחון נמוך', medium: 'ביטחון בינוני', high: 'ביטחון גבוה' }

// ---------- עזרים ----------
const band = (v: number, cuts: number[]) => cuts.filter((c) => v >= c).length
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
const clamp = (v: number) => Math.max(0, Math.min(5, v))
const cutsText = (cuts: number[], unit = '') => cuts.map((c, i) => `${i + 1} מ-${c}${unit}`).join(', ')

// ---------- מדידות תהליך מתוך הקווים ----------
export type ProcessFeatures = {
  strokes: number
  activeSec: number
  firstStrokeSec: number
  pauses: number
  erase: number
  smoothness: number // 0 עד 100: כמה הקו רציף בלי שינויי כיוון חדים
  avgStrokeLen: number // אורך קו ממוצע בפיקסלים של הדף
  overlap: number // אחוז התאים שקווים רבים (4 ומעלה) עברו בהם שוב ושוב
  sensoryShare: number // אחוז מזמן הציור בצבע רטוב ובמריחה
  rate: number // קווים לדקת ציור פעילה
  colorsUsed: number
}

export function processFeatures(p: ProcessRecord): ProcessFeatures {
  const strokes = p.strokes.filter((s) => s.tool !== 'eraser')
  let turnSum = 0
  let turnN = 0
  let lenSum = 0
  const cell = 30
  const visits = new Map<number, number>()
  for (const s of strokes) {
    lenSum += strokeLength(s)
    const seen = new Set<number>()
    for (const [x, y] of s.pts) seen.add(Math.floor(y / cell) * 1000 + Math.floor(x / cell))
    for (const c of seen) visits.set(c, (visits.get(c) ?? 0) + 1)
    for (let i = 2; i < s.pts.length; i++) {
      const a1 = Math.atan2(s.pts[i - 1][1] - s.pts[i - 2][1], s.pts[i - 1][0] - s.pts[i - 2][0])
      const a2 = Math.atan2(s.pts[i][1] - s.pts[i - 1][1], s.pts[i][0] - s.pts[i - 1][0])
      let d = Math.abs(a2 - a1)
      if (d > Math.PI) d = 2 * Math.PI - d
      turnSum += d
      turnN++
    }
  }
  const visited = visits.size
  const heavy = [...visits.values()].filter((n) => n >= 4).length
  const sm = p.summary
  const active = Math.max(1, sm.activeSec)
  return {
    strokes: strokes.length,
    activeSec: sm.activeSec,
    firstStrokeSec: sm.firstStrokeSec ?? 0,
    pauses: sm.pauses,
    erase: sm.eraseStrokes,
    smoothness: turnN ? Math.round(100 * (1 - Math.min(1, turnSum / turnN / (Math.PI / 2)))) : 0,
    avgStrokeLen: strokes.length ? Math.round(lenSum / strokes.length) : 0,
    overlap: visited ? Math.round((heavy / visited) * 100) : 0,
    sensoryShare: Math.round((((sm.toolSec.wet ?? 0) + (sm.toolSec.smudge ?? 0)) / active) * 100),
    rate: Math.round((strokes.length / (active / 60)) * 10) / 10,
    colorsUsed: sm.colors.length,
  }
}

function strokeLength(s: Stroke) {
  let l = 0
  for (let i = 1; i < s.pts.length; i++) l += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1])
  return l
}

// פיזור ברביעים כאחוז מהאחידות המלאה (אנטרופיה מנורמלת)
function spread(q: number[]) {
  const t = q.reduce((a, b) => a + b, 0)
  if (!t) return 0
  const h = q.reduce((s, v) => (v ? s - (v / t) * Math.log(v / t) : s), 0)
  return Math.round((h / Math.log(4)) * 100)
}

// ---------- FEATS ----------
const CONTENT_SCALES = new Set(['color_fit', 'logic', 'realism', 'problem_solving', 'person', 'rotation'])

function featsAuto(c: Computed, pf: ProcessFeatures | null, ppat: boolean): AutoItem[] {
  const photo = !pf
  const colorArea = Math.round((c.coverage * c.colorShare) / 100)
  const elements = c.elements ?? null
  const sp = spread(c.quadrants)
  const centered = Math.max(0, 100 - c.centerOffset * 2)
  const out = new Map<string, Omit<AutoItem, 'id' | 'label' | 'en' | 'meaning'>>()

  out.set('space', {
    score: band(c.coverage, [5, 15, 30, 50, 75]),
    confidence: photo ? 'medium' : 'high',
    measures: [{ label: 'כיסוי הדף', value: `${c.coverage}%` }],
    rule: `אחוז הדף שסומן. ${cutsText([5, 15, 30, 50, 75], '%')}.`,
    limits: photo ? 'בצילום, צל או קצה של שולחן נספרים כסימון. מצלמים מלמעלה ובאור יום.' : 'מדידה ישירה מהדף הדיגיטלי.',
  })
  out.set('prominence_of_color', {
    score: band(colorArea, [2, 8, 18, 35, 55]),
    confidence: photo ? 'medium' : 'high',
    measures: [
      { label: 'שטח צבוע מהדף', value: `${colorArea}%` },
      { label: 'מהסימון צבעוני', value: `${c.colorShare}%` },
    ],
    rule: `אחוז הדף שמכוסה בצבע (לא שחור או אפור). ${cutsText([2, 8, 18, 35, 55], '%')}.`,
    limits: 'לא מבחין בין צבע שממלא צורה לבין קו מתאר צבעוני עבה. תאורה חמה בצילום מגדילה את הצבע.',
  })
  if (pf) {
    const s1 = band(pf.strokes, [3, 10, 25, 60, 120])
    const s2 = band(c.coverage, [5, 15, 30, 50, 75])
    const s3 = band(pf.activeSec, [10, 30, 90, 240, 480])
    out.set('implied_energy', {
      score: avg([s1, s2, s3]),
      confidence: 'medium',
      measures: [
        { label: 'קווים', value: `${pf.strokes}` },
        { label: 'כיסוי', value: `${c.coverage}%` },
        { label: 'זמן ציור פעיל', value: `${pf.activeSec} שניות` },
      ],
      rule: `ממוצע של שלושה ציונים: מספר הקווים (${s1}), הכיסוי (${s2}) וזמן הציור הפעיל (${s3}).`,
      limits: 'מודד כמות מאמץ, לא את עוצמת הלחץ על הדף. בעכבר אין מדידת לחץ.',
    })
    const l1 = band(pf.smoothness, [35, 50, 62, 74, 85])
    const l2 = band(pf.avgStrokeLen, [20, 60, 120, 220, 380])
    out.set('line_quality', {
      score: avg([l1, l2]),
      confidence: 'medium',
      measures: [
        { label: 'רציפות הקו', value: `${pf.smoothness}/100` },
        { label: 'אורך קו ממוצע', value: `${pf.avgStrokeLen} פיקסלים` },
      ],
      rule: `ממוצע של רציפות הכיוון לאורך כל קו (${l1}) ושל אורך הקו (${l2}). קו ארוך בלי שינויי כיוון חדים מקבל ציון גבוה.`,
      limits: 'שרבוט מכוון או הצללה בקווים קצרים מורידים את הציון גם כשהם בחירה אמנותית.',
    })
    out.set('perseveration', {
      score: 5 - band(pf.overlap, [5, 12, 22, 35, 50]),
      confidence: 'low',
      measures: [{ label: 'אזורים שקווים רבים עברו בהם', value: `${pf.overlap}%` }],
      rule: `5 פחות מידת החזרתיות: אחוז האזורים שארבעה קווים ומעלה עברו בהם. כל סף (${[5, 12, 22, 35, 50].join(', ')}%) מוריד נקודה.`,
      limits: 'מילוי שטח בצבע נראה כמו חזרתיות. כשיש מילוי רב, הציון נמוך מדי.',
    })
  } else {
    out.set('implied_energy', {
      score: avg([band(c.edgeDensity, [5, 10, 18, 28, 40]), band(c.coverage, [5, 15, 30, 50, 75])]),
      confidence: 'low',
      measures: [
        { label: 'צפיפות קווים', value: `${c.edgeDensity}%` },
        { label: 'כיסוי', value: `${c.coverage}%` },
      ],
      rule: 'ממוצע של צפיפות הקווים ושל הכיסוי. בצילום אין נתוני תהליך.',
      limits: 'בלי תהליך אי אפשר לדעת כמה זמן ומאמץ הושקעו.',
    })
    for (const id of ['line_quality', 'perseveration'])
      out.set(id, {
        score: null,
        confidence: 'low',
        measures: [],
        rule: 'נמדד רק בסטודיו, מתוך מסלול הקו.',
        limits: 'בצילום מנייר אין מסלול קו. הדירוג נשאר למטפלת.',
      })
  }
  if (elements === null) {
    for (const id of ['integration', 'details'])
      out.set(id, { score: null, confidence: 'low', measures: [], rule: 'מדידת הרכיבים נוספה אחרי שההערכה הזו נוצרה.', limits: 'בהערכה חדשה הסולם נמדד.' })
  } else {
    const i1 = band(sp, [20, 40, 60, 75, 88])
    const i2 = band(centered, [20, 40, 55, 70, 85])
    let integ = elements === 0 ? 0 : avg([i1, i2])
    if (elements > 12) integ = Math.max(0, integ - 1)
    out.set('integration', {
      score: integ,
      confidence: 'low',
      measures: [
        { label: 'רכיבים נפרדים', value: `${elements}` },
        { label: 'פיזור ברביעים', value: `${sp}/100` },
        { label: 'מרכוז', value: `${centered}/100` },
      ],
      rule: `ממוצע של הפיזור בדף (${i1}) ושל האיזון סביב המרכז (${i2}). מעל 12 רכיבים נפרדים יורדת נקודה, כי הקומפוזיציה מתפרקת.`,
      limits: 'מודד איזון במרחב, לא קשר משמעותי בין הרכיבים. זה החלק שהמטפלת רואה טוב יותר.',
    })
    const d1 = band(elements, [1, 2, 4, 7, 11])
    const d2 = band(c.colorCount, [1, 2, 3, 5, 7])
    out.set('details', {
      score: avg([d1, d2]),
      confidence: 'low',
      measures: [
        { label: 'רכיבים נפרדים', value: `${elements}` },
        { label: 'גוונים עיקריים', value: `${c.colorCount}` },
      ],
      rule: `ממוצע של מספר הרכיבים (${d1}) ושל מספר הגוונים (${d2}).`,
      limits: 'פרט שנוגע ברכיב אחר נספר איתו כרכיב אחד. פרטים קטנים מאוד לא נספרים.',
    })
  }
  const dev = ['line_quality', 'details', 'integration'].map((id) => out.get(id)?.score).filter((v): v is number => v !== null && v !== undefined)
  out.set('developmental_level', {
    score: dev.length ? avg(dev) : null,
    confidence: 'low',
    measures: dev.length ? [{ label: 'נגזר מ', value: 'איכות הקו, פרטים ואינטגרציה' }] : [],
    rule: 'ממוצע של הסולמות שנמדדו ומשקפים בשלות ציורית: איכות הקו, פרטים ואינטגרציה.',
    limits: 'אומדן עקיף בלבד. רמה התפתחותית נקבעת בעיקר מצורת הדמויות, והמנוע לא מזהה דמויות.',
  })
  for (const id of CONTENT_SCALES)
    out.set(id, {
      score: null,
      confidence: 'low',
      measures: [],
      rule: 'דורש זיהוי של מה מצויר (אדם, עץ, תפוח, התאמת צבע לעצם). המנוע מודד צורה ולא מזהה עצמים.',
      limits: 'הסולם נשאר למטפלת, ואפשר להיעזר בטיוטת Claude שרואה את התמונה.',
    })
  return FEATS.filter((f) => ppat || !f.ppatOnly).map((f) => ({
    id: f.id,
    label: f.he,
    en: f.en,
    meaning: `${f.question} 0: ${f.low}. 5: ${f.high}.`,
    ...out.get(f.id)!,
  }))
}

// ---------- ETC ----------
function etcAuto(c: Computed, pf: ProcessFeatures | null): AutoItem[] {
  const colorArea = Math.round((c.coverage * c.colorShare) / 100)
  const items: AutoItem[] = []
  if (pf) {
    const k1 = band(pf.sensoryShare, [5, 15, 30, 50, 70])
    const k2 = band(pf.rate, [2, 5, 10, 20, 35])
    items.push({
      id: 'kinesthetic_sensory',
      label: 'קינסתטי/חושי',
      en: 'Kinesthetic / Sensory',
      score: avg([k1, k2]),
      confidence: 'medium',
      meaning: 'עבודה דרך תנועה, קצב ומגע בחומר. הגוף נכנס לעבודה לפני הצורה.',
      measures: [
        { label: 'זמן בצבע רטוב ובמריחה', value: `${pf.sensoryShare}%` },
        { label: 'קצב', value: `${pf.rate} קווים לדקה` },
      ],
      rule: `ממוצע של חלק הזמן בחומרים החושיים (${k1}) ושל קצב הקווים (${k2}).`,
      limits: 'במשימה התקנית יש טוש בלבד, ולכן הרמה החושית נמוכה מטבעה.',
    })
  }
  const p1 = band(pf ? pf.colorsUsed : c.colorCount, [1, 2, 3, 5, 7])
  const p2 = band(colorArea, [2, 8, 18, 35, 55])
  items.push({
    id: 'perceptual_affective',
    label: 'תפיסתי/רגשי',
    en: 'Perceptual / Affective',
    score: avg([p1, p2]),
    confidence: 'medium',
    meaning: 'עבודה דרך צבע, צורה וגבול. כאן רגש מקבל צורה.',
    measures: [
      { label: pf ? 'צבעים שנבחרו' : 'גוונים עיקריים', value: `${pf ? pf.colorsUsed : c.colorCount}` },
      { label: 'שטח צבוע', value: `${colorArea}%` },
    ],
    rule: `ממוצע של מגוון הצבעים (${p1}) ושל השטח הצבוע (${p2}).`,
    limits: 'מודד כמה צבע יש, לא איזה רגש הוא נושא. את זה שואלים בשיחה.',
  })
  if (pf) {
    const el = c.elements ?? 0
    const c1 = band(el, [1, 2, 4, 7, 11])
    const c2 = band(pf.pauses + pf.erase, [1, 2, 4, 6, 9])
    items.push({
      id: 'cognitive_symbolic',
      label: 'קוגניטיבי/סמלי',
      en: 'Cognitive / Symbolic',
      score: avg([c1, c2]),
      confidence: 'low',
      meaning: 'תכנון, סדר ומבנה. עצירה לשקול, תיקון, וחלוקה של הדף לרכיבים.',
      measures: [
        { label: 'רכיבים נפרדים', value: `${el}` },
        { label: 'עצירות מעל 5 שניות', value: `${pf.pauses}` },
        { label: 'מחיקות', value: `${pf.erase}` },
      ],
      rule: `ממוצע של מבנה הדף (${c1}) ושל עצירות ומחיקות, כסימן לשקילה ולתיקון (${c2}).`,
      limits: 'עצירה יכולה להיות גם היסוס או הסחת דעת. המנוע לא יודע מה הדימוי מסמל.',
    })
    const three = items.map((i) => i.score as number)
    const cr = clamp(Math.round(three.reduce((a, b) => a + b, 0) / 3 - (Math.max(...three) - Math.min(...three)) / 2))
    items.push({
      id: 'creative',
      label: 'יצירתי',
      en: 'Creative',
      score: cr,
      confidence: 'low',
      meaning: 'שילוב בין הרמות: תנועה, צבע ומבנה פועלים יחד.',
      measures: [{ label: 'שלוש הרמות', value: three.join(' / ') }],
      rule: 'ממוצע שלוש הרמות, פחות חצי מהפער בין הגבוהה לנמוכה. רמה אחת חזקה בלבד לא מספיקה.',
      limits: 'חידוש ורגע של שלמות אינם נמדדים ממוחשבית.',
    })
  } else {
    items.push({
      id: 'process_missing',
      label: 'קינסתטי, קוגניטיבי ויצירתי',
      en: 'K / C / Cr',
      score: null,
      confidence: 'low',
      meaning: 'שלוש הרמות האלה נקראות מתוך התהליך.',
      measures: [],
      rule: 'בצילום מנייר אין נתוני תהליך.',
      limits: 'כדי לקבל את כל הרמות, עובדים בסטודיו.',
    })
  }
  return items
}

// ---------- ריצה ----------
export function runAuto(method: MethodId, c: Computed, process: ProcessRecord | null, ppat = false): AutoResult {
  const pf = process ? processFeatures(process) : null
  const items = method === 'feats' ? featsAuto(c, pf, ppat) : etcAuto(c, pf)
  const measured = items.filter((i) => i.score !== null)
  let summary: string
  if (method === 'feats') {
    const hi = [...measured].sort((a, b) => (b.score as number) - (a.score as number))[0]
    const lo = [...measured].sort((a, b) => (a.score as number) - (b.score as number))[0]
    summary = `**${measured.length} מתוך ${items.length} סולמות נמדדו ממוחשבית.** הגבוה: ${hi?.label} (${hi?.score}). הנמוך: ${lo?.label} (${lo?.score}). ==הסולמות שתלויים בזיהוי מה מצויר נשארים לך.==`
  } else {
    const top = Math.max(...measured.map((i) => i.score as number))
    const lead = measured.filter((i) => i.score === top && i.id !== 'creative').map((i) => i.label)
    summary = `**העבודה התרחשה בעיקר ברמה ${lead.join(' וברמה ')}** (${top} מתוך 5). ==זו נקודת פתיחה לשיחה, לא קביעה.==`
  }
  return { method, version: 1, at: new Date().toISOString(), items, summary }
}

// זוגות להשוואה: ציון אוטומטי מול דירוג המטפלת, רק בסולמות שנמדדו ודורגו
export function autoPairs(auto: AutoResult | undefined, ratings: Record<string, number | null> | null | undefined) {
  if (!auto || !ratings) return [] as [number, number][]
  return auto.items
    .filter((i) => i.score !== null && ratings[i.id] !== null && ratings[i.id] !== undefined)
    .map((i) => [i.score as number, ratings[i.id] as number] as [number, number])
}
