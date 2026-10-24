// בדיקת קצה לקצה מול vite preview, עם מוקים לכל קריאות Supabase וסשן מזויף.
// הרצה: npm run build && (npx vite preview --port 4173 &) && node tests/e2e.mjs
import { createRequire } from 'node:module'
// Playwright מותקן גלובלית בסביבה, ולכן נטען דרך require.
const { chromium } = createRequire(import.meta.url)('playwright')
import fs from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const SB = 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
const OUT = new URL('./screens/', import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })

const UID = '11111111-1111-4111-8111-111111111111'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
let failures = 0
const ok = (cond, msg) => {
  if (cond) console.log('  pass', msg)
  else {
    failures++
    console.log('  FAIL', msg)
  }
}

const db = { tipul_clients: [], tipul_sessions: [], tipul_observations: [], tipul_artworks: [], tipul_practice: [] }
const requests = []
let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

function embedSession(s, withClient) {
  const out = {
    ...s,
    tipul_observations: db.tipul_observations.filter((o) => o.session_id === s.id),
    tipul_artworks: db.tipul_artworks.filter((a) => a.session_id === s.id),
  }
  if (withClient) {
    const c = db.tipul_clients.find((c) => c.id === s.client_id)
    out.tipul_clients = c && { id: c.id, code: c.code, population: c.population }
  }
  return out
}

function eqParam(url, key) {
  const v = url.searchParams.get(key)
  return v && v.startsWith('eq.') ? v.slice(3) : null
}

async function handleRest(route) {
  const req = route.request()
  const url = new URL(req.url())
  const table = url.pathname.split('/').pop()
  const method = req.method()
  const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
  requests.push(`${method} ${table}${url.search}`)
  const rows = db[table]
  if (!rows) return route.fulfill({ status: 404, body: '{}' })
  const json = (status, data) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(single && Array.isArray(data) ? data[0] : data) })

  if (method === 'GET') {
    let list = rows
    const id = eqParam(url, 'id')
    const clientId = eqParam(url, 'client_id')
    if (id) list = list.filter((r) => r.id === id)
    if (clientId) list = list.filter((r) => r.client_id === clientId)
    if (table === 'tipul_clients')
      list = list.map((c) => ({ ...c, tipul_sessions: [{ count: db.tipul_sessions.filter((s) => s.client_id === c.id).length }] }))
    if (table === 'tipul_sessions') list = list.map((s) => embedSession(s, (url.searchParams.get('select') || '').includes('tipul_clients')))
    return json(200, list)
  }
  if (method === 'POST') {
    const body = JSON.parse(req.postData() || '{}')
    const items = (Array.isArray(body) ? body : [body]).map((b) => ({
      id: uuid(),
      therapist_id: UID,
      created_at: new Date().toISOString(),
      ...b,
    }))
    if (table === 'tipul_clients' && items.some((i) => rows.some((r) => r.code === i.code)))
      return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'duplicate key value' }) })
    rows.push(...items)
    return json(201, items)
  }
  if (method === 'PATCH') {
    const id = eqParam(url, 'id')
    const body = JSON.parse(req.postData() || '{}')
    rows.filter((r) => r.id === id).forEach((r) => Object.assign(r, body))
    return route.fulfill({ status: 204, body: '' })
  }
  if (method === 'DELETE') {
    const id = eqParam(url, 'id') || eqParam(url, 'exercise_id')
    db[table] = rows.filter((r) => r.id !== id && r.exercise_id !== id)
    return route.fulfill({ status: 204, body: '' })
  }
  return route.fulfill({ status: 405, body: '{}' })
}

