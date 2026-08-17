# Mental Podcast Show — YouTube Clipping Pipeline

The repeatable YouTube pipeline configured for **Mental Podcast Show** (mentalpodcastshow.com). It pulls videos **from other channels in the niche** — relationships, dating, sex, mental health and emotional-wellbeing conversations — and produces ready-to-edit **clip briefs** for publishing on the show's own channel ([@mentalpodcastshow](https://www.youtube.com/@mentalpodcastshow)), with the original creator's permission and credit.

Everything below is pre-filled for this workflow. Copy the **ready-to-paste prompt** at the bottom into any AI tool, or use the **Clip Studio** on the website (runs fully in the browser, no key required for single videos).

## 1. The niche

The show's own channel description defines the niche:

> "We are Here to Help everyone in the area of Dating, Relationships, Mental Health, and sex … we will always be truthful and real." — @mentalpodcastshow

**Primary niche — the conversations being clipped**

- Relationships, dating, first dates and expectations
- Baggage, heartbreak, moving on and letting go of the past
- Anxiety, stress, depression and reaching out for mental-health support
- Self-worth, confidence, boundaries and communication
- Motivation, personal growth and the people you surround yourself with
- Sex and intimacy (handled honestly, with advisories)

**Discovery niches — the directory topics that feed the show**
Anxiety · Depression · Trauma & PTSD · ADHD & neurodiversity · OCD · Addiction & recovery · Mindfulness & happiness · Grief · Therapy · Lived experience.

**Channel facts**

- Publishing channel (where clips go): `https://www.youtube.com/@mentalpodcastshow`
- Hosts: Sean and Heath
- Source channels (where clips come from): **any other channel in the niche** — the show's own channel is excluded from discovery.

## 2. Clipping other creators: permissions first

Reposting clips of other channels on your channel is only safe when the rights are clear. Before clipping any third-party video:

1. **Check the video's license.** Creative Commons videos are the safest: YouTube search filter → *Features → Creative Commons*, or the Data API `videoLicense=creativeCommon` (the `--cc` flag in the CLI and the checkbox in the Clip Studio). A CC license still requires attribution — always credit.
2. **Check the creator's policy.** Many podcasters state a clipping policy in their channel's About page or video descriptions ("clips welcome with credit", "no reposting"). Prefer creators who explicitly allow it.
3. **Ask for written permission.** For standard-licensed videos, message the creator (channel About → email/business contact). Keep the reply — a screenshot, email or DM link — and log it in `clips/permissions.json` (template: `clips/permissions.example.json`).
4. **Always credit.** Every clip caption names the original channel and links the full video, plus "via @mentalpodcastshow". Put an on-screen credit in the first seconds of the clip too.
5. **Without permission, the clip is research only** — do not publish it.

This is a rights workflow, not legal advice. Fair use is a defense decided in court, not a pre-checkbox; YouTube's reused-content rules and copyright claims still apply. When in doubt, ask the creator.

**Rights statuses used throughout the pipeline:**

| Status | Meaning | Can publish? |
| --- | --- | --- |
| `creative_commons` | Video carries a CC license | Yes, with attribution |
| `permission_granted` | Written permission recorded in `clips/permissions.json` | Yes, with credit |
| `permission_requested` | Asked, awaiting reply | No — wait |
| `needs_review` | Unknown or unclear | No — default for every new third-party video |

## 3. Step 1 — Niche input (pre-filled)

```json
{
  "niche": "Honest conversations about relationships, dating, sex, mental health and emotional wellbeing",
  "audience": "Adults 18–45 navigating dating, relationships, anxiety, stress, heartbreak and personal growth",
  "goal": "pull clips from OTHER channels in the niche and publish them on the Mental Podcast Show channel, always with the original creator's permission and credit",
  "publish_channel": "@mentalpodcastshow",
  "region": "United States",
  "language": "en",
  "video_limit": 30,
  "published_after": "2022-01-01",
  "exclude_channels": ["@mentalpodcastshow"],
  "rights": {
    "required": true,
    "prefer_creative_commons": true,
    "publish_only": ["creative_commons", "permission_granted"],
    "credit": "Credit: {channel} · Full video: {url} · via @mentalpodcastshow"
  },
  "topics": {
    "include": ["relationships", "dating", "first dates", "expectations", "baggage", "moving on", "heartbreak", "letting go of the past", "anxiety", "stress", "depression", "therapy", "reaching out for help", "self-worth", "confidence", "boundaries", "communication", "healing", "motivation", "personal growth", "sex and intimacy"],
    "exclude": ["diagnosis", "medication instructions", "professional medical advice", "explicit content"]
  },
  "clip_format": { "min_seconds": 15, "max_seconds": 60, "orientation": "vertical 9:16" }
}
```

