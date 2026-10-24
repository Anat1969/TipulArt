// TIPULART: טיוטת ניתוח צורני של יצירה לפי מבנה FEATS. הטיוטה אינה אבחנה ואינה פרשנות סמלית.
// המטפלת מדרגת סופית. ההסכמה בין הטיוטה לדירוג שלה נמדדת באפליקציה.
// Input: { assessmentId }. Auth: JWT של המטפלת. Text + vision: Claude (ANTHROPIC_API_KEY, shared project secret).
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const MODEL = "claude-opus-5-5";
const PER_HOUR = 40;

class UserError extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

const ITEMS: { id: string; he: string; en: string; low: string; high: string; ppatOnly?: boolean }[] = [
  { id: "prominence_of_color", he: "בולטות הצבע", en: "Prominence of Color", low: "אין צבע, או קו מתאר בלבד", high: "צבע ממלא את רוב הצורות והרקע" },
  { id: "color_fit", he: "התאמת הצבע", en: "Color Fit", low: "צבעים שאינם תואמים את המיוצג", high: "כל הצבעים תואמים את המיוצג", ppatOnly: true },
  { id: "implied_energy", he: "אנרגיה משתמעת", en: "Implied Energy", low: "מעט סימנים, מאמץ מינימלי", high: "עבודה עתירת סימנים ומאמץ ניכר" },
  { id: "space", he: "ניצול השטח", en: "Space", low: "פחות מעשירית הדף", high: "כמעט כל הדף" },
  { id: "integration", he: "אינטגרציה", en: "Integration", low: "רכיבים מפוזרים ללא קשר", high: "קומפוזיציה מאוזנת ושלמה" },
  { id: "logic", he: "היגיון", en: "Logic", low: "רכיבים רבים שאינם הגיוניים", high: "כל הרכיבים הגיוניים וקשורים" },
  { id: "realism", he: "ריאליזם", en: "Realism", low: "לא ניתן לזהות דבר", high: "מצויר באופן ריאליסטי ומפורט" },
  { id: "problem_solving", he: "פתרון בעיה", en: "Problem-Solving", low: "אין עדות לאופן השגת התפוח", high: "פתרון ברור והגיוני", ppatOnly: true },
  { id: "developmental_level", he: "רמה התפתחותית", en: "Developmental Level", low: "שרבוט של גיל הגן", high: "רמת ציור של מבוגר" },
  { id: "details", he: "פרטי עצמים וסביבה", en: "Details of Objects and Environment", low: "אין פרטים מעבר לנדרש", high: "שפע פרטים בעצמים ובסביבה" },
  { id: "line_quality", he: "איכות הקו", en: "Line Quality", low: "קו רועד, מקוטע או לא נשלט", high: "קו רציף, בטוח ושולט" },
  { id: "person", he: "דמות האדם", en: "Person", low: "אין דמות אדם", high: "דמות שלמה עם פרופורציות ופרטים", ppatOnly: true },
  { id: "rotation", he: "ישרות", en: "Rotation", low: "סיבוב או הטיה ניכרים", high: "זקוף, ללא סיבוב", ppatOnly: true },
  { id: "perseveration", he: "העדר חזרתיות", en: "Perseveration", low: "חזרתיות רבה ומכסה", high: "אין חזרתיות" },
];

