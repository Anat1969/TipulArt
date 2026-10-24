import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ETC_LEVELS } from '../content/etc'
import { TECHNIQUES } from '../content/techniques'
import './Home.css'

const HomeScene = lazy(() => import('../three/HomeScene'))

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const CHAPTERS = [
  { id: 'vision', n: '01', label: 'חזון' },
  { id: 'goal', n: '02', label: 'מטרה' },
  { id: 'tools', n: '03', label: 'כלים' },
  { id: 'results', n: '04', label: 'תוצאות' },
]

const PATH = ['ספרייה', 'בחירת מטרה', 'תכנון מפגש', 'תיעוד עם תמונה ותצפית', 'ציר זמן']

const TOOLS = [
  { to: '/library', title: 'ספרייה וראיות', body: `${TECHNIQUES.length} טכניקות, גישה, רמת ETC ורמת ראיות לכל אחת. תרגיל אישי לכל טכניקה.` },
  { to: '/map', title: 'מפת מטרות', body: 'מטרה טיפולית מחוברת לחומר, למשימה ולרמה במודל ETC.' },
  { to: '/plan', title: 'מתכנן מפגש', body: 'קוד מטופל/ת, מטרה וטכניקה. התוכנית נכתבת מתוך התרגיל, עם שאלות לתהליך.' },
  { to: '/clients', title: 'יומן ותצפית', body: 'תמונת היצירה, תצפית לפי רמות ETC והערות. תצפית, לא אבחנה.' },
  { to: '/clients', title: 'ציר זמן', body: 'כל המפגשים של מטופל/ת אחד/ת, עם התמונות והרמות שנצפו.' },
]

const RESULTS = [
  { k: 'דפוס', title: 'שינוי נראה לעין', body: 'הרמות שנצפו מוצגות לאורך המפגשים. רואים תנועה, או העדר תנועה.' },
  { k: 'נימוק', title: 'בחירה שאפשר לשחזר', body: 'לכל מפגש נשמרו המטרה והטכניקה. ברור למה נבחר כל תרגיל.' },
  { k: 'פרטיות', title: 'קוד בלבד', body: 'בלי שם, ת.ז. או פרטי קשר. תמונות בדלי פרטי, נפתחות בקישור זמני בלבד.' },
  { k: 'כנות', title: 'ראיות כמות שהן', body: 'אפקט בינוני (SMD 0.38) במטא־אנליזה של 2024, רוב המחקרים באיכות נמוכה. אף טכניקה אינה מוצגת כ"מוכחת".' },
]

// הדגמת תצפיות: שמונה מפגשים לדוגמה, ארבע רמות. נתוני הדגמה בלבד.
const DEMO = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 1, 1, 0],
  [0, 1, 1, 0],
  [0, 1, 1, 1],
  [1, 1, 1, 1],
]

function StaticComposition() {
  return (
    <div className="static-comp" aria-hidden="true">
      <div className="sc-sheet sc-1" />
      <div className="sc-sheet sc-2" />
      <div className="sc-sheet sc-3" />
      <div className="sc-clay" />
      <div className="sc-stick" />
    </div>
  )
}