async function mockSupabase(context) {
  await context.route(`${SB}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const p = url.pathname
    if (p === '/auth/v1/settings')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ external: { google: false, email: true } }) })
    if (p === '/auth/v1/user')
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: UID, email: 'anat@example.com', aud: 'authenticated' }) })
    if (p === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' })
    if (p.startsWith('/rest/v1/')) return handleRest(route)
    if (p.startsWith('/storage/v1/object/sign/tipul-artworks/') && req.method() === 'GET') return route.fulfill({ contentType: 'image/png', body: PNG })
    if (p.startsWith('/storage/v1/object/sign/')) {
      requests.push(`SIGN ${p}`)
      const body = JSON.parse(req.postData() || '{}')
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify((body.paths || []).map((path) => ({ path, signedURL: `/object/sign/tipul-artworks/${path}?token=x`, error: null }))),
      })
    }
    if (p.startsWith('/storage/v1/object/tipul-artworks/') && req.method() === 'POST') {
      requests.push(`UPLOAD ${p}`)
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Key: p }) })
    }
    if (p.startsWith('/storage/v1/object/')) return route.fulfill({ contentType: 'application/json', body: '[]' })
    return route.fulfill({ status: 404, body: '{}' })
  })
}

const fakeSession = {
  access_token: 'fake.jwt.token',
  refresh_token: 'fake-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
  user: { id: UID, email: 'anat@example.com', aud: 'authenticated', role: 'authenticated' },
}

async function noHorizontalScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  ok(sw <= cw + 1, `${label}: אין גלילה אופקית (${sw} <= ${cw})`)
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

// ---------- שולחן עבודה, משתמשת לא מחוברת ----------
{
  console.log('desktop, logged out')
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', permissions: ['clipboard-read', 'clipboard-write'] })
  await mockSupabase(context)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('fonts.g') && errors.push(m.text()))

  await page.goto(BASE + '/')
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(1500)
  ok(await page.locator('canvas').count() === 1, 'סצנת תלת־ממד נטענה')
  await page.screenshot({ path: OUT + 'home-desktop-0.png' })

  // כפתורי מערכת מתחת ללוגו
  const logo = await page.locator('.brand').boundingBox()
  const sys = await page.locator('.sys-buttons').boundingBox()
  ok(sys.y >= logo.y + logo.height - 1, 'כפתורי המערכת מתחת ללוגו')
  const radius = await page.locator('[data-testid=copy-link]').evaluate((el) => getComputedStyle(el).borderRadius)
  ok(radius === '0px', `כפתורים מרובעים (border-radius ${radius})`)
  ok((await page.locator('[data-testid=dev-chat]').getAttribute('href')).includes('claude.ai/code/session_'), 'שיחת הפיתוח מקשרת לשיחה')
  ok((await page.locator('[data-testid=research]').getAttribute('aria-disabled')) === 'true', 'פרויקט המחקר מסומן כ־placeholder')

  for (const id of ['vision', 'goal', 'tools', 'results']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'center' }), id)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: OUT + `home-desktop-${id}.png` })
  }
  ok(await page.locator('.chapter-rail a.on').count() === 1, 'מסילת הפרקים מסמנת פרק פעיל')

  await page.locator('[data-testid=copy-link]').click()
  ok(await page.waitForSelector('[data-testid=copy-link]:has-text("הועתק")', { timeout: 3000 }).then(() => true, () => false), 'העתקת קישור מגיבה')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  ok(clip.startsWith(BASE), 'הקישור שהועתק הוא הכתובת הנוכחית')

  // התקנה
  const cdp = await context.newCDPSession(page)
  const inst = await cdp.send('Page.getInstallabilityErrors')
  ok(inst.installabilityErrors.length === 0, `אין שגיאות התקנה ${JSON.stringify(inst.installabilityErrors)}`)

  // ספרייה
  await page.getByRole('link', { name: 'ספרייה', exact: true }).first().click()
  await page.waitForSelector('text=ספריית טכניקות')
  await page.getByRole('button', { name: 'ויסות', exact: true }).click()
  ok(page.url().includes('goal=regulation'), 'סינון מטרה נשמר בכתובת')
  await page.getByRole('button', { name: 'ילדים', exact: true }).click()
  const n = await page.locator('.technique-card').count()
  ok(n >= 1, `סינון משולב מחזיר ${n} טכניקות`)
  await page.screenshot({ path: OUT + 'library.png', fullPage: true })
  await page.locator('.technique-card').first().click()
  await page.waitForSelector('text=שאלות לתהליך')
  ok(await page.getByText('כניסה כדי לסמן תרגול').count() === 1, 'דף טכניקה: תרגול דורש כניסה')
  await page.screenshot({ path: OUT + 'technique.png', fullPage: true })

  // מפת מטרות
  await page.getByRole('link', { name: 'מפת מטרות' }).click()
  for (const g of ['ביטוי', 'עיבוד אובדן', 'עבודה עם טראומה', 'עבודה עם ילדים', 'ויסות']) {
    await page.getByRole('tab', { name: g }).click()
    await page.waitForTimeout(450)
  }
  ok(page.url().includes('goal=regulation'), 'מפת מטרות: לשוניות מעדכנות כתובת')
  await page.screenshot({ path: OUT + 'map.png', fullPage: true })

  await page.getByRole('link', { name: 'ראיות' }).click()
  await page.waitForSelector('text=מסקנה מעשית')
  await page.screenshot({ path: OUT + 'evidence.png', fullPage: true })

  await page.getByRole('link', { name: 'מתכנן מפגש' }).click()
  ok(await page.waitForSelector('text=האזור הזה אישי', { timeout: 5000 }).then(() => true, () => false), 'מתכנן ללא כניסה מציג הסבר וכניסה')
  await page.locator('.account').getByRole('link', { name: 'כניסה' }).click()
  ok(await page.waitForSelector('input[type=password]', { timeout: 5000 }).then(() => true, () => false), 'דף כניסה עם אימייל וסיסמה')
  ok(await page.getByText('כניסה עם Google').count() === 0, 'Google כבוי: הכפתור מוסתר')

  await page.getByRole('link', { name: 'TipulArt, דף הבית' }).click()
  ok(new URL(page.url()).pathname === '/', 'שם האפליקציה מקשר לדף הבית')
  ok(errors.length === 0, `אין שגיאות בקונסול ${errors.join(' | ')}`)
  await context.close()
}

// ---------- שולחן עבודה, מחוברת: המסלול המרכזי ----------
{
  console.log('desktop, logged in: main path')
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'he-IL' })
  await mockSupabase(context)
  await context.addInitScript((s) => localStorage.setItem('tipulart-auth', JSON.stringify(s)), fakeSession)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  const t0 = Date.now()

  await page.goto(BASE + '/clients')
  await page.waitForSelector('text=מטופל/ת חדש/ה')
  await page.getByPlaceholder('מ-014').fill('מ-014')
  await page.locator('select.select').selectOption('ילדים')
  await page.getByRole('button', { name: 'הוספה' }).click()
  await page.waitForSelector('text=מ-014')
  ok(requests.some((r) => r.startsWith('POST tipul_clients')), 'יצירת מטופל/ת שולחת POST')
  await page.getByPlaceholder('מ-014').fill('מ-014')
  await page.getByRole('button', { name: 'הוספה' }).click()
  await page.waitForSelector('text=הקוד הזה כבר קיים')
  ok(true, 'קוד כפול מציג הודעה')

  await page.getByRole('link', { name: 'מתכנן מפגש' }).click()
  await page.waitForSelector('[data-testid=client-select] option:nth-child(2)', { state: 'attached' })
  await page.locator('[data-testid=client-select]').selectOption({ index: 1 })
  await page.getByRole('button', { name: 'ויסות', exact: true }).click()
  await page.locator('[data-testid=pick-clay]').click()
  ok((await page.locator('textarea').inputValue()).includes('תרגיל:'), 'התוכנית נכתבת מתוך התרגיל')
  await page.screenshot({ path: OUT + 'planner.png', fullPage: true })
  await page.locator('[data-testid=save-plan]').click()
  await page.waitForURL(/\/sessions\//)
  await page.waitForSelector('text=תצפית לפי רמות ETC')
  ok(requests.some((r) => r.startsWith('POST tipul_sessions')), 'שמירת תוכנית שולחת POST')

  await page.locator('[data-testid=mark-held]').click()
  await page.locator('[data-testid=session-notes]').fill('עבודה רציפה בחימר, קצב נשימה האט.')
  await page.locator('[data-testid=etc-kinesthetic_sensory]').click()
  await page.locator('[data-testid=etc-notes-kinesthetic_sensory]').fill('לישה ממושכת בשתי ידיים')
  await page.locator('[data-testid=etc-perceptual_affective]').click()
  await page.locator('[data-testid=artwork-file]').setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: PNG })
  await page.locator('[data-testid=save-journal]').click()
  await page.waitForSelector('text=תצפיות שנשמרו')
  ok(requests.some((r) => r.startsWith('PATCH tipul_sessions')), 'שמירת יומן שולחת PATCH')
  ok(requests.filter((r) => r.startsWith('POST tipul_observations')).length === 2, 'נשמרו שתי תצפיות')
  ok(requests.some((r) => r.startsWith(`UPLOAD /storage/v1/object/tipul-artworks/${UID}/`)), 'התמונה הועלתה לנתיב של המטפלת')
  ok(requests.some((r) => r.startsWith('POST tipul_artworks')), 'רשומת תמונה נוצרה')
  ok(requests.some((r) => r.startsWith('SIGN')), 'התמונה נפתחת דרך signed URL')
  await page.screenshot({ path: OUT + 'journal.png', fullPage: true })

  await page.getByRole('link', { name: 'לציר הזמן' }).click()
  await page.waitForSelector('.timeline li')
  ok(await page.locator('.strip-cell').count() === 4, 'ציר זמן: פס תצפיות לכל רמה')
  ok(await page.locator('.tl-thumbs img').count() === 1, 'ציר זמן: תמונה מוצגת')
  ok(await page.locator('.tl-thumbs img').evaluate((i) => i.complete && i.naturalWidth > 0), 'ציר זמן: התמונה נטענה מה־signed URL')
  const elapsed = (Date.now() - t0) / 1000
  ok(elapsed < 60, `המסלול המרכזי הסתיים ב־${elapsed.toFixed(1)} שניות`)
  await page.screenshot({ path: OUT + 'timeline.png', fullPage: true })

  await page.goto(BASE + '/library/clay')
  await page.locator('[data-testid=practice]').click()
  await page.waitForTimeout(300)
  ok(requests.some((r) => r.startsWith('POST tipul_practice')), 'סימון תרגול נשמר')
  ok((await page.locator('[data-testid=practice]').innerText()) === 'תרגלתי', 'כפתור התרגול מתעדכן')

  await page.getByRole('button', { name: 'יציאה' }).click()
  await page.waitForSelector('.account >> text=כניסה')
  ok(true, 'יציאה מחזירה כפתור כניסה')
  ok(errors.length === 0, `אין שגיאות דף ${errors.join(' | ')}`)
  await context.close()
}

// ---------- נייד ----------
{
  console.log('mobile')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL' })
  await mockSupabase(context)
  await context.addInitScript((s) => localStorage.setItem('tipulart-auth', JSON.stringify(s)), fakeSession)
  const page = await context.newPage()
  await page.goto(BASE + '/')
  await page.waitForTimeout(800)
  ok(await page.locator('canvas').count() === 0, 'נייד: תצוגה סטטית כברירת מחדל')
  await noHorizontalScroll(page, 'בית')
  await page.screenshot({ path: OUT + 'home-mobile.png', fullPage: true })
  await page.locator('[data-testid=enable-3d]').click()
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(1200)
  ok(true, 'נייד: הפעלת תלת־ממד ידנית')
  await page.screenshot({ path: OUT + 'home-mobile-3d.png' })
  await noHorizontalScroll(page, 'בית עם תלת־ממד')
  for (const p of ['/library', '/library/mandala', '/map', '/evidence', '/plan', '/clients', '/login']) {
    await page.goto(BASE + p)
    await page.waitForTimeout(700)
    await noHorizontalScroll(page, p)
  }
  await page.goto(BASE + '/library')
  await page.waitForTimeout(500)
  await page.screenshot({ path: OUT + 'library-mobile.png' })
  await context.close()
}

// ---------- הפחתת תנועה ----------
{
  console.log('reduced motion')
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  await mockSupabase(context)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + '/')
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.evaluate(() => document.getElementById('results').scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(800)
  ok(errors.length === 0, 'הפחתת תנועה: הסצנה פועלת ללא שגיאות')
  await context.close()
}

await browser.close()
console.log(failures ? `\n${failures} failures` : '\nall green')
process.exit(failures ? 1 : 0)
