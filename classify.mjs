#!/usr/bin/env node
/**
 * classify.mjs — Phase 1c: classification job
 *
 * Reads unclassified episodes, classifies by topic/feeling/format/perspective,
 * stores results, and flags low-confidence items for review.
 *
 * Run:  node classify.mjs
 * Idempotent: skips already-classified episodes.
 */

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '.data', 'mental.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

const SQL = await initSqlJs();
let db;
if (existsSync(DB_PATH)) {
  db = new SQL.Database(readFileSync(DB_PATH));
} else {
  db = new SQL.Database();
}

const schema = readFileSync(SCHEMA_PATH, 'utf8');
for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
  try { db.run(stmt); } catch {}
}

function nowISO() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

// --- Classification rules (keyword-based, seed version) ---
// In production this calls Claude Haiku. For Phase 1 we use keyword matching.
// The pipeline structure is the same; the classifier is swappable.

function classifyEpisode(title, description) {
  const hay = (title + ' ' + (description || '')).toLowerCase();

  const topics = [];
  if (/adhd|attention\s*deficit|attention\s*deficiency/i.test(hay)) topics.push('ADHD');
  if (/anxiety|Anxious|anxious|panic|calm|nervous|overwhelm|anxiet/i.test(hay)) topics.push('Anxiety');
  if (/depress|low\s*mood|ssri|electroc|antidepress/i.test(hay)) topics.push('Depression');
  if (/trauma|ptsd|post-traum|flashback|traumat/i.test(hay)) topics.push('Trauma');
  if (/ptsd/i.test(hay) && !topics.includes('PTSD')) topics.push('PTSD');
  if (/addiction|addict|sober|recovery\s*from|substance/i.test(hay)) topics.push('Addiction');
  if (/mindful|meditation|present\s*moment|breathwork/i.test(hay)) topics.push('Mindfulness');
  if (/stress|stressful|burn.?out|overload/i.test(hay)) topics.push('Stress');
  if (/habit|routine|behaviour|behavior|change\s*habit/i.test(hay)) topics.push('Habits');
  if (/relationship|partner|dating|marriage|divorce|relation/i.test(hay)) topics.push('Relationships');
  if (/parent|parenting|child.?ren|family\s*life/i.test(hay)) topics.push('Parenting');
  if (/happiness|happy|well.?being|gratitude|positive\s*psych/i.test(hay)) topics.push('Happiness');
  if (/psycholog|research|study|science\s*of|peer.?reviewed/i.test(hay)) topics.push('Psychology');
  if (/research|study|findings|data|evidence/i.test(hay)) topics.push('Research');
  if (/therap|counsel|clinician|therapist|therapeutic|modality/i.test(hay)) topics.push('Therapy');
  if (/recovery|recover|healing|healed/i.test(hay)) topics.push('Recovery');
  if (/neurodiver|autism|autistic|asperger|neurodiverse/i.test(hay)) topics.push('Neurodiversity');
  if (/identity|race|culture|gender|sexuality|belong|bipoc/i.test(hay)) topics.push('Identity');
  if (/purpose|meaning|existential|why\s*we|living\s*for/i.test(hay)) topics.push('Purpose');
  if (/personal\s*growth|self.?help|self.?improve|growth|motivation/i.test(hay)) topics.push('Personal growth');
  if (/work|job|career|burn.?out\s*at\s*work|workplace/i.test(hay)) topics.push('Work');
  if (/humor|humour|funny|comedy|joke|laugh/i.test(hay)) topics.push('Humour');
  if (/well.?being|self.?care|sleep|diet|nutrition|exercise/i.test(hay)) topics.push('Wellbeing');
  if (/professional|credential|licensed|phd|md\b|doctor|specialist|expert\s*guest/i.test(hay)) topics.push('Professional knowledge');
  if (!topics.length) topics.push('Wellbeing'); // default

  const feelings = [];
  if (/anxious|nervous|worry|panic|overwhelm/i.test(hay)) feelings.push('I feel anxious');
  if (/alone|lone|isolat|lonely/i.test(hay)) feelings.push('I feel alone');
  if (/low|depress|sad|grief|hopeless|struggle/i.test(hay)) feelings.push('I feel low');
  if (/understand|self.?discover|introspect|insight|learn\s*about/i.test(hay)) feelings.push('I want to understand myself');
  if (/expert|explain|science|research|how\s*does|why\s*do|clinical/i.test(hay)) feelings.push('I want expert explanations');
  if (/story|experience|lived|personal|honest|raw|interview|conversation/i.test(hay)) feelings.push('I want honest stories');
  if (/support|family|friend|partner|caregiver|helping\s*someone/i.test(hay)) feelings.push('I am supporting someone else');
  if (/relationship|relation|partner|dating|marriage|divorce|love|couples/i.test(hay)) feelings.push('My relationship is difficult');

  let format = 'Interviews';
  if (/webinar|expert|specialist|professional|clinician|therapist|speaker/i.test(hay)) format = 'Expert conversations';
  if (/guided|practice|exercise|meditation|walk.?through|tool|technique/i.test(hay)) format = 'Guided conversations';
  if (/narrative|story|documentary|series|deep\s*dive/i.test(hay)) format = 'Narrative and expert conversations';
  if (/story.?tell|sharing|personal\s*story|lived/i.test(hay) && /expert|professional|clinician|specialist/i.test(hay)) format = 'Stories and expert interviews';

  let perspective = 'Lived experience';
  if (/professional|credential|licensed|phd|md\b|doctor|specialist|expert|therapist|psycholog|psychiatr|counsel|coach/i.test(hay)) perspective = 'Professional-led';
  if (/professional|credential|expert|therapist|specialist/i.test(hay) && /personal|lived|experience|story/i.test(hay)) perspective = 'Mixed';

  const confidence = topics.length >= 2 ? 'high' : (topics.length === 1 ? 'medium' : 'low');
  const confVal = confidence === 'high' ? 0.8 : (confidence === 'medium' ? 0.5 : 0.3);

  return { topics, feelings, format, perspective, confidence, confVal };
}

