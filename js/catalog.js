/* Каталог и избранное: разделы, фильтры, сортировка, поиск, «показать ещё» */
(async () => {
  const { $, $$, esc, card, catalog, fav, search } = SS;
  const PER = 24;
  const FAV = location.pathname.endsWith('favorites.html');
  const d = await catalog();
  const anc = s => { const out = []; while (s) { out.push(s); s = d.parent[s]; } return out; };
  d.products.forEach(p => { p.all = new Set(p.s.flatMap(anc)); });
  const findNode = (nodes, s) => { for (const n of nodes) { if (n.s === s) return n; const f = findNode(n.ch, s); if (f) return f; } };

  const url = new URL(location.href);
  const st = {
    s: url.searchParams.get('s') || '', q: url.searchParams.get('q') || '',
    nw: url.searchParams.get('new') === '1', own: url.searchParams.get('own') === '1',
    pmin: +url.searchParams.get('pmin') || 0, pmax: +url.searchParams.get('pmax') || 0,
    sz: (url.searchParams.get('sz') || '').split(',').filter(Boolean),
    sort: url.searchParams.get('sort') || 'pop', page: 1,
  };
  if (st.s && !d.names[st.s]) st.s = '';

  // ---------- шапка страницы
  const node = st.s ? findNode(d.tree, st.s) : null;
  const title = FAV ? 'Избранное' : st.q ? `Поиск: «${st.q}»` : node ? node.n : st.nw ? 'Новинки' : 'Каталог';
  $('[data-title]').textContent = title;
  document.title = title + ' — StudioSports';
  const crumbs = ['<a href="index.html">Главная</a>'];
  if (FAV) crumbs.push('<span>Избранное</span>');
  else {
    crumbs.push(st.s || st.q || st.nw ? '<a href="catalog.html">Каталог</a>' : '<span>Каталог</span>');
    if (st.s) anc(st.s).reverse().forEach((s, i, a) => crumbs.push(i === a.length - 1 ? `<span>${esc(d.names[s])}</span>` : `<a href="catalog.html?s=${s}">${esc(d.names[s])}</a>`));
  }
  $('[data-crumbs]').innerHTML = crumbs.join('');
  const subs = FAV || st.q ? [] : node ? node.ch : d.tree;
  $('[data-subs]').innerHTML = subs.map(n => `<a class="sub" href="catalog.html?s=${n.s}">${esc(n.n)}<small>${n.c}</small></a>`).join('');

  // ---------- дерево в сайдбаре
  // компактно: ссылка на уровень выше + разделы текущего уровня
  const level = !node ? d.tree : node.ch.length ? node.ch : (d.parent[st.s] ? findNode(d.tree, d.parent[st.s]).ch : d.tree);
  const upSlug = !node ? null : node.ch.length ? d.parent[st.s] : d.parent[d.parent[st.s]] ?? null;
  const upNode = node && (node.ch.length ? node : findNode(d.tree, d.parent[st.s]) || null);
  const tree = nodes => '<ul>' + nodes.map(n => `<li class="${n.s === st.s ? 'cur' : ''}">
    <a href="catalog.html?s=${n.s}">${esc(n.n)}<small>${n.c}</small></a></li>`).join('') + '</ul>';
  $('[data-tree]').innerHTML = (node
      ? `<a class="tree-all" href="${upSlug ? 'catalog.html?s=' + upSlug : 'catalog.html'}">← ${esc(upSlug ? d.names[upSlug] : 'Весь каталог')}</a>`
        + (upNode ? `<a class="tree-cur${upNode.s === st.s ? ' on' : ''}" href="catalog.html?s=${upNode.s}">${esc(upNode.n)}<small>${upNode.c}</small></a>` : '')
      : '') + tree(level);
  if (FAV) $('[data-tree]').closest('.f-block').hidden = true;

  // ---------- базовый набор (раздел / поиск / избранное)
  let base = d.products;
  if (FAV) { const l = fav.list(); base = l.map(k => d.byKey[k]).filter(Boolean); }
  if (st.s) base = base.filter(p => p.all.has(st.s));
  if (st.q) base = search(base, st.q);

  // размеры, которые реально есть в наборе
  const szCount = {};
  base.forEach(p => p.sz.forEach(s => szCount[s] = (szCount[s] || 0) + 1));
  const ORD = ['XXS', 'XS', 'S', 'M', 'М', 'L', 'XL', 'XXL'];
  const szKey = s => /^\d/.test(s) ? [0, parseInt(s)] : ORD.includes(s) ? [1, ORD.indexOf(s)] : [2, 0];
  const sizes = Object.keys(szCount).filter(s => szCount[s] >= Math.min(3, base.length) && s.length <= 12 && s !== 'Не указан')
    .sort((a, b) => { const x = szKey(a), y = szKey(b); return x[0] - y[0] || x[1] - y[1] || a.localeCompare(b); }).slice(0, 30);
  $('[data-sizes]').innerHTML = sizes.map(s => `<button type="button" data-sz="${esc(s)}" class="${st.sz.includes(s) ? 'on' : ''}">${esc(s)}</button>`).join('');
  $('[data-size-block]').hidden = !sizes.length;

  // ---------- элементы управления
  const pmin = $('[data-pmin]'), pmax = $('[data-pmax]'), nw = $('[data-new]'), own = $('[data-own]'), sort = $('[data-sort]');
  if (st.pmin) pmin.value = st.pmin; if (st.pmax) pmax.value = st.pmax;
  nw.checked = st.nw; own.checked = st.own; sort.value = st.sort;
  const prices = base.map(p => p.p);
  if (prices.length) { pmin.placeholder = 'от ' + Math.min(...prices); pmax.placeholder = 'до ' + Math.max(...prices); }

  function apply() {
    let list = base.filter(p =>
      (!st.nw || p.nw) && (!st.own || p.own) &&
      (!st.pmin || p.pm >= st.pmin) && (!st.pmax || p.p <= st.pmax) &&
      (!st.sz.length || st.sz.some(s => p.sz.includes(s))));
    const by = { asc: (a, b) => a.p - b.p, desc: (a, b) => b.p - a.p, az: (a, b) => a.n.localeCompare(b.n, 'ru'), new: (a, b) => b.nw - a.nw };
    if (by[st.sort]) list = [...list].sort(by[st.sort]);
    return list;
  }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }

  function render(append) {
    const list = apply(); const shown = Math.min(list.length, st.page * PER);
    const grid = $('[data-grid]');
    const from = append ? (st.page - 1) * PER : 0;
    const html = list.slice(from, shown).map(card).join('');
    append ? grid.insertAdjacentHTML('beforeend', html) : (grid.innerHTML = html);
    $('[data-total]').textContent = `${list.length} ${plural(list.length, 'товар', 'товара', 'товаров')}`;
    $('[data-empty]').hidden = !!list.length;
    if (FAV && !base.length) $('[data-empty]').innerHTML = '<h3>В избранном пока пусто</h3><p>Нажимайте на сердечко у товаров — они появятся здесь.</p><a class="btn btn--dark" href="catalog.html">Перейти в каталог</a>';
    $('[data-more]').hidden = shown >= list.length;
    $('[data-shown]').textContent = list.length > PER ? `Показано ${shown} из ${list.length}` : '';
    // активные фильтры
    const chips = [];
    if (st.nw) chips.push(['new', 'Новинки']); if (st.own) chips.push(['own', 'Своё производство']);
    if (st.pmin || st.pmax) chips.push(['price', `${st.pmin || 0} – ${st.pmax || '∞'} ₽`]);
    st.sz.forEach(s => chips.push(['sz:' + s, s]));
    $('[data-active]').innerHTML = chips.map(([k, t]) => `<button class="af" data-rm="${esc(k)}">${esc(t)} ×</button>`).join('');
    $('.f-open').dataset.n = chips.length || '';
    syncUrl();
  }
  function syncUrl() {
    const u = new URL(location.href); const sp = u.searchParams;
    const set = (k, v) => v ? sp.set(k, v) : sp.delete(k);
    set('s', st.s); set('q', st.q); set('new', st.nw ? 1 : ''); set('own', st.own ? 1 : '');
    set('pmin', st.pmin); set('pmax', st.pmax); set('sz', st.sz.join(',')); set('sort', st.sort === 'pop' ? '' : st.sort);
    history.replaceState(null, '', u);
  }
  const reset = () => { st.page = 1; render(); };

  let pt;
  [pmin, pmax].forEach(i => i.addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(() => { st.pmin = +pmin.value || 0; st.pmax = +pmax.value || 0; reset(); }, 350); }));
  nw.onchange = () => { st.nw = nw.checked; reset(); };
  own.onchange = () => { st.own = own.checked; reset(); };
  sort.onchange = () => { st.sort = sort.value; reset(); };
  $('[data-sizes]').addEventListener('click', ev => {
    const b = ev.target.closest('[data-sz]'); if (!b) return;
    const s = b.dataset.sz; const i = st.sz.indexOf(s);
    i < 0 ? st.sz.push(s) : st.sz.splice(i, 1); b.classList.toggle('on', i < 0); reset();
  });
  $('[data-active]').addEventListener('click', ev => {
    const b = ev.target.closest('[data-rm]'); if (!b) return; const k = b.dataset.rm;
    if (k === 'new') { st.nw = false; nw.checked = false; }
    else if (k === 'own') { st.own = false; own.checked = false; }
    else if (k === 'price') { st.pmin = st.pmax = 0; pmin.value = pmax.value = ''; }
    else { const s = k.slice(3); st.sz = st.sz.filter(x => x !== s); $(`[data-sz="${CSS.escape(s)}"]`)?.classList.remove('on'); }
    reset();
  });
  $('[data-reset]').onclick = () => {
    Object.assign(st, { nw: false, own: false, pmin: 0, pmax: 0, sz: [] });
    nw.checked = own.checked = false; pmin.value = pmax.value = ''; $$('[data-sz]').forEach(b => b.classList.remove('on')); reset();
  };
  $('[data-more]').onclick = () => { st.page++; render(true); };
  // в избранном снятое сердечко убирает карточку
  if (FAV) document.addEventListener('click', ev => {
    const f = ev.target.closest('[data-fav]'); if (!f || fav.has(f.dataset.fav)) return;
    base = base.filter(p => p.k !== f.dataset.fav); setTimeout(reset, 0);
  });
  render();
})();
