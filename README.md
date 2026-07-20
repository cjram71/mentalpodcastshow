# Mental Podcast Show

A curated mental-health, relationships and emotional-wellbeing podcast directory built as a static GitHub Pages site.

## Current release

- Search by show, host and topic
- Browse by feeling and topic
- Filter by editorial perspective and show status
- Individual reference profile pages
- Editorial standards
- Global help page
- Podcast submission form using mailto
- Responsive and accessible design
- GitHub Pages workflow
- Custom domain file for `mentalpodcastshow.com`

## Edit the podcast directory

Podcast data lives in:

```text
data/podcasts.js
```

Each podcast is one JavaScript object. Add a unique `id`, an official source URL, a review date and editorial labels.

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages deployment

The repository includes `.github/workflows/pages.yml`.

In GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions**.
3. Push to `main`.
4. Add the custom domain `mentalpodcastshow.com` if GitHub does not detect the `CNAME` file automatically.
5. Configure your domain DNS according to GitHub Pages documentation.
6. Enable **Enforce HTTPS** after DNS is verified.

## Email addresses to configure

The submission form uses:

```text
submissions@mentalpodcastshow.com
```

Create that mailbox or replace it in `submit.html`.

## Important editorial note

This site is a discovery resource, not a clinical service. Do not add diagnostic tools, personalised health profiles or emergency advice without professional and legal review.

## Future data architecture

The UI is intentionally separated from `data/podcasts.js`. A future release can replace this with:

- RSS feed ingestion
- Podcast Index API
- Supabase or PostgreSQL
- Server-generated podcast profile pages
- A moderation dashboard
- Episode-level search and collections
