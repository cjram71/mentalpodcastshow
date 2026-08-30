-- Mental Podcast Show — Phase 1a Database Schema
-- SQLite, committed to repo. Move to Postgres only if you outgrow it.
-- Generated 2026-08-30 for Phase 1 foundation work.

-- Sources: a podcast, a YouTube channel, a publication.
CREATE TABLE IF NOT EXISTS sources (
  id              TEXT PRIMARY KEY,     -- podcast id: tbg, mih, anxiety, ...
  kind            TEXT NOT NULL,       -- podcast | youtube | site
  name            TEXT NOT NULL,
  canonical_url   TEXT NOT NULL UNIQUE,
  feed_url        TEXT,
  creator_name    TEXT,
  language        TEXT NOT NULL DEFAULT 'en',
  rights_status   TEXT NOT NULL DEFAULT 'LINK_ONLY',
  perspective     TEXT,                -- professional-led | lived-experience | mixed
  format          TEXT,
  reviewed_at     TEXT,                -- human review date, null = never
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL
);

-- Episodes: one row per discovered item. Never stores the media itself.
CREATE TABLE IF NOT EXISTS episodes (
  id              INTEGER PRIMARY KEY,
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  title           TEXT NOT NULL,
  description     TEXT,                -- as syndicated by the publisher
  url             TEXT NOT NULL UNIQUE,
  published_at    TEXT NOT NULL,
  duration_s      INTEGER,
  language        TEXT NOT NULL DEFAULT 'en',
  content_hash    TEXT NOT NULL,       -- dedupe across feeds
  view_count      INTEGER,             -- YouTube only, refreshed on a schedule
  classified_at   TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ep_published ON episodes(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ep_source    ON episodes(source_id);

-- Topics: your existing 27, as data rather than hardcoded strings.
CREATE TABLE IF NOT EXISTS topics (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,   -- 'anxiety' -> /topics/anxiety
  label           TEXT NOT NULL,
  parent_id       INTEGER REFERENCES topics(id),
  blurb           TEXT,                   -- human-written, for the topic page
  sensitive       INTEGER NOT NULL DEFAULT 0  -- forces crisis messaging
);

-- Many-to-many, with the model's confidence kept for auditing.
CREATE TABLE IF NOT EXISTS episode_topics (
  episode_id      INTEGER NOT NULL REFERENCES episodes(id),
  topic_id        INTEGER NOT NULL REFERENCES topics(id),
  confidence      REAL NOT NULL,
  assigned_by     TEXT NOT NULL,       -- 'model:haiku@2026-08' | 'human'
  PRIMARY KEY (episode_id, topic_id)
);

-- Feelings: the eight entry points already on the site.
CREATE TABLE IF NOT EXISTS episode_feelings (
  episode_id      INTEGER NOT NULL REFERENCES episodes(id),
  feeling         TEXT NOT NULL,
  PRIMARY KEY (episode_id, feeling)
);

-- Daily snapshot per topic. The trend score is derived from this, not stored raw.
CREATE TABLE IF NOT EXISTS topic_stats (
  topic_id        INTEGER NOT NULL REFERENCES topics(id),
  day             TEXT NOT NULL,
  episode_count   INTEGER NOT NULL,
  source_count    INTEGER NOT NULL,    -- creator diversity
  view_sum        INTEGER,
  PRIMARY KEY (topic_id, day)
);

-- Rights: one row per grant. Empty until a creator says yes in writing.
CREATE TABLE IF NOT EXISTS rights_grants (
  id              INTEGER PRIMARY KEY,
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  status          TEXT NOT NULL,       -- see rights table in brief
  scope           TEXT NOT NULL,       -- index | embed | analyse | clip
  granted_by      TEXT, granted_at TEXT, expires_at TEXT,
  attribution     TEXT NOT NULL,       -- required credit line
  evidence_url    TEXT,                -- the email or signed document
  revoked_at      TEXT,
  notes           TEXT
);

-- Every job run. This is the audit log from brief sections 19 and 21.
CREATE TABLE IF NOT EXISTS runs (
  id              INTEGER PRIMARY KEY,
  job             TEXT NOT NULL,
  started_at      TEXT NOT NULL, finished_at TEXT,
  model           TEXT, prompt_version TEXT,
  items_in        INTEGER, items_out INTEGER,
  cost_usd        REAL,
  status          TEXT NOT NULL,       -- ok | partial | failed
  error           TEXT
);

-- Anything a human must look at before it goes live.
CREATE TABLE IF NOT EXISTS review_queue (
  id              INTEGER PRIMARY KEY,
  entity_type     TEXT NOT NULL, entity_id INTEGER NOT NULL,
  reason          TEXT NOT NULL,       -- sensitive_topic | low_confidence | rights_unknown
  risk            TEXT NOT NULL,       -- low | medium | high | critical
  created_at      TEXT NOT NULL,
  resolved_at     TEXT, resolved_by TEXT, decision TEXT
);
