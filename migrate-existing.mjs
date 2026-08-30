#!/usr/bin/env node
/**
 * migrate-existing.mjs — Phase 1a data migration
 *
 * Reads the 10 podcasts from the hardcoded array in index.html and inserts
 * them as sources into the SQLite database. Converts the current static
 * directory into the first rows of the new data layer.
 *
 * Run:  node migrate-existing.mjs
 * After: check .data/mental.db with sqlite3 or the admin page.
 * Idempotent: safe to re-run — INSERT OR IGNORE skips existing rows.
 */

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '.data', 'mental.db');
const HTML_PATH = join(__dirname, 'index.html');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

// --- Load index.html, extract the podcasts array ---
const html = readFileSync(HTML_PATH, 'utf8');
const start = html.indexOf('const podcasts=[');
const end = html.indexOf('}];', start);
if (start < 0 || end < 0) throw new Error('Podcast data not found in index.html');
const body = html.slice(start + 'const podcasts='.length, end + 2);

// Parse: the array uses single-quoted JS object literals.
// Evaluate the array body safely in a function scope.
// eslint-disable-next-line no-new-func
const podcasts = Function('"use strict"; return (' + body + ')')();

console.log(`Found ${podcasts.length} podcasts in index.html`);

// --- Load or create database ---
const SQL = await initSqlJs();
let db;
if (existsSync(DB_PATH)) {
  db = new SQL.Database(readFileSync(DB_PATH));
} else {
  db = new SQL.Database();
}

// --- Apply schema ---
const schema = readFileSync(SCHEMA_PATH, 'utf8');
for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
  try { db.run(stmt); } catch (e) { console.warn('Schema skip:', e.message); }
}

