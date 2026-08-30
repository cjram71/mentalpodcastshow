# Mental Podcast Show

**[mentalpodcastshow.com](https://mentalpodcastshow.com/)** — a curated directory of mental-health
podcasts, searchable by how you feel rather than by title.

There are thousands of podcasts about anxiety, depression, ADHD, trauma, relationships,
neurodiversity, grief and personal growth. Finding the right one, on the day you need it, is still
hard. This site organises them around what a listener is actually experiencing, what kind of
conversation they want, and whose perspective it comes from — and links out to every show's
official source.

It is the companion site to the **Mental Podcast Show** on YouTube:
[@mentalpodcastshow](https://www.youtube.com/@mentalpodcastshow) — honest conversations about
relationships, dating, sex, mental health and the experiences that shape how we think, feel and
connect.

> This site is educational. It is not diagnosis, treatment, medical advice or emergency support.

## What's on the site

| Section | What it does |
| --- | --- |
| **Hero** | Scroll-resolved signal animation over the main search — canvas-drawn, no video, no image payload |
| **Start with how you feel** | Eight entry points ("I feel anxious", "I am supporting someone") that filter the directory |
| **Browse by topic** | Crawlable links to the ten highest-intent topics, each a real `?topic=` URL |
| **The directory** | Every listing filterable by search, topic, format and perspective, with a reference modal per show |
| **The original show** | The YouTube channel and the guest application route |
| **Reference desk** | About, editorial standards, crisis support, submissions and privacy |

Crisis support is deliberately never more than one click away: the banner at the top of every
screen, the floating **Get help** button, and its own red-tinted panel in the reference desk.

## Design

Single self-contained `index.html` — markup, styles and behaviour in one file, no framework, no
build-time bundler, no runtime dependencies. It stays fast because the visual identity is drawn
rather than downloaded.

- **Palette** — black `#000000`, deep red `#8d110e`, bright red `#b5201a`, paper `#f7f3f3`
- **Type** — Inter for interface, Instrument Serif italic for the emotional accents
- **Motion** — one canvas particle field resolving into an audio waveform, echoed as signal-line
  dividers between sections
- **Fallbacks** — `prefers-reduced-motion`, no-JavaScript and no-canvas all render the finished
  page directly; nothing is hidden behind an animation that might not run

Logo: `assets/mental-podcast-show-logo.webp`.

## SEO

- Title, description, canonical, Open Graph and Twitter card metadata
- `schema.org` JSON-LD: `WebSite` (with `SearchAction`), `Organization`, and a `CollectionPage`
  whose `ItemList` carries every podcast as a `PodcastSeries` — regenerated from the live podcast
  data on every build, so structured data can never drift from the directory
- `robots.txt` and `sitemap.xml`
- Deep links: `/?q=trauma` and `/?topic=ADHD` open the directory pre-filtered, so search results
  and shared links land on the right listings

**Known ceiling:** this is one page. It can rank for the brand and for a handful of long-tail
queries, but competing for *"best mental health podcasts"* against Healthline and the podcast
aggregators needs separate indexable pages per topic. That is the next structural step, not a
metadata problem.

## Build and deploy

Hosting is **Hostinger**, which pulls from this repository and runs:

```bash
npm run build     # node build.mjs
```

`build.mjs` reads `index.html` and writes a deployable `dist/`:

1. swaps the `mailto:` submission form for the live **Formspree** form and its async handler
2. verifies the official YouTube channel URL is present, and adds the footer channel link
3. regenerates the JSON-LD from the current podcast list
4. copies `404.html`, `CNAME`, `.nojekyll`, `robots.txt`, `sitemap.xml` and `assets/`

The build **fails loudly** if the submission form, its handler or the channel URL are missing —
so a refactor of `index.html` can't silently ship a broken form. `dist/` is what gets served;
never edit it by hand.

`.github/workflows/jekyll-gh-pages.yml` also publishes the repository root to GitHub Pages. Note
that Pages serves the **root**, not `dist`, so the Pages copy has the `mailto:` form rather than
the Formspree one.

## Editing the directory

Podcasts live in the `podcasts` array near the top of the `<script>` block in `index.html`:

```js
{id:'tbg', title:'…', initials:'TBG', host:'…',
 topics:['Anxiety','Relationships'],           // drives filters, tags and structured data
 feelings:['I feel overwhelmed'],              // must match the eight feeling buttons
 format:'Expert conversations',                // populates the format filter
 perspective:'Professional-led',               // populates the perspective filter
 summary:'…', official:'https://…',            // official source, always linked out
 accent:'#8d110e', status:'Active', reviewed:'July 2026'}
```

Adding an entry updates the filters, the tag list and the structured data automatically. Every
listing must link to an official source and carry a review date.

## Before publishing a listing

1. Verify the show against its official website or RSS feed.
2. Check the perspective label is accurate — labels describe the format or the host's standpoint,
   never a clinical endorsement.
3. Add content warnings for sensitive episode collections.
4. Confirm `hello@mentalpodcastshow.com` is monitored for submissions and corrections.
