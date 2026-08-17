# Mental Podcast Show — YouTube Clipping Pipeline

The repeatable YouTube pipeline configured for **Mental Podcast Show** (mentalpodcastshow.com). It takes the niche, pulls videos and transcripts from YouTube, and produces ready-to-edit **clip briefs** for Shorts, Reels and TikTok.

Everything below is already pre-filled for this show. Copy the **ready-to-paste prompt** at the bottom into any AI tool, or use the **Clip Studio** on the website (runs fully in the browser, no key required for single videos).

## 1. The niche

The show's own channel description defines the niche:

> "We are Here to Help everyone in the area of Dating, Relationships, Mental Health, and sex … we will always be truthful and real. And Honest." — @mentalpodcastshow

**Primary niche — the original show's conversations**

- Relationships, dating, first dates and expectations
- Baggage, heartbreak, moving on and letting go of the past
- Anxiety, stress, depression and reaching out for mental-health support
- Self-worth, confidence, boundaries and communication
- Motivation, personal growth and the people you surround yourself with
- Sex and intimacy (handled honestly, with advisories)

**Discovery niches — the directory topics that feed the show**
Anxiety · Depression · Trauma & PTSD · ADHD & neurodiversity · OCD · Addiction & recovery · Mindfulness & happiness · Grief · Therapy · Lived experience.

**Channel facts**

- Channel: `https://www.youtube.com/@mentalpodcastshow`
- Hosts: Sean and Heath
- Existing long-form episodes: *Moving Past The Past* (45:11), *Baggage* (27:16), *Expectations* (29:14), *First dates, and reaching out for Mental Health* (18:57)
- Existing Shorts: Moving Past The Past, Anxiety & Stress, Baggage, Expectations, Who are you around.

## 2. Step 1 — Niche input (pre-filled)

```json
{
  "niche": "Honest conversations about relationships, dating, sex, mental health and emotional wellbeing",
  "audience": "Adults 18–45 navigating dating, relationships, anxiety, stress, heartbreak and personal growth",
  "goal": "produce short-form vertical clips (Shorts, Reels, TikTok) that pull viewers to full episodes",
  "region": "United States",
  "language": "en",
  "video_limit": 30,
  "published_after": "2022-01-01",
  "preferred_channels": ["@mentalpodcastshow"],
  "topics": {
    "include": ["relationships", "dating", "first dates", "expectations", "baggage", "moving on", "heartbreak", "letting go of the past", "anxiety", "stress", "depression", "therapy", "reaching out for help", "self-worth", "confidence", "boundaries", "communication", "healing", "motivation", "personal growth", "sex and intimacy"],
    "exclude": ["diagnosis", "medication instructions", "professional medical advice", "explicit content"]
  },
  "clip_format": { "min_seconds": 15, "max_seconds": 60, "orientation": "vertical 9:16" }
}
```

The same config lives in `clips/niche.json` (used by the CLI) and in the Clip Studio on the website.

## 3. Step 2 — Search queries

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

For clips of the show itself, the first query is always the channel: pull `@mentalpodcastshow` directly. The remaining queries discover adjacent conversations for research, guests and collaboration.

## 4. Step 3 — Discover videos

Use the YouTube Data API (key optional) or the built-in tools:

