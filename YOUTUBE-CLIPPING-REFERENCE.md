# Mental Podcast Show — YouTube Clipping Reference

> Repository reference file. This document is the source of truth for the clipping system.
> It is **not** part of the website HTML — it lives here on GitHub only.
> Site: mentalpodcastshow.com · Publishing channel: youtube.com/@mentalpodcastshow · Hosts: Sean & Heath

## What this system does

Finds videos from **other channels** in the niche — honest conversations about relationships, dating, sex, mental health and emotional wellbeing — selects the ones that already **score high numbers in views** on YouTube, and produces ready-to-edit **clip briefs** for publishing on the Mental Podcast Show channel, with the original creator's permission and credit.

```
NICHE → KEYWORD PHRASES → YOUTUBE SEARCH → HIGH-VIEW RANKING
      → PERMISSION CHECK → TRANSCRIPT → CLIP BRIEFS → CREDIT → PUBLISH
```

## 1. Niche config

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
  "exclude_channels": ["@mentalpodcastshow"]
}
```

## 2. Keyword phrases (what discovery matches against)

```
relationships · dating · first dates · first date tips · expectations
baggage · moving on · heartbreak · letting go of the past · anxiety
stress · depression · therapy · reaching out for help · self worth
confidence · boundaries · communication · healing · motivation
personal growth · sex and intimacy · mental health podcast
dating advice · relationship advice · how to let go · anxiety relief
red flags · self love · emotional wellbeing
```

These keywords become YouTube search queries (e.g. *"dating expectations mental health"*, *"first dates dos and donts"*, *"how to let go of the past"*). Every candidate records which keyword found it (`found_via`).

## 3. Find the videos that score high numbers

For every keyword search, keep videos at or above the views threshold and sort by views:

```
min_views: 5000 (configurable)
sort_by:   views
collect:   views · likes · comments
```

```
 1.  1,842,300 views  Why expectations ruin relationships  (Channel A · 41,200 likes)
     keywords: dating expectations mental health
 2.    987,120 views  How to let go of the past           (Channel B · 22,900 likes · CC)
     keywords: how to let go of the past
```

**Why high views matter:** a high-number video is already proven with the niche's audience — the hook worked, the topic resonated, the pacing held attention.
**Why views are not enough:** views never replace permission, and a big channel's numbers do not transfer automatically to your Shorts. Relevance, depth and rights stay in the rubric:

```
40% topic relevance  ·  15% conversational depth  ·  10% recency
10% rights (CC / clip-friendly policy)  ·  25% high numbers (views + likes, log-scaled)
```

## 4. Rights & credit (mandatory)

| Status | Meaning | Can publish? |
| --- | --- | --- |
| `creative_commons` | Video carries a CC license | Yes, with attribution |
| `permission_granted` | Written permission logged in `clips/permissions.json` | Yes, with credit |
| `permission_requested` | Asked, awaiting reply | No — wait |
| `needs_review` | Unknown (default for every new third-party video) | No |

- Prefer Creative Commons (YouTube search filter → Features → Creative Commons; Data API `videoLicense=creativeCommon`).
- For standard-licensed videos, get the creator's **written** permission and log the evidence.
- Every caption credits the original channel and links the full video:

```
Credit: {channel} · Full video: {url} · via @mentalpodcastshow
```

- On-screen credit in the first seconds of the clip. Never present another creator's words as the show's own.
- This is a rights workflow, not legal advice. Fair use is a defense decided in court; YouTube reused-content rules and copyright claims still apply.

## 5. Clip brief schema (what the editor works from)

```json
{
  "hook": "the only thing that can actually break your heart and hurt you is your own expectations",
  "start_seconds": 120,
  "end_seconds": 168,
  "title": "Your expectations are what break your heart",
  "caption": "\"…\" — clip from Channel Name. Full video: https://www.youtube.com/watch?v=… · via @mentalpodcastshow #Relationships #Dating #Podcast",
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

Moment rules: 15–60 seconds · ≥45 seconds apart · qualifies on a hook (bold claim, question, "nobody talks about…"), emotional intensity, a complete story beat or practical guidance. Publish gate: `rights_status` must be `creative_commons` or `permission_granted`.

## 6. Safety review (before anything is published)

1. Verify the quote against the transcript — never distort the creator's meaning.
2. Mark opinions as opinions — no universal medical or relationship rules.
3. Crisis-adjacent content always carries a support note: *call or text 988 (US/Canada) or visit findahelpline.com*.
4. Mental-health statements are conversation, **not** medical advice.
5. Adult topics (sex, intimacy) get platform advisories; only clip identifiable guests with consent.
6. Confirm attribution: original channel + full video link + "via @mentalpodcastshow".

## 7. The tools

| Tool | Where | What it does |
| --- | --- | --- |
| Clip Studio | Website section (in-browser) | Pull video → paste transcript → clip briefs → rights → queue |
| `clips/discover.mjs` | CLI, Node ≥ 18 | Keyword queries, discovery, high-view ranking, captions |
| `clips/niche.json` | Repo | Single niche config source (CLI + studio mirror it) |
| `clips/permissions.json` | Local (template: `permissions.example.json`) | Permission log — never commit real emails/replies |
| `CLIP-PIPELINE.md` | Repo | The detailed 26-step pipeline this file summarizes |

CLI commands:

```bash
node clips/discover.mjs                     # print niche config, keywords + queries
node clips/discover.mjs --video <URL>       # pull metadata + license + views
YT_API_KEY=... node clips/discover.mjs --search --cc      # discover + rank candidates
YT_API_KEY=... node clips/discover.mjs --top --cc --min-views 5000   # HIGH-VIEW leaderboard
node clips/discover.mjs --captions <URL>    # best-effort public captions
```

## 8. Ready-to-paste prompt (for any AI tool)

```
You are the Mental Podcast Show clipping assistant. The niche is honest conversations
about relationships, dating, sex, mental health and emotional wellbeing. The clips come
from OTHER channels in the niche and will be published on youtube.com/@mentalpodcastshow.
Discovery runs on the niche's keyword phrases (relationships, dating, first dates,
expectations, baggage, letting go of the past, anxiety, boundaries, self worth and more)
and selects the videos that score HIGH VIEW NUMBERS in the niche — high views show what
the audience already watches, but views never replace permission. Follow this pipeline.

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

---

*This file is a GitHub-only reference. It is intentionally not rendered into the website.*
