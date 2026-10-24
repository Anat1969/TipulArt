// כל הגישה לנתונים עוברת כאן. RLS מבטיח שכל מטפלת רואה רק את הרשומות שלה.
import { supabase, ARTWORK_BUCKET } from './supabase'
import { compressImage } from './image'
import type { EtcLevel } from '../content/etc'

export type Client = {
  id: string
  code: string
  population: string | null
  goals: string | null
  created_at: string
}

export type Observation = { id: string; session_id: string; etc_level: EtcLevel; process_notes: string | null; created_at: string }
export type Artwork = { id: string; session_id: string; storage_path: string; caption: string | null; taken_at: string }

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
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  if (!uid) throw new Error('נדרשת כניסה')
  const blob = await compressImage(file)
  const path = `${uid}/${session_id}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from(ARTWORK_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (up.error) throw new Error(up.error.message)
  return check(
    await supabase.from('tipul_artworks').insert({ session_id, storage_path: path, caption: caption || null }).select().single(),
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
