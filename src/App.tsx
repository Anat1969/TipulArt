import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import Home from './pages/Home'

const Library = lazy(() => import('./pages/Library'))
const Technique = lazy(() => import('./pages/Technique'))
const GoalMap = lazy(() => import('./pages/GoalMap'))
const Evidence = lazy(() => import('./pages/Evidence'))
const Login = lazy(() => import('./pages/Login'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientTimeline = lazy(() => import('./pages/ClientTimeline'))
const Planner = lazy(() => import('./pages/Planner'))
const SessionJournal = lazy(() => import('./pages/SessionJournal'))
const StudioPage = lazy(() => import('./pages/StudioPage'))
const HomeExercise = lazy(() => import('./pages/HomeExercise'))
const AssessmentInfo = lazy(() => import('./pages/assessment/AssessmentInfo'))
const AssessmentNew = lazy(() => import('./pages/assessment/AssessmentNew'))
const AssessmentDetail = lazy(() => import('./pages/assessment/AssessmentDetail'))

const TITLES: [RegExp, string][] = [
  [/^\/library\/.+/, 'טכניקה'],
  [/^\/library/, 'ספרייה'],
  [/^\/map/, 'מפת מטרות'],
  [/^\/evidence/, 'ראיות'],
  [/^\/plan/, 'מתכנן מפגש'],
  [/^\/clients\/.+/, 'ציר זמן'],
  [/^\/clients/, 'מטופלים'],
  [/^\/sessions/, 'יומן מפגש'],
  [/^\/login/, 'כניסה'],
  [/^\/studio/, 'סטודיו'],
  [/^\/assessment/, 'הערכה מובנית'],
  [/^\/home\//, 'תרגול בבית'],
]

function NotFound() {
  return (
    <div className="page">
      <h1>הדף לא נמצא</h1>
      <a className="btn" href="/">לדף הבית</a>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    const t = TITLES.find(([re]) => re.test(pathname))?.[1]
    document.title = t ? `${t} · TipulArt` : 'TipulArt · כלי עבודה לטיפול באמנות'
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <TopBar />
      <main id="main">
        <Suspense fallback={<div className="page"><p className="label">טוען</p></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:id" element={<Technique />} />
            <Route path="/map" element={<GoalMap />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/login" element={<Login />} />
            <Route path="/plan" element={<Planner />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientTimeline />} />
            <Route path="/sessions/:id" element={<SessionJournal />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/home/:token" element={<HomeExercise />} />
            <Route path="/assessment" element={<AssessmentInfo />} />
            <Route path="/assessment/new" element={<AssessmentNew />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
