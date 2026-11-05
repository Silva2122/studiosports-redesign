/* Корзина и оформление заказа (демо: заказ сохраняется только в браузере) */
(() => {
  const { $, $$, esc, rub, cart, discountPct, store } = SS;
  const TIERS = [5000, 10000, 15000, 20000, 30000];
  let stage = 'cart';

  function totals(items) {
    const sum = items.reduce((a, x) => a + x.p * x.q, 0);
    const ownSum = items.filter(x => x.own).reduce((a, x) => a + x.p * x.q, 0);
    const pct = discountPct(ownSum);
    const disc = Math.round(ownSum * pct / 100);
    return { sum, ownSum, pct, disc, total: sum - disc, count: items.reduce((a, x) => a + x.q, 0) };
  }
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };

  function render() {
    const items = cart.items();
    const empty = !items.length && stage !== 'done';
    $('[data-cempty]').hidden = !empty;
    $('.cart-main').hidden = empty || stage === 'done';
    $('[data-summary]').hidden = empty || stage === 'done';
    $('[data-done]').hidden = stage !== 'done';
    const t = totals(items);
    $('[data-cart-total]').textContent = items.length && stage !== 'done' ? `${t.count} ${plural(t.count, 'товар', 'товара', 'товаров')}` : '';
    if (empty || stage === 'done') return;

    $('[data-list]').innerHTML = items.map((x, i) => `<div class="ci">
      <a class="ci-img" href="product.html?p=${encodeURIComponent(x.k)}">${x.img ? `<img src="img/m/${x.img}.jpg" alt="">` : ''}</a>
      <div class="ci-info"><a class="ci-name" href="product.html?p=${encodeURIComponent(x.k)}">${esc(x.n)}</a>
        ${x.opt ? `<span class="ci-opt">${esc(x.opt)}</span>` : ''}
        ${x.own ? '<span class="ci-own">Своё производство · участвует в скидке</span>' : ''}
        <span class="ci-unit">${rub(x.p)} за шт.</span></div>
      <div class="qty qty--sm"><button data-dq="${i}" data-d="-1" aria-label="Меньше">−</button><input value="${x.q}" data-qi="${i}" inputmode="numeric" aria-label="Количество"><button data-dq="${i}" data-d="1" aria-label="Больше">+</button></div>
      <b class="ci-sum">${rub(x.p * x.q)}</b>
      <button class="ci-rm" data-rm="${i}" aria-label="Удалить">×</button>
    </div>`).join('');

    $('[data-s-count]').textContent = `${t.count} шт.`;
    $('[data-s-sum]').textContent = rub(t.sum);
    $('.s-disc').hidden = !t.pct;
    $('[data-s-pct]').textContent = t.pct ? t.pct + '%' : '';
    $('[data-s-disc]').textContent = '−' + rub(t.disc);
    $('[data-s-total]').textContent = rub(t.total);
    const next = TIERS.find(s => s > t.ownSum);
    $('[data-s-progress]').innerHTML = next
      ? `<div class="bar"><i style="width:${Math.min(100, t.ownSum / next * 100)}%"></i></div><p>Добавьте товаров нашего производства ещё на <b>${rub(next - t.ownSum)}</b> — скидка будет <b>${discountPct(next)}%</b></p>`
      : '<p><b>У вас максимальная скидка 15%</b></p>';
    $('[data-go]').hidden = stage !== 'cart';
    $('[data-submit]').hidden = stage !== 'form';
    $('[data-checkout]').hidden = stage !== 'form';
  }

  const list = $('[data-list]');
  list.addEventListener('click', ev => {
    const items = cart.items();
    const q = ev.target.closest('[data-dq]');
    if (q) { const x = items[+q.dataset.dq]; x.q = Math.max(1, Math.min(99, x.q + +q.dataset.d)); cart.save(items); render(); return; }
    const r = ev.target.closest('[data-rm]');
    if (r) { items.splice(+r.dataset.rm, 1); cart.save(items); render(); }
  });
  list.addEventListener('change', ev => {
    const i = ev.target.dataset.qi; if (i == null) return;
    const items = cart.items(); items[+i].q = Math.max(1, Math.min(99, parseInt(ev.target.value) || 1)); cart.save(items); render();
  });

  // ---------- оформление
  const form = $('[data-checkout]');
  $('[data-go]').onclick = () => { stage = 'form'; render(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); form.querySelector('input[name=name]').focus({ preventScroll: true }); };
  form.addEventListener('change', ev => {
    if (ev.target.name === 'who') $('[data-org]').hidden = ev.target.value !== 'org';
    if (ev.target.name === 'ship') $('[data-addr]').hidden = ev.target.value === 'pickup';
  });
  function validate() {
    const f = form.elements; const bad = [];
    $$('.fld.bad', form).forEach(x => x.classList.remove('bad'));
    const mark = (el, msg) => { el.closest('.fld, .chk').classList.add('bad'); bad.push(msg); };
    if (f.name.value.trim().length < 2) mark(f.name, 'имя');
    if (f.phone.value.replace(/\D/g, '').length < 10) mark(f.phone, 'телефон');
    if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) mark(f.email, 'e-mail');
    if (f.ship.value !== 'pickup' && !f.city.value.trim()) mark(f.city, 'город');
    if (!f.agree.checked) mark(f.agree, 'согласие с условиями');
    $('[data-err]').textContent = bad.length ? 'Проверьте: ' + bad.join(', ') : '';
    return !bad.length;
  }
  const submit = ev => {
    ev && ev.preventDefault();
    if (!validate()) { form.querySelector('.bad')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const no = 'SS-' + String(Date.now()).slice(-6);
    const orders = store.get('orders', []);
    orders.push({ no, at: new Date().toISOString(), items: cart.items(), ...totals(cart.items()), form: Object.fromEntries(new FormData(form)) });
    store.set('orders', orders);
    cart.save([]); stage = 'done'; $('[data-order-no]').textContent = '№ ' + no; render(); scrollTo({ top: 0, behavior: 'smooth' });
  };
  form.addEventListener('submit', submit);
  $('[data-submit]').onclick = submit;
  render();
})();