// --- Fetch unclassified episodes ---
const unclassified = db.exec(
  `SELECT id, title, description FROM episodes
   WHERE classified_at IS NULL
   ORDER BY published_at DESC
   LIMIT 100`
);

if (!unclassified[0] || unclassified[0].values.length === 0) {
  console.log('No unclassified episodes.');
  process.exit(0);
}

const episodes = unclassified[0].values.map(([id, t, d]) => ({ id, title: t, description: d || '' }));
console.log(`Classifying ${episodes.length} unclassified episodes...`);

// --- Classify ---
const results = episodes.map(ep => {
  const c = classifyEpisode(ep.title, ep.description);
  return { episodeId: ep.id, ...c };
});

// --- Store ---
const topicInsertStmt = db.prepare(
  `INSERT OR IGNORE INTO episode_topics (episode_id, topic_id, confidence, assigned_by)
   VALUES (?, (SELECT id FROM topics WHERE slug = ? OR label = ?), ?, 'model:keyword@2026-08-30')`
);
// Wrapper that uses db.run with array params
function insertTopic(episodeId, topicLabel, confidence) {
  db.run(
    `INSERT OR IGNORE INTO episode_topics (episode_id, topic_id, confidence, assigned_by)
     VALUES (?, (SELECT id FROM topics WHERE slug = ? OR label = ?), ?, 'model:keyword@2026-08-30')`,
    [episodeId, topicLabel, topicLabel, confidence]
  );
}
const feelingInsert = db.prepare(
  `INSERT OR IGNORE INTO episode_feelings (episode_id, feeling) VALUES (?, ?)`
);
const epUpdate = db.prepare(`UPDATE episodes SET classified_at = ? WHERE id = ?`);

let lowConfCount = 0;
for (const r of results) {
  for (const t of r.topics) {
    insertTopic(r.episodeId, t, r.confidence);
  }
  for (const f of r.feelings) {
    db.run(`INSERT OR IGNORE INTO episode_feelings (episode_id, feeling) VALUES (?, ?)`, [r.episodeId, f]);
  }
  // Direct db.run for the update — spread params
  db.run(`UPDATE episodes SET classified_at = ? WHERE id = ?`, [nowISO(), r.episodeId]);
  if (r.confidence === 'low') lowConfCount++;
}

// --- Review queue for low-confidence ---
if (lowConfCount > 0) {
  const reviewInsert = db.prepare(
    `INSERT OR IGNORE INTO review_queue (entity_type, entity_id, reason, risk, created_at)
     VALUES ('episode', ?, 'low_confidence', 'low', ?)`
  );
  const lowItems = db.exec(
    `SELECT id FROM episodes WHERE classified_at IS NOT NULL AND id IN (
      SELECT episode_id FROM episode_topics GROUP BY episode_id HAVING COUNT(*) < 2
    ) LIMIT 20`
  );
  if (lowItems[0]) {
    for (const [id] of lowItems[0].values) {
      reviewInsert.run(id, nowISO());
    }
  }
  console.log(`  Added ${lowConfCount} low-confidence items to review queue`);
}

// --- Log run ---
const finishedAt = nowISO();
try {
  db.run(
    `INSERT INTO runs (job, started_at, finished_at, items_in, items_out, cost_usd, status, error)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
    ['classify', nowISO(), finishedAt, episodes.length, episodes.length, 'ok', null]
  );
} catch (e) { console.warn('Run log failed:', e.message); }

writeFileSync(DB_PATH, db.export());

// --- Stats ---
const totalEps = db.exec('SELECT COUNT(*) as c FROM episodes')[0].values[0][0];
const classified = db.exec('SELECT COUNT(*) as c FROM episodes WHERE classified_at IS NOT NULL')[0].values[0][0];
const unclass = db.exec('SELECT COUNT(*) as c FROM episodes WHERE classified_at IS NULL')[0].values[0][0];
const topicCount = db.exec('SELECT COUNT(*) as c FROM episode_topics')[0].values[0][0];
const feelingCount = db.exec('SELECT COUNT(*) as c FROM episode_feelings')[0].values[0][0];
const reviewCount = db.exec('SELECT COUNT(*) as c FROM review_queue')[0].values[0][0];

console.log(`\n=== Classification complete ===`);
console.log(`  Episodes classified: ${episodes.length}`);
console.log(`  Total episodes:      ${totalEps}`);
console.log(`  Classified:          ${classified}`);
console.log(`  Unclassified:        ${unclass}`);
console.log(`  Topic assignments:   ${topicCount}`);
console.log(`  Feeling assignments: ${feelingCount}`);
console.log(`  Items in review:     ${reviewCount}`);
