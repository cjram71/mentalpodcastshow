#!/usr/bin/env node
/**
 * Mental Podcast Show — YouTube discovery CLI
 * Implements pipeline steps 1–6 (CLIP-PIPELINE.md): niche input, query
 * generation, YouTube discovery, ranking, metadata and best-effort captions.
 *
 * Usage:
 *   node clips/discover.mjs                    print niche config + queries (no network)
 *   node clips/discover.mjs --video <URL>      pull public metadata for one video
 *   node clips/discover.mjs --search           run every niche query via the YouTube Data
 *                                              API (needs YT_API_KEY), rank, and write
 *                                              clips/candidates.json
 *   node clips/discover.mjs --captions <URL>   best-effort public captions fetch
 *
 * The YouTube Data API key is read from the YT_API_KEY environment variable.
 * Without it, --video still works through YouTube's public oEmbed endpoint
 * (title, channel, thumbnail) and --captions through the public timedtext
 * endpoint when YouTube serves it.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const niche = JSON.parse(await readFile(join(here, 'niche.json'), 'utf8'));
const key = process.env.YT_API_KEY || '';
const [, , cmd, arg] = process.argv;

/* ---------- helpers ---------- */

function parseVideoId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isoDuration(d) {
  const m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : null;
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers: headers || {} });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

const fmtTime = (s) => {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};

/* ---------- ranking (pipeline step 4) ---------- */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function rank(v, publishedAfter) {
  // Never rank the show's own channel — the pipeline clips OTHER channels.
  const excluded = niche.exclude_channels.some((c) => norm(v.channel).includes(norm(c)));
  if (excluded) {
    v.status = 'excluded-own-channel';
    v.score = 0;
    return v;
  }

  const hay = `${v.title} ${v.description || ''}`.toLowerCase();
  let relevance = 0;
  for (const k of niche.topics.include) if (hay.includes(k)) relevance += 1;
  relevance = Math.min(1, relevance / 4);
  for (const k of niche.topics.exclude) if (hay.includes(k)) relevance -= 0.5;
  relevance = Math.max(0, relevance);

  const depth = Math.min(1, (v.description || '').split(/\s+/).length / 120);

  let recency = 0.5;
  if (v.published_at) {
    const ageDays = Math.max(0, (Date.now() - new Date(v.published_at).getTime()) / 86400000);
    recency = v.published_at >= publishedAfter ? Math.max(0, 1 - ageDays / 730) : 0;
  }

  // Creative Commons videos are the safest to clip; permission-based sources next.
  const credibility = v.license === 'creative_commons' ? 1 : 0.6;

  const engagement = Math.min(1, Math.log10((v.views || 0) + 1) / 6);

  v.score = 0.4 * relevance + 0.3 * depth + 0.1 * recency + 0.1 * credibility + 0.1 * engagement;
  return v;
}

/* ---------- commands ---------- */

async function printConfig() {
  console.log('NICHE CONFIG (clips/niche.json)');
  console.log(JSON.stringify(niche, null, 2));
  console.log('\nSEARCH QUERIES (pipeline step 2)');
  niche.search_queries.forEach((q, i) => console.log(`${String(i + 1).padStart(2)}. ${q}`));
  console.log('\nNext:');
  console.log('  node clips/discover.mjs --video <URL>     pull metadata for one video');
  console.log('  YT_API_KEY=... node clips/discover.mjs --search   discover + rank 30 candidates');
  console.log('  node clips/discover.mjs --captions <URL>  best-effort public captions');
}

