# מודל נתונים ואבטחה

פרויקט Supabase המיועד: CULTURA-GH. מצבו טרם נבדק. לפני יצירת טבלאות: לוודא מול הפרויקט הקיים (`list_projects`), ואם אינו קיים או אינו מתאים, להציע יצירה חדשה.

## טבלאות

### therapists
- `id` uuid, מפתח ראשי, זהה ל-`auth.users.id`
- `display_name` text
- `created_at` timestamptz

### clients
- `id` uuid
- `therapist_id` uuid, מפתח זר ל-therapists
- `code` text: מזהה קוד בלבד, למשל "מ-014". ייחודי לכל מטפלת.
- `population` text: למשל ילדים, מבוגרים, קשישים, צעירים, אחר
- `goals` text: מטרות טיפוליות בניסוח כללי
- `created_at` timestamptz

אין עמודות שם, ת.ז., טלפון, אימייל או כתובת.

### techniques
- `id` uuid
- `name_he` text, `name_en` text
- `approach` text: נאומבורג, קרמר, רובין (פסיכודינמית, הומניסטית, פסיכו־חינוכית, מערכתית, אינטגרטיבית), או אחר
- `etc_level` text: קינסתטי/חושי, תפיסתי/רגשי, קוגניטיבי/סמלי, יצירתי
- `populations` text[]
- `description_he` text
- `evidence_level` text: לפי `docs/06-evidence-and-sources.md`
- `sources` jsonb
- `is_seed` boolean: רשומת זרע מהמסמך, או רשומה שהוזנה ידנית

הטבלה משותפת לכל המטפלות (ללא `therapist_id`), וקריאה בלבד לכולן. עריכה: רק לאדמין.

### exercises
- `id` uuid, `technique_id` uuid
- `title_he` text
- `instructions_he` text
- `materials` text[]
- `duration_min` int
- `observe_for` text: מה לשים לב אליו בתהליך
- `is_practice` boolean: תרגיל שהמטפלת מתרגלת בעצמה לפני שימוש

### sessions
- `id` uuid
- `therapist_id` uuid, `client_id` uuid
- `technique_id` uuid, אופציונלי
- `planned_at` timestamptz, `held_at` timestamptz
- `duration_min` int
- `plan_notes` text
- `session_notes` text

### observations
- `id` uuid
- `session_id` uuid
- `etc_level` text
- `process_notes` text: תיאור מה נצפה בתהליך
- `created_at` timestamptz

טופס התצפית מציג את רמות ETC לבחירה. הערות חופשיות בלבד, בלי ציון כמותי של מצב נפשי.

### artworks
- `id` uuid
- `session_id` uuid
- `storage_path` text: נתיב ב-bucket פרטי
- `caption` text
- `taken_at` timestamptz

## אחסון תמונות

- bucket פרטי בשם `artworks`.
- נתיב: `{therapist_id}/{session_id}/{uuid}.jpg`.
- גישה לתמונה דרך signed URL בתוקף קצר בלבד.
- דחיסה בצד הלקוח לפני העלאה.

## Row Level Security

- לכל טבלה עם `therapist_id`: מדיניות SELECT, INSERT, UPDATE, DELETE עם התנאי `therapist_id = auth.uid()`.
- `clients` ו-`sessions` ו-`observations` ו-`artworks`: בדיקה שגם המפתח הזר מצביע לרשומה של אותה מטפלת.
- `techniques` ו-`exercises`: SELECT לכל משתמש מחובר. כתיבה לאדמין בלבד.
- Storage: מדיניות לפי prefix של `therapist_id`.
- לפני סיום: להריץ `get_advisors` ולתקן כל אזהרה על RLS.

## פרטיות ורגולציה

- המידע כולל נתוני בריאות נפשית. לפני הפעלה בפועל יש לבדוק מול יועץ משפטי את חוק הגנת הפרטיות, התשמ"א–1981, ותקנותיו, ואת הדרישות לנתונים רגישים.
- מדיניות שמירה ומחיקה: טרם הוחלט (ראו `docs/07-open-questions.md`).
- הצפנה במנוחה: ברירת מחדל של Supabase. בדיקה מול ענת אם נדרשת הצפנה נוספת לשדות הערות.
- לוגים: אין לרשום תוכן הערות או נתיבי תמונות בלוגים.

## שדרוג עתידי למספר מטפלות

המודל כבר כולל `therapist_id` בכל טבלה רלוונטית ו-RLS לפיו. שדרוג יוסיף רק הרשמה ותפקידים. לא נדרש שינוי מבני.
