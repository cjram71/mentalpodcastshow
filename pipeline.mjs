#!/usr/bin/env node
/**
 * pipeline.mjs — Paperclip-triggered pipeline runner
 *
 * Thin wrapper that Paperclip agents call to run the full pipeline.
 * Usage: node pipeline.mjs [job]
 *   job: ingest  | classify  | both  (default: both)
 *
 * Each job writes its own run log entry. This is a thin orchestrator — the
 * real logic lives in ingest-rss.mjs and classify.mjs.
 */

import { spawn } from 'node:child_process';
import { resolve as pathResolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOB = process.argv[2] || 'both';

async function runJob(name) {
  return new Promise((done, fail) => {
    const child = spawn('node', [pathResolve(__dirname, `${name}.mjs`)], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: false,
    });
    child.on('close', (code) => {
      if (code === 0) done(code);
      else fail(new Error(`${name}.mjs exited with code ${code}`));
    });
    child.on('error', fail);
  });
}

(async () => {
  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║  Mental Podcast Show Pipeline   ║`);
  console.log(`║  Job: ${JOB.padEnd(18)}║`);
  console.log(`╚══════════════════════════════════╝\n`);

  if (JOB === 'ingest' || JOB === 'both') {
    try { await runJob('ingest-rss'); }
    catch (e) { console.error('Ingest failed:', e.message); process.exit(1); }
  }
  if (JOB === 'classify' || JOB === 'both') {
    try { await runJob('classify'); }
    catch (e) { console.error('Classify failed:', e.message); process.exit(1); }
  }

  console.log('\n✓ Pipeline complete.');
})();
