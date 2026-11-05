/* Карточка товара */
(async () => {
  const { $, $$, esc, rub, cart, fav, card, catalog, toast } = SS;
  const k = new URL(location.href).searchParams.get('p');
  let p;
  try { p = await fetch('data/p/' + encodeURIComponent(k) + '.json').then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch {
    $('[data-pp]').innerHTML = '<div class="empty"><h3>Товар не найден</h3><p>Возможно, его уже нет в каталоге.</p><a class="btn btn--dark" href="catalog.html">В каталог</a></div>';
    $('[data-mbuy]')?.remove(); return;
  }
  document.title = p.n + ' — StudioSports';
  $('[data-name]').textContent = p.n;
  $('[data-crumbs]').innerHTML = '<a href="index.html">Главная</a><a href="catalog.html">Каталог</a>' +
    p.crumbs.map(([s, n]) => `<a href="catalog.html?s=${s}">${esc(n)}</a>`).join('');
  $('[data-desc]').innerHTML = p.d || '<p class="muted">Описание уточняйте у менеджера.</p>';
  if (!p.d) $('[data-desc]').closest('details').open = false;
  $('[data-own-perk]').hidden = !p.own;

  // ---------- галерея
  const imgs = p.i.length ? p.i : [];
  const gal = $('[data-gal]');
  gal.innerHTML = imgs.map((i, n) => `<figure><img src="img/l/${i}.jpg" alt="${esc(p.n)}${n ? ', фото ' + (n + 1) : ''}" ${n ? 'loading="lazy"' : ''} data-n="${n}"></figure>`).join('');
  $('[data-thumbs]').innerHTML = imgs.length > 1 ? imgs.map((i, n) => `<button data-t="${n}" class="${n ? '' : 'on'}"><img src="img/m/${i}.jpg" alt="" loading="lazy"></button>`).join('') : '';
  $('[data-dots]').innerHTML = imgs.length > 1 ? imgs.map((_, n) => `<i class="${n ? '' : 'on'}"></i>`).join('') : '';
  const go = n => gal.scrollTo({ left: n * gal.clientWidth, behavior: 'smooth' });
  $('[data-thumbs]').addEventListener('click', ev => { const b = ev.target.closest('[data-t]'); if (b) go(+b.dataset.t); });
  let st;
  gal.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => {
    const n = Math.round(gal.scrollLeft / gal.clientWidth);
    $$('[data-t]').forEach((b, i) => b.classList.toggle('on', i === n));
    $$('[data-dots] i').forEach((b, i) => b.classList.toggle('on', i === n));
    $(`[data-t="${n}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, 60); });
  // лайтбокс
  const lb = $('[data-lb]'), lbImg = $('[data-lb-img]'); let cur = 0;
  const lbShow = n => { cur = (n + imgs.length) % imgs.length; lbImg.src = `img/l/${imgs[cur]}.jpg`; };
  gal.addEventListener('click', ev => { const i = ev.target.closest('img'); if (!i) return; lbShow(+i.dataset.n); SS.openLayer('lb'); });
  $$('[data-lb-step]').forEach(b => b.onclick = () => lbShow(cur + +b.dataset.lbStep));
  document.addEventListener('keydown', ev => { if (!lb.classList.contains('open')) return;
    if (ev.key === 'ArrowRight') lbShow(cur + 1); if (ev.key === 'ArrowLeft') lbShow(cur - 1); });
  lb.addEventListener('click', ev => { if (ev.target === lb) SS.closeLayers(); });

  // ---------- варианты
  const of = p.of;
  const colorMode = p.two || p.lbl === 'Цвет';
  const sizeMode = p.two || (of.length && p.lbl !== 'Цвет');
  const sel = { c: null, s: null };
  const colors = colorMode ? [...new Set(of.map(o => o.o[0]))] : [];
  if (colors.length === 1) sel.c = colors[0];
  const ORD = ['XXS', 'XS', 'S', 'M', 'М', 'L', 'XL', 'XXL'];
  const szKey = s => /^\d/.test(s) ? [0, parseInt(s)] : ORD.includes(s) ? [1, ORD.indexOf(s)] : [2, 0];
  const sizesFor = c => [...new Set(of.filter(o => !p.two || !c || o.o[0] === c).map(o => o.o[o.o.length - 1]))]
    .sort((a, b) => { const x = szKey(a), y = szKey(b); return x[0] - y[0] || x[1] - y[1]; });
  const allSizes = sizeMode ? sizesFor(null) : [];
  if (allSizes.length === 1) sel.s = allSizes[0];
  const lblSize = /рост/i.test(p.lbl) || allSizes.every(s => /^\d{3}$/.test(s)) ? 'Рост' : 'Размер';
  $('[data-size-lbl]').textContent = lblSize;

  function offer() {
    if (!of.length) return null;
    return of.find(o => (p.two ? o.o[0] === sel.c && o.o[1] === sel.s : colorMode ? o.o[0] === sel.c : o.o[0] === sel.s)) || null;
  }
  function priceFor(c, s) {
    const m = of.filter(o => (!p.two || !c || o.o[0] === c) && (!s || o.o[o.o.length - 1] === s)).map(o => o.p);
    return m.length ? [Math.min(...m), Math.max(...m)] : [0, 0];
  }
  function draw() {
    if (colorMode) {
      $('[data-colors-w]').hidden = false;
      $('[data-colors]').innerHTML = colors.map(c => `<button data-c="${esc(c)}" class="${c === sel.c ? 'on' : ''}">${esc(c)}</button>`).join('');
      $('[data-color-val]').textContent = sel.c || 'выберите';
    }
    if (sizeMode) {
      const avail = new Set(sizesFor(sel.c));
      $('[data-sizes-w]').hidden = false;
      $('[data-sizes]').innerHTML = allSizes.map(s => `<button data-s="${esc(s)}" class="${s === sel.s ? 'on' : ''}" ${avail.has(s) ? '' : 'disabled'}>${esc(s)}</button>`).join('');
      $('[data-size-val]').textContent = sel.s || 'выберите';
    }
    const o = offer();
    let txt, note = '';
    if (o) txt = rub(o.p);
    else if (!of.length) txt = rub(p.price || 0);
    else { const [a, b] = priceFor(sel.c, sel.s); txt = (a !== b ? 'от ' : '') + rub(a); if (a !== b) note = 'цена зависит от роста'; }
    $('[data-price]').textContent = txt; $('[data-price-note]').textContent = note;
    $('[data-mprice]').textContent = txt;
    $('[data-msize]').textContent = [sel.c, sel.s].filter(Boolean).join(' · ');
  }
  $('[data-colors]').addEventListener('click', ev => { const b = ev.target.closest('[data-c]'); if (!b) return;
    sel.c = b.dataset.c; if (sel.s && !sizesFor(sel.c).includes(sel.s)) sel.s = null; hint(''); draw(); });
  $('[data-sizes]').addEventListener('click', ev => { const b = ev.target.closest('[data-s]'); if (!b || b.disabled) return;
    sel.s = b.dataset.s; hint(''); draw(); });
  const hint = t => { const h = $('[data-hint]'); h.textContent = t; h.classList.toggle('err', !!t); };

  // ---------- количество, корзина, избранное
  const qty = $('[data-qty]');
  $$('[data-q]').forEach(b => b.onclick = () => { qty.value = Math.max(1, Math.min(99, (+qty.value || 1) + +b.dataset.q)); });
  qty.onchange = () => { qty.value = Math.max(1, Math.min(99, parseInt(qty.value) || 1)); };
  $$('[data-add]').forEach(b => b.onclick = () => {
    const o = offer();
    if (of.length && !o) {
      const need = colorMode && !sel.c ? 'цвет' : lblSize.toLowerCase();
      hint(`Выберите ${need}`); $('.pp-info').scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
    cart.add({ k: p.k, of: o ? o.id : p.k, n: p.n, img: imgs[0] || '', opt: [sel.c, sel.s].filter(Boolean).join(' · '),
      p: o ? o.p : p.price || 0, q: +qty.value || 1, own: p.own });
    toast(`Добавлено в корзину · <a href="cart.html">Оформить</a>`);
    b.classList.add('added'); setTimeout(() => b.classList.remove('added'), 1200);
  });
  const favB = $('[data-fav-p]');
  favB.dataset.fav = p.k; favB.classList.toggle('on', fav.has(p.k));

  // бейджи
  const d = await catalog(); const meta = d.byKey[p.k];
  p.price = meta ? meta.p : 0;
  $('[data-badges]').innerHTML = (meta && meta.nw ? '<span class="chip chip--dark">Новинка</span>' : '') + (p.own ? '<span class="chip chip--line">Своё производство</span>' : '');
  draw();

  // мобильная плашка «в корзину» — когда основная кнопка ушла с экрана
  const mb = $('[data-mbuy]');
  new IntersectionObserver(([en]) => mb.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top < 0))
    .observe($('.buy'));

  // ---------- похожие
  const rel = d.products.filter(x => x.k !== p.k && x.s.includes(p.s)).slice(0, 12);
  if (rel.length) {
    $('[data-related-w]').hidden = false;
    $('[data-related]').innerHTML = rel.map(card).join('');
    $('[data-related-link]').href = 'catalog.html?s=' + p.s;
  }
})();
