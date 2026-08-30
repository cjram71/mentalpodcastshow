#!/usr/bin/env node
/**
 * classify.mjs — Phase 1c: classification job
 *
 * Reads unclassified episodes, classifies by topic/feeling/format/perspective,
 * stores results, and flags low-confidence items to the review queue.
 *
 * Run:  node classify.mjs
 * Idempotent: skips already-classified episodes.
 *
 * Uses sql.js (WASM SQLite). ALL statements go through db.run() with a
 * single params array — never prepared-statement .run() with spread args.
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
  throw new Error('No database found. Run migrate-existing.mjs first.');
}

// Apply schema (idempotent)
const schema = readFileSync(SCHEMA_PATH, 'utf8');
for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
  try { db.run(stmt); } catch {}
}

function nowISO() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

// ---- Keyword classifier (seed version; swappable for Haiku later) ----

const TOPIC_RULES = [
  { labels: ['ADHD'],         pattern: /adhd|attention\s*deficit/i },
  { labels: ['Anxiety'],      pattern: /anxiety|anxious|panic|calm|nervous|overwhelm/i },
  { labels: ['Depression'],   pattern: /depress|low\s*mood|ssri|electroc|antidepress/i },
  { labels: ['Trauma'],       pattern: /trauma|ptsd|post-traum|flashback|traumat/i },
  { labels: ['PTSD'],         pattern: /ptsd/i },
  { labels: ['Addiction'],    pattern: /addiction|addict|sober|substance/i },
  { labels: ['Mindfulness'],  pattern: /mindful|meditation|present\s*moment|breathwork/i },
  { labels: ['Stress'],       pattern: /stress|stressful|burn.?out|overload/i },
  { labels: ['Habits'],       pattern: /habit|routine|behaviour|behavior|change\s*habit/i },
  { labels: ['Relationships'],pattern: /relationship|partner|dating|marriage|divorce|relation/i },
  { labels: ['Parenting'],    pattern: /parent|parenting|child.?ren|family\s*life/i },
  { labels: ['Happiness'],    pattern: /happiness|happy|well.?being|gratitude|positive\s*psych/i },
  { labels: ['Psychology'],   pattern: /psycholog|research|study|science\s*of|peer.?reviewed/i },
  { labels: ['Research'],     pattern: /research|study|findings|data|evidence/i },
  { labels: ['Therapy'],      pattern: /therap|counsel|clinician|therapist|therapeutic|modality/i },
  { labels: ['Recovery'],     pattern: /recovery|recover|healing|healed/i },
  { labels: ['Neurodiversity'],pattern:/neurodiver|autism|autistic|asperger|neurodiverse/i },
  { labels: ['Identity'],     pattern: /identity|race|culture|gender|sexuality|belong|bipoc/i },
  { labels: ['Purpose'],      pattern: /purpose|meaning|existential|why\s*we|living\s*for/i },
  { labels: ['Personal growth'],pattern:/personal\s*growth|self.?help|self.?improve|growth|motivation/i },
  { labels: ['Work'],         pattern: /work|job|career|workplace/i },
  { labels: ['Humour'],       pattern: /humor|humour|funny|comedy|joke|laugh/i },
  { labels: ['Wellbeing'],    pattern: /well.?being|self.?care|sleep|diet|nutrition|exercise/i },
  { labels: ['Professional knowledge'], pattern: /professional|credential|licensed|phd|md\b|doctor|specialist|expert\s*guest/i },
];

const FEELING_RULES = [
  { label: 'I feel anxious',         pattern: /anxious|nervous|worry|panic|overwhelm/i },
  { label: 'I feel alone',            pattern: /alone|lone|isolat|lonely/i },
  { label: 'I feel low',              pattern: /low|depress|sad|grief|hopeless|struggle/i },
  { label: 'I want to understand myself', pattern: /understand|self.?discover|introspect|insight|learn\s*about/i },
  { label: 'I want expert explanations', pattern: /expert|explain|science|research|how\s*does|why\s*do|clinical/i },
  { label: 'I want honest stories',   pattern: /story|experience|lived|personal|honest|raw|interview|conversation/i },
  { label: 'I am supporting someone else', pattern: /support|family|friend|partner|caregiver|helping\s*someone/i },
  { label: 'My relationship is difficult', pattern: /relationship|relation|partner|dating|marriage|divorce|love|couples/i },
];

function classify(hay) {
  const topics = [];
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(hay) && !topics.includes(rule.labels[0])) {
      topics.push(rule.labels[0]);
    }
  }
  if (!topics.length) topics.push('Wellbeing');

  const feelings = [];
  for (const rule of FEELING_RULES) {
    if (rule.pattern.test(hay)) {
      feelings.push(rule.label);
    }
  }

  let format = 'Interviews';
  if (/webinar|expert|specialist|professional|clinician|therapist|speaker/i.test(hay)) format = 'Expert conversations';
  if (/guided|practice|exercise|meditation|walk.?through|tool|technique/i.test(hay)) format = 'Guided conversations';
  if (/narrative|story|documentary|series|deep\s*dive/i.test(hay)) format = 'Narrative and expert conversations';
  if (/story.?tell|sharing|personal\s*story|lived/i.test(hay) && /expert|professional|clinician|specialist/i.test(hay)) format = 'Stories and expert interviews';

  let perspective = 'Lived experience';
  if (/professional|credential|licensed|phd|md\b|doctor|specialist|expert|therapist|psycholog|psychiatr|counsel|coach/i.test(hay)) perspective = 'Professional-led';
  if (/professional|credential|expert|therapist|specialist/i.test(hay) && /personal|lived|experience|story/i.test(hay)) perspective = 'Mixed';

  const conf = topics.length >= 2 ? 'high' : (topics.length === 1 ? 'medium' : 'low');
  const confVal = conf === 'high' ? 0.8 : (conf === 'medium' ? 0.5 : 0.3);

  return { topics, feelings, format, perspective, confidence: conf, confVal };
}

// ---- Main ----

const unclassified = db.exec(
  `SELECT id, title, description FROM episodes
   WHERE classified_at IS NULL
   ORDER BY published_at DESC
   LIMIT 100`
);

if (!unclassified[0] || !unclassified[0].values.length) {
  console.log('No unclassified episodes.');
  db.close();
  process.exit(0);
}

const episodes = unclassified[0].values.map(([id, t, d]) => ({ id, title: t, description: d || '' }));
console.log(`Classifying ${episodes.length} unclassified episodes...`);

const startedAt = nowISO();
let topicCount = 0, feelingCount = 0, lowConfCount = 0;

for (const ep of episodes) {
  const h = (ep.title + ' ' + ep.description).toLowerCase();
  const c = classify(h);

  // Topics
  for (const t of c.topics) {
    db.run(
      `INSERT OR IGNORE INTO episode_topics (episode_id, topic_id, confidence, assigned_by)
       VALUES (?, (SELECT id FROM topics WHERE slug = ? OR label = ? LIMIT 1), ?, 'model:keyword@2026-08-30')`,
      [ep.id, t, t, c.confVal]
    );
    topicCount++;
  }

  // Feelings
  for (const f of c.feelings) {
    db.run(
      `INSERT OR IGNORE INTO episode_feelings (episode_id, feeling) VALUES (?, ?)`,
      [ep.id, f]
    );
    feelingCount++;
  }

  // Mark classified
  db.run(`UPDATE episodes SET classified_at = ? WHERE id = ?`, [nowISO(), ep.id]);

  if (c.confidence === 'low') lowConfCount++;
}

// Review queue for items with 0 topics assigned
const zeroTopics = db.exec(
  `SELECT e.id FROM episodes e
   WHERE e.classified_at IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM episode_topics WHERE episode_id = e.id)
   LIMIT 50`
);
if (zeroTopics[0]) {
  for (const [id] of zeroTopics[0].values) {
    db.run(
      `INSERT OR IGNORE INTO review_queue (entity_type, entity_id, reason, risk, created_at)
       VALUES ('episode', ?, 'low_confidence', 'low', ?)`,
      [id, nowISO()]
    );
  }
  console.log(`  Added ${zeroTopics[0].values.length} zero-topic items to review queue`);
} else {
  console.log(`  No zero-topic items.`);
}

// Log run
const finishedAt = nowISO();
db.run(
  `INSERT INTO runs (job, started_at, finished_at, items_in, items_out, cost_usd, status, error)
   VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
  ['classify', startedAt, finishedAt, episodes.length, episodes.length, 'ok', null]
);

// Persist
writeFileSync(DB_PATH, db.export());
db.close();

// Stats
console.log(`\n=== Classification complete ===`);
console.log(`  Episodes classified: ${episodes.length}`);
console.log(`  Topic assignments:   ${topicCount}`);
console.log(`  Feeling assignments: ${feelingCount}`);
console.log(`  Low-confidence:       ${lowConfCount}`);
