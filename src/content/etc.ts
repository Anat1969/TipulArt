// רמות מודל ETC (Expressive Therapies Continuum). הצבע נושא משמעות ונשמר בכל המערכת.
export type EtcLevel = 'kinesthetic_sensory' | 'perceptual_affective' | 'cognitive_symbolic' | 'creative'

export const ETC_LEVELS: { id: EtcLevel; label: string; en: string; color: string; hint: string }[] = [
  {
    id: 'kinesthetic_sensory',
    label: 'קינסתטי/חושי',
    en: 'Kinesthetic / Sensory',
    color: 'var(--etc-ks)',
    hint: 'תנועה, קצב, מגע בחומר. האם הגוף נכנס לעבודה?',
  },
  {
    id: 'perceptual_affective',
    label: 'תפיסתי/רגשי',
    en: 'Perceptual / Affective',
    color: 'var(--etc-pa)',
    hint: 'צורה, צבע, גבול. איזה רגש עלה ואיך הוא קיבל צורה?',
  },
  {
    id: 'cognitive_symbolic',
    label: 'קוגניטיבי/סמלי',
    en: 'Cognitive / Symbolic',
    color: 'var(--etc-cs)',
    hint: 'תכנון, סדר, סמל ומשמעות. מה נאמר על הדימוי?',
  },
  {
    id: 'creative',
    label: 'יצירתי',
    en: 'Creative',
    color: 'var(--etc-cr)',
    hint: 'שילוב בין הרמות. רגע של חידוש או של שלמות.',
  },
]

export const etcById = (id: string) => ETC_LEVELS.find((l) => l.id === id)
