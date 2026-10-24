// מפת מטרות טיפוליות. החיבור בין מטרה לטכניקה הוא הצעה לחשיבה, לא המלצה מבוססת ראיות.
export type GoalId = 'regulation' | 'expression' | 'grief' | 'trauma' | 'children'

export const GOALS: { id: GoalId; label: string; summary: string; materials: string }[] = [
  {
    id: 'regulation',
    label: 'ויסות',
    summary: '**הרגעה וארגון.** חומרים מובנים, גבול ברור, קצב איטי.',
    materials: 'חימר, עיפרון, מנדלה',
  },
  {
    id: 'expression',
    label: 'ביטוי',
    summary: '**פתיחה ומתן צורה לרגש.** חומרים רכים ופחות נשלטים.',
    materials: 'צבע רטוב, פסטל, קולאז׳',
  },
  {
    id: 'grief',
    label: 'עיבוד אובדן',
    summary: '**מקום לזיכרון ולהיעדר.** דימוי שאפשר לחזור אליו.',
    materials: 'קולאז׳, ציור חופשי',
  },
  {
    id: 'trauma',
    label: 'עבודה עם טראומה',
    summary: '**קודם ביטחון ומשאב,** ורק אחר כך עיבוד.',
    materials: 'מקום בטוח, חימר, מנדלה',
  },
  {
    id: 'children',
    label: 'עבודה עם ילדים',
    summary: '**משחק, חומר ותנועה.** השפה היא החומר.',
    materials: 'חימר, צבע, ציור משפחה',
  },
]

export const goalById = (id?: string | null) => GOALS.find((g) => g.id === id)
