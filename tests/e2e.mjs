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

const db = { tipul_clients: [], tipul_sessions: [], tipul_observations: [], tipul_artworks: [], tipul_practice: [], tipul_home_links: [], tipul_home_submissions: [] }
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
  if (url.pathname.includes('/rpc/')) {
    const body = JSON.parse(req.postData() || '{}')
    requests.push(`RPC ${table}`)
    const link = db.tipul_home_links.find((l) => l.token === body.p_token)
    if (table === 'tipul_home_get')
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(link ? { ...link, open: link.active, submitted: db.tipul_home_submissions.filter((x) => x.link_id === link.id).length } : null),
      })
    if (table === 'tipul_home_submit') {
      if (!link || !body.p_image_path.startsWith(`home/${body.p_token}/`)) return route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"bad"}' })
      const row = { id: uuid(), therapist_id: UID, client_id: link.client_id, link_id: link.id, image_path: body.p_image_path, process: body.p_process, reflections: body.p_reflections, session_id: null, created_at: new Date().toISOString() }
      db.tipul_home_submissions.push(row)
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(row.id) })
    }
    return route.fulfill({ status: 404, body: '{}' })
  }
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
    if (table === 'tipul_home_submissions' || table === 'tipul_home_links') list = [...list].reverse()
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
      ...(table === 'tipul_home_links' ? { token: `tok${seq}abc`, active: true, max_submissions: 3, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() } : {}),
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
      if (p.includes('/home/') && !db.tipul_home_links.some((l) => p.includes(`/home/${l.token}/`))) return route.fulfill({ status: 403, body: '{}' })
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
  ok(await page.locator('[data-testid=copy-link]').count() === 0, 'בסרגל רואים רק את הלוגו, בלי כפתורים')
  ok((await page.locator('[data-testid=anat-button]').innerText()).includes("אד' ענת שטיבלמן"), 'כפתור הלוגו של ענת מוצג')
  await page.locator('[data-testid=anat-button]').click()
  const inLogo = await page.evaluate(() => {
    const logo = document.querySelector('[data-testid=anat-menu]')
    return ['copy-link', 'dev-chat', 'research', 'auth-btn'].every((id) => logo?.contains(document.querySelector(`[data-testid=${id}]`)))
  })
  ok(inLogo, 'לחיצה על הלוגו פותחת את כל כפתורי המערכת והכניסה')
  await page.keyboard.press('Escape')
  ok(await page.locator('[data-testid=anat-menu]').count() === 0, 'Escape סוגר את התפריט')
  await page.locator('[data-testid=anat-button]').click()
  const radius = await page.locator('[data-testid=copy-link]').evaluate((el) => getComputedStyle(el).borderRadius)
  ok(radius === '0px', `כפתורים מרובעים (border-radius ${radius})`)
  ok((await page.locator('[data-testid=dev-chat]').getAttribute('href')).includes('claude.ai/code/session_'), 'שיחת הפיתוח מקשרת לשיחה')
  ok((await page.locator('[data-testid=research]').getAttribute('href')) === 'https://claude.ai/chat/61b5f6c0-8394-4c37-a232-4fed2c479392', 'פרויקט המחקר מקשר לפרויקט')

  for (const id of ['vision', 'goal', 'tools', 'results']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.evaluate((i) => document.getElementById(i).scrollIntoView({ block: 'center' }), id)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: OUT + `home-desktop-${id}.png` })
  }
  ok(await page.locator('.chapter-rail a.on').count() === 1, 'מסילת הפרקים מסמנת פרק פעיל')

  if (!(await page.locator('[data-testid=anat-menu]').count())) await page.locator('[data-testid=anat-button]').click()
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
  await page.locator('[data-testid=anat-button]').click()
  await page.locator('[data-testid=auth-btn]').click()
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
  await page.waitForSelector('a[href^="/clients/"]')
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

  await page.locator('[data-testid=anat-button]').click()
  await page.locator('[data-testid=auth-btn]').click()
  await page.locator('[data-testid=anat-button]').click()
  await page.waitForSelector('[data-testid=auth-btn]:has-text("כניסה")')
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

// ---------- סטודיו וערוץ הבית ----------
async function draw(page, tool) {
  if (tool) await page.locator(`[data-testid=tool-${tool}]`).click()
  await page.evaluate(() => document.querySelector('[data-testid=studio-canvas]').scrollIntoView({ block: 'start' }))
  const box = await page.locator('[data-testid=studio-canvas]').boundingBox()
  const cx = box.x + box.width / 2
  const cy = Math.max(box.y, 0) + Math.min(box.height / 2, 260)
  await page.mouse.move(cx - 120, cy - 40)
  await page.mouse.down()
  for (let i = 0; i <= 12; i++) await page.mouse.move(cx - 120 + i * 20, cy - 40 + Math.sin(i) * 30, { steps: 2 })
  await page.mouse.up()
  await page.waitForTimeout(150)
}

