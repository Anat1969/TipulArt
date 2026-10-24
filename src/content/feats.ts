// הערכה מובנית לפי מבנה FEATS (Formal Elements Art Therapy Scale, Gantt & Tabone, 1998).
// FEATS מדרג מאפיינים צורניים של הציור, לא תוכן סמלי. כל סולם 0 עד 5.
// הגדרות העוגן כאן מנוסחות על ידי TipulArt על בסיס מבנה הסולמות. לשימוש מחקרי: מדריך הדירוג המקורי.

export type FeatsItem = {
  id: string
  he: string
  en: string
  question: string
  low: string
  high: string
  ppatOnly?: boolean
}

export const FEATS: FeatsItem[] = [
  { id: 'prominence_of_color', he: 'בולטות הצבע', en: 'Prominence of Color', question: 'באיזו מידה הצבע ממלא צורות ושטחים, ולא רק קווי מתאר?', low: 'אין צבע, או קו מתאר בלבד', high: 'צבע ממלא את רוב הצורות והרקע' },
  { id: 'color_fit', he: 'התאמת הצבע', en: 'Color Fit', question: 'האם הצבעים תואמים את הדברים שהם מייצגים?', low: 'צבעים שאינם תואמים את המיוצג', high: 'כל הצבעים תואמים את המיוצג', ppatOnly: true },
  { id: 'implied_energy', he: 'אנרגיה משתמעת', en: 'Implied Energy', question: 'כמה מאמץ ותנועה נראים בעבודה?', low: 'מעט סימנים, מאמץ מינימלי', high: 'עבודה עתירת סימנים ומאמץ ניכר' },
  { id: 'space', he: 'ניצול השטח', en: 'Space', question: 'איזה חלק מהדף נוצל?', low: 'פחות מעשירית הדף', high: 'כמעט כל הדף' },
  { id: 'integration', he: 'אינטגרציה', en: 'Integration', question: 'עד כמה הרכיבים מאורגנים לקומפוזיציה אחת?', low: 'רכיבים מפוזרים ללא קשר', high: 'קומפוזיציה מאוזנת ושלמה' },
  { id: 'logic', he: 'היגיון', en: 'Logic', question: 'האם יש רכיבים מוזרים, לא קשורים או בלתי הגיוניים?', low: 'רכיבים רבים שאינם הגיוניים', high: 'כל הרכיבים הגיוניים וקשורים' },
  { id: 'realism', he: 'ריאליזם', en: 'Realism', question: 'עד כמה הדברים המצוירים ניתנים לזיהוי?', low: 'לא ניתן לזהות דבר', high: 'מצויר באופן ריאליסטי ומפורט' },
  { id: 'problem_solving', he: 'פתרון בעיה', en: 'Problem-Solving', question: 'האם נראה פתרון לאופן שבו האדם משיג את התפוח?', low: 'אין עדות לפתרון', high: 'פתרון ברור והגיוני (הושטת יד, סולם, קפיצה)', ppatOnly: true },
  { id: 'developmental_level', he: 'רמה התפתחותית', en: 'Developmental Level', question: 'לאיזו רמה התפתחותית בציור העבודה מתאימה?', low: 'שרבוט של גיל הגן', high: 'רמת ציור של מבוגר' },
  { id: 'details', he: 'פרטי עצמים וסביבה', en: 'Details of Objects and Environment', question: 'כמה פרטים מעבר לנדרש (אדמה, שמיים, צמחייה, חפצים)?', low: 'אין פרטים מעבר לנדרש', high: 'שפע פרטים בעצמים ובסביבה' },
  { id: 'line_quality', he: 'איכות הקו', en: 'Line Quality', question: 'עד כמה הקו שולט, רציף ומכוון?', low: 'קו רועד, מקוטע או לא נשלט', high: 'קו רציף, בטוח ושולט' },
  { id: 'person', he: 'דמות האדם', en: 'Person', question: 'עד כמה דמות האדם שלמה ומפורטת?', low: 'אין דמות אדם', high: 'דמות שלמה עם פרופורציות ופרטים', ppatOnly: true },
  { id: 'rotation', he: 'ישרות', en: 'Rotation', question: 'האם הדמות והעץ זקופים, בלי סיבוב או הטיה?', low: 'סיבוב או הטיה ניכרים', high: 'זקוף, ללא סיבוב', ppatOnly: true },
  { id: 'perseveration', he: 'העדר חזרתיות', en: 'Perseveration', question: 'האם יש חזרה כפייתית על קווים או צורות?', low: 'חזרתיות רבה ומכסה', high: 'אין חזרתיות' },
]

