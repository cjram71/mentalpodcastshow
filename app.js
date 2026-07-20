import { podcasts, topicGroups } from './data/podcasts.js';

const state = { query: '', topic: 'All topics', feeling: '', authority: 'all', status: 'all' };
const grid = document.getElementById('podcast-grid');
const resultCount = document.getElementById('result-count');
const emptyState = document.getElementById('empty-state');
const activeFilter = document.getElementById('active-filter');
const directorySearch = document.getElementById('directory-search');
const heroSearch = document.getElementById('hero-search');
const authorityFilter = document.getElementById('authority-filter');
const statusFilter = document.getElementById('status-filter');

const escapeHTML = (value = '') => value.replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));

function topicMatch(show, topic) {
  if (topic === 'All topics') return true;
  return show.topics.some(item => item.toLowerCase().includes(topic.toLowerCase()));
}

function renderTopicPills() {
  const shell = document.getElementById('topic-pills');
  shell.innerHTML = topicGroups.map(topic => `<button type="button" data-topic="${escapeHTML(topic)}" aria-pressed="${topic === state.topic}">${escapeHTML(topic)}</button>`).join('');
  shell.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    state.topic = button.dataset.topic;
    state.feeling = '';
    document.querySelectorAll('[data-feeling]').forEach(item => item.setAttribute('aria-pressed', 'false'));
    renderTopicPills();
    renderDirectory();
    document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
  }));
}

function filteredShows() {
  const q = state.query.trim().toLowerCase();
  return podcasts.filter(show => {
    const haystack = [show.title, show.host, show.organization, show.summary, ...show.topics, ...show.authority, ...show.audience].join(' ').toLowerCase();
    return (!q || haystack.includes(q)) &&
      topicMatch(show, state.topic) &&
      (!state.feeling || show.feelings.includes(state.feeling)) &&
      (state.authority === 'all' || show.authority.includes(state.authority)) &&
      (state.status === 'all' || show.status === state.status);
  });
}

function renderCard(show) {
  const statusClass = show.status === 'On break' ? 'break' : 'status';
  const labels = [...show.authority.slice(0, 2), show.status];
  return `<article class="podcast-card">
    <div class="podcast-cover" aria-hidden="true">${escapeHTML(show.initials)}</div>
    <div class="card-main">
      <h3>${escapeHTML(show.title)}</h3>
      <p class="host">${escapeHTML(show.host)} · ${escapeHTML(show.country)}</p>
      <div class="badges">
        ${labels.map(label => `<span class="badge ${label === show.status ? statusClass : ''}">${escapeHTML(label)}</span>`).join('')}
      </div>
      <p class="summary">${escapeHTML(show.summary)}</p>
      <div class="card-actions">
        <a class="profile-link" href="show.html?id=${encodeURIComponent(show.id)}">View profile →</a>
        <a class="listen-link" href="${escapeHTML(show.website)}" target="_blank" rel="noopener noreferrer">Official site ↗</a>
      </div>
    </div>
  </article>`;
}

function renderDirectory() {
  const shows = filteredShows();
  grid.innerHTML = shows.map(renderCard).join('');
  resultCount.textContent = `${shows.length} ${shows.length === 1 ? 'show' : 'shows'} in this collection`;
  emptyState.hidden = shows.length !== 0;
  grid.hidden = shows.length === 0;

  const active = [];
  if (state.query) active.push(`search: “${state.query}”`);
  if (state.topic !== 'All topics') active.push(state.topic);
  if (state.feeling) active.push(`feeling: ${state.feeling}`);
  if (state.authority !== 'all') active.push(state.authority);
  if (state.status !== 'all') active.push(state.status);
  activeFilter.hidden = active.length === 0;
  activeFilter.textContent = active.length ? `Showing ${active.join(' · ')}` : '';
}

function applySearch(value) {
  state.query = value;
  directorySearch.value = value;
  renderDirectory();
  document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
}

heroSearch.addEventListener('keydown', event => { if (event.key === 'Enter') applySearch(heroSearch.value); });
document.getElementById('hero-search-button').addEventListener('click', () => applySearch(heroSearch.value));
directorySearch.addEventListener('input', event => { state.query = event.target.value; renderDirectory(); });
authorityFilter.addEventListener('change', event => { state.authority = event.target.value; renderDirectory(); });
statusFilter.addEventListener('change', event => { state.status = event.target.value; renderDirectory(); });

document.getElementById('clear-filters').addEventListener('click', () => {
  Object.assign(state, { query: '', topic: 'All topics', feeling: '', authority: 'all', status: 'all' });
  directorySearch.value = '';
  heroSearch.value = '';
  authorityFilter.value = 'all';
  statusFilter.value = 'all';
  document.querySelectorAll('[data-feeling]').forEach(item => item.setAttribute('aria-pressed', 'false'));
  renderTopicPills();
  renderDirectory();
});

document.querySelectorAll('[data-feeling]').forEach(button => button.addEventListener('click', () => {
  const next = state.feeling === button.dataset.feeling ? '' : button.dataset.feeling;
  state.feeling = next;
  document.querySelectorAll('[data-feeling]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.feeling === next)));
  renderDirectory();
  document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
}));

const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.getElementById('primary-nav');
menuToggle.addEventListener('click', () => {
  const open = primaryNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
primaryNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  primaryNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

renderTopicPills();
renderDirectory();
