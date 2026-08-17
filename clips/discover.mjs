#!/usr/bin/env node
/**
 * Mental Podcast Show — YouTube discovery CLI
 * Implements pipeline steps 1–6 (CLIP-PIPELINE.md): niche input, keyword
 * queries, YouTube discovery, high-view ranking, metadata and best-effort
 * captions. The pipeline clips OTHER channels in the niche.
 *
 * Usage:
 *   node clips/discover.mjs                    print niche config, keywords + queries (no network)
 *   node clips/discover.mjs --video <URL>      pull public metadata for one video
 *   node clips/discover.mjs --search [--cc]    run every niche query via the YouTube Data
 *                                              API (needs YT_API_KEY), rank by the rubric,
 *                                              and write clips/candidates.json
 *   node clips/discover.mjs --top [--cc] [--min-views 5000]
 *                                              find the HIGH-VIEW videos per keyword:
 *                                              sort by views, keep videos at/above
 *                                              --min-views (default from niche.json),
 *                                              and write clips/top-videos.json
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
const args = process.argv.slice(2);
const cmd = args[0];
const arg = args[1];
const flag = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : null;
};
const ccOnly = flag('--cc');
const minViews = parseInt(val('--min-views') || niche.performance.min_views, 10);

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

  // High numbers: views are the strongest performance signal in the niche.
  // log-scaled so a 10M-view video scores 1 and a 100-view video ~0.3.
  const engagement = Math.min(
    1,
    Math.log10((v.views || 0) + 1) / 7 + Math.log10((v.likes || 0) + 1) / 8
  );

  v.score = 0.4 * relevance + 0.15 * depth + 0.1 * recency + 0.1 * credibility + 0.25 * engagement;
  return v;
}

/* ---------- commands ---------- */

async function printConfig() {
  console.log('NICHE CONFIG (clips/niche.json)');
  console.log(JSON.stringify(niche, null, 2));
  console.log('\nKEYWORD PHRASES (pipeline step 2 — what the search matches against)');
  niche.keywords.forEach((k, i) => console.log(`${String(i + 1).padStart(2)}. ${k}`));
  console.log('\nSEARCH QUERIES (pipeline step 3 — what gets sent to YouTube)');
  niche.search_queries.forEach((q, i) => console.log(`${String(i + 1).padStart(2)}. ${q}`));
  console.log('\nPERFORMANCE TARGET');
  console.log(`  min_views: ${niche.performance.min_views.toLocaleString()}  ·  sort_by: ${niche.performance.sort_by}`);
  console.log('\nNext:');
  console.log('  node clips/discover.mjs --video <URL>                  pull metadata + numbers for one video');
  console.log('  YT_API_KEY=... node clips/discover.mjs --search        discover + rank candidates');
  console.log('  YT_API_KEY=... node clips/discover.mjs --top           HIGH-VIEW leaderboard per keyword');
  console.log('  YT_API_KEY=... node clips/discover.mjs --top --cc --min-views 5000');
  console.log('  node clips/discover.mjs --captions <URL>               best-effort public captions');
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
        video.likes = +(it.statistics && it.statistics.likeCount) || 0;
        video.comments = +(it.statistics && it.statistics.commentCount) || 0;
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

async function collect() {
  if (!key) {
    console.error('YT_API_KEY is not set. Get a free key at https://console.cloud.google.com/apis/credentials');
    console.error('and run:  YT_API_KEY=... node clips/discover.mjs --search [--cc]');
    console.error('         YT_API_KEY=... node clips/discover.mjs --top [--cc] [--min-views N]');
    console.error('\nWithout a key, open YouTube search manually for each query:');
    niche.search_queries.forEach((q) =>
      console.log(`  https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`)
    );
    console.error('\nTo find videos that are safe to clip, use the Creative Commons filter:');
    console.error('  https://www.youtube.com/results?search_query=mental+health+podcast&sp=EgIwAQ%253D%253D');
    process.exit(1);
  }

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
        const id = it.id && it.id.videoId;
        if (!id) continue;
        if (!seen.has(id)) {
          seen.set(id, {
            video_id: id,
            url: `https://www.youtube.com/watch?v=${id}`,
            title: s.title,
            channel: s.channelTitle,
            description: s.description || '',
            published_at: s.publishedAt || '',
            thumbnail: (s.thumbnails && s.thumbnails.medium && s.thumbnails.medium.url) || '',
            found_via: [q],
            status: 'discovered',
          });
        } else {
          seen.get(id).found_via.push(q);
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
      v.likes = +(it.statistics && it.statistics.likeCount) || 0;
      v.comments = +(it.statistics && it.statistics.commentCount) || 0;
      v.license = it.status && it.status.license === 'creativeCommon' ? 'creative_commons' : 'standard';
    }
  }

  return [...seen.values()]
    .map((v) => rank(v, niche.published_after))
    .filter((v) => v.status !== 'excluded-own-channel');
}

async function search() {
  const candidates = (await collect()).sort((a, b) => b.score - a.score).slice(0, niche.video_limit);
  const out = join(here, 'candidates.json');
  await writeFile(out, JSON.stringify(candidates, null, 2) + '\n');
  console.log(`\nRanked ${candidates.length} candidates → ${out}`);
  candidates.forEach((v, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${(v.score * 100).toFixed(0).padStart(3)}%  ${v.title}  (${v.channel}, ${
        v.duration_seconds ? fmtTime(v.duration_seconds) : '—'
      }, ${(v.views || 0).toLocaleString()} views${v.license === 'creative_commons' ? ', CC' : ''})`
    )
  );
  console.log(`\nRIGHTS: only publish clips where rights_status is "creative_commons" or "permission_granted".`);
  console.log(`CC-tagged videos are marked above. For standard-licensed videos, get the creator's written`);
  console.log(`permission first and log it in ${niche.rights.permission_log}. Always credit the original channel.`);
}

async function top() {
  const list = (await collect()).sort((a, b) => (b.views || 0) - (a.views || 0));
  const above = list.filter((v) => (v.views || 0) >= minViews);
  const below = list.filter((v) => (v.views || 0) < minViews);

  const out = join(here, 'top-videos.json');
  await writeFile(out, JSON.stringify(above, null, 2) + '\n');

  console.log(`\nHIGH-VIEW LEADERBOARD — keywords in the niche, sorted by views (min ${minViews.toLocaleString()})`);
  console.log(`${above.length} videos above the threshold → ${out}`);
  above.forEach((v, i) =>
    console.log(
      `${String(i + 1).padStart(2)}. ${(v.views || 0).toLocaleString().padStart(10)} views  ${v.title}  (${v.channel} · ${(v.likes || 0).toLocaleString()} likes${v.license === 'creative_commons' ? ' · CC' : ''})` +
      `\n    keywords: ${(v.found_via || []).slice(0, 3).join(' · ')}`
    )
  );
  if (below.length) {
    console.log(`\n${below.length} more below ${minViews.toLocaleString()} views (kept in memory, not written).`);
    console.log(`Lower --min-views to include them:  node clips/discover.mjs --top --min-views 1000`);
  }
  console.log(`\nHigh views = the audience already watches these. Views never replace permission:`);
  console.log(`publish only clips with rights_status "creative_commons" or "permission_granted", and always`);
  console.log(`credit the original channel. Log permissions in ${niche.rights.permission_log}.`);
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
  else if (cmd === '--top') await top();
  else if (cmd === '--captions' && arg) await captions(arg);
  else await printConfig();
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