// --- Insert sources ---
const insertSource = db.prepare(
  `INSERT OR IGNORE INTO sources (id, kind, name, canonical_url, feed_url,
   creator_name, language, rights_status, perspective, format, reviewed_at, active, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const now = new Date().toISOString().slice(0, 10);

const CANONICAL_PERSPECTIVES = new Set([
  'professional-led', 'lived-experience', 'mixed'
]);

for (const p of podcasts) {
  const rawPerspective = (p.perspective || '').toLowerCase().replace(/\s+/g, '-');
  // Map the site's varied perspective labels to the three canonical ones
  let perspective = rawPerspective;
  if (rawPerspective.includes('professional') || rawPerspective.includes('expert') || rawPerspective.includes('research') || rawPerspective.includes('clinician') || rawPerspective.includes('coach')) {
    perspective = 'professional-led';
  } else if (rawPerspective.includes('lived') || rawPerspective.includes('journalist') || rawPerspective.includes('host-led') || rawPerspective === 'personal') {
    perspective = 'lived-experience';
  } else if (rawPerspective.includes('mixed') || rawPerspective.includes('and')) {
    perspective = 'mixed';
  }

  insertSource.run(
    p.id,
    'podcast',
    p.title,
    p.official || '',
    '',
    p.host || '',
    'en',
    'LINK_ONLY',
    perspective,
    p.format || '',
    p.reviewed || null,
    1,
    now
  );
  console.log(`  Source: ${p.title} (${p.id}) — perspective: ${perspective}`);
}

// --- Seed one placeholder episode per source ---
const sources = db.exec('SELECT id, name FROM sources');
const insertEpisode = db.prepare(
  `INSERT OR IGNORE INTO episodes (source_id, title, description, url, published_at,
   duration_s, language, content_hash, view_count, classified_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const source of sources[0]?.values || []) {
  const [sid, sname] = source;
  insertEpisode.run(
    sid,
    `${sname} — first listed episode`,
    'Seed episode from existing directory listing.',
    `https://example.com/${sid}/1`,
    '2026-01-01T00:00:00Z',
    null, 'en', `${sid}-1`, null, null, now
  );
  console.log(`  Episode seed: ${sname}`);
}

// --- Seed the 27 canonical topics ---
const topicInsert = db.prepare(
  `INSERT OR IGNORE INTO topics (slug, label, parent_id, blurb)
   VALUES (?, ?, ?, ?)`
);

const TOPICS = [
  ['anxiety',         'Anxiety',            null, 'Podcasts about anxiety — generalised anxiety, social anxiety, panic attacks and the day-to-day experience of living with it.'],
  ['depression',      'Depression',         null, 'Podcasts about depression — low mood, loss of interest, and the range of ways people talk about living through it.'],
  ['trauma',          'Trauma',             null, 'Podcasts about trauma — PTSD, complex trauma, recovery and the therapies that address it.'],
  ['ptsd',            'PTSD',               null, 'Podcasts specifically about post-traumatic stress disorder — symptoms, treatment, and lived experience.'],
  ['addiction',       'Addiction',          null, 'Podcasts about addiction — substance use, behavioural addiction, recovery and harm reduction.'],
  ['adhd',            'ADHD',               null, 'Podcasts about ADHD — diagnosis, coping strategies, relationships and work.'],
  ['neurodiversity',  'Neurodiversity',     'adhd', 'Podcasts about neurodiversity more broadly — autism, dyslexia, and the full spectrum.'],
  ['ocd',             'OCD',                null, 'Podcasts about obsessive-compulsive disorder — intrusive thoughts, compulsions and treatment.'],
  ['panic',           'Panic',              null, 'Podcasts about panic attacks and panic disorder specifically.'],
  ['stress',          'Stress',             null, 'Podcasts about stress — work stress, burnout, nervous-system overload.'],
  ['mindfulness',     'Mindfulness',        null, 'Podcasts about mindfulness meditation, presence and attention training.'],
  ['happiness',       'Happiness',          null, 'Podcasts about happiness science, positive psychology and wellbeing.'],
  ['wellbeing',       'Wellbeing',          null, 'Podcasts about general wellbeing — sleep, movement, nutrition and everyday habits.'],
  ['psychology',      'Psychology',         null, 'Podcasts about psychology as a discipline — theories, experiments and the research literature.'],
  ['research',        'Research',           null, 'Podcasts that centre peer-reviewed research and evidence-based discussion.'],
  ['therapy',         'Therapy',            null, 'Podcasts about psychotherapy — modalities, training, and what actually happens in session.'],
  ['recovery',        'Recovery',           null, 'Podcasts about recovery — from addiction, trauma, mental-health crises and life disruption.'],
  ['relationships',   'Relationships',      null, 'Podcasts about relationships — romantic, family, friendship and the difficulties inside them.'],
  ['parenting',       'Parenting',          null, 'Podcasts about parenting — mental health in families, raising children, parental burnout.'],
  ['work',            'Work',               null, 'Podcasts about work and mental health — burnout, boundaries, workplace culture.'],
  ['identity',        'Identity',           null, 'Podcasts about identity — race, gender, sexuality, culture and how they intersect with mental health.'],
  ['personal-growth', 'Personal growth',    null, 'Podcasts about personal growth — habits, purpose, self-understanding.'],
  ['purpose',         'Purpose',            null, 'Podcasts about meaning, purpose and the questions around why we do what we do.'],
  ['habits',          'Habits',             null, 'Podcasts about habits — building them, breaking them, the science of behaviour change.'],
  ['humour',          'Humour',             null, 'Podcasts that use humour as the primary lens — comedy, absurdity and lightness around hard topics.'],
  ['lived-experience','Lived experience',   null, 'Podcasts whose primary value is the host personal experience of mental health — not clinical expertise.'],
  ['professional-knowledge','Professional knowledge', null, 'Podcasts aimed at professionals — clinicians, coaches, social workers and students.'],
];

for (const [slug, label, parent, blurb] of TOPICS) {
  topicInsert.run([slug, label, parent || null, blurb || null]);
}
console.log(`  Seeded ${TOPICS.length} topics`);

// --- Persist ---
writeFileSync(DB_PATH, db.export());
db.close();

console.log(`\nMigration complete. Database: ${DB_PATH}`);
console.log(`  Sources: ${sources[0]?.values?.length || 0}`);
console.log(`  Topics:  ${TOPICS.length}`);
console.log(`Run again: node migrate-existing.mjs  (idempotent)`);
