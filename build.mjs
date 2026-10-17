import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import cfg from './site.config.mjs';

const R = process.cwd();
const D = path.join(R, 'dist');
const B = cfg.base || '';
const U = (cfg.url || '').replace(/\/$/, '');
const serve = process.argv.includes('--serve');
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const H = p => B + p;
const errs = [];
const STAT = { exploring: 'Exploring', 'in-progress': 'In progress', experiment: 'Experiment', completed: 'Completed', archived: 'Archived' };
const safe = u => /^(https?:|mailto:|\/|#|\.)/.test(u) ? (u[0] === '/' ? B + u : u) : '#';
const xml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const faqItems = [
  {
    q: 'What is this website about?',
    a: "Houcine's personal website collects short essays, project write-ups, and research notes. Current topics include international business, negotiation, AI-assisted research, and philosophy. The focus is on work in progress and what the sources or code actually show."
  },
  {
    q: 'Who writes this site, and what are their qualifications?',
    a: 'Houcine writes and maintains this website. It is a self-directed learning log, not a professional publication. No degrees, job titles, or professional certifications are claimed on the site. Readers can assess each entry from its reasoning, methods, and linked sources.'
  },
  {
    q: 'What topics or categories does the site cover?',
    a: 'The main topics are business and entrepreneurship, negotiation and human behaviour, international business and market entry, technology and AI, and philosophy. Examples include a desk study of Tunisian olive oil in Singapore, an essay about persuasion versus negotiation, and the Ultimate Reality Researcher software project.'
  },
  {
    q: 'What kind of information can I find here?',
    a: 'The site contains short essays, source-linked research notes, software project documentation, and desk research. The market-entry study separates reported trade data from estimates and unanswered questions. Project pages describe the approach and limitations instead of presenting every exercise as a proven result. Reading times are shown on writing listings.'
  },
  {
    q: 'How often is new content published?',
    a: 'There is no fixed publishing schedule. Posts appear irregularly when Houcine has a piece of writing or a project result worth documenting. The site does not promise weekly or monthly updates. Dates on each article show when it was published and, where listed, updated.'
  },
  {
    q: 'Does the site have an email newsletter, and how can I subscribe?',
    a: 'There is no email newsletter or mailing list. Readers can subscribe to new writing using the free RSS feed at /feed.xml in any compatible feed reader.'
  },
  {
    q: 'Can I submit a guest post or pitch an idea?',
    a: 'There is no guest-author program or submission form, and guest posts are not currently being solicited. There is no general contact form or public email address. Technical feedback about the Ultimate Reality Researcher project can be sent through its public GitHub repository.'
  },
  {
    q: 'Is any content paid or available only to subscribers?',
    a: 'No. All currently published writing and project pages are free to read. There are no paid tiers, memberships, paywalls, premium articles, or paid downloads.'
  },
  {
    q: 'Who is the intended audience?',
    a: 'The intended audience is curious readers, students, and self-learners interested in business decisions, international markets, negotiation, AI-assisted research, and philosophy. The site is a personal learning log rather than a source of professional, legal, investment, or business advice.'
  },
  {
    q: 'Are the project pages proof that a product or business has been launched?',
    a: 'No. The Tunisian olive oil page is a desk-research exercise, not a launched business, buyer survey, shipping quote, or validated market-entry recommendation. The Ultimate Reality Researcher is a working software project and its page records an implementation issue; it does not claim to have settled metaphysical or religious questions.'
  }
];

const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safe(u)}" alt="${a}" loading="lazy">`)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safe(u)}"${/^https?:/.test(u) ? ' rel="noopener noreferrer" target="_blank"' : ''}>${t}</a>`);

function md(src) { // Small Markdown renderer. Raw HTML is escaped.
  const L = src.replace(/\r/g, '').split('\n');
  const LI = /^([-*]|\d+\.) /;
  let o = '', i = 0;
  const splitTableRow = s => s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const isTableDivider = s => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
  while (i < L.length) {
    const l = L[i];
    if (/^```/.test(l)) {
      const c = []; i++;
      while (i < L.length && !/^```/.test(L[i])) c.push(L[i++]);
      i++; o += `<pre><code>${esc(c.join('\n'))}</code></pre>`;
    } else if (i + 1 < L.length && l.includes('|') && isTableDivider(L[i + 1])) {
      const headers = splitTableRow(L[i++]); i++;
      const rows = [];
      while (i < L.length && L[i].trim() && L[i].includes('|')) rows.push(splitTableRow(L[i++]));
      const th = headers.map(c => `<th scope="col">${inline(c)}</th>`).join('');
      const tb = rows.map(row => `<tr>${headers.map((_, n) => `<td>${inline(row[n] || '')}</td>`).join('')}</tr>`).join('');
      o += `<div class="table-wrap" role="region" tabindex="0" aria-label="Scrollable data table"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
    } else if (/^#{2,3} /.test(l)) {
      const n = l.match(/^#+/)[0].length; o += `<h${n}>${inline(l.slice(n + 1))}</h${n}>`; i++;
    } else if (/^> /.test(l)) {
      const c = []; while (i < L.length && /^> /.test(L[i])) c.push(L[i++].slice(2));
      o += `<blockquote><p>${inline(c.join(' '))}</p></blockquote>`;
    } else if (LI.test(l)) {
      const t = /^\d/.test(l) ? 'ol' : 'ul', c = [];
      while (i < L.length && LI.test(L[i])) c.push(`<li>${inline(L[i++].replace(LI, ''))}</li>`);
      o += `<${t}>${c.join('')}</${t}>`;
    } else if (/^---+$/.test(l)) { o += '<hr>'; i++; }
    else if (!l.trim()) i++;
    else {
      const c = [];
      while (i < L.length && L[i].trim() && !/^(```|#{2,3} |> |([-*]|\d+\.) |---+$)/.test(L[i])) c.push(L[i++]);
      o += `<p>${inline(c.join(' '))}</p>`;
    }
  }
  return o;
}

function load(dir) {
  const d = path.join(R, 'content', dir);
  if (!fs.existsSync(d)) return [];
  const seen = new Set();
  return fs.readdirSync(d).filter(f => f.endsWith('.md')).flatMap(f => {
    const m = fs.readFileSync(path.join(d, f), 'utf8').replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) { errs.push(`${dir}/${f}: missing front matter`); return []; }
    const x = {};
    for (const ln of m[1].split('\n')) {
      const k = ln.match(/^(\w+):\s*(.*)$/); if (!k) continue;
      let v = k[2].trim();
      v = /^\[.*\]$/.test(v) ? v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean) : v === 'true' ? true : v === 'false' ? false : v.replace(/^['"]|['"]$/g, '');
      x[k[1]] = v;
    }
    x.slug = x.slug || f.replace(/\.md$/, '');
    for (const k of ['title', 'description', 'date']) if (!x[k]) errs.push(`${dir}/${f}: missing "${k}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.slug)) errs.push(`${dir}/${f}: invalid slug "${x.slug}"`);
    if (seen.has(x.slug)) errs.push(`${dir}: duplicate slug "${x.slug}"`); seen.add(x.slug);
    if (x.draft === true || x.status === 'draft') return [];
    if (dir === 'projects' && !STAT[x.status]) errs.push(`${dir}/${f}: status must be one of ${Object.keys(STAT).join(', ')}`);
    x.tags = x.tags || [];
    x.body = m[2]; x.html = md(m[2]); x.kind = dir; x.url = `/${dir}/${x.slug}/`;
    x.mins = Math.max(1, Math.round(m[2].split(/\s+/).length / 220));
    return [x];
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const date = d => String(d).slice(0, 10);
const nav = [['/', 'Home'], ['/writing/', 'Writing'], ['/projects/', 'Projects'], ['/about/', 'About'], ['/faq/', 'FAQ'], ['/search/', 'Search']];
const links = () => [cfg.email && `<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`, ...Object.entries(cfg.social || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" rel="noopener noreferrer" target="_blank">${esc(k)}</a>`)].filter(Boolean);
const personId = U ? `${U}/#person` : '#person';
const websiteId = U ? `${U}/#website` : '#website';
function schemaScript({ title, desc, path: p, pageType = 'WebPage', mainEntity, extraSchema = [] }) {
  if (!U) return '';
  const canon = `${U}${B}${p}`;
  const pageId = `${canon}#webpage`;
  const person = {
    '@type': 'Person', '@id': personId, name: cfg.name, url: `${U}${B}/about/`,
    description: cfg.authorDescription,
    sameAs: Object.values(cfg.social || {}).filter(Boolean),
    knowsAbout: (cfg.interests || []).map(i => i.name)
  };
  const website = {
    '@type': 'WebSite', '@id': websiteId, url: `${U}${B}/`, name: cfg.title,
    description: cfg.tagline, inLanguage: cfg.lang || 'en', publisher: { '@id': personId }
  };
  const page = {
    '@type': pageType, '@id': pageId, url: canon, name: title, description: desc,
    isPartOf: { '@id': websiteId }, about: { '@id': personId }, inLanguage: cfg.lang || 'en'
  };
  if (mainEntity !== undefined) page.mainEntity = mainEntity;
  const graph = [website, person, page, ...extraSchema];
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}
function layout({ title, desc, path: p, body, type = 'website', pageType = 'WebPage', mainEntity, extraSchema = [] }) {
  const rawTitle = title ? `${title} | ${cfg.name}` : 'Houcine | Business, AI, Philosophy and Research Notes';
  // Keep titles distinctive without appending a long site name to already-long article titles.
  const t = rawTitle.length > 60 ? (title && title.length <= 60 ? title : rawTitle.slice(0, 57).trimEnd() + '…') : rawTitle;
  const rawDesc = (desc || cfg.tagline).replace(/\\s+/g, ' ').trim();
  const metaDesc = rawDesc.length > 155 ? rawDesc.slice(0, 152).replace(/\\s+\\S*$/, '') + '…' : rawDesc;
  const d = esc(metaDesc);
  const L = links();
  const canonical = U ? `${U}${B}${p}` : '';
  const canonicalTag = canonical ? `<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">` : '';
  const schemas = schemaScript({ title: t, desc: metaDesc, path: p, pageType, mainEntity, extraSchema });
  const robots = ['/search/', '/404/'].includes(p) ? 'noindex,follow' : 'index,follow,max-image-preview:large';
  const ogImage = U ? `${U}${B}/og-cover.png` : `${B}/og-cover.png`;
  return `<!doctype html><html lang="${cfg.lang || 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><meta name="description" content="${d}"><meta name="robots" content="${robots}">${canonicalTag}<meta property="og:site_name" content="${esc(cfg.title)}"><meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${d}"><meta property="og:type" content="${type}"><meta property="og:locale" content="en_US"><meta property="og:image" content="${esc(ogImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(ogImage)}"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#10100f"><link rel="icon" type="image/svg+xml" href="${H('/favicon.svg?v=2')}"><link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)} RSS" href="${H('/feed.xml')}"><link rel="stylesheet" href="${H('/style.css')}"><script defer src="${H('/app.js')}"></script>${schemas}</head><body><a class="skip" href="#main">Skip to content</a><header class="top"><div class="in"><a class="mark" href="${H('/')}">${esc(cfg.name)}</a><button class="menu" type="button" aria-expanded="false" aria-controls="nav">Menu</button><nav id="nav" aria-label="Primary">${nav.map(([u, n]) => `<a href="${H(u)}"${p === u || (u !== '/' && p.startsWith(u)) ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav></div></header><main id="main">${body}</main><footer><div class="in"><a class="mark" href="${H('/')}">${esc(cfg.name)}</a><nav aria-label="Footer">${nav.filter(([u]) => u !== '/search/').map(([u, n]) => `<a href="${H(u)}">${n}</a>`).join('')}<a href="${H('/feed.xml')}">RSS</a>${L.join('')}</nav><p>&copy; ${new Date().getFullYear()} ${esc(cfg.name)}. ${esc(cfg.footerLine)}</p></div></footer></body></html>`;
}

const row = (x, extra) => `<li class="row" data-cat="${esc(x.category)}"><a href="${H(x.url)}"><span class="meta mono">${date(x.date)}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><span class="meta">${[x.category, extra].filter(Boolean).map(esc).join('<i></i>')}${x.sample ? '<span class="tag sample">Demonstration</span>' : ''}</span></div></a></li>`;
const sec = (t, l, items, fn) => `<section class="in sec"><div class="sh"><h2 class="label">${t}</h2><a href="${H(l)}">View all</a></div>${items.length ? `<ul class="list">${items.map(fn).join('')}</ul>` : '<p class="empty">Nothing here yet.</p>'}</section>`;
const pick = a => [...a.filter(x => x.featured), ...a.filter(x => !x.featured)].slice(0, 3);
const related = (x, all) => all.filter(y => y !== x).map(y => [y, (y.category && y.category === x.category ? 1 : 0) + y.tags.filter(t => x.tags.includes(t)).length]).filter(a => a[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(a => a[0]);

const home = (A, P) => layout({ path: '/', body: `<section class="in hero"><div class="hero-grid"><div class="hero-copy"><p class="label"><span class="live-dot"></span>${esc(cfg.heroLabel)}</p><h1>${esc(cfg.headline)}</h1><p class="lede">${esc(cfg.intro)}</p><p class="cta"><a class="btn btn-primary" href="${H('/writing/')}">Read the writing <span aria-hidden="true">↗</span></a><a class="text-link" href="${H('/projects/')}">Explore projects <span aria-hidden="true">→</span></a></p></div><aside class="hero-note" aria-label="A note on how this site works"><p class="note-kicker mono">A NOTE</p><div class="note-mark" aria-hidden="true">“</div><p class="note-quote">Check the source, then check what the source actually supports.</p><div class="note-rule"></div><div class="note-bottom"><span>PERSONAL NOTES</span><span>UPDATED IRREGULARLY</span></div></aside></div><div class="hero-foot"><span>BUSINESS · AI · PHILOSOPHY</span><a href="${H('/about/')}">About Houcine <span aria-hidden="true">↗</span></a></div></section>
<section class="in sec interests-sec"><div class="section-intro"><p class="label">Areas of interest</p><h2>Topics I keep<br>coming back to.</h2></div><ul class="idx">${cfg.interests.map((i, n) => `<li><span class="interest-name"><span class="index-no mono">0${n + 1}</span>${esc(i.name)}</span><span class="meta">${esc(i.note)}</span></li>`).join('')}</ul></section>
${sec('Writing', '/writing/', pick(A), x => row(x, `${x.mins} min read`))}${sec('Projects', '/projects/', pick(P), x => row(x, STAT[x.status]))}
<section class="in sec focus-sec"><div class="section-intro"><p class="label">Lately</p><h2>What I'm working on<br>right now.</h2><p class="section-desc">A few concrete things from the current work.</p></div><dl class="focus">${cfg.focus.map((f, i) => `<div class="focus-item"><dt><span class="index-no mono">0${i + 1}</span>${esc(f.label)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl></section>
<section class="in sec site-info"><div class="section-intro"><p class="label">Site information</p><h2>Before you browse.</h2></div><div class="prose"><p>${esc(cfg.audience)}</p><p>${esc(cfg.publishingSchedule)}</p><p>${esc(cfg.contentPolicy)} ${esc(cfg.newsletterPolicy)}</p><p>${esc(cfg.submissionsPolicy)}</p><p><a href="${H('/faq/')}">Read the full FAQ</a> or <a href="${H('/feed.xml')}">subscribe to the RSS feed</a>.</p></div></section>
<section class="in sec close"><p class="label">For now</p><p class="big">${esc(cfg.closing)}</p><p><a class="btn" href="${H('/about/')}">About me <span aria-hidden="true">↗</span></a></p></section>` });

function indexPage(kind, label, h1, intro, items, fn) {
  const c = [...new Set(items.map(x => x.category).filter(Boolean))];
  const canon = U ? `${U}${B}/${kind}/` : '';
  const listId = canon ? `${canon}#item-list` : `/${kind}/#item-list`;
  const itemList = { '@type': 'ItemList', '@id': listId, itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: U ? `${U}${B}${x.url}` : x.url, name: x.title })) };
  return layout({ title: label, desc: intro, path: `/${kind}/`, pageType: 'CollectionPage', mainEntity: { '@id': listId }, extraSchema: [itemList], body: `<section class="in sec first"><p class="label">${label}</p><h1>${h1}</h1><p class="lede">${intro}</p>${c.length > 1 ? `<div class="filters" role="group" aria-label="Filter by category" hidden><button type="button" aria-pressed="true" data-f="">All</button>${c.map(k => `<button type="button" aria-pressed="false" data-f="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}${items.length ? `<ul class="list">${items.map(fn).join('')}</ul><p class="empty nomatch" hidden>Nothing in this category yet.</p>` : `<p class="empty">Nothing published yet. Add a file to <code>content/${kind}/</code> and rebuild.</p>`}</section>` });
}

function detail(x, all, back, meta, pn = '') {
  const r = related(x, all);
  const canonical = U ? `${U}${B}${x.url}` : x.url;
  let workSchema;
  if (x.kind === 'writing') {
    workSchema = {
      '@type': 'BlogPosting', '@id': canonical + '#article', headline: x.title, description: x.description,
      datePublished: date(x.date), dateModified: date(x.updated || x.date), isAccessibleForFree: true,
      author: { '@id': personId }, publisher: { '@id': personId }, mainEntityOfPage: { '@id': canonical + '#webpage' },
      articleSection: x.category, keywords: x.tags
    };
  } else {
    workSchema = {
      '@type': x.slug === 'ultimate-reality-researcher' ? 'SoftwareSourceCode' : 'CreativeWork',
      '@id': canonical + '#work', name: x.title, description: x.description,
      dateCreated: date(x.date), dateModified: date(x.updated || x.date), isAccessibleForFree: true, author: { '@id': personId },
      mainEntityOfPage: { '@id': canonical + '#webpage' }, keywords: x.tags, genre: x.category
    };
    if (x.slug === 'ultimate-reality-researcher') workSchema.codeRepository = 'https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher';
  }
  return layout({ title: x.title, desc: x.description, path: x.url, type: 'article', extraSchema: [workSchema], body: `<div class="in"><article class="read"><a class="back" href="${H(back[0])}">Back to ${back[1]}</a><header class="ah"><p class="label">${esc(x.category || back[1])}</p><h1>${esc(x.title)}</h1><p class="lede">${esc(x.description)}</p>${meta}</header>${x.sample ? '<p class="note"><strong>Demonstration content.</strong> This shows how the template works. It is not real published work or a real result. Delete the file, or remove <code>sample: true</code>, when you replace it.</p>' : ''}<div class="prose">${x.html}</div>${x.tags.length ? `<p class="tags">${x.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}${pn}${r.length ? `<section class="rel"><h2 class="label">Related</h2><ul class="list">${r.map(y => row(y)).join('')}</ul></section>` : ''}</article></div>` });
}

const pnav = (o, n) => o || n ? `<nav class="pn" aria-label="More writing">${o ? `<a href="${H(o.url)}"><span class="meta">Older</span>${esc(o.title)}</a>` : '<span></span>'}${n ? `<a class="r" href="${H(n.url)}"><span class="meta">Newer</span>${esc(n.title)}</a>` : '<span></span>'}</nav>` : '';
const facts = x => `<dl class="facts">${[['Status', STAT[x.status]], ['Category', x.category], ['Started', date(x.date)], ['Updated', x.updated && date(x.updated)]].filter(f => f[1]).map(f => `<div><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl>`;
const li = a => a.map(s => `<li>${esc(s)}</li>`).join('');
const plainText = s => String(s || '').replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`|]/g, ' ').replace(/\s+/g, ' ').trim();
const pageUrl = p => U ? `${U}${B}${p}` : `${B}${p}`;

function build() {
  errs.length = 0;
  fs.rmSync(D, { recursive: true, force: true });
  const A = load('writing'), P = load('projects');
  if (errs.length) { console.error('Content errors:\n- ' + errs.join('\n- ')); if (!serve) process.exit(1); }
  const put = (p, s) => { const f = path.join(D, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
  if (fs.existsSync('static')) fs.cpSync('static', D, { recursive: true });

  put('index.html', home(A, P));
  put('writing/index.html', indexPage('writing', 'Writing', 'Writing and notes', 'Short essays on negotiation and international business, including a source-based market-entry exercise.', A, x => row(x, `${x.mins} min read`)));
  A.forEach((x, i) => put(`writing/${x.slug}/index.html`, detail(x, A, ['/writing/', 'writing'], `<p class="meta"><span class="mono">${date(x.date)}</span>${x.updated ? `<i></i>Updated ${date(x.updated)}` : ''}<i></i>${x.mins} min read</p>`, pnav(A[i + 1], A[i - 1]))));
  put('projects/index.html', indexPage('projects', 'Projects', 'Projects and research exercises', 'Two public projects: an AI research program and a sourced market-entry desk study. Neither claims to have settled a philosophical question or validated a business opportunity.', P, x => row(x, STAT[x.status])));
  P.forEach(x => put(`projects/${x.slug}/index.html`, detail(x, P, ['/projects/', 'projects'], facts(x))));

  const about = cfg.about;
  const profileId = `${U}${B}/#person`;
  put('about/index.html', layout({ title: 'About', desc: about.intro[0], path: '/about/', pageType: 'ProfilePage', mainEntity: { '@id': profileId }, body: `<div class="in sec first"><article class="read"><p class="label">About</p><h1>About Houcine</h1><div class="prose">${about.intro.map(p => `<p>${esc(p)}</p>`).join('')}<h2>What I'm working on</h2><p>${esc(about.stage)}</p><h2>Questions I'm looking into</h2><ul>${li(about.questions)}</ul><h2>What I'm learning</h2><ul>${li(about.learning)}</ul><h2>Where I'd like to go</h2><p>${esc(about.direction)}</p><h2>Contact and feedback</h2><p>There is no general contact form or public email address at the moment. For technical feedback about the research agent, visit its <a href="https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher" rel="noopener noreferrer" target="_blank">public GitHub repository</a>.</p><p><a href="${H('/writing/')}">Read the writing</a>, <a href="${H('/projects/')}">browse the projects</a>, or check the <a href="${H('/faq/')}">site FAQ</a>.</p></div></article></div>` }));

  const faqSchemaItems = faqItems.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } }));
  const faqBody = faqItems.map((item, i) => {
    let answerHtml = `<p>${esc(item.a).replace(/\/feed\.xml/g, `<a href="${H('/feed.xml')}">/feed.xml</a>`)}</p>`;
    if (i === 6) answerHtml = `<p>There is no guest-author program or submission form, and guest posts are not currently being solicited. There is no general contact form or public email address. For technical feedback about <em>Ultimate Reality Researcher</em>, use the <a href="https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher" rel="noopener noreferrer" target="_blank">public GitHub repository</a>.</p>`;
    return `<section class="faq-item"><h2>${esc(item.q)}</h2>${answerHtml}</section>`;
  }).join('');
  put('faq/index.html', layout({ title: 'Frequently asked questions', desc: 'Direct answers about the author, topics, publishing schedule, newsletter, free access, and guest submissions.', path: '/faq/', pageType: ['WebPage', 'FAQPage'], mainEntity: faqSchemaItems, body: `<section class="in sec first"><article class="read"><p class="label">FAQ</p><h1>Frequently asked questions</h1><p class="lede">A few direct answers about the site and what to expect from it.</p><div class="prose">${faqBody}<p>More detail about the author and current projects is on the <a href="${H('/about/')}">About page</a>. New writing is available through the <a href="${H('/feed.xml')}">RSS feed</a>.</p></div></article></section>` }));

  put('search/index.html', layout({ title: 'Search', desc: 'Search the writing and projects.', path: '/search/', body: `<section class="in sec first"><p class="label">Search</p><h1>Find something</h1><form role="search" data-search data-index="${H('/search.json')}"><label for="q" class="meta">Search writing and projects</label><div class="sf"><input id="q" type="search" autocomplete="off"><button type="button" id="clear" class="btn">Clear</button></div></form><p id="st" class="meta" role="status"></p><ul id="res" class="list"></ul><noscript><p class="empty">Search needs JavaScript. Browse the <a href="${H('/writing/')}">writing</a> or <a href="${H('/projects/')}">projects</a> instead.</p></noscript></section>` }));
  put('search.json', JSON.stringify([...A, ...P].map(x => ({ t: x.title, d: x.description, u: H(x.url), k: x.kind === 'writing' ? 'Writing' : 'Project', x: x.body.replace(/[#*`>\[\]()_-]/g, ' ').slice(0, 4000) }))));
  put('404.html', layout({ title: 'Not found', desc: 'The requested page could not be found. Return to Houcine’s homepage or browse the published writing and projects.', path: '/404/', body: `<section class="in sec first"><h1>Page not found</h1><p class="lede">That address does not exist here. <a href="${H('/')}">Go to the homepage</a>.</p></section>` }));

  const sitemapPaths = ['/', '/writing/', '/projects/', '/about/', '/faq/', ...A.map(x => x.url), ...P.map(x => x.url)];
  const crawlAgents = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended',
    'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'PerplexityBot',
    'Perplexity-User', 'CCBot', 'Applebot-Extended', 'Bytespider',
    'Amazonbot', 'Meta-ExternalAgent', 'MistralAI-User'
  ];
  // Give each named crawler an explicit allow-all group so audits do not mistake
  // a generic group or an absent named group for a partial restriction.
  put('robots.txt', `User-agent: *\nAllow: /\n\n${crawlAgents.map(agent => `User-agent: ${agent}\nAllow: /`).join('\n\n')}\n${U ? `\nSitemap: ${U}${B}/sitemap.xml\n` : ''}`);
  if (U) {
    const dateMap = new Map([...A, ...P].map(x => [x.url, date(x.updated || x.date)]));
    put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map(p => `<url><loc>${xml(`${U}${B}${p}`)}</loc>${dateMap.has(p) ? `<lastmod>${dateMap.get(p)}</lastmod>` : ''}</url>`).join('')}</urlset>`);
  } else console.warn('Set url in site.config.mjs to generate canonical links and a sitemap.');

  const llmsSections = [
    '# ' + cfg.title,
    `> Personal website by ${cfg.name}: essays, research notes, and small projects about business, international markets, negotiation, AI-assisted research, and philosophy.`,
    '',
    cfg.audience,
    '',
    `Author and credentials: ${cfg.authorDescription}`,
    `Publishing: ${cfg.publishingSchedule}`,
    `Access: ${cfg.contentPolicy}`,
    `Newsletter: ${cfg.newsletterPolicy}`,
    `Submissions: ${cfg.submissionsPolicy}`,
    '',
    '## Key pages',
    `- [Home](${pageUrl('/')}): Overview of the site, its main topics, current work, publishing schedule, and access policy.`,
    `- [About](${pageUrl('/about/')}): Author background, current interests, learning goals, and project context.`,
    `- [Frequently asked questions](${pageUrl('/faq/')}): Direct answers about the site, content access, newsletter, posting frequency, and submissions.`,
    `- [Writing](${pageUrl('/writing/')}): Published essays and research notes.`,
    `- [Projects](${pageUrl('/projects/')}): Public software and research exercises.`,
    `- [RSS feed](${pageUrl('/feed.xml')}): Subscribe to new writing in a feed reader.`,
    '',
    '## Writing',
    ...A.map(x => `- [${x.title}](${pageUrl(x.url)}): ${x.description} Published ${date(x.date)}.`),
    '',
    '## Projects',
    ...P.map(x => `- [${x.title}](${pageUrl(x.url)}): ${x.description} Status: ${STAT[x.status]}.`),
    '',
    '## Notes on interpretation',
    '- The site is a personal learning log, not a professional advisory service.',
    '- The Tunisian olive oil and Singapore page is desk research, not a launched business or a validated market-entry recommendation.',
    '- Ultimate Reality Researcher is experimental software. It does not establish the truth of any metaphysical or religious conclusion.',
    '- No products, paid memberships, premium posts, or email newsletter are offered.'
  ].join('\n');
  put('llms.txt', llmsSections + '\n');

  const feedItems = A.map(x => {
    const url = pageUrl(x.url);
    const pubDate = new Date(`${date(x.date)}T00:00:00Z`).toUTCString();
    const description = plainText(x.body).slice(0, 700);
    return `<item><title>${xml(x.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${xml(pubDate)}</pubDate><description>${xml(description)}</description></item>`;
  }).join('');
  const latest = A.length ? new Date(`${date(A[0].updated || A[0].date)}T00:00:00Z`).toUTCString() : new Date().toUTCString();
  put('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(cfg.title)}</title><link>${xml(pageUrl('/'))}</link><description>${xml(cfg.tagline)}</description><language>en</language><atom:link href="${xml(pageUrl('/feed.xml'))}" rel="self" type="application/rss+xml"/><lastBuildDate>${xml(latest)}</lastBuildDate>${feedItems}</channel></rss>`);

  console.log(`Built ${A.length} articles and ${P.length} projects into dist/`);
  console.log('Added FAQ page, RSS feed, llms.txt, sitemap, and structured data.');
}

build();
if (serve) http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (B && p.startsWith(B)) p = p.slice(B.length) || '/';
  if (!path.extname(p)) try { build(); } catch (e) { console.error(e); }
  let f = path.join(D, p);
  if (!f.startsWith(D)) return r.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) return r.writeHead(404).end('Not found');
  r.writeHead(200, { 'Content-Type': { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml;charset=utf-8', '.txt': 'text/plain;charset=utf-8' }[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(4321, () => console.log('Preview: http://localhost:4321'));
