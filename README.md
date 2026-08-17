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
- **Clip Studio** — pull videos from other channels in the niche, paste their public transcripts, and generate clip briefs (hook, timestamps, title, caption, hashtags, rights status, safety flags) for publishing on @mentalpodcastshow with the original creator's permission and credit
- Editorial standards, privacy and safety information
- Podcast and guest submission workflow
- Responsive mobile navigation
- Custom domain and GitHub Pages support

## Clip Studio & the YouTube clipping pipeline

The niche is configured from the show's own channel description: *dating, relationships, mental health and sex — honest, real conversations*. The pipeline clips **other channels in the niche** and publishes on **@mentalpodcastshow**, with a rights workflow (Creative Commons / written permission) and credit to the original creator. The pipeline lives in [CLIP-PIPELINE.md](CLIP-PIPELINE.md) and the website ships a working first version of it in the **Clip Studio** section:

1. **Pull a video** — paste another channel's YouTube URL; public metadata and the video's license (title, channel, thumbnail, CC or standard) are pulled without any key. An optional YouTube Data API key (stored only in the visitor's browser) enables niche search with candidate ranking, Creative Commons filtering and own-channel exclusion.
2. **Paste the public transcript** — copy it from the video's ⋯ → *Show transcript* panel (or use the demo sample). The studio cleans, chunks and scores every line for hook, emotional, story and practical signal.
3. **Review clip briefs** — draft briefs from the strongest moments (15–60s windows, ≥45s apart) with auto credit lines for the original channel. Set each brief's rights status (creative_commons / permission_granted / permission_requested / needs_review), edit inline, then queue (localStorage) or copy/export JSON. The *Copy configured pipeline prompt* button produces the full niche-configured prompt for any AI tool.

Command-line companion (`clips/discover.mjs`, Node ≥ 18):

```bash
node clips/discover.mjs                     # print niche config, keywords + queries
node clips/discover.mjs --video <URL>       # pull metadata + license + views (oEmbed; Data API if YT_API_KEY set)
YT_API_KEY=... node clips/discover.mjs --search      # run queries, rank, write clips/candidates.json
YT_API_KEY=... node clips/discover.mjs --search --cc # same, Creative Commons videos only
YT_API_KEY=... node clips/discover.mjs --top         # HIGH-VIEW leaderboard: sort by views (min 5000), write clips/top-videos.json
YT_API_KEY=... node clips/discover.mjs --top --cc --min-views 1000
node clips/discover.mjs --captions <URL>    # best-effort public captions
```

No API key is required for the basic workflow. `clips/niche.json` is the single niche config consumed by the CLI and mirrored in the website. Track creator permissions in `clips/permissions.json` (template: `clips/permissions.example.json`).

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
4. Review Clip Studio briefs before publishing anything — publish only clips with `creative_commons` or `permission_granted` rights, always credit the original channel, and remember mental-health clips are conversation, not medical advice, and crisis-adjacent clips must carry a support note (988).
