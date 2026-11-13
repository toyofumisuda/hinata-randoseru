/* Hinata — shared behaviour: nav, smooth scroll, scroll reveals */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---- current page in nav ---- */
  const page = document.body.dataset.page;
  document.querySelectorAll('.gnav-links a').forEach((a) => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  });

  /* ---- mobile menu ---- */
  const nav = document.getElementById('gnav');
  const toggle = nav && nav.querySelector('.gnav-toggle');
  if (toggle) {
    const set = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => set(!nav.classList.contains('open')));
    nav.querySelectorAll('.gnav-links a').forEach((a) => a.addEventListener('click', () => set(false)));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---- year ---- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  if (!hasGsap || reduce) {
    document.documentElement.classList.add('no-anim');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('anim');

  /* ---- smooth scroll (Lenis) ---- */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---- reveal on scroll ---- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
      delay: parseFloat(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  /* ---- count up numbers ---- */
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const obj = { v: 0 };
    el.textContent = (0).toFixed(dec);
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => { el.textContent = obj.v.toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec }); },
    });
  });

  /* ---- text that lights up as you scroll ---- */
  gsap.utils.toArray('.scrub-text').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = Array.from(text).map((c) => `<span class="ch" aria-hidden="true">${c}</span>`).join('');
    gsap.to(el.querySelectorAll('.ch'), {
      opacity: 1, stagger: 0.05, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.8 },
    });
  });

  /* ---- parallax images ---- */
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { y: 60 }, {
      y: -60, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
})();

/* ---- demo contact form (nothing is sent) ---- */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const card = form.closest('.form-card');
  const rules = {
    name: (v) => v.trim().length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    msg: (v) => v.trim().length > 0,
  };
  const check = (el) => {
    const ok = el.type === 'checkbox' ? el.checked : rules[el.id](el.value);
    el.closest('.field').classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  const fields = ['name', 'email', 'msg', 'agree'].map((id) => document.getElementById(id));
  fields.forEach((el) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => check(el)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const results = fields.map(check);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); return; }
    card.classList.add('sent');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
