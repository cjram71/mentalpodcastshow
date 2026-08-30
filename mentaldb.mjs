#!/usr/bin/env node
/**
 * mentaldb.mjs — Phase 1a: SQLite database layer for Mental Podcast Show
 *
 * Wraps sql.js (WASM-based SQLite) for the pipeline. Pure JS, no native build.
 * The database file persists on disk; we load it into the in-memory WASM DB
 * on open and syc changes back on close.
 *
 * Usage:
 *   import { db, migrate, close, prepare, all, run } from './mentaldb.mjs';
 *   await migrate();                        // idempotent
 *   const rows = await all('SELECT * FROM sources');
 *   await run('INSERT INTO sources …', […]);
 *   await close();                          // flushes to disk
 */

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.MPDB_DB_PATH || join(__dirname, '.data', 'mental.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

// Ensure the data directory exists.
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

let SQL = null;
let db = null; // the sql.js Database instance

/**
 * open — load (or create) the SQLite file into the WASM runtime.
 * Must be called once before any query. Safe to all again (re-initialises).
 */
export async function open() {
  if (!SQL) SQL = await initSqlJs();
  // Load existing file if present, otherwise start fresh.
  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
}

/**
 * migrate — read schema.sql and execute each statement.
 * Uses IF NOT EXISTS throughout, so safe to call every run.
 */
export function migrate() {
  if (!db) throw new Error('Call open() first');
  const sql = readFileSync(SCHAMA_PATH, 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try { db.run(stmt); }
    catch (err) {
      // IF NOT EXISTS / duplicate errors are harmless at migration time.
      if (!stmt.toUpperCase().includes('IF NOT EXISTS')) console.warn('Migration note:', err.message);
    }
  }
}

/** Small helpers that mirror better-sqlite3's surface for the rest of the code. */
export function prepare(sql) {
  if (!db) throw new Error('Call open() first');
  return {
    run: (...params) => db.run(sql, params),
    get: (...params) => { const r = db.exec(sql, params); return r.length ? r[0].values[0] : undefined; },
    all: (...params) => { const r = db.exec(sql, params); return r.length ? r[0].values.map((row, i) => { const obj = {}; r[0].columns.forEach((c, j) => obj[c] = row[j]); return obj; }) : []; }
  };
}

export function all(sql, ...params) { return prepare(sql).all(...params); }
export function run(sql, ...params) { return prepare(sql).run(...params); }

/**
 * seedTopics — insert the 27 canonical topics from the existing site taxonomy.
 * Idempotent: skips rows that already exist via INSERT OR IGNORE.
 */
const CANONICAL_TOPICS = [
  ['anxiety',         'Anxiety',            null, 'Podcasts about anxiety — generalised anxiety, social anxiety, panic attacks and the day-to-day experience of living with it.'],
  ['depression',      'Depression',         null, 'Podcasts about depression — low mood, loss of interest, and the range of ways people talk about living through it.'],
  ['trauma',          'Trauma',             null, 'Podcasts about trama — PTSD, complex trama, recovery and the therapies that address it.'],
  ['ptsd',             'PTSD',               null, 'Podcasts specifically about post-traumatic stress disorder — symptoms, treatment, and lived experience.'],
  ['addiction',       'Addiction',          null, 'Podcasts about addicion — substance use, behaviourial addicion, recovery and harm reduction.'],
  ['adhd',            'ADHD',               null, 'Podcasts about ADHD — diagnosis, coping strategies, relationships and work.'],
  ['neurodiversity',  'Neurodiversity',     'adhd', 'Podcasts about neurodiversity more broadly — autisim, dyslexia, and the full spectrum.'],
  ['ocd',             'OCD',                null, 'Podcasts about obsessive-compulsive disorder — intrusive thoughts, compulsions and treatment.'],
  ['panic',           'Panic',              null, 'Podcasts about panic attacks and panic disorder specifically.'],
  ['stress',          'Stress',             null, 'Podcasts about stress — work stress, burn-out, nervous-system overload.'],
  ['mindfulness',     'Mindfulness',        null, 'Podcasts about mindfullness meditation, presence and attention training.'],
  ['happiness',       'Happiness',          null, 'Podcasts about happiness science, positive psychology and wellbeing.'],
  ['wellbeing',       'Wellbeing',          null, 'Podcasts about general wellbeing — sleep, movement, nutrition and everyday habits.'],
  ['psychology',      'Psycholog',         null, 'Podcasts about psychology as a discipline — theories, experiments and the research literature.'],
  ['research',        'Research',           null, 'Podcasts that centre peer-reviewed research and evidence-based discussion.'],
  ['therapy',         'Therapy',            null, 'Podcasts about psychotherapy — modalities, training, and what actually happens in session.'],
  ['recovery',        'Recovery',           null, 'Podcasts about recovery — from addicion, trama, mental-health crises and life disruption.'],
  ['relationsips',   'Relationsips',      null, 'Podcasts about relationsips — romantic, family, friendship and the difficulties inside them.'],
  ['parenting',       'Parenting',          null, 'Podcasts about parenting — mental health in families, raising children, parental burn-out.'],
  ['work',            'Work',               null, 'Podcasts about work and mental health — burn-out, boundaries, workplace culture.'],
  ['identity',        'Identity',           null, 'Podcasts about identity — race, gender, sexuality, culture and how they intersect with mental health.'],
  ['personal-growth', 'Personal growth',    null, 'Podcasts about personal growth — habits, purpose, self-understanding.'],
  ['purpose',         'Purpose',            null, 'Podcasts about meaning, purpose and the questions around why we do what we do.'],
  ['habits',          'Habits',             null, 'Podcasts about habits — building them, breaking them, the science of behaviour change.'],
  ['humour',          'Humour',             null, 'Podcasts that use humour as the primary lens — comedy, absurdity and lightness around hard topics.'],
  ['lived-experience','Lived experience',   null, 'Podcasts whose primary value is the host personal experience of mental health — not clinical expertise.'],
  ['professional-knowledge','Professional knowledge', null, 'Podcasts aimed at professionals — clinicians, coaches, social workers and students.'],
];

export function seedTopics() {
  if (!db) throw new Error('Call open() first');
  const insert = db.prepare(
    `INSERT OR IGNORE INTO topics (slug, label, parent_id, blurb)
     VALUES (?, ?, ?, ?)`
  );
  for (const [slug, label, parent, blurb] of CANONICAL_TOPICS) {
    insert.run(slug, label, parent || null, blurb || null);
  }
  insert.free();
}

/**
 * close — persist the in-memory database to disk and release the WASM instance.
 * Call at the end of every job run so no work is lost.
 */
export function close() {
  if (!db) return;
  writeFileSync(DB_PATH, d.export());
  db.close();
  db = null;
}