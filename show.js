import { podcasts } from './data/podcasts.js';
const params = new URLSearchParams(location.search);
const show = podcasts.find(item => item.id === params.get('id'));
const root = document.getElementById('show-content');
const esc = (value = '') => value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));

if (!show) {
  document.title = 'Podcast not found | Mental Podcast Show';
  root.innerHTML = `<section class="page-shell"><p class="eyebrow">Not found</p><h1>We could not find that podcast.</h1><p>The listing may have moved or the link may be incorrect.</p><a class="button primary" href="index.html#directory">Return to the directory</a></section>`;
} else {
  document.title = `${show.title} | Mental Podcast Show`;
  document.querySelector('meta[name="description"]').setAttribute('content', show.summary);
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = `https://mentalpodcastshow.com/show.html?id=${show.id}`;
  document.head.appendChild(canonical);
  const schema = document.createElement('script');
  schema.type = 'application/ld+json';
  schema.textContent = JSON.stringify({
    '@context':'https://schema.org',
    '@type':'PodcastSeries',
    'name':show.title,
    'url':show.website,
    'description':show.summary,
    'inLanguage':'en',
    'author':{'@type':'Person','name':show.host}
  });
  document.head.appendChild(schema);
  root.innerHTML = `<section class="show-hero">
      <div class="show-cover" aria-hidden="true">${esc(show.initials)}</div>
      <div>
        <p class="eyebrow">Independent podcast profile</p>
        <h1>${esc(show.title)}</h1>
        <p class="hero-lede">${esc(show.summary)}</p>
        <div class="badges">${[...show.authority, show.status].map(label => `<span class="badge">${esc(label)}</span>`).join('')}</div>
        <p><strong>Hosted by:</strong> ${esc(show.host)}${show.organization !== show.host ? ` · ${esc(show.organization)}` : ''}</p>
        <a class="button primary" href="${esc(show.website)}" target="_blank" rel="noopener noreferrer">Visit official website</a>
      </div>
    </section>
    <section class="show-meta-grid">
      <div class="meta-box"><strong>Format</strong>${esc(show.format)}</div>
      <div class="meta-box"><strong>Typical length</strong>${esc(show.duration)}</div>
      <div class="meta-box"><strong>Release status</strong>${esc(show.status)} · ${esc(show.cadence)}</div>
      <div class="meta-box"><strong>Language</strong>${esc(show.language)}</div>
      <div class="meta-box"><strong>Country</strong>${esc(show.country)}</div>
      <div class="meta-box"><strong>Content</strong>${show.explicit ? 'May include explicit language or sensitive material' : 'Generally listed as non-explicit'}</div>
    </section>
    <section class="show-section"><h2>Why listeners might start here</h2><p>${esc(show.whyStart)}</p></section>
    <section class="show-section"><h2>Topics</h2><div class="topic-pills">${show.topics.map(topic => `<span class="badge">${esc(topic)}</span>`).join('')}</div></section>
    <section class="show-section info-panel"><h2>How this profile was reviewed</h2><p>Details were checked against the ${esc(show.sourceLabel.toLowerCase())}. Last reviewed ${esc(show.reviewed)}. This profile is an independent editorial summary and is not an endorsement of medical advice.</p><p><a href="editorial-standards.html">Read the editorial standards</a> · <a href="submit.html">Report an update</a></p></section>`;
}
