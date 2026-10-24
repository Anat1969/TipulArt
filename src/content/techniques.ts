// זרע ספריית הטכניקות, לפי docs/03-techniques-library.md ו-docs/06-evidence-and-sources.md.
// הספרייה היא ידע מקצועי ציבורי, ולכן נשמרת בקוד ולא במסד הנתונים.
import type { EtcLevel } from './etc'
import type { GoalId } from './goals'

export type EvidenceLevel = 'mixed' | 'single' | 'clinical' | 'untested'

export const EVIDENCE_LABELS: Record<EvidenceLevel, { label: string; note: string }> = {
  mixed: { label: 'ראיות מעורבות', note: 'יש מחקרים מבוקרים, התוצאות אינן אחידות.' },
  single: { label: 'מחקר יחיד', note: 'מחקר אחד או מעט מאוד. לא מספיק להכרעה.' },
  clinical: { label: 'ידע קליני', note: 'מבוסס בעיקר על ניסיון קליני ודעת מומחים.' },
  untested: { label: 'לא נבדק בנפרד', note: 'עיקרון עבודה שלא נבדק כמרכיב עצמאי.' },
}

export type Exercise = {
  id: string
  title: string
  instructions: string
  materials: string[]
  durationMin: number
  observeFor: string
  isPractice: boolean
}

export type Technique = {
  id: string
  nameHe: string
  nameEn: string
  approach: string
  founder: string
  etc: EtcLevel[]
  populations: string[]
  goals: GoalId[]
  description: string
  processQuestions: string[]
  evidence: EvidenceLevel
  evidenceNote: string
  sources: string[]
  exercises: Exercise[]
}

export const POPULATIONS = [
  'ילדים',
  'מתבגרים',
  'מבוגרים',
  'קשישים',
  'טראומה',
  'דיכאון',
  'חרדת ביצוע',
  'מאושפזים פסיכיאטריים',
]

