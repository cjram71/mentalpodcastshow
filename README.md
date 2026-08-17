# Mental Podcast Show

A complete static mental-health podcast discovery and reference website for **mentalpodcastshow.com**.

## Brand

- Black: `#000000`
- Deep red: `#8d110e`
- Bright red: `#b5201a`
- White: `#ffffff`
- Logo: `assets/mental-podcast-show-logo.webp`

## Features

- Searchable curated podcast directory
- Filters by topic, format and perspective
- Discovery by current feeling or need
- Podcast reference modal with official source links
- Original Mental Podcast Show section (official YouTube channel: [@mentalpodcastshow](https://www.youtube.com/@mentalpodcastshow))
- **Clip Studio** — pull a YouTube video, paste its public transcript, and generate clip briefs (hook, timestamps, title, caption, hashtags, safety flags) for Shorts, Reels and TikTok
- Editorial standards, privacy and safety information
- Podcast and guest submission workflow
- Responsive mobile navigation
- Custom domain and GitHub Pages support

## Clip Studio & the YouTube clipping pipeline

The niche is configured from the show's own channel description: *dating, relationships, mental health and sex — honest, real conversations*. The pipeline lives in [CLIP-PIPELINE.md](CLIP-PIPELINE.md) and the website ships a working first version of it in the **Clip Studio** section:

1. **Pull a video** — paste a YouTube URL; public metadata (title, channel, thumbnail) is pulled without any key. An optional YouTube Data API key (stored only in the visitor's browser) enables niche search with candidate ranking and full metadata.
2. **Paste the public transcript** — copy it from the video's ⋯ → *Show transcript* panel (or use the sample). The studio cleans, chunks and scores every line for hook, emotional, story and practical signal.
3. **Review clip briefs** — draft briefs from the strongest moments (15–60s windows, ≥45s apart), edit inline, then queue them (localStorage) or copy/export JSON. The *Copy configured pipeline prompt* button produces the full niche-configured prompt for any AI tool.

Command-line companion (`clips/discover.mjs`, Node ≥ 18):

```bash
node clips/discover.mjs                     # print niche config + queries
node clips/discover.mjs --video <URL>       # pull metadata (oEmbed; Data API if YT_API_KEY set)
YT_API_KEY=... node clips/discover.mjs --search      # run queries, rank, write clips/candidates.json
node clips/discover.mjs --captions <URL>    # best-effort public captions
```

No API key is required for the basic workflow. `clips/niche.json` is the single niche config consumed by the CLI and mirrored in the website.

## Deploy with GitHub Pages

Use `main` and `/ (root)` in repository Settings → Pages.

## Import into another host

Run:

```bash
npm run build
```

Publish the `dist` directory.

## Before promotion

1. Confirm `hello@mentalpodcastshow.com` exists.
2. Review every podcast listing against its official source.
3. Add content warnings to sensitive episode collections.
4. Review Clip Studio briefs before publishing anything — mental-health clips are conversation, not medical advice, and crisis-adjacent clips must carry a support note (988).
