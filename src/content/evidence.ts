// ממצאי מחקר וסטטוס בישראל, לפי docs/06-evidence-and-sources.md. כל טענה מסומנת לפי סוגה.
export type ClaimKind = 'fact' | 'expert' | 'interpretation' | 'uncertain'

export const CLAIM_LABELS: Record<ClaimKind, string> = {
  fact: 'עובדה מבוססת',
  expert: 'דעת מומחה',
  interpretation: 'פרשנות',
  uncertain: 'אי־ודאות',
}

export const FINDINGS: { title: string; body: string; kind: ClaimKind; source: string }[] = [
  {
    title: 'מטא־אנליזה רחבה',
    body: '69 ניסויים מבוקרים, כ־4,200 משתתפים בגילאי 4–96. במטא־אנליזה נכללו 50 מחקרים. SMD של 0.38 (רווח סמך 95%: 0.26–0.51). ==רוב המחקרים באיכות נמוכה.==',
    kind: 'fact',
    source: 'Joschko et al., JAMA Network Open, 2024',
  },
  {
    title: 'דיכאון',
    body: 'SMD של 0.53 בניתוח משני, ו־SMD של ‎−0.69 במטא־אנליזה נוספת. **לא נמצא אפקט מובהק על חרדה.** הסקירות כוללות גם מוזיקה ודרמה.',
    kind: 'fact',
    source: 'Frontiers in Psychiatry, 2026; Qiao et al., 2026',
  },
  {
    title: 'סכיזופרניה (MATISSE)',
    body: '417 משתתפים. טיפול קבוצתי באמנות **לא שיפר תפקוד או תסמינים** לעומת טיפול רגיל. המסקנה זכתה לביקורת מקצועית (Holttum & Huet, 2014).',
    kind: 'fact',
    source: 'Crawford et al., BMJ, 2012',
  },
  {
    title: 'דמנציה',
    body: 'סקירת Cochrane: שני מחקרים, 60 משתתפים. **אין ראיות מספיקות.**',
    kind: 'fact',
    source: 'Deshmukh et al., Cochrane, 2018',
  },
  {
    title: 'קורטיזול',
    body: 'ירידה ברמות קורטיזול אצל 30 מתוך 39 מבוגרים בריאים אחרי 45 דקות יצירה. ללא קבוצת ביקורת ולא קליני: ==מלמד על רווחה, לא על יעילות טיפולית.==',
    kind: 'fact',
    source: 'Kaimal, Ray & Muniz, Art Therapy, 2016',
  },
  {
    title: 'מה מקור התועלת',
    body: 'ייתכן שחלק מהתועלת נובע **מיצירה ומקשר טיפולי בכלל**, ולא ממרכיב ייחודי לטיפול באמנות.',
    kind: 'uncertain',
    source: 'docs/06-evidence-and-sources.md',
  },
]

export const ISRAEL_STATUS: { body: string; kind: ClaimKind }[] = [
  { body: 'טיפול באמצעות אמנויות מוכר באקדמיה. מתווה המל"ג מ־2010 דורש תואר שני ו־1,560 שעות הכשרה לרישום ביה"ת.', kind: 'fact' },
  { body: 'בג"ץ 2921/03 (2004) ביטל את הנוהל המנהלי של משרד הבריאות. **מאז לא מונפקות תעודות.**', kind: 'fact' },
  { body: 'בג"ץ 11/19 (2019) קבע שיש לבחון הסדרה בחוק. הצעות חוק הוגשו **ולא אושרו.**', kind: 'fact' },
  { body: 'נכון לאוקטובר 2026 לא אותר חוזר מנכ"ל חתום להכנסת המקצוע לקופות החולים. ==האפליקציה אינה מבטיחה כיסוי.==', kind: 'uncertain' },
]

export const PRACTICAL_CONCLUSION = [
  'יש בסיס סביר להציע טיפול באמנות **כטיפול משלים**, בעיקר **בדיכאון** ובמי שמתקשה במילים.',
  '==אין בסיס להציג אותו כטיפול מבוסס ראיות ברמת CBT.==',
  'לכן כל טכניקה מציגה את **רמת הראיות שלה**, ואף אחת אינה מוצגת כ"מוכחת".',
]