export const SCALE = [0, 1, 2, 3, 4, 5] as const

// ---------- PPAT: המשימה התקנית ----------
export const PPAT = {
  name: 'אדם קוטף תפוח מעץ (PPAT)',
  en: 'Person Picking an Apple from a Tree',
  directive: 'צייר/י אדם קוטף תפוח מעץ.',
  source: 'Gantt, L. & Tabone, C. (1998). The Formal Elements Art Therapy Scale: The Rating Manual. Gargoyle Press.',
  protocol: [
    'חומרים: **דף לבן במידה אחידה וערכת טושים קבועה.** בסטודיו: דף ביחס 3:2 ו-12 צבעי טוש, בלי חומרים אחרים.',
    'אומרים את ההנחיה **במדויק, פעם אחת**: "צייר/י אדם קוטף תפוח מעץ."',
    '**לא מדגימים, לא מציעים רעיונות ולא מעירים** בזמן הציור.',
    'אם נשאלת שאלה (איך, מה, כמה): **"כל דרך שתבחר/י היא בסדר."**',
    '**אין הגבלת זמן.** הזמן נרשם אוטומטית בסטודיו, או ידנית בציור על נייר.',
    '**מותר לסובב את הדף.** בנייר: מצלמים את הדף בכיוון שבו המטופל/ת סיים/ה.',
    'בסיום אפשר לשאול "רוצה לספר על הציור?", ולרשום את התשובה בהערות. ==התשובה אינה חלק מהדירוג.==',
    'צילום ציור מנייר: **אור יום, מלמעלה, הדף ממלא את התמונה, בלי צל.**',
  ],
  // ערכת 12 צבעים לגרסה הדיגיטלית
  palette: ['#1d1d1f', '#6b3e1f', '#d12a2a', '#f07a1a', '#f4d21f', '#7bc043', '#1f7a3a', '#1aa6b7', '#1f4fbf', '#6a3fb5', '#e0569b', '#8a8a8a'],
}

export type AiItem = { id: string; applicable: boolean; score: number; confidence: 'low' | 'medium' | 'high'; rationale: string }
export type AiDraft = {
  items: AiItem[]
  formal_description: string
  process_reading: string
  conversation_questions: string[]
  limitations: string[]
}
export type Ratings = Record<string, number | null> // null = לא רלוונטי

export type Computed = {
  coverage: number
  colorShare: number
  colors: { hex: string; share: number }[]
  colorCount: number
  quadrants: [number, number, number, number]
  centerOffset: number
  edgeDensity: number
  proxies: { space: number; prominence_of_color: number }
  // מספר הרכיבים הנפרדים בדף (אזורי סימון שאינם נוגעים זה בזה). חסר בהערכות ישנות.
  elements?: number
  // הערכה אוטומטית לפי שיטה, ומי הוביל: המכשיר קודם או המטפלת קודם
  auto?: Partial<Record<'feats' | 'etc', import('../assessment/auto').AutoResult>>
  autoLead?: 'machine' | 'therapist'
}

// ---------- מהימנות: הסכמה בין הטיוטה הממוחשבת לבין המטפלת ----------
export function agreement(pairs: [number, number][]) {
  const n = pairs.length
  if (!n) return null
  const exact = pairs.filter(([a, b]) => a === b).length / n
  const within1 = pairs.filter(([a, b]) => Math.abs(a - b) <= 1).length / n
  const mae = pairs.reduce((s, [a, b]) => s + Math.abs(a - b), 0) / n
  // קאפה משוקללת ריבועית (Cohen's quadratic weighted kappa) על סולם 0 עד 5
  const k = 6
  const O = Array.from({ length: k }, () => Array(k).fill(0))
  const ha = Array(k).fill(0)
  const hb = Array(k).fill(0)
  for (const [a, b] of pairs) {
    O[a][b]++
    ha[a]++
    hb[b]++
  }
  let num = 0
  let den = 0
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++) {
      const w = ((i - j) * (i - j)) / ((k - 1) * (k - 1))
      num += w * O[i][j]
      den += w * ((ha[i] * hb[j]) / n)
    }
  const kappa = den === 0 ? null : 1 - num / den
  return { n, exact, within1, mae, kappa }
}