export const TECHNIQUES: Technique[] = [
  {
    id: 'free-drawing',
    nameHe: 'ציור חופשי',
    nameEn: 'Free drawing',
    approach: 'פסיכודינמית',
    founder: 'מרגרט נאומבורג (Margaret Naumburg)',
    etc: ['cognitive_symbolic'],
    populations: ['מבוגרים', 'מתבגרים'],
    goals: ['expression', 'grief'],
    description:
      'המטופל/ת מצייר/ת **ללא הנחיה מוגדרת**, ואחר כך מתאר/ת את הדימוי ומשייך/ת אליו. היצירה משמשת **"דיבור סמלי"** שמוביל לשיחה.',
    processQuestions: [
      'מה הדבר הראשון שאת/ה רואה בציור?',
      'אם הדימוי היה מדבר, מה היה אומר?',
      'איפה בציור הכי קל להסתכל, ואיפה הכי קשה?',
    ],
    evidence: 'mixed',
    evidenceNote:
      'המטא־אנליזה של Joschko et al. (2024) מצאה אפקט בינוני (SMD 0.38) לטיפול באמנות בכלל, ברוב המחקרים **באיכות נמוכה**. ==הטכניקה לא נבדקה בנפרד.==',
    sources: ['Naumburg, M., Dynamically Oriented Art Therapy, 1966', 'Joschko et al., JAMA Network Open, 2024'],
    exercises: [
      {
        id: 'free-drawing-15',
        title: 'ציור חופשי של 15 דקות',
        instructions: 'לשבת בשקט, לבחור חומר אחד, לתת לקו הראשון לקרות בלי לתכנן.',
        materials: ['נייר A4', 'פחם או צבע אקרילי אחד'],
        durationMin: 15,
        observeFor: 'האם התחלתי מהר או לאט? האם שיניתי את הכלי? מה הרגשתי ברגע שרציתי לתקן?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'safe-place',
    nameHe: 'משימה מכוונת: "מקום בטוח"',
    nameEn: 'Directed task: Safe place',
    approach: 'מערכתית/הומניסטית',
    founder: "ג'ודית רובין (Judith A. Rubin)",
    etc: ['perceptual_affective'],
    populations: ['טראומה', 'מבוגרים', 'מתבגרים'],
    goals: ['regulation', 'trauma'],
    description:
      'הנחיה לציור **מקום שבו המטופל/ת מרגיש/ה בטוח/ה**. מתאים לעבודה ראשונית **לוויסות** ולבניית **משאב פנימי**.',
    processQuestions: [
      'מה יש במקום הזה שעושה אותו בטוח?',
      'מי או מה יכול להיכנס אליו?',
      'איפה בגוף מורגשת התחושה כשמסתכלים עליו?',
    ],
    evidence: 'mixed',
    evidenceNote: 'מחקרי טראומה (למשל Maddox et al., 2024) מציגים **תוצאות מעורבות**. ==המשימה לא הוערכה בנפרד.==',
    sources: ['Rubin, J. A., Approaches to Art Therapy', 'Maddox et al., 2024'],
    exercises: [
      {
        id: 'safe-place-20',
        title: 'המקום הבטוח שלי, 20 דקות',
        instructions: 'לעצום עיניים לדקה ולדמיין מקום שבו יש שקט. לפתוח עיניים ולצייר אותו, בלי לחשוב על דיוק.',
        materials: ['נייר A3', 'פסטלים שמניים', 'עפרונות צבעוניים'],
        durationMin: 20,
        observeFor: 'אילו גבולות ציירתי? האם יש בציור דמויות? מה השתנה בנשימה במהלך העבודה?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'my-family',
    nameHe: 'משימה מכוונת: "המשפחה שלי"',
    nameEn: 'Directed task: My family',
    approach: 'מערכתית',
    founder: "ג'ודית רובין (Judith A. Rubin)",
    etc: ['cognitive_symbolic'],
    populations: ['ילדים', 'מתבגרים'],
    goals: ['children', 'expression'],
    description:
      'ציור של המשפחה או של מערכת יחסים. **המיקום, הגודל והמרחק** בציור הם חלק מהתצפית, ==לא בסיס לאבחנה.==',
    processQuestions: ['מי צויר ראשון?', 'מי קרוב למי?', 'מה כל דמות עושה עכשיו?'],
    evidence: 'clinical',
    evidenceNote: '**מעט מחקר מבוקר.** רוב הידע קליני.',
    sources: ['Rubin, J. A., Approaches to Art Therapy'],
    exercises: [
      {
        id: 'my-family-25',
        title: 'מפת קרבה, 25 דקות',
        instructions: 'לצייר את בני המשפחה כצורות פשוטות בלבד: עיגול, ריבוע או קו. לסדר אותם על הדף לפי תחושת קרבה.',
        materials: ['נייר A3', 'טושים', 'מדבקות צבעוניות'],
        durationMin: 25,
        observeFor: 'את מי קשה היה למקם? מה הרגשתי כשראיתי את המרחקים?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'collage',
    nameHe: "קולאז'",
    nameEn: 'Collage',
    approach: 'התפתחותית',
    founder: 'אדית קרמר (Edith Kramer)',
    etc: ['perceptual_affective'],
    populations: ['מבוגרים', 'מתבגרים', 'חרדת ביצוע'],
    goals: ['expression', 'grief'],
    description:
      'בחירה והרכבה של דימויים מוכנים. **מוריד את חרדת הביצוע** ומתאים למי שמרגיש/ה "לא מוכשר/ת".',
    processQuestions: ['מה משך אותך לדימוי הזה?', 'מה נשאר מחוץ לדף?', 'איזה דימוי הכי חשוב כאן?'],
    evidence: 'clinical',
    evidenceNote: '**מעט מחקר ייעודי.** מתבסס על הגישה הקלינית.',
    sources: ['Kramer, E., Art as Therapy with Children, 1971'],
    exercises: [
      {
        id: 'collage-30',
        title: "קולאז' של עשרה דימויים, 30 דקות",
        instructions: 'לגזור עשרה דימויים ממגזינים בלי לתכנן. לבחור מהם חמישה ולהדביק על דף אחד.',
        materials: ['מגזינים ישנים', 'מספריים', 'דבק', 'בריסטול'],
        durationMin: 30,
        observeFor: 'מה הוצאתי ולמה? האם הסידור היה מהיר או מהוסס?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'clay',
    nameHe: 'חימר ופיסול',
    nameEn: 'Clay and sculpture',
    approach: 'אינטגרטיבית',
    founder: 'אדית קרמר (Edith Kramer)',
    etc: ['kinesthetic_sensory'],
    populations: ['ילדים', 'מבוגרים', 'דיכאון'],
    goals: ['regulation', 'children', 'trauma'],
    description: 'עבודה תלת־ממדית ו**עיבוד חושי**. מתאים **לוויסות** ולביטוי של מתח דרך הידיים.',
    processQuestions: ['מה הידיים רצו לעשות עם החימר?', 'מתי היה צורך ללחוץ, ומתי ללטף?', 'מה נשאר בסוף?'],
    evidence: 'single',
    evidenceNote: 'לפי הדוח יש **ניסוי מבוקר אחד** בחימר בדיכאון. ==יש לאמת פרטים מול מקור ראשוני לפני ציטוט.==',
    sources: ['Kramer, E., Art as Therapy with Children, 1971'],
    exercises: [
      {
        id: 'clay-pinch-20',
        title: 'כדור, לחיצה, צורה, 20 דקות',
        instructions: 'לחמם גוש חימר בידיים חמש דקות בעיניים עצומות. אחר כך ליצור צורה אחת בלי כלים.',
        materials: ['חימר אוויר', 'מגבת לחה', 'משטח עבודה'],
        durationMin: 20,
        observeFor: 'מה קרה לקצב הנשימה? האם רציתי לשמור את הצורה או למחוץ אותה?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'mandala',
    nameHe: 'מנדלה',
    nameEn: 'Mandala',
    approach: 'יונגיאנית',
    founder: 'קרל גוסטב יונג (Carl Gustav Jung)',
    etc: ['cognitive_symbolic'],
    populations: ['מבוגרים', 'מאושפזים פסיכיאטריים'],
    goals: ['regulation', 'trauma'],
    description: 'מבנה מעגלי ש**תוחם ומארגן**. מתאים לאנשים שחשים **פיזור או ערבול**.',
    processQuestions: ['מאיפה התחלת, מהמרכז או מהשוליים?', 'מה נמצא במרכז?', 'האם המעגל הספיק?'],
    evidence: 'single',
    evidenceNote: '**מחקר יחיד** במאושפזים פסיכיאטריים. ==לא מספיק להכרעה.==',
    sources: ['docs/06-evidence-and-sources.md'],
    exercises: [
      {
        id: 'mandala-20',
        title: 'מנדלה מהמרכז החוצה, 20 דקות',
        instructions: 'לצייר עיגול בקוטר 20 ס"מ. להתחיל בנקודה במרכז ולהוסיף שכבות החוצה, שכבה אחר שכבה.',
        materials: ['נייר A3', 'צלחת לשרטוט העיגול', 'עפרונות צבעוניים'],
        durationMin: 20,
        observeFor: 'האם שמרתי על סימטריה? מתי רציתי לצאת מהמעגל?',
        isPractice: true,
      },
    ],
  },
  {
    id: 'wet-paint',
    nameHe: 'צבע רטוב וחומרים נשלטים',
    nameEn: 'Fluid and controlled media',
    approach: 'עקרון ETC',
    founder: 'ויג׳ה לוסברינק (Vija Lusebrink), סנדרה קייגין (Sandra Kagin)',
    etc: ['kinesthetic_sensory', 'perceptual_affective'],
    populations: ['ילדים', 'מבוגרים'],
    goals: ['regulation', 'expression', 'children'],
    description:
      'חומרים רטובים ופחות נשלטים **מעוררים רגש**. חומרים מובנים **מארגנים ומרגיעים**. הבחירה נעשית **לפי רמת המטופל/ת**.',
    processQuestions: ['מה קרה כשהצבע זלג?', 'מתי היה צורך בעיפרון?', 'איזה חומר הרגיש יותר "שלך"?'],
    evidence: 'untested',
    evidenceNote: 'עקרון קליני של מודל ETC, ==לא נבדק בנפרד.==',
    sources: ['Lusebrink, V. B., Imagery and Visual Expression in Therapy, 1990'],
    exercises: [
      {
        id: 'wet-dry-25',
        title: 'רטוב ואחריו יבש, 25 דקות',
        instructions: 'עשר דקות של צבעי מים רטובים על רטוב. אחר כך, על אותו דף, עשר דקות של קווים בעיפרון.',
        materials: ['נייר לצבעי מים', 'צבעי מים', 'מכחול רחב', 'עיפרון רך'],
        durationMin: 25,
        observeFor: 'מה הרגשתי במעבר בין החומרים? מה הוסיף העיפרון לצבע?',
        isPractice: true,
      },
    ],
  },
]

export const techniqueById = (id?: string | null) => TECHNIQUES.find((t) => t.id === id)
export const ALL_EXERCISES = TECHNIQUES.flatMap((t) => t.exercises.map((e) => ({ ...e, techniqueId: t.id })))
