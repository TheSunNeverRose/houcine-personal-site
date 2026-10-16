const q = s => document.querySelector(s), btn = q('.menu'), nav = q('#nav');
const shut = () => { btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
btn?.addEventListener('click', () => { const o = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!o)); nav.classList.toggle('open', !o); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav?.classList.contains('open')) { shut(); btn.focus(); } });
const fg = q('.filters');
if (fg) { fg.hidden = false; fg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  fg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); let n = 0;
  document.querySelectorAll('.row').forEach(r => { const s = !b.dataset.f || r.dataset.cat === b.dataset.f; r.hidden = !s; n += s; }); q('.nomatch').hidden = n > 0; }); }
const s = q('[data-search]');
if (s) { const i = q('#q'), out = q('#res'), st = q('#st'); let data = [];
  const run = () => { const w = i.value.toLowerCase().split(/\s+/).filter(Boolean); out.replaceChildren(); if (!w.length) { st.textContent = ''; return; }
    const r = data.filter(d => w.every(x => (d.t + ' ' + d.d + ' ' + d.x).toLowerCase().includes(x)));
    st.textContent = r.length ? `${r.length} result${r.length > 1 ? 's' : ''}` : 'No results. Try fewer or different words.';
    r.forEach(d => { const li = document.createElement('li'), a = document.createElement('a'), h = document.createElement('h3'), p = document.createElement('p'); li.className = 'row s'; a.href = d.u; h.textContent = d.t; p.textContent = d.k + ': ' + d.d; a.append(h, p); li.append(a); out.append(li); }); };
  s.addEventListener('submit', e => e.preventDefault()); i.addEventListener('input', run);
  q('#clear').addEventListener('click', () => { i.value = ''; run(); i.focus(); });
  fetch(s.dataset.index).then(r => r.json()).then(j => { data = j; i.value = new URLSearchParams(location.search).get('q') || ''; run(); }); }