const SYSTEM = `אתה עוזר דירוג להערכה מובנית בטיפול באמנות. אתה מדרג מאפיינים צורניים של ציור לפי מבנה הסולמות של FEATS (Formal Elements Art Therapy Scale, Gantt & Tabone).
המשתמשת היא מטפלת באמנות מוסמכת. הדירוג שלך הוא טיוטה שהיא בודקת ומתקנת פריט אחר פריט. ההסכמה בינך לבינה נמדדת כדי לבחון את מהימנות הכלי.

כללים מחייבים:
- מדרגים רק מה שנראה בתמונה. כל נימוק מצביע על מאפיין גלוי: מיקום, גודל, צבע, קו, שטח, פרטים.
- אין אבחנה, אין שם של הפרעה, אין הערכת מצב נפשי ואין פרשנות סמלית או השלכתית של התוכן. לא "מעיד על", לא "משקף", לא "מרמז".
- כשאי אפשר לדרג בביטחון (איכות צילום, חיתוך, תאורה), confidence נמוך ונימוק שמסביר למה.
- פריטים שמסומנים "PPAT בלבד" מדורגים רק במשימת PPAT. בציור חופשי: applicable=false, score=0.
- סולם 0 עד 5 לכל פריט. 0 הוא קצה "נמוך" ו-5 קצה "גבוה" לפי ההגדרות שלמטה.
- עברית טבעית, קצרה ומקצועית. בלי אימוג'י ובלי סימני קריאה.

הסולמות:
${ITEMS.map((i) => `- ${i.id}: ${i.he} (${i.en})${i.ppatOnly ? " [PPAT בלבד]" : ""}. 0 = ${i.low}. 5 = ${i.high}.`).join("\n")}`;

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "formal_description", "process_reading", "conversation_questions", "limitations"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "applicable", "score", "confidence", "rationale"],
        properties: {
          id: { type: "string", enum: ITEMS.map((i) => i.id) },
          applicable: { type: "boolean" },
          score: { type: "integer", enum: [0, 1, 2, 3, 4, 5] },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          rationale: str,
        },
      },
    },
    formal_description: str,
    process_reading: str,
    conversation_questions: { type: "array", items: str },
    limitations: { type: "array", items: str },
  },
};

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...SB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function processText(p: Record<string, unknown> | null) {
  const s = (p?.summary ?? null) as Record<string, unknown> | null;
  if (!s) return "אין נתוני תהליך (ציור על נייר שצולם).";
  const t = (s.toolSec ?? {}) as Record<string, number>;
  return `נתוני תהליך מהסטודיו הדיגיטלי: זמן כולל ${s.totalSec} שניות, ציור בפועל ${s.activeSec} שניות, עד הקו הראשון ${s.firstStrokeSec} שניות, ${s.strokes} קווים, ${s.pauses} עצירות מעל 5 שניות (הארוכה ${s.longestPauseSec} שניות), ${s.eraseStrokes} מחיקות, כיסוי ${s.coverage}%, ${s.centerShare}% מהסימון במרכז. זמן לפי כלי בשניות: ${JSON.stringify(t)}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: auth } });
    if (!u.ok) throw new UserError("נדרשת כניסה", 401);
    const user = await u.json();

    const body = await req.json().catch(() => ({}));
    const id = String(body.assessmentId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("הערכה לא תקינה");
    const [a] = await rest(`tipul_assessments?id=eq.${id}&therapist_id=eq.${user.id}&select=*`);
    if (!a) throw new UserError("ההערכה לא נמצאה", 404);
    if (a.status === "final") throw new UserError("ההערכה כבר נחתמה");

    const since = new Date(Date.now() - 3600_000).toISOString();
    const recent = await rest(`tipul_assessments?select=id&therapist_id=eq.${user.id}&ai_at=gte.${since}`);
    if ((recent?.length ?? 0) >= PER_HOUR) throw new UserError("הופקו הרבה ניתוחים בשעה האחרונה. אפשר לנסות שוב מאוחר יותר.", 429);

    const img = await fetch(`${SB_URL}/storage/v1/object/tipul-artworks/${a.image_path}`, { headers: SB });
    if (!img.ok) throw new UserError("התמונה לא נמצאה", 404);
    const mediaType = (img.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    const data = toBase64(await img.arrayBuffer());

    const ppat = a.instrument === "feats_ppat";
    const task = ppat
      ? 'משימה תקנית PPAT. ההנחיה שנאמרה: "צייר/י אדם קוטף תפוח מעץ."'
      : "ציור חופשי (לא משימה תקנית). פריטי PPAT בלבד: applicable=false.";

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
    if (!apiKey) throw new UserError("מפתח Claude לא מוגדר בשרת", 500);
    const client = new Anthropic({ apiKey });
    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            {
              type: "text",
              text: `${task}
מצב: ${a.mode === "photo" ? "צילום של ציור על נייר" : "ציור בסטודיו הדיגיטלי, טוש, דף 3:2"}.
${processText(a.process)}
מדדים ממוחשבים מהתמונה: ${JSON.stringify(a.computed ?? {})}

החזר:
- items: כל 14 הפריטים, פריט אחד לכל id, עם score, confidence ונימוק של משפט עד שניים שמצביע על מה שנראה.
- formal_description: תיאור צורני של העבודה, 4 עד 6 משפטים: קומפוזיציה, שימוש בשטח, צבע, קו, פרטים. בלי פרשנות.
- process_reading: מה נתוני התהליך מוסיפים לתיאור (קצב, עצירות, מחיקות, סדר), 2 עד 3 משפטים. אם אין נתונים, משפט שאומר זאת.
- conversation_questions: 3 שאלות פתוחות שהמטפלת יכולה לשאול על הציור, מבוססות על מה שנראה, בלי הנחה מה הוא אומר.
- limitations: מגבלות הדירוג במקרה הזה (איכות תמונה, גרסה דיגיטלית שטרם תוקפה מול המקור, פריטים שקשה לדרג).`,
            },
          ],
        }],
      } as never);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new UserError("עומס זמני, אפשר לנסות שוב בעוד דקה.", 429);
      if (err instanceof Anthropic.APIError) throw new UserError(`Claude API ${err.status}: ${err.message}`, 502);
      throw err;
    }
    // deno-lint-ignore no-explicit-any
    const resp = response as any;
    if (resp.stop_reason === "refusal") throw new UserError("הניתוח לא הופק עבור התמונה הזו. אפשר לדרג ידנית.", 422);
    if (resp.stop_reason === "max_tokens") throw new UserError("הניתוח נקטע. אפשר לנסות שוב.", 502);
    const text = resp.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    const draft = JSON.parse(text);

    // השלמה ואימות: פריט אחד לכל סולם, בסדר הקבוע
    const byId = new Map((draft.items ?? []).map((i: { id: string }) => [i.id, i]));
    draft.items = ITEMS.map((def) => {
      const it = byId.get(def.id) as Record<string, unknown> | undefined;
      const applicable = Boolean(it?.applicable ?? false) && (ppat || !def.ppatOnly);
      const score = Math.max(0, Math.min(5, Math.round(Number(it?.score ?? 0))));
      return { id: def.id, applicable, score, confidence: it?.confidence ?? "low", rationale: String(it?.rationale ?? "") };
    });

    const [saved] = await rest(`tipul_assessments?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_draft: draft, ai_model: resp.model ?? MODEL, ai_at: new Date().toISOString() }),
    });
    return json({ assessment: saved });
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }
});