{
  console.log('studio and home channel')
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL', permissions: ['clipboard-read', 'clipboard-write'] })
  await mockSupabase(context)
  await context.addInitScript((s) => localStorage.setItem('tipulart-auth', JSON.stringify(s)), fakeSession)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => d.accept())

  // סטודיו פתוח לתרגול מתוך הספרייה
  await page.goto(BASE + '/library/clay')
  await page.locator('[data-testid=practice-studio]').click()
  await page.waitForSelector('[data-testid=studio-canvas]')
  ok(await page.getByText('כדור, לחיצה, צורה').count() >= 1, 'סטודיו נפתח עם התרגיל מהספרייה')
  ok(await page.locator('[data-testid=studio-finish]').isDisabled(), 'סיום חסום לפני הקו הראשון')
  for (const t of ['charcoal', 'wet', 'smudge', 'eraser']) await draw(page, t)
  await page.locator('.swatch').nth(1).click()
  await draw(page, 'wet')
  await page.screenshot({ path: OUT + 'studio.png' })
  await page.locator('[data-testid=studio-finish]').click()
  await page.waitForSelector('[data-testid=process-view]')
  const strokesShown = await page.locator('.metric').nth(3).locator('b').innerText()
  ok(strokesShown === '5', `תמונת התהליך סופרת 5 קווים (${strokesShown})`)
  await page.locator('[data-testid=replay]').click()
  await page.waitForTimeout(500)
  ok(true, 'שחזור התהליך רץ')
  await page.screenshot({ path: OUT + 'studio-process.png', fullPage: true })

  // מטפלת יוצרת קישור לבית
  const clientId = db.tipul_clients[0].id
  await page.goto(BASE + `/clients/${clientId}`)
  await page.waitForSelector('[data-testid=home-channel]')
  await page.locator('[data-testid=home-tech]').selectOption('mandala')
  ok((await page.locator('[data-testid=home-instructions]').inputValue()).includes('עיגול'), 'ההנחיה נטענת מהתרגיל')
  await page.locator('[data-testid=home-create]').click()
  await page.waitForSelector('[data-testid=home-copy]')
  ok(requests.some((r) => r.startsWith('POST tipul_home_links')), 'יצירת קישור שולחת POST')
  const link = db.tipul_home_links[0]
  ok((await page.evaluate(() => navigator.clipboard.readText())).endsWith(`/home/${link.token}`), 'הקישור הועתק')

  // מטופל/ת בבית, בלי חשבון
  const anon = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
  await mockSupabase(anon)
  const pp = await anon.newPage()
  pp.on('pageerror', (e) => errors.push(e.message))
  await pp.goto(BASE + `/home/${link.token}`)
  await pp.waitForSelector('[data-testid=studio-canvas]')
  ok(await pp.locator('.main-nav').count() === 0, 'דף המטופל/ת: בלי ניווט של המטפלת')
  await pp.locator('[data-testid=anat-button]').click()
  ok(await pp.locator('[data-testid=dev-chat]').count() === 0, 'דף המטופל/ת: הלוגו בלי כפתורי עריכה')
  ok(await pp.getByText('1201').count() >= 1, 'דף המטופל/ת: מספר ער"ן מוצג')
  await draw(pp, 'charcoal')
  await draw(pp, 'wet')
  await pp.locator('[data-testid=studio-finish]').click()
  await pp.locator('[data-testid=answer-0]').fill('מהמרכז, לאט')
  ok(await pp.locator('[data-testid=send-home]').isDisabled(), 'שליחה חסומה עד הסכמה')
  await pp.locator('[data-testid=consent]').check()
  await pp.screenshot({ path: OUT + 'home-patient.png', fullPage: true })
  await pp.locator('[data-testid=send-home]').click()
  await pp.waitForSelector('text=היצירה נשלחה')
  ok(requests.some((r) => r.startsWith(`UPLOAD /storage/v1/object/tipul-artworks/home/${link.token}/`)), 'התמונה הועלתה לתיקיית הקישור')
  ok(requests.includes('RPC tipul_home_submit'), 'השליחה עוברת בפונקציה המאובטחת')
  const sub = db.tipul_home_submissions[0]
  ok(sub?.process?.summary?.strokes === 2 && sub.reflections[0].a === 'מהמרכז, לאט', 'נתוני התהליך והתשובות נשמרו')
  await anon.close()

  // מטפלת רואה, פותחת כמפגש ורושמת תצפית
  await page.reload()
  await page.waitForSelector('[data-testid=home-submission]')
  ok(await page.locator('[data-testid=home-submission] [data-testid=process-view]').count() === 1, 'היצירה מהבית מוצגת עם תמונת תהליך')
  await page.screenshot({ path: OUT + 'home-therapist.png', fullPage: true })
  await page.locator('[data-testid=to-session]').click()
  await page.waitForURL(/\/sessions\//)
  await page.waitForSelector('[data-testid=process-view]')
  ok(db.tipul_artworks.some((a) => a.storage_path === sub.image_path && a.process), 'המפגש נוצר עם היצירה ונתוני התהליך')
  ok(db.tipul_home_submissions[0].session_id, 'היצירה מהבית מקושרת למפגש')

  // סטודיו בתוך מפגש
  await page.locator('[data-testid=open-studio]').click()
  await page.waitForSelector('[data-testid=studio-canvas]')
  await draw(page, 'charcoal')
  await page.locator('[data-testid=studio-finish]').click()
  await page.locator('[data-testid=save-studio]').click()
  await page.waitForURL(/\/sessions\//)
  await page.waitForSelector('[data-testid=process-view]')
  ok(db.tipul_artworks.filter((a) => a.process).length === 2, 'יצירה מהסטודיו נשמרה ליומן עם התהליך')
  ok(errors.length === 0, `אין שגיאות ${errors.join(' | ')}`)

  // נייד
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'he-IL' })
  await mockSupabase(mob)
  const mp = await mob.newPage()
  for (const pth of ['/studio', `/home/${link.token}`]) {
    await mp.goto(BASE + pth)
    await mp.waitForTimeout(800)
    await noHorizontalScroll(mp, pth)
  }
  await mp.goto(BASE + '/studio')
  await mp.waitForTimeout(500)
  await mp.screenshot({ path: OUT + 'studio-mobile.png', fullPage: true })
  await mob.close()
  await context.close()
}

await browser.close()
console.log(failures ? `\n${failures} failures` : '\nall green')
process.exit(failures ? 1 : 0)