- **In the browser:** Clip Studio → *Pull a video* (public metadata, no key) or *Search the niche* (needs a YouTube Data API key, stored only in the visitor's browser).
- **On the command line:** `node clips/discover.mjs --search` (needs `YT_API_KEY`) — runs every query, dedupes, ranks and writes `clips/candidates.json`.

Collect for every candidate:

```json
{
  "video_id": "2XCwUT92jxc",
  "url": "https://www.youtube.com/watch?v=2XCwUT92jxc",
  "title": "Moving Past The Past",
  "channel": "Mental Podcast Show",
  "duration_seconds": 2711,
  "published_at": "2023-07-20",
  "status": "discovered"
}
```

Skip private, members-only, deleted or login-gated content.

## 5. Step 4 — Rank candidates

Not every result deserves full processing. Score with:

```
40% topic relevance    (title/description vs the include list; penalise the exclude list)
30% conversational depth (a real conversation, process or opinion — not a music video)
10% recency            (published_after 2022-01-01; newer weighs more)
10% creator credibility (the show's own channel scores highest)
10% engagement         (views/likes, log-scaled — never rank by views alone)
```

Popular videos are often entertaining but shallow. For this show, own-channel episodes always outrank everything else because they are the content being clipped.

## 6. Step 5 — Build a balanced source set

```
1   own-channel episode queue   (every @mentalpodcastshow long-form episode)
5   broad overview videos       (how conversations about mental health work)
10  detailed process videos     (first-date dos/don'ts, boundaries, letting go)
5   mistakes / failure analysis (why expectations hurt, red flags)
5   case studies / real stories (lived experience, "this is what happened")
5   support & wellbeing         (reaching out, anxiety relief, therapy basics)
```

Diversify creators so repeated opinions from one channel never look like industry consensus. Host opinions on the show stay attributed to the show.

## 7. Step 6 — Retrieve permitted transcripts

For each selected video:

1. Check for available captions on YouTube (video page → ⋯ → *Show transcript*).
2. Record whether it is creator-provided, auto-generated (ASR) or user-provided.
3. Record the language.
4. Store the **raw transcript separately** from any cleaned version — never edit the raw copy.
5. If no transcript is legally or technically available, keep metadata only. **Do not invent content.**

```json
{
  "video_id": "2XCwUT92jxc",
  "transcript_status": "available",
  "transcript_type": "public_auto_caption",
  "language": "en",
  "retrieved_at": "2026-08-17T10:00:00Z"
}
```

`node clips/discover.mjs --captions <url>` makes a best-effort fetch of public captions; when YouTube does not serve them, copy the transcript from the video page (Clip Studio also has a paste box for this).

## 8. Step 7 — Clean without destroying meaning

Remove or label: channel intros and outros ("welcome to the mental podcast show… thank you for following us"), subscribe/share prompts, giveaway talk, livestream chatter, empty filler, unrelated stories, transcript artefacts (duplicated words, broken lines).

Preserve: procedures, definitions, numbers, recommended ranges, warnings, exceptions, examples, disagreements, and each host's exact phrasing — quotes must survive cleaning verbatim.

Keep the raw transcript unchanged; create a separate cleaned, timestamped version.

## 9. Step 8 — Split the transcript by topic

Prefer semantic sections over arbitrary character counts. Example for *Moving Past The Past*:

```
00:00–01:08  Welcome and support note (promo — mark, don't clip)
01:08–02:32  Why people stay stuck in the past
02:32–04:40  The past is the past — learn and move on
04:40–08:50  Friend-zoning and holding on to people
08:50–12:20  Perfecting the body, ignoring the mind
```

A section should be small enough to analyse accurately but large enough to preserve context.

## 10. Step 9 — Extract clip-worthy moments

Run every section through the same extraction schema. A moment qualifies when it has a **hook** (bold claim, question, "nobody talks about…"), **emotional intensity**, a **complete story beat** or **practical guidance** — and runs **15–60 seconds**.

```json
{
  "hook": "the only thing that can actually break your heart and hurt you is your own expectations",
  "start_seconds": 120,
  "end_seconds": 168,
  "title": "Your expectations are what break your heart",
  "caption": "\"The only thing that can actually break your heart and hurt you is your own expectations.\" — Sean & Heath on the Mental Podcast Show. Full episode on YouTube. #Relationships #Dating #Podcast",
  "hashtags": ["#Relationships", "#Dating", "#MentalPodcastShow", "#Podcast"],
  "why_it_works": ["hook", "emotional", "practical"],
  "flags": [],
  "confidence": 0.91,
  "source_timestamp": "02:00"
}
```

Moment types for this niche: **bold claim**, **question**, **story beat**, **hot take**, **practical tip**, **disagreement between Sean and Heath**, **supportive message**, **call to subscribe** (rarely — only when genuinely entertaining).

Every moment keeps its video ID and timestamp.

## 11. Step 10 — Separate claims from evidence

Classify each extracted statement:

- **Host opinion** — a recommendation without external validation (most of the show's advice).
- **Shared experience** — the host describes something that happened to them.
- **Agreed pattern** — both hosts, or multiple independent creators, say the same thing.
- **Verified fact** — supported by authoritative documentation.
- **Uncertain** — transcript or context is ambiguous.

A confident host opinion never becomes a universal rule: "Sean believes X" is not "X is true".

## 12. Step 11 — Merge duplicates

Different episodes describe the same idea differently ("let the past go", "move past the past", "the past is the past for a reason"). Merge into one canonical moment, keep the strongest phrasing with its exact timestamp, and keep the original wording behind it.

## 13. Step 12 — Detect disagreement

Do not flatten genuine contradictions — they make great clips. Example:

```json
{
  "topic": "first-date spending",
  "positions": [
    { "claim": "Keep first dates simple — a walk or coffee shows who the person is", "sources": ["j4NbYq6oGjg"] },
    { "claim": "A first date should feel special, not like a job interview", "sources": ["j4NbYq6oGjg"] }
  ],
  "synthesis": "Both hosts agree expectations ruin first dates; they differ on how much effort is right."
}
```

Sean-vs-Heath disagreements are a clip format of their own.

## 14. Step 13 — Niche knowledge map (clip pillars)

```
Mental Podcast Show
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

## 15. Step 14 — Clip series opportunities

Concepts that repeat across episodes become named series:

| Source pattern | Clip series |
| --- | --- |
| "Expectations are deceiving" | **Expectations Are Deceiving** — moments where expecting too much hurt someone |
| "The past is the past for a reason" | **Let It Go** — moving-on moments |
| First-date dos and don'ts | **First Date Files** — quick dos/don'ts, one per clip |
| "Who are you around" | **Your Circle** — the people-shape-you moments |
| Anxiety & stress talk | **Anxiety Check-In** — short supportive clips, always with the support note |
| Sean vs Heath | **The Disagreement** — both sides of one topic in one clip |

## 16. Step 15 — Clip brief specification

Every clip brief (the unit the editor works from) contains:

- `hook` — the exact quote (verbatim from the transcript)
- `start_seconds` / `end_seconds` — 15–60s window
- `title` — scroll-stopping title (≤ 64 chars)
- `caption` — social caption crediting @mentalpodcastshow
- `hashtags` — 3–5 niche hashtags
- `why_it_works` — the signals that qualified it (hook / emotional / story / practical)
- `flags` — safety and review flags
- `confidence` — extraction confidence 0–1
- `source` — video title, channel, URL, timestamp, transcript type

## 17. Step 16 — Build the first workflow

One loop first — the one already live in the website's Clip Studio:

```
paste episode URL  →  pull public metadata
paste public transcript  →  clean, chunk, score every line
find clip moments  →  draft briefs (hook, times, caption, hashtags, flags)
review and edit  →  queue in the browser  →  copy brief or export JSON
```

Broader features (multi-video batch, auto-scheduling, publishing) come only after this loop works.

## 18. Step 17 — Preserve provenance

Every recommendation points back to its source: video title, channel, URL, timestamp, transcript type and confidence. The brief JSON keeps these fields even when the caption does not show them.

## 19. Step 18 — Human review (safety-first for this niche)

Mental health is a safety-sensitive niche. Before publishing any clip:

1. Verify the quote against the transcript — **never** let a cut distort meaning.
2. Check timestamps against the actual video.
3. Mark host opinions as opinions — no universal medical or relationship rules.
4. **Crisis-adjacent content** (suicide, self-harm) always carries a support note: *If you or someone you know is struggling: call or text 988 (US/Canada) or visit findahelpline.com.*
5. Treat every mental-health statement as conversation, **not** medical advice.
6. Add advisories for adult topics (sex, intimacy) per platform rules.
7. Only clip guests with their consent; the show's own hosts are its content.
8. Confirm attribution: @mentalpodcastshow and mentalpodcastshow.com in the caption.

## 20. Step 19 — Test the pipeline

- Videos without transcripts (metadata-only fallback)
- Transcripts without timestamps (Clip Studio estimates times — verify before editing)
- Non-English captions (record language, skip or translate deliberately)
- Duplicate moments (merge keeps the strongest phrasing)
- Sean-vs-Heath disagreements (preserved, not flattened)
- Very long episodes (chunked, never analysed in one go)
- Auto-caption errors (flag low confidence)
- Crisis language (flag + support note)
- Adult topics (advisory flag)
- Queue persistence (localStorage) and JSON export round-trip

## 21. Step 20 — Keep the niche current

Run weekly:

```
weekly YouTube search (clips/discover.mjs --search)
→ compare video IDs with the existing candidate list
→ collect new metadata, re-rank
→ retrieve available transcripts
→ extract new moments, flag changed guidance
→ human review → update the knowledge map and clip series
```

Never overwrite historical clip records silently — record what changed and which new source caused it.

## 22. Recommended automation architecture

```
Niche input (clips/niche.json, pre-filled)
  ↓
Query generator (15 niche queries)
  ↓
YouTube Data API discovery (discover.mjs / Clip Studio)
  ↓
Candidate ranking (rubric above)
  ↓
Human source-set approval
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
Clip briefs (title, times, caption, hashtags, flags)
  ↓
Human safety review → publish queue
```

## 23. Minimum viable version (already shipped)

- [x] Niche input (pre-filled for Mental Podcast Show)
- [x] 15 search-query variations
- [x] Pull single videos by URL (public metadata, no API key)
- [x] Optional YouTube Data API discovery + ranking
- [x] Transcript paste → cleaning → chunking → moment scoring
- [x] Structured clip-brief JSON with provenance
- [x] Duplicate-resistant moment selection (45s separation)
- [x] Safety flags for crisis language, health claims, adult topics, faith framing
- [x] In-browser queue (localStorage) + JSON export
- [x] Copy the full configured pipeline prompt for any AI tool
- [x] Human approval before anything is published

## 24. Ready-to-paste prompt (for AI tools)

Use this with any AI assistant. The website's Clip Studio generates the same prompt with your selected video and transcript already attached (button: *Copy configured pipeline prompt*).

```
You are the Mental Podcast Show clipping assistant. The niche is honest conversations
about relationships, dating, sex, mental health and emotional wellbeing
(youtube.com/@mentalpodcastshow, hosts Sean and Heath). Follow this pipeline.

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
     "caption": "social caption that credits @mentalpodcastshow",
     "hashtags": [], "why_it_works": [], "flags": [],
     "confidence": 0.0, "source_timestamp": "MM:SS"
   }
5. Classify each statement as host opinion, shared experience, agreed pattern or
   verified fact. Never turn a host's opinion into a universal rule; mark opinions.
6. Merge near-duplicate moments and keep the strongest phrasing with its exact
   timestamp. Where episodes disagree, preserve both sides instead of flattening them.
7. Keep provenance on every clip: video title, channel, URL, timestamp, transcript type.
8. Safety review: flag crisis-adjacent content and always attach a support note (988);
   treat mental-health statements as conversation, not medical advice; add advisories
   for adult topics; only clip guests with consent; never distort a quote.
9. Rank the top 8 clip briefs by clip strength. Return them as a JSON array with a
   one-line rationale for each ranking.

NICHE CONFIG: <paste clips/niche.json>
VIDEO(S): <paste the pulled video JSON>
TRANSCRIPT: <paste the raw timestamped transcript>
```

## 25. Where everything lives

| Artifact | Purpose |
| --- | --- |
| `CLIP-PIPELINE.md` | This document — the configured pipeline |
| `clips/niche.json` | Niche config consumed by the CLI and the site |
| `clips/discover.mjs` | Node CLI: queries, discovery, ranking, captions (best-effort) |
| `index.html` → **Clip Studio** | Browser workflow: pull video → paste transcript → clip briefs → queue |
| `clips/candidates.json` | Output of `discover.mjs --search` (generated, git-ignored) |