The same config lives in `clips/niche.json` (used by the CLI) and in the Clip Studio on the website.

## 4. Step 2 — Search queries

Turn the niche into targeted queries (already generated):

```
mental health relationships podcast
dating expectations mental health
first dates dos and donts
how to let go of the past
baggage in relationships
anxiety and stress conversation
moving on from heartbreak
setting boundaries in relationships
self worth after a breakup
honest mental health conversations
overcoming anxiety podcast
communication in relationships
why expectations hurt relationships
the people you surround yourself with
reaching out for mental health
```

Run them against YouTube search with the **Creative Commons** filter when possible — those results are clip-ready. The show's own channel is always excluded from results.

## 5. Step 3 — Discover videos

Use the YouTube Data API (key optional) or the built-in tools:

- **In the browser:** Clip Studio → *Pull a video* (public metadata + license, no key) or *Search the niche* (needs a YouTube Data API key, stored only in the visitor's browser; Creative Commons filter on by default).
- **On the command line:** `node clips/discover.mjs --search [--cc]` (needs `YT_API_KEY`) — runs every query, excludes the own channel, ranks and writes `clips/candidates.json`.

Collect for every candidate:

```json
{
  "video_id": "abcXYZ12345",
  "url": "https://www.youtube.com/watch?v=abcXYZ12345",
  "title": "How to let go of relationship baggage",
  "channel": "Some Other Channel",
  "duration_seconds": 1245,
  "published_at": "2024-03-12",
  "license": "standard | creative_commons",
  "rights_status": "needs_review",
  "status": "discovered"
}
```

Skip private, members-only, deleted or login-gated content — and anything from `exclude_channels`.

## 6. Step 4 — Rank candidates

Not every result deserves full processing. Score with:

```
40% topic relevance    (title/description vs the include list; penalise the exclude list)
30% conversational depth (a real conversation, process or opinion — not music or vlogs)
10% recency            (published_after 2022-01-01; newer weighs more)
10% rights/credibility (Creative Commons or an explicit clip-friendly policy scores highest)
10% engagement         (views/likes, log-scaled — never rank by views alone)
```

Popular videos are often entertaining but shallow. Prefer channels that are easy to credit and contact (link in About page, active business email).

## 7. Step 5 — Build a balanced source set

```
5   broad overview videos       (how conversations about mental health work)
10  detailed process videos     (first-date dos/don'ts, boundaries, letting go)
5   mistakes / failure analysis (why expectations hurt, red flags)
5   case studies / real stories (lived experience, "this is what happened")
5   support & wellbeing         (reaching out, anxiety relief, therapy basics)
```

Diversify creators — never build a week of clips from one channel, and never let one creator's repeated opinions look like industry consensus.

## 8. Step 6 — Retrieve permitted transcripts

For each selected video:

1. Check for available captions on YouTube (video page → ⋯ → *Show transcript*).
2. Record whether it is creator-provided, auto-generated (ASR) or user-provided.
3. Record the language.
4. Store the **raw transcript separately** from any cleaned version — never edit the raw copy.
5. If no transcript is legally or technically available, keep metadata only. **Do not invent content.**

```json
{
  "video_id": "abcXYZ12345",
  "transcript_status": "available",
  "transcript_type": "public_auto_caption",
  "language": "en",
  "retrieved_at": "2026-08-17T10:00:00Z"
}
```

`node clips/discover.mjs --captions <url>` makes a best-effort fetch of public captions; when YouTube does not serve them, copy the transcript from the video page (Clip Studio also has a paste box for this).

## 9. Step 7 — Clean without destroying meaning

Remove or label: channel intros and outros, subscribe/share prompts, giveaway talk, livestream chatter, empty filler, unrelated stories, transcript artefacts (duplicated words, broken lines).

Preserve: procedures, definitions, numbers, recommended ranges, warnings, exceptions, examples, disagreements, and the speaker's exact phrasing — **quotes must survive cleaning verbatim**, especially since they belong to another creator.

Keep the raw transcript unchanged; create a separate cleaned, timestamped version.

## 10. Step 8 — Split the transcript by topic

Prefer semantic sections over arbitrary character counts. A section should be small enough to analyse accurately but large enough to preserve context.

## 11. Step 9 — Extract clip-worthy moments

Run every section through the same extraction schema. A moment qualifies when it has a **hook** (bold claim, question, "nobody talks about…"), **emotional intensity**, a **complete story beat** or **practical guidance** — and runs **15–60 seconds**.

```json
{
  "hook": "the only thing that can actually break your heart and hurt you is your own expectations",
  "start_seconds": 120,
  "end_seconds": 168,
  "title": "Your expectations are what break your heart",
  "caption": "\"The only thing that can actually break your heart and hurt you is your own expectations.\" — clip from Channel Name. Full video: https://www.youtube.com/watch?v=… · via @mentalpodcastshow #Relationships #Dating #Podcast",
  "hashtags": ["#Relationships", "#Dating", "#Podcast"],
  "why_it_works": ["hook", "emotional", "practical"],
  "flags": [],
  "confidence": 0.91,
  "source_timestamp": "02:00",
  "original_channel": "Channel Name",
  "original_url": "https://www.youtube.com/watch?v=…",
  "rights_status": "permission_granted"
}
```

Moment types for this niche: **bold claim**, **question**, **story beat**, **hot take**, **practical tip**, **disagreement between hosts**, **supportive message**.

Every moment keeps its video ID, timestamp, original channel and rights status.

## 12. Step 10 — Separate claims from evidence

Classify each extracted statement:

- **Host opinion** — a recommendation without external validation (most conversation advice).
- **Shared experience** — the speaker describes something that happened to them.
- **Agreed pattern** — multiple independent creators say the same thing.
- **Verified fact** — supported by authoritative documentation.
- **Uncertain** — transcript or context is ambiguous.

A confident creator's opinion never becomes a universal rule: "Channel X believes Y" is not "Y is true". This matters even more when the words belong to someone else — never make another creator say more than they said.

## 13. Step 11 — Merge duplicates

Different channels describe the same idea differently. Merge into one canonical moment, keep the strongest phrasing with its exact timestamp, and keep the original wording and source link behind it.

## 14. Step 12 — Detect disagreement

Do not flatten genuine contradictions — they make great clips. Preserve both sides with their sources.

## 15. Step 13 — Niche knowledge map (clip pillars)

```
Mental-health & relationship conversations
├── Expectations       (why expectations hurt, what we expect vs what we get)
├── Baggage & the past (letting go, moving on, staying stuck)
├── First dates        (dos and don'ts, energy checks, keeping it real)
├── Relationships      (friend-zoning, manipulation, genuine connection)
├── Anxiety & stress   (recognising it, reaching out, day-to-day coping)
├── Self-worth         (confidence, the people around you, your mind first)
├── Faith & growth     (thinking, speaking, manifesting, patience)
├── Support & help     (reaching out, 988, talking to someone)
└── Sex & intimacy     (honest talk, handled with advisories)
```

## 16. Step 14 — Clip series opportunities

Concepts that repeat across channels become named series:

| Source pattern | Clip series |
| --- | --- |
| "Expectations are deceiving" | **Expectations Are Deceiving** — moments where expecting too much hurt someone |
| "The past is the past for a reason" | **Let It Go** — moving-on moments from different channels |
| First-date dos and don'ts | **First Date Files** — quick dos/don'ts, one per clip |
| "Who are you around" | **Your Circle** — the people-shape-you moments |
| Anxiety & stress talk | **Anxiety Check-In** — short supportive clips, always with the support note |
| Two hosts disagreeing | **The Disagreement** — both sides of one topic in one clip |

## 17. Step 15 — Clip brief specification

Every clip brief (the unit the editor works from) contains:

- `hook` — the exact quote (verbatim from the transcript)
- `start_seconds` / `end_seconds` — 15–60s window
- `title` — scroll-stopping title (≤ 64 chars)
- `caption` — social caption that **credits the original channel and links the full video**, plus "via @mentalpodcastshow"
- `hashtags` — 3–5 niche hashtags
- `why_it_works` — the signals that qualified it (hook / emotional / story / practical)
- `flags` — safety and rights flags
- `confidence` — extraction confidence 0–1
- `original_channel` / `original_url` — who the clip belongs to
- `rights_status` — one of `creative_commons`, `permission_granted`, `permission_requested`, `needs_review`
- `source` — video title, channel, URL, timestamp, transcript type

**Publish gate:** only briefs with `rights_status` of `creative_commons` or `permission_granted` may be published.

## 18. Step 16 — Build the first workflow

One loop first — the one already live in the website's Clip Studio:

```
paste another channel's video URL  →  pull public metadata + license
paste public transcript  →  clean, chunk, score every line
find clip moments  →  draft briefs (hook, times, caption, hashtags, flags)
set rights status  →  queue in the browser  →  copy brief or export JSON
```

Broader features (multi-video batch, auto-scheduling, publishing) come only after this loop works.

## 19. Step 17 — Preserve provenance

Every recommendation points back to its source: video title, channel, URL, timestamp, transcript type, license and rights status. The brief JSON keeps these fields even when the caption does not show them.

## 20. Step 18 — Human review (safety + rights for this niche)

Mental health is a safety-sensitive niche, and the clips belong to other creators. Before publishing any clip:

1. **Verify rights** — `rights_status` must be `creative_commons` or `permission_granted`, with evidence logged in `clips/permissions.json`.
2. **Verify the quote against the transcript** — never let a cut distort the creator's meaning.
3. Check timestamps against the actual video.
4. Mark opinions as opinions — no universal medical or relationship rules.
5. **Crisis-adjacent content** (suicide, self-harm) always carries a support note: *If you or someone you know is struggling: call or text 988 (US/Canada) or visit findahelpline.com.*
6. Treat every mental-health statement as conversation, **not** medical advice.
7. Add advisories for adult topics (sex, intimacy) per platform rules.
8. Only clip identifiable guests with the channel's consent.
9. **Credit visibly:** the original channel in the caption, a link to the full video, on-screen credit in the first seconds, and "via @mentalpodcastshow".
10. Never present another creator's words as the show's own.

## 21. Step 19 — Test the pipeline

- Videos without transcripts (metadata-only fallback)
- Transcripts without timestamps (Clip Studio estimates times — verify before editing)
- Non-English captions (record language, skip or translate deliberately)
- Duplicate moments (merge keeps the strongest phrasing)
- Disagreements between hosts (preserved, not flattened)
- Very long episodes (chunked, never analysed in one go)
- Auto-caption errors (flag low confidence)
- Crisis language (flag + support note)
- Adult topics (advisory flag)
- **Standard-license videos (rights = needs_review, publish gate blocks them)**
- **Own-channel videos (excluded from discovery)**
- Queue persistence (localStorage) and JSON export round-trip

## 22. Step 20 — Keep the niche current

Run weekly:

```
weekly YouTube search (clips/discover.mjs --search [--cc])
→ compare video IDs with the existing candidate list
→ collect new metadata, licenses and re-rank
→ retrieve available transcripts
→ extract new moments, flag changed guidance
→ record permissions for promising channels (clips/permissions.json)
→ human review → update the knowledge map and clip series
```

Never overwrite historical clip records silently. Record what changed and which new source caused it.

## 23. Recommended automation architecture

```
Niche input (clips/niche.json, pre-filled, own channel excluded)
  ↓
Query generator (15 niche queries)
  ↓
YouTube Data API discovery (CC filter preferred)
  ↓
Candidate ranking (rubric above, license-aware)
  ↓
Human source-set approval + permission check
  ↓
Metadata + permitted transcript collection
  ↓
Transcript cleaning and topic chunking
  ↓
Clip-moment extraction (hook · emotional · story · practical)
  ↓
Source and timestamp validation
  ↓
Deduplication + disagreement detection
  ↓
Niche clip-pillar map
  ↓
Clip series opportunities
  ↓
Clip briefs (title, times, caption, hashtags, flags, rights, credit)
  ↓
Human rights + safety review → publish queue
```

## 24. Minimum viable version (already shipped)

- [x] Niche input (pre-filled; own channel excluded, publish target set)
- [x] 15 search-query variations
- [x] Pull single videos by URL (public metadata + license, no API key)
- [x] Optional YouTube Data API discovery with Creative Commons filter and own-channel exclusion
- [x] Transcript paste → cleaning → chunking → moment scoring
- [x] Structured clip-brief JSON with provenance, `original_channel`, `original_url`, `rights_status`
- [x] Rights workflow: publish gate on rights status, third-party flags, auto credit line
- [x] Permission log template (`clips/permissions.example.json`)
- [x] Duplicate-resistant moment selection (45s separation)
- [x] Safety flags for crisis language, health claims, adult topics, faith framing
- [x] In-browser queue (localStorage) + JSON export
- [x] Copy the full configured pipeline prompt for any AI tool
- [x] Human approval before anything is published

## 25. Ready-to-paste prompt (for AI tools)

Use this with any AI assistant. The website's Clip Studio generates the same prompt with your selected video and transcript already attached (button: *Copy configured pipeline prompt*).

```
You are the Mental Podcast Show clipping assistant. The niche is honest conversations
about relationships, dating, sex, mental health and emotional wellbeing. The clips come
from OTHER channels in the niche and will be published on youtube.com/@mentalpodcastshow.
Follow this pipeline.

1. The transcript is the only source of quotes. Never invent, paraphrase into
   someone's mouth, or rewrite lines.
2. Clean without destroying meaning: remove intros, promos, subscribe asks, filler
   and off-topic rambles. Keep the raw transcript unchanged and produce a separate
   cleaned, timestamped copy.
3. Split the cleaned transcript into semantic topic sections with start/end timestamps.
4. Extract clip-worthy moments from every section. A moment qualifies when it has a
   hook (bold claim, question, "nobody talks about…"), emotional intensity, a complete
   story beat or practical guidance, and runs 15–60 seconds. Output every moment as:
   {
     "hook": "exact quote from the transcript",
     "start_seconds": 0, "end_seconds": 0,
     "title": "short scroll-stopping title",
     "caption": "caption that credits the original channel and links the full video, plus via @mentalpodcastshow",
     "hashtags": [], "why_it_works": [], "flags": [],
     "confidence": 0.0, "source_timestamp": "MM:SS",
     "original_channel": "channel the clip comes from",
     "original_url": "full video URL",
     "rights_status": "creative_commons | permission_granted | permission_requested | needs_review"
   }
5. Classify each statement as host opinion, shared experience, agreed pattern or
   verified fact. Never turn a host's opinion into a universal rule; mark opinions.
6. Merge near-duplicate moments and keep the strongest phrasing with its exact
   timestamp. Where episodes disagree, preserve both sides instead of flattening them.
7. Keep provenance on every clip: video title, channel, URL, timestamp, transcript type.
8. RIGHTS AND CREDIT (mandatory for third-party clips): only produce briefs ready for
   publishing when rights_status is "creative_commons" or "permission_granted".
   Set rights_status to "needs_review" whenever permission is unknown, and say so.
   Every caption must credit the original channel, link the full video, and add
   "via @mentalpodcastshow". Never present another creator's words as the show's own.
9. Safety review: flag crisis-adjacent content and always attach a support note (988);
   treat mental-health statements as conversation, not medical advice; add advisories
   for adult topics; only clip guests with consent; never distort a quote.
10. Rank the top 8 clip briefs by clip strength. Return them as a JSON array with a
    one-line rationale for each ranking.

NICHE CONFIG: <paste clips/niche.json>
VIDEO(S): <paste the pulled video JSON>
TRANSCRIPT: <paste the raw timestamped transcript>
```

## 26. Where everything lives

| Artifact | Purpose |
| --- | --- |
| `CLIP-PIPELINE.md` | This document — the configured pipeline |
| `clips/niche.json` | Niche config consumed by the CLI and the site |
| `clips/discover.mjs` | Node CLI: queries, discovery, ranking, licenses, captions (best-effort) |
| `clips/permissions.example.json` | Permission log template → copy to `clips/permissions.json` |
| `index.html` → **Clip Studio** | Browser workflow: pull video → paste transcript → clip briefs → rights → queue |
| `clips/candidates.json` | Output of `discover.mjs --search` (generated, git-ignored) |