export default function Home() {
  const reduce = useReducedMotion() ?? false
  const [mobile] = useState(() => window.matchMedia('(max-width: 719px)').matches)
  const [gl] = useState(webglAvailable)
  const [enable3d, setEnable3d] = useState(() => !mobile)
  const phaseRef = useRef(0)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const mid = window.scrollY + window.innerHeight * 0.5
      const centers = sectionRefs.current.map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0))
      let p = 0
      if (mid <= centers[0]) p = 0
      else if (mid >= centers[centers.length - 1]) p = centers.length - 1
      else
        for (let i = 0; i < centers.length - 1; i++)
          if (mid >= centers[i] && mid < centers[i + 1]) p = i + (mid - centers[i]) / (centers[i + 1] - centers[i])
      phaseRef.current = reduce ? Math.round(p) : p
      setActive(Math.round(p))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduce])

  const show3d = gl && enable3d
  const reveal = {
    initial: { opacity: 0, y: reduce ? 0 : 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }
  const setSection = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el
  }

  return (
    <div className={`home ${show3d ? 'has-3d' : ''}`}>
      {show3d && (
        <div className="scene-layer">
          <SceneBoundary fallback={null}>
            <Suspense fallback={null}>
              <HomeScene phaseRef={phaseRef} still={reduce} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}

      <nav className="chapter-rail" aria-label="פרקי דף הבית">
        {CHAPTERS.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className={active === i + 1 ? 'on' : ''}>
            <span className="label">{c.n}</span>
            <span>{c.label}</span>
          </a>
        ))}
      </nav>

      <section className="chapter hero" ref={setSection(0)} id="top">
        <motion.div className="chapter-copy" initial={{ opacity: 0, y: reduce ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div className="label">טיפול באמנות · ידע · תכנון · תיעוד</div>
          <h1>
            היצירה מספרת תהליך.
            <br />
            <span className="accent">TipulArt</span> שומר אותו.
          </h1>
          <p className="lede">
            כלי עבודה למטפלת באמנות: בוחרים טכניקה לפי מטרה, מתכננים מפגש, מתעדים תמונה ותצפית, ורואים את הדרך של כל
            מטופל/ת לאורך זמן.
          </p>
          <div className="row">
            <Link className="btn btn-primary" to="/plan">
              תכנון מפגש
            </Link>
            <Link className="btn" to="/library">
              לספרייה
            </Link>
            {gl && mobile && !enable3d && (
              <button type="button" className="btn btn-quiet" onClick={() => setEnable3d(true)} data-testid="enable-3d">
                הפעלת תלת־ממד
              </button>
            )}
          </div>
          <ol className="hero-index">
            {CHAPTERS.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`}>
                  <span className="label">{c.n}</span> {c.label}
                </a>
              </li>
            ))}
          </ol>
        </motion.div>
        {!show3d && <StaticComposition />}
      </section>

      <section className="chapter" id="vision" ref={setSection(1)}>
        <motion.div className="chapter-copy panel" {...reveal}>
          <div className="label">01 · חזון</div>
          <h2>כל מפגש הוא נקודה. יחד הן מראות דרך.</h2>
          <p>
            מטפלת שרואה את כל המפגשים של מטופל/ת ברצף מזהה דפוס, שינוי או תקיעות. היום המידע מפוזר בפתקים, בזיכרון
            ובקבצים. כאן הוא מתחבר לציר אחד.
          </p>
          <ul className="ticks">
            <li>לראות שינוי, או העדר שינוי, לאורך זמן.</li>
            <li>לדעת למה נבחרה כל טכניקה.</li>
            <li>האפליקציה אינה מאבחנת. היא עוזרת לתעד, לארגן ולחשוב.</li>
          </ul>
        </motion.div>
      </section>

      <section className="chapter" id="goal" ref={setSection(2)}>
        <motion.div className="chapter-copy panel" {...reveal}>
          <div className="label">02 · מטרה</div>
          <h2>מפגש מתוכנן ומתועד בפחות מדקה.</h2>
          <p>ידע, תכנון ותיעוד במקום אחד, במסלול קצר וקבוע:</p>
          <ol className="path">
            {PATH.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: reduce ? 0 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: reduce ? 0 : 0.12 * i, duration: 0.5 }}
              >
                <span className="path-n">{i + 1}</span>
                <span>{s}</span>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </section>

      <section className="chapter" id="tools" ref={setSection(3)}>
        <motion.div className="chapter-copy wide" {...reveal}>
          <div className="label">03 · כלים</div>
          <h2>חמישה כלים, דף אחד לכל פעולה.</h2>
          <div className="tool-grid">
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: reduce ? 0 : 20, rotateX: reduce ? 0 : 12 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: reduce ? 0 : 0.08 * i, duration: 0.6 }}
                className="tool-card-wrap"
              >
                <Link to={t.to} className="tool-card">
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  <span className="tool-go">פתיחה</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="chapter" id="results" ref={setSection(4)}>
        <motion.div className="chapter-copy wide" {...reveal}>
          <div className="label">04 · תוצאות</div>
          <h2>מה מקבלים בסוף.</h2>
          <div className="results-grid">
            <div className="panel demo">
              <div className="label">הדגמה: תצפיות ETC לאורך שמונה מפגשים</div>
              <div className="demo-grid" role="img" aria-label="הדגמה של רמות ETC שנצפו לאורך שמונה מפגשים, מתרחבות בהדרגה">
                {ETC_LEVELS.map((lvl, r) => (
                  <div className="demo-row" key={lvl.id}>
                    <span className="demo-name">{lvl.label}</span>
                    <div className="demo-cells">
                      {DEMO.map((col, c) => (
                        <motion.span
                          key={c}
                          className="demo-cell"
                          style={{ background: col[r] ? lvl.color : 'transparent' }}
                          initial={{ scale: reduce ? 1 : 0.2, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: reduce ? 0 : 0.05 * c + 0.03 * r, duration: 0.4 }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="muted demo-note">נתוני הדגמה. בציר הזמן האמיתי מוצגות התצפיות שהוזנו בפועל.</p>
            </div>
            <div className="results-list">
              {RESULTS.map((r) => (
                <div className="panel result" key={r.k}>
                  <span className="label">{r.k}</span>
                  <h3>{r.title}</h3>
                  <p>{r.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="row cta-row">
            <Link className="btn btn-primary" to="/plan">
              להתחיל במפגש הראשון
            </Link>
            <Link className="btn" to="/evidence">
              לראיות ולמקורות
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
