// כל הגישה לנתונים עוברת כאן. RLS מבטיח שכל מטפלת רואה רק את הרשומות שלה.
import { supabase, ARTWORK_BUCKET } from './supabase'
import { compressImage } from './image'
import type { EtcLevel } from '../content/etc'
import type { ProcessRecord } from '../studio/engine'
import type { AiDraft, Computed, Ratings } from '../content/feats'

export type Client = {
  id: string
  code: string
  population: string | null
  goals: string | null
  created_at: string
}

export type Observation = { id: string; session_id: string; etc_level: EtcLevel; process_notes: string | null; created_at: string }
export type Artwork = { id: string; session_id: string; storage_path: string; caption: string | null; taken_at: string; process?: ProcessRecord | null }

export type SessionRow = {
  id: string
  client_id: string
  technique_id: string | null
  goal: string | null
  planned_at: string | null
  held_at: string | null
  duration_min: number | null
  plan_notes: string | null
  session_notes: string | null
  created_at: string
  tipul_observations?: Observation[]
  tipul_artworks?: Artwork[]
  tipul_clients?: Pick<Client, 'id' | 'code' | 'population'>
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function listClients(): Promise<(Client & { tipul_sessions: { count: number }[] })[]> {
  return check(
    await supabase.from('tipul_clients').select('*, tipul_sessions(count)').order('code', { ascending: true }),
  )
}

export async function createClient(input: { code: string; population?: string; goals?: string }): Promise<Client> {
  return check(await supabase.from('tipul_clients').insert(input).select().single())
}

export async function getClient(id: string): Promise<Client> {
  return check(await supabase.from('tipul_clients').select('*').eq('id', id).single())
}

export async function deleteClient(id: string) {
  check(await supabase.from('tipul_clients').delete().eq('id', id))
}

export async function listClientSessions(clientId: string): Promise<SessionRow[]> {
  return check(
    await supabase
      .from('tipul_sessions')
      .select('*, tipul_observations(*), tipul_artworks(*)')
      .eq('client_id', clientId)
      .order('planned_at', { ascending: true, nullsFirst: false }),
  )
}

export async function listRecentSessions(limit = 8): Promise<SessionRow[]> {
  return check(
    await supabase
      .from('tipul_sessions')
      .select('*, tipul_clients(id, code, population)')
      .order('planned_at', { ascending: false, nullsFirst: false })
      .limit(limit),
  )
}

export async function createSession(input: {
  client_id: string
  technique_id?: string | null
  goal?: string | null
  planned_at?: string | null
  duration_min?: number | null
  plan_notes?: string | null
}): Promise<SessionRow> {
  return check(await supabase.from('tipul_sessions').insert(input).select().single())
}

export async function getSession(id: string): Promise<SessionRow> {
  return check(
    await supabase
      .from('tipul_sessions')
      .select('*, tipul_observations(*), tipul_artworks(*), tipul_clients(id, code, population)')
      .eq('id', id)
      .single(),
  )
}

export async function updateSession(id: string, patch: Partial<Pick<SessionRow, 'held_at' | 'session_notes' | 'plan_notes' | 'duration_min' | 'planned_at'>>) {
  check(await supabase.from('tipul_sessions').update(patch).eq('id', id))
}

export async function deleteSession(id: string) {
  check(await supabase.from('tipul_sessions').delete().eq('id', id))
}

export async function addObservation(session_id: string, etc_level: EtcLevel, process_notes: string): Promise<Observation> {
  return check(await supabase.from('tipul_observations').insert({ session_id, etc_level, process_notes }).select().single())
}

export async function deleteObservation(id: string) {
  check(await supabase.from('tipul_observations').delete().eq('id', id))
}

export async function uploadArtwork(session_id: string, file: File, caption: string): Promise<Artwork> {
  return uploadArtworkBlob(session_id, await compressImage(file), caption, null)
}

// יצירה מהסטודיו: התמונה ונתוני התהליך נשמרים יחד.
export async function uploadArtworkBlob(session_id: string, blob: Blob, caption: string, process: ProcessRecord | null): Promise<Artwork> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  if (!uid) throw new Error('נדרשת כניסה')
  const path = `${uid}/${session_id}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(ARTWORK_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw new Error(up.error.message)
  return check(
    await supabase.from('tipul_artworks').insert({ session_id, storage_path: path, caption: caption || null, process }).select().single(),
  )
}

export async function deleteArtwork(a: Artwork) {
  await supabase.storage.from(ARTWORK_BUCKET).remove([a.storage_path])
  check(await supabase.from('tipul_artworks').delete().eq('id', a.id))
}

// signed URL בתוקף קצר בלבד.
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from(ARTWORK_BUCKET).createSignedUrls(paths, 300)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const d of data) if (d.signedUrl && d.path) out[d.path] = d.signedUrl
  return out
}

export async function listPractice(): Promise<string[]> {
  const rows = check(await supabase.from('tipul_practice').select('exercise_id'))
  return (rows as { exercise_id: string }[]).map((r) => r.exercise_id)
}

export async function setPractice(exercise_id: string, done: boolean) {
  if (done) check(await supabase.from('tipul_practice').upsert({ exercise_id }, { ignoreDuplicates: true }))
  else check(await supabase.from('tipul_practice').delete().eq('exercise_id', exercise_id))
}

// ---------- ערוץ הבית: תרגיל שנשלח למטופל/ת לפי קוד ----------
export type HomeLink = {
  id: string
  client_id: string
  token: string
  technique_id: string | null
  exercise_id: string | null
  instructions: string
  questions: string[]
  task: 'free' | 'ppat'
  max_submissions: number
  expires_at: string
  active: boolean
  created_at: string
}

export type HomeSubmission = {
  id: string
  client_id: string
  link_id: string
  image_path: string
  process: ProcessRecord | null
  reflections: { q: string; a: string }[] | null
  session_id: string | null
  created_at: string
}

export type HomePublic = {
  task: 'free' | 'ppat'
  technique_id: string | null
  exercise_id: string | null
  instructions: string
  questions: string[]
  expires_at: string
  open: boolean
  submitted: number
}

export const homeUrl = (token: string) => `${window.location.origin}/home/${token}`

export async function createHomeLink(input: {
  client_id: string
  technique_id?: string | null
  exercise_id?: string | null
  instructions: string
  questions: string[]
  task?: 'free' | 'ppat'
}): Promise<HomeLink> {
  return check(await supabase.from('tipul_home_links').insert(input).select().single())
}

export async function listHomeLinks(clientId: string): Promise<HomeLink[]> {
  return check(await supabase.from('tipul_home_links').select('*').eq('client_id', clientId).order('created_at', { ascending: false }))
}

export async function closeHomeLink(id: string) {
  check(await supabase.from('tipul_home_links').update({ active: false }).eq('id', id))
}

export async function listHomeSubmissions(clientId: string): Promise<HomeSubmission[]> {
  return check(
    await supabase.from('tipul_home_submissions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
  )
}

// עבודה מהבית הופכת למפגש ביומן, ושם המטפלת רושמת את התצפית שלה.
export async function submissionToSession(sub: HomeSubmission, link: HomeLink | undefined): Promise<string> {
  const s = await createSession({
    client_id: sub.client_id,
    technique_id: link?.technique_id ?? null,
    planned_at: sub.created_at,
    duration_min: sub.process ? Math.max(1, Math.round(sub.process.summary.totalSec / 60)) : null,
    plan_notes: link ? `עבודה מהבית. ההנחיה שנשלחה:\n${link.instructions}` : 'עבודה מהבית',
  })
  await updateSession(s.id, {
    held_at: sub.created_at,
    session_notes: (sub.reflections ?? []).filter((r) => r.a).map((r) => `${r.q}\n${r.a}`).join('\n\n') || null,
  })
  check(
    await supabase
      .from('tipul_artworks')
      .insert({ session_id: s.id, storage_path: sub.image_path, caption: 'עבודה מהבית', process: sub.process, taken_at: sub.created_at })
      .select()
      .single(),
  )
  check(await supabase.from('tipul_home_submissions').update({ session_id: s.id }).eq('id', sub.id))
  return s.id
}

// צד המטופל/ת: גישה לפי מפתח הקישור בלבד, בלי חשבון.
export async function getHomeExercise(token: string): Promise<HomePublic | null> {
  const { data, error } = await supabase.rpc('tipul_home_get', { p_token: token })
  if (error) throw new Error(error.message)
  return (data as HomePublic | null) ?? null
}

export async function markSubmission(id: string, session_id: string | null) {
  check(await supabase.from('tipul_home_submissions').update({ session_id }).eq('id', id))
}

export async function submitHomeWork(token: string, blob: Blob, process: ProcessRecord | null, reflections: { q: string; a: string }[]) {
  const path = `home/${token}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(ARTWORK_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw new Error(up.error.message)
  const { error } = await supabase.rpc('tipul_home_submit', { p_token: token, p_image_path: path, p_process: process, p_reflections: reflections })
  if (error) throw new Error(error.message)
}

// ---------- הערכה מובנית (FEATS) ----------
export type Assessment = {
  id: string
  client_id: string
  session_id: string | null
  image_path: string
  instrument: 'feats_ppat' | 'feats_free'
  mode: 'digital' | 'photo'
  computed: Computed | null
  process: ProcessRecord | null
  ai_draft: AiDraft | null
  ai_model: string | null
  ai_at: string | null
  ratings: Ratings | null
  notes: string | null
  status: 'draft' | 'final'
  created_at: string
  finalized_at: string | null
}

async function uploadToOwnFolder(blob: Blob, folder: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  if (!uid) throw new Error('נדרשת כניסה')
  const path = `${uid}/${folder}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(ARTWORK_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw new Error(up.error.message)
  return path
}

// הערכה חדשה: מפגש, יצירה ביומן ורשומת הערכה. התמונה נשמרת פעם אחת.
export async function createAssessment(input: {
  client_id: string
  instrument: Assessment['instrument']
  mode: Assessment['mode']
  blob?: Blob
  image_path?: string
  process: ProcessRecord | null
  computed: Computed | null
  session_id?: string | null
  held_at?: string
}): Promise<Assessment> {
  let sessionId = input.session_id ?? null
  if (!sessionId) {
    const s = await createSession({
      client_id: input.client_id,
      planned_at: input.held_at ?? new Date().toISOString(),
      duration_min: input.process ? Math.max(1, Math.round(input.process.summary.totalSec / 60)) : null,
      plan_notes: input.instrument === 'feats_ppat' ? 'הערכה מובנית: אדם קוטף תפוח מעץ (PPAT)' : 'הערכה מובנית: ציור חופשי',
    })
    await updateSession(s.id, { held_at: input.held_at ?? new Date().toISOString() })
    sessionId = s.id
  }
  const image_path = input.image_path ?? (await uploadToOwnFolder(input.blob!, sessionId))
  check(
    await supabase
      .from('tipul_artworks')
      .insert({ session_id: sessionId, storage_path: image_path, caption: input.instrument === 'feats_ppat' ? 'PPAT' : 'הערכה מובנית', process: input.process })
      .select()
      .single(),
  )
  return check(
    await supabase
      .from('tipul_assessments')
      .insert({
        client_id: input.client_id,
        session_id: sessionId,
        image_path,
        instrument: input.instrument,
        mode: input.mode,
        process: input.process,
        computed: input.computed,
      })
      .select()
      .single(),
  )
}

export async function getAssessment(id: string): Promise<Assessment> {
  return check(await supabase.from('tipul_assessments').select('*').eq('id', id).single())
}

export async function listAssessments(clientId: string): Promise<Assessment[]> {
  return check(await supabase.from('tipul_assessments').select('*').eq('client_id', clientId).order('created_at', { ascending: true }))
}

export async function listFinalAssessments(): Promise<Pick<Assessment, 'id' | 'ai_draft' | 'ratings' | 'instrument' | 'computed'>[]> {
  return check(await supabase.from('tipul_assessments').select('id, ai_draft, ratings, instrument, computed').eq('status', 'final'))
}

export async function requestAiDraft(id: string): Promise<Assessment> {
  const { data, error } = await supabase.functions.invoke('tipul-analyze', { body: { assessmentId: id } })
  if (error) {
    let msg = error.message
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) msg = body.error
    } catch {
      /* הודעת ברירת מחדל */
    }
    throw new Error(msg)
  }
  return (data as { assessment: Assessment }).assessment
}

export async function saveAssessment(id: string, patch: Partial<Pick<Assessment, 'ratings' | 'notes' | 'status' | 'finalized_at' | 'computed'>>) {
  check(await supabase.from('tipul_assessments').update(patch).eq('id', id))
}
