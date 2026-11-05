/* StudioSports — общий скрипт: хранилище, шапка, меню, поиск, карточки */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- хранилище (localStorage может быть недоступен)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ss_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ss_' + k, JSON.stringify(v)); } catch {} },
  };
  const rub = n => Math.round(n).toLocaleString('ru-RU').replace(/ |,/g, ' ') + ' ₽';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/["«»()]/g, ' ');

  const TIERS = [[30000, 15], [20000, 12], [15000, 10], [10000, 7], [5000, 5]];
  const discountPct = sum => (TIERS.find(([s]) => sum >= s) || [0, 0])[1];

  // ---------- корзина
  const cart = {
    items: () => store.get('cart', []),
    save(items) { store.set('cart', items); counts(); },
    add(item) {
      const items = cart.items();
      const same = items.find(x => x.of === item.of && x.k === item.k);
      if (same) same.q += item.q; else items.push(item);
      cart.save(items);
    },
    count: () => cart.items().reduce((a, x) => a + x.q, 0),
  };
  // ---------- избранное
  const fav = {
    list: () => store.get('fav', []),
    has: k => fav.list().includes(k),
    toggle(k) {
      const l = fav.list(); const i = l.indexOf(k);
      i < 0 ? l.unshift(k) : l.splice(i, 1);
      store.set('fav', l); counts(); return i < 0;
    },
  };
  function counts() {
    const c = cart.count(), f = fav.list().length;
    $$('[data-count=cart]').forEach(el => { el.textContent = c; el.hidden = !c; });
    $$('[data-count=fav]').forEach(el => { el.textContent = f; el.hidden = !f; });
  }

  // ---------- каталог (грузим один раз)
  let catP;
  const catalog = () => catP || (catP = fetch('data/catalog.json').then(r => r.json()).then(d => {
    d.byKey = Object.fromEntries(d.products.map(p => [p.k, p]));
    return d;
  }));

  const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"/></svg>';
  function sizeRange(sz) {
    if (!sz.length) return '';
    const nums = sz.flatMap(s => (s.match(/\d+/g) || []).map(Number));
    if (nums.length && sz.every(s => /^\d/.test(s))) {
      const a = Math.min(...nums), b = Math.max(...nums);
      return (a >= 80 ? 'Рост ' : 'Размер ') + (a === b ? a : `${a}–${b}`);
    }
    return sz.slice(0, 4).join(', ') + (sz.length > 4 ? '…' : '');
  }
  function card(p) {
    const url = 'product.html?p=' + encodeURIComponent(p.k);
    const [a, b] = p.i;
    const range = sizeRange(p.sz);
    return `<article class="p">
  <a class="p-img${b ? ' has2' : ''}" href="${url}">
    ${a ? `<img src="img/m/${a}.jpg" alt="${esc(p.n)}" loading="lazy">` : ''}
    ${b ? `<img class="p-img2" src="img/m/${b}.jpg" alt="" loading="lazy">` : ''}
    ${p.nw ? '<span class="chip">Новинка</span>' : ''}
  </a>
  <button class="p-fav${fav.has(p.k) ? ' on' : ''}" data-fav="${esc(p.k)}" aria-label="В избранное">${HEART}</button>
  <a class="p-name" href="${url}">${esc(p.n)}</a>
  <div class="p-meta"><span class="p-price">${p.pm > p.p ? 'от ' : ''}${rub(p.p)}</span>${range ? `<span class="p-size">${esc(range)}</span>` : ''}</div>
</article>`;
  }

  // ---------- тост
  let toastT;
  function toast(html) {
    const t = $('#toast'); if (!t) return;
    t.innerHTML = html; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  // ---------- оверлеи: data-open="id", data-close
  function openLayer(id) {
    closeLayers();
    const el = document.getElementById(id); if (!el) return;
    el.classList.add('open'); document.body.classList.add('lock', 'lock-' + id);
    if (id === 'search') setTimeout(() => $('[data-search]')?.focus(), 50);
    if (id === 'drawer') buildDrawer();
  }
  function closeLayers() {
    $$('.open').forEach(el => el.classList.remove('open'));
    document.body.className = document.body.className.replace(/\block(-\S+)?\b/g, '').trim();
  }
  document.addEventListener('click', ev => {
    const o = ev.target.closest('[data-open]');
    if (o) { ev.preventDefault(); const id = o.dataset.open;
      document.getElementById(id)?.classList.contains('open') ? closeLayers() : openLayer(id); return; }
    if (ev.target.closest('[data-close]')) { closeLayers(); return; }
    const f = ev.target.closest('[data-fav]');
    if (f) {
      ev.preventDefault(); const on = fav.toggle(f.dataset.fav);
      $$(`[data-fav="${CSS.escape(f.dataset.fav)}"]`).forEach(b => b.classList.toggle('on', on));
      toast(on ? 'Добавлено в <a href="favorites.html">избранное</a>' : 'Убрано из избранного');
      return;
    }
    const r = ev.target.closest('[data-rail]');
    if (r) { const rail = r.closest('section').querySelector('.rail');
      rail.scrollBy({ left: r.dataset.rail * rail.clientWidth * 0.75, behavior: 'smooth' }); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeLayers(); });

  // ---------- мега-меню и мобильное меню
  async function buildMega() {
    const box = $('[data-mega]'); if (!box || box.dataset.ready) return;
    const d = await catalog(); box.dataset.ready = 1;
    box.innerHTML = d.tree.map(r => `<div class="mega-col"><a class="mega-root" href="catalog.html?s=${r.s}">${esc(r.n)} <small>${r.c}</small></a>
      ${r.ch.slice(0, 7).map(c => `<a href="catalog.html?s=${c.s}">${esc(c.n)}</a>`).join('')}
      ${r.ch.length > 7 ? `<a class="mega-all" href="catalog.html?s=${r.s}">Ещё ${r.ch.length - 7} →</a>` : ''}</div>`).join('');
  }
  async function buildDrawer() {
    const box = $('[data-drawer-tree]'); if (!box || box.dataset.ready) return;
    const d = await catalog(); box.dataset.ready = 1;
    box.innerHTML = '<a class="dt-all" href="catalog.html">Весь каталог</a>' + d.tree.map(r => r.ch.length
      ? `<details><summary>${esc(r.n)}</summary><a href="catalog.html?s=${r.s}">Все товары раздела · ${r.c}</a>${r.ch.map(c => `<a href="catalog.html?s=${c.s}">${esc(c.n)}</a>`).join('')}</details>`
      : `<a class="dt-root" href="catalog.html?s=${r.s}">${esc(r.n)}</a>`).join('');
  }
  const navCat = $('.nav-cat');
  if (navCat) {
    const hdr = $('.hdr'); let t;
    const show = () => { clearTimeout(t); buildMega(); hdr.classList.add('mega-on'); };
    const hide = () => { t = setTimeout(() => hdr.classList.remove('mega-on'), 180); };
    navCat.addEventListener('mouseenter', show); navCat.addEventListener('mouseleave', hide);
    $('#mega').addEventListener('mouseenter', show); $('#mega').addEventListener('mouseleave', hide);
    navCat.removeAttribute('data-open');
    navCat.addEventListener('click', () => hdr.classList.contains('mega-on') ? hdr.classList.remove('mega-on') : show());
  }

  // ---------- живой поиск
  const sIn = $('[data-search]');
  if (sIn) {
    let t;
    sIn.addEventListener('input', () => { clearTimeout(t); t = setTimeout(runSearch, 120); });
    async function runSearch() {
      const q = norm(sIn.value.trim()); const box = $('[data-search-res]');
      if (q.length < 2) { box.innerHTML = ''; return; }
      const d = await catalog();
      const res = search(d.products, q);
      box.innerHTML = res.length ? res.slice(0, 6).map(p => `<a class="sr" href="product.html?p=${encodeURIComponent(p.k)}">
          ${p.i[0] ? `<img src="img/m/${p.i[0]}.jpg" alt="">` : '<span></span>'}<span>${esc(p.n)}</span><b>${p.pm > p.p ? 'от ' : ''}${rub(p.p)}</b></a>`).join('')
          + `<a class="sr-all" href="catalog.html?q=${encodeURIComponent(sIn.value.trim())}">Все результаты · ${res.length}</a>`
        : '<p class="sr-none">Ничего не нашлось. Попробуйте другое слово.</p>';
    }
  }
  function search(products, q) {
    const words = norm(q).split(/\s+/).filter(Boolean).map(w => w.replace(/(ые|ий|ая|ое|ы|и|а|я|е|у|ю|ов|ей)$/, ''));
    return products.filter(p => { const n = norm(p.n); return words.every(w => n.includes(w)); });
  }

  counts();
  window.SS = { $, $$, store, rub, esc, norm, cart, fav, catalog, card, toast, counts, search, discountPct, openLayer, closeLayers };
})();