async function pullVideo(url) {
  const id = parseVideoId(url);
  if (!id) throw new Error('Could not parse a YouTube video ID from that URL.');
  const canonical = `https://www.youtube.com/watch?v=${id}`;
  const video = {
    video_id: id,
    url: canonical,
    title: '',
    channel: '',
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    description: '',
    duration_seconds: null,
    published_at: '',
    views: null,
    status: 'discovered',
  };

  if (key) {
    try {
      const d = await getJson(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${id}&key=${key}`
      );
      const it = d.items && d.items[0];
      if (it) {
        video.title = it.snippet.title;
        video.channel = it.snippet.channelTitle;
        video.description = it.snippet.description || '';
        video.published_at = it.snippet.publishedAt || '';
        video.duration_seconds = isoDuration(it.contentDetails && it.contentDetails.duration);
        video.views = +(it.statistics && it.statistics.viewCount) || 0;
        video.thumbnail = (it.snippet.thumbnails && it.snippet.thumbnails.medium && it.snippet.thumbnails.medium.url) || video.thumbnail;
        video.license = it.status && it.status.license === 'creativeCommon' ? 'creative_commons' : 'standard';
      }
      console.log(`Pulled "${video.title}" via YouTube Data API.`);
      console.log(JSON.stringify(video, null, 2));
      return;
    } catch (e) {
      console.error(`Data API failed (${e.message}). Falling back to public oEmbed.`);
    }
  }

  try {
    const meta = await getJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`);
    video.title = meta.title || '';
    video.channel = meta.author_name || '';
    video.thumbnail = meta.thumbnail_url || video.thumbnail;
    console.log(`Pulled "${video.title}" via public oEmbed (no API key: no duration/description/views).`);
  } catch (e) {
    console.error(`oEmbed failed: ${e.message}`);
  }
  console.log(JSON.stringify(video, null, 2));
}

async function search() {
  if (!key) {
    console.error('YT_API_KEY is not set. Get a free key at https://console.cloud.google.com/apis/credentials');
    console.error('and run:  YT_API_KEY=... node clips/discover.mjs --search [--cc]');
    console.error('\nWithout a key, open YouTube search manually for each query:');
    niche.search_queries.forEach((q) =>
      console.log(`  https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`)
    );
    console.error('\nTo find videos that are safe to clip, use the Creative Commons filter:');
    console.error('  https://www.youtube.com/results?search_query=mental+health+podcast&sp=EgIwAQ%253D%253D');
    process.exit(1);
  }

  const ccOnly = process.argv.includes('--cc');
  const seen = new Map();
  for (const q of niche.search_queries) {
    console.log(`Searching: "${q}"${ccOnly ? ' (Creative Commons only)' : ''}`);
    try {
      const ccParam = ccOnly ? '&videoLicense=creativeCommon' : '';
      const d = await getJson(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&relevanceLanguage=en&q=${encodeURIComponent(q)}${ccParam}&key=${key}`
      );
      for (const it of d.items || []) {
        const s = it.snippet || {};
        if (!seen.has(it.id.videoId)) {
          seen.set(it.id.videoId, {
            video_id: it.id.videoId,
            url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
            title: s.title,
            channel: s.channelTitle,
            description: s.description || '',
            published_at: s.publishedAt || '',
            thumbnail: (s.thumbnails && s.thumbnails.medium && s.thumbnails.medium.url) || '',
            status: 'discovered',
          });
        }
      }
    } catch (e) {
      console.error(`  failed: ${e.message}`);
    }
  }

  const ids = [...seen.values()].map((v) => v.video_id).join(',');
  if (ids) {
    const d = await getJson(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,status&id=${ids}&key=${key}`
    );
    for (const it of d.items || []) {
      const v = seen.get(it.id);
      if (!v) continue;
      v.duration_seconds = isoDuration(it.contentDetails && it.contentDetails.duration);
      v.views = +(it.statistics && it.statistics.viewCount) || 0;
      v.license = it.status && it.status.license === 'creativeCommon' ? 'creative_commons' : 'standard';
    }
  }

  const candidates = [...seen.values()]
    .map((v) => rank(v, niche.published_after))
    .filter((v) => v.status !== 'excluded-own-channel')
    .sort((a, b) => b.score - a.score)
    .slice(0, niche.video_limit);

  const out = join(here, 'candidates.json');
  await writeFile(out, JSON.stringify(candidates, null, 2) + '\n');
  console.log(`\nRanked ${candidates.length} candidates → ${out}`);
  candidates.forEach((v, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${(v.score * 100).toFixed(0).padStart(3)}%  ${v.title}  (${v.channel}, ${
        v.duration_seconds ? fmtTime(v.duration_seconds) : '—'
      }, ${v.views || 0} views${v.license === 'creative_commons' ? ', CC' : ''})`
    )
  );
  console.log(`\nRIGHTS: only publish clips where rights_status is "creative_commons" or "permission_granted".`);
  console.log(`CC-tagged videos are marked above. For standard-licensed videos, get the creator's written`);
  console.log(`permission first and log it in ${niche.rights.permission_log}. Always credit the original channel.`);
}

async function captions(url) {
  const id = parseVideoId(url);
  if (!id) throw new Error('Could not parse a YouTube video ID from that URL.');
  const ua = { 'User-Agent': 'Mozilla/5.0 (compatible; MentalPodcastShowClipBot/1.0)' };

  const xml = async (qs) => {
    const res = await fetch(`https://www.youtube.com/api/timedtext?${qs}`, { headers: ua });
    return res.ok ? res.text() : '';
  };

  let body = await xml(`lang=en&v=${id}`);
  if (!body.includes('<transcript>')) {
    const list = await xml(`type=list&v=${id}`);
    const track = (list.match(/lang_code="([^"]+)"/) || [])[1];
    if (track) body = await xml(`lang=${encodeURIComponent(track)}&v=${id}`);
  }
  if (!body.includes('<transcript>')) {
    console.error('No public captions served by YouTube for this video.');
    console.error('Copy them manually instead: open the video → ⋯ → Show transcript → copy all.');
    console.error('Then paste into the Clip Studio on mentalpodcastshow.com or any AI tool with CLIP-PIPELINE.md.');
    process.exit(1);
  }

  const decode = (s) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  const lines = [...body.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)];
  for (const m of lines) {
    const t = Math.round(parseFloat(m[1]));
    console.log(`${fmtTime(t)} ${decode(m[2]).replace(/\s+/g, ' ').trim()}`);
  }
  console.error(`\n${lines.length} caption lines. Verify timestamps against the video before editing clips.`);
}

/* ---------- run ---------- */

try {
  if (cmd === '--video' && arg) await pullVideo(arg);
  else if (cmd === '--search') await search();
  else if (cmd === '--captions' && arg) await captions(arg);
  else await printConfig();
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
