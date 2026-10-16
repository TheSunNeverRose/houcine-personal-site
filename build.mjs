import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import cfg from './site.config.mjs';
const R = process.cwd(), D = path.join(R, 'dist'), B = cfg.base || '', U = (cfg.url || '').replace(/\/$/, ''), serve = process.argv.includes('--serve');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const H = p => B + p, errs = [];
const STAT = { exploring: 'Exploring', 'in-progress': 'In progress', experiment: 'Experiment', completed: 'Completed', archived: 'Archived' };
const safe = u => /^(https?:|mailto:|\/|#|\.)/.test(u) ? (u[0] === '/' ? B + u : u) : '#';
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safe(u)}" alt="${a}" loading="lazy">`)
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safe(u)}"${/^https?:/.test(u) ? ' rel="noopener noreferrer" target="_blank"' : ''}>${t}</a>`);
function md(src) { // small, safe Markdown: raw HTML is always escaped
  const L = src.replace(/\r/g, '').split('\n'), LI = /^([-*]|\d+\.) /; let o = '', i = 0;
  const splitTableRow = s => s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const isTableDivider = s => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
  while (i < L.length) { const l = L[i];
    if (/^```/.test(l)) { const c = []; i++; while (i < L.length && !/^```/.test(L[i])) c.push(L[i++]); i++; o += `<pre><code>${esc(c.join('\n'))}</code></pre>`; }
    else if (i + 1 < L.length && l.includes('|') && isTableDivider(L[i + 1])) {
      const headers = splitTableRow(L[i++]); i++; const rows = [];
      while (i < L.length && L[i].trim() && L[i].includes('|')) rows.push(splitTableRow(L[i++]));
      const th = headers.map(c => `<th scope="col">${inline(c)}</th>`).join('');
      const tb = rows.map(row => `<tr>${headers.map((_, n) => `<td>${inline(row[n] || '')}</td>`).join('')}</tr>`).join('');
      o += `<div class="table-wrap" role="region" tabindex="0" aria-label="Scrollable data table"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`;
    }
    else if (/^#{2,3} /.test(l)) { const n = l.match(/^#+/)[0].length; o += `<h${n}>${inline(l.slice(n + 1))}</h${n}>`; i++; }
    else if (/^> /.test(l)) { const c = []; while (i < L.length && /^> /.test(L[i])) c.push(L[i++].slice(2)); o += `<blockquote><p>${inline(c.join(' '))}</p></blockquote>`; }
    else if (LI.test(l)) { const t = /^\d/.test(l) ? 'ol' : 'ul', c = []; while (i < L.length && LI.test(L[i])) c.push(`<li>${inline(L[i++].replace(LI, ''))}</li>`); o += `<${t}>${c.join('')}</${t}>`; }
    else if (/^---+$/.test(l)) { o += '<hr>'; i++; }
    else if (!l.trim()) i++;
    else { const c = []; while (i < L.length && L[i].trim() && !/^(```|#{2,3} |> |([-*]|\d+\.) |---+$)/.test(L[i])) c.push(L[i++]); o += `<p>${inline(c.join(' '))}</p>`; }
  } return o;
}
function load(dir) {
  const d = path.join(R, 'content', dir); if (!fs.existsSync(d)) return []; const seen = new Set();
  return fs.readdirSync(d).filter(f => f.endsWith('.md')).flatMap(f => {
    const m = fs.readFileSync(path.join(d, f), 'utf8').replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) { errs.push(`${dir}/${f}: missing front matter`); return []; }
    const x = {}; for (const ln of m[1].split('\n')) { const k = ln.match(/^(\w+):\s*(.*)$/); if (!k) continue; let v = k[2].trim();
      v = /^\[.*\]$/.test(v) ? v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean) : v === 'true' ? true : v === 'false' ? false : v.replace(/^["']|["']$/g, ''); x[k[1]] = v; }
    x.slug = x.slug || f.replace(/\.md$/, '');
    for (const k of ['title', 'description', 'date']) if (!x[k]) errs.push(`${dir}/${f}: missing "${k}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.slug)) errs.push(`${dir}/${f}: invalid slug "${x.slug}"`);
    if (seen.has(x.slug)) errs.push(`${dir}: duplicate slug "${x.slug}"`); seen.add(x.slug);
    if (x.draft === true || x.status === 'draft') return [];
    if (dir === 'projects' && !STAT[x.status]) errs.push(`${dir}/${f}: status must be one of ${Object.keys(STAT).join(', ')}`);
    x.tags = x.tags || []; x.body = m[2]; x.html = md(m[2]); x.kind = dir; x.url = `/${dir}/${x.slug}/`;
    x.mins = Math.max(1, Math.round(m[2].split(/\s+/).length / 220)); return [x];
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
const date = d => String(d).slice(0, 10);
const nav = [['/', 'Home'], ['/writing/', 'Writing'], ['/projects/', 'Projects'], ['/about/', 'About'], ['/search/', 'Search']];
const links = () => [cfg.email && `<a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`, ...Object.entries(cfg.social || {}).filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" rel="noopener noreferrer" target="_blank">${esc(k)}</a>`)].filter(Boolean);
function layout({ title, desc, path: p, body, type = 'website' }) {
  const t = title ? `${title} | ${cfg.title}` : cfg.title, d = esc(desc || cfg.tagline), L = links();
  return `<!doctype html><html lang="${cfg.lang || 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t)}</title><meta name="description" content="${d}">${U ? `<link rel="canonical" href="${U}${B}${p}"><meta property="og:url" content="${U}${B}${p}">` : ''}<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${d}"><meta property="og:type" content="${type}"><meta name="twitter:card" content="summary"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#10100f"><link rel="icon" type="image/svg+xml" href="${H('/favicon.svg?v=2')}"><link rel="stylesheet" href="${H('/style.css')}"><script defer src="${H('/app.js')}"></script></head><body><a class="skip" href="#main">Skip to content</a><header class="top"><div class="in"><a class="mark" href="${H('/')}">${esc(cfg.name)}</a><button class="menu" type="button" aria-expanded="false" aria-controls="nav">Menu</button><nav id="nav" aria-label="Primary">${nav.map(([u, n]) => `<a href="${H(u)}"${p === u || (u !== '/' && p.startsWith(u)) ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav></div></header><main id="main">${body}</main><footer><div class="in"><a class="mark" href="${H('/')}">${esc(cfg.name)}</a><nav aria-label="Footer">${nav.slice(0, 4).map(([u, n]) => `<a href="${H(u)}">${n}</a>`).join('')}${L.join('')}</nav><p>&copy; ${new Date().getFullYear()} ${esc(cfg.name)}. ${esc(cfg.footerLine)}</p></div></footer></body></html>`;
}
const row = (x, extra) => `<li class="row" data-cat="${esc(x.category)}"><a href="${H(x.url)}"><span class="meta mono">${date(x.date)}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><span class="meta">${[x.category, extra].filter(Boolean).map(esc).join('<i></i>')}${x.sample ? '<span class="tag sample">Demonstration</span>' : ''}</span></div></a></li>`;
const sec = (t, l, items, fn) => `<section class="in sec"><div class="sh"><h2 class="label">${t}</h2><a href="${H(l)}">View all</a></div>${items.length ? `<ul class="list">${items.map(fn).join('')}</ul>` : '<p class="empty">Nothing here yet.</p>'}</section>`;
const pick = a => [...a.filter(x => x.featured), ...a.filter(x => !x.featured)].slice(0, 3);
const related = (x, all) => all.filter(y => y !== x).map(y => [y, (y.category && y.category === x.category ? 1 : 0) + y.tags.filter(t => x.tags.includes(t)).length]).filter(a => a[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(a => a[0]);
const home = (A, P) => layout({ path: '/', body: `<section class="in hero"><div class="hero-grid"><div class="hero-copy"><p class="label"><span class="live-dot"></span>${esc(cfg.heroLabel)}</p><h1>${esc(cfg.headline)}</h1><p class="lede">${esc(cfg.intro)}</p><p class="cta"><a class="btn btn-primary" href="${H('/writing/')}">Read the writing <span aria-hidden="true">↗</span></a><a class="text-link" href="${H('/projects/')}">Explore projects <span aria-hidden="true">→</span></a></p></div><aside class="hero-note" aria-label="A note on how this site works"><p class="note-kicker mono">NOTE TO SELF</p><div class="note-mark" aria-hidden="true">“</div><p class="note-quote">Check the reasoning, not just how convincing it sounds.</p><div class="note-rule"></div><div class="note-bottom"><span>PERSONAL NOTES</span><span>SUBJECT TO CHANGE</span></div></aside></div><div class="hero-foot"><span>A FEW THINGS I'M INTO RIGHT NOW</span><a href="${H('/about/')}">A little about me <span aria-hidden="true">↗</span></a></div></section>
<section class="in sec interests-sec"><div class="section-intro"><p class="label">Areas of interest</p><h2>Things I keep<br>coming back to.</h2></div><ul class="idx">${cfg.interests.map((i, n) => `<li><span class="interest-name"><span class="index-no mono">0${n + 1}</span>${esc(i.name)}</span><span class="meta">${esc(i.note)}</span></li>`).join('')}</ul></section>
${sec('Writing', '/writing/', pick(A), x => row(x, `${x.mins} min read`))}${sec('Projects', '/projects/', pick(P), x => row(x, STAT[x.status]))}
<section class="in sec focus-sec"><div class="section-intro"><p class="label">Lately</p><h2>What I'm working on<br>right now.</h2><p class="section-desc">What I've been spending time on lately.</p></div><dl class="focus">${cfg.focus.map((f, i) => `<div class="focus-item"><dt><span class="index-no mono">0${i + 1}</span>${esc(f.label)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl></section>
<section class="in sec close"><p class="label">For now</p><p class="big">${esc(cfg.closing)}</p><p><a class="btn" href="${H('/about/')}">About me <span aria-hidden="true">↗</span></a></p></section>` });
function indexPage(kind, label, h1, intro, items, fn) {
  const c = [...new Set(items.map(x => x.category).filter(Boolean))];
  return layout({ title: label, desc: intro, path: `/${kind}/`, body: `<section class="in sec first"><p class="label">${label}</p><h1>${h1}</h1><p class="lede">${intro}</p>${c.length > 1 ? `<div class="filters" role="group" aria-label="Filter by category" hidden><button type="button" aria-pressed="true" data-f="">All</button>${c.map(k => `<button type="button" aria-pressed="false" data-f="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}${items.length ? `<ul class="list">${items.map(fn).join('')}</ul><p class="empty nomatch" hidden>Nothing in this category yet.</p>` : `<p class="empty">Nothing published yet. Add a file to <code>content/${kind}/</code> and rebuild.</p>`}</section>` });
}
function detail(x, all, back, meta, pn = '') {
  const r = related(x, all);
  return layout({ title: x.title, desc: x.description, path: x.url, type: 'article', body: `<div class="in"><article class="read"><a class="back" href="${H(back[0])}">Back to ${back[1]}</a><header class="ah"><p class="label">${esc(x.category || back[1])}</p><h1>${esc(x.title)}</h1><p class="lede">${esc(x.description)}</p>${meta}</header>${x.sample ? '<p class="note"><strong>Demonstration content.</strong> This shows how the template works. It is not real published work or a real result. Delete the file, or remove <code>sample: true</code>, when you replace it.</p>' : ''}<div class="prose">${x.html}</div>${x.tags.length ? `<p class="tags">${x.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</p>` : ''}${pn}${r.length ? `<section class="rel"><h2 class="label">Related</h2><ul class="list">${r.map(y => row(y)).join('')}</ul></section>` : ''}</article></div>` });
}
const pnav = (o, n) => o || n ? `<nav class="pn" aria-label="More writing">${o ? `<a href="${H(o.url)}"><span class="meta">Older</span>${esc(o.title)}</a>` : '<span></span>'}${n ? `<a class="r" href="${H(n.url)}"><span class="meta">Newer</span>${esc(n.title)}</a>` : '<span></span>'}</nav>` : '';
const facts = x => `<dl class="facts">${[['Status', STAT[x.status]], ['Category', x.category], ['Started', date(x.date)], ['Updated', x.updated && date(x.updated)]].filter(f => f[1]).map(f => `<div><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl>`;
const li = a => a.map(s => `<li>${esc(s)}</li>`).join('');
function build() {
  errs.length = 0; fs.rmSync(D, { recursive: true, force: true });
  const A = load('writing'), P = load('projects');
  if (errs.length) { console.error('Content errors:\n- ' + errs.join('\n- ')); if (!serve) process.exit(1); }
  const put = (p, s) => { const f = path.join(D, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
  if (fs.existsSync('static')) fs.cpSync('static', D, { recursive: true });
  put('index.html', home(A, P));
  put('writing/index.html', indexPage('writing', 'Writing', 'Things I have been thinking about', 'Ideas, questions, and notes as they develop.', A, x => row(x, `${x.mins} min read`)));
  A.forEach((x, i) => put(`writing/${x.slug}/index.html`, detail(x, A, ['/writing/', 'writing'], `<p class="meta"><span class="mono">${date(x.date)}</span>${x.updated ? `<i></i>Updated ${date(x.updated)}` : ''}<i></i>${x.mins} min read</p>`, pnav(A[i + 1], A[i - 1]))));
  put('projects/index.html', indexPage('projects', 'Projects', 'Projects and research exercises', 'A working research agent and a sourced market-entry desk study. Each page separates what I have built or checked from what remains unanswered.', P, x => row(x, STAT[x.status])));
  P.forEach(x => put(`projects/${x.slug}/index.html`, detail(x, P, ['/projects/', 'projects'], facts(x))));
  const a = cfg.about, L = links();
  put('about/index.html', layout({ title: 'About', desc: a.intro[0], path: '/about/', body: `<div class="in sec first"><article class="read"><p class="label">About</p><h1>A little about me</h1><div class="prose">${a.intro.map(p => `<p>${esc(p)}</p>`).join('')}<h2>What I'm focused on</h2><p>${esc(a.stage)}</p><h2>Questions on my mind</h2><ul>${li(a.questions)}</ul><h2>What I'm learning</h2><ul>${li(a.learning)}</ul><h2>Where I'd like to go</h2><p>${esc(a.direction)}</p><h2>Contact</h2><p>${L.length ? L.join(', ') : 'Contact details will appear here once they are added.'}</p><p><a href="${H('/writing/')}">Read the writing</a> or <a href="${H('/projects/')}">see the projects</a>.</p></div></article></div>` }));
  put('search/index.html', layout({ title: 'Search', desc: 'Search the writing and projects.', path: '/search/', body: `<section class="in sec first"><p class="label">Search</p><h1>Find something</h1><form role="search" data-search data-index="${H('/search.json')}"><label for="q" class="meta">Search writing and projects</label><div class="sf"><input id="q" type="search" autocomplete="off"><button type="button" id="clear" class="btn">Clear</button></div></form><p id="st" class="meta" role="status"></p><ul id="res" class="list"></ul><noscript><p class="empty">Search needs JavaScript. Browse the <a href="${H('/writing/')}">writing</a> or <a href="${H('/projects/')}">projects</a> instead.</p></noscript></section>` }));
  put('search.json', JSON.stringify([...A, ...P].map(x => ({ t: x.title, d: x.description, u: H(x.url), k: x.kind === 'writing' ? 'Writing' : 'Project', x: x.body.replace(/[#*`>\[\]()_-]/g, ' ').slice(0, 4000) }))));
  put('404.html', layout({ title: 'Not found', path: '/404/', body: `<section class="in sec first"><h1>Page not found</h1><p class="lede">That address does not exist here. <a href="${H('/')}">Go to the homepage</a>.</p></section>` }));
  put('robots.txt', `User-agent: *\nAllow: /\n${U ? `Sitemap: ${U}${B}/sitemap.xml\n` : ''}`);
  if (U) put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/writing/', '/projects/', '/about/', '/search/', ...A.map(x => x.url), ...P.map(x => x.url)].map(u => `<url><loc>${U}${B}${u}</loc></url>`).join('')}</urlset>`);
  else console.warn('Note: set `url` in site.config.mjs to generate sitemap.xml and canonical links.');
  console.log(`Built ${A.length} articles and ${P.length} projects into dist/`);
}
build();
if (serve) http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (B && p.startsWith(B)) p = p.slice(B.length) || '/';
  if (!path.extname(p)) try { build(); } catch (e) { console.error(e); }
  let f = path.join(D, p); if (!f.startsWith(D)) return r.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) return r.writeHead(404).end('Not found');
  r.writeHead(200, { 'Content-Type': { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' }[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f));
}).listen(4321, () => console.log('Preview: http://localhost:4321'));
