/* =========================================================
   Force a genuine fresh page load/refresh to start at the top,
   without resetting scroll on bfcache restores (browser
   Back/Forward, or a backgrounded tab being reloaded from cache).
   Runs before anything else so the browser's native scroll
   restoration never gets a chance to jump back down.
   ========================================================= */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
window.addEventListener('pageshow', (event) => {
  // event.persisted === true means the page was restored from
  // the back/forward cache rather than freshly loaded — in that
  // case, leave the user's scroll position alone.
  if (!event.persisted) {
    window.scrollTo(0, 0);
  }
});

/* =========================================================
   Preloader — runs immediately, independent of DOMContentLoaded.
   Fires 'stackly:ready' once removed so the hero sequence starts
   exactly when the page becomes visible.
   ========================================================= */
(function () {
  const loader = document.getElementById('boardPreloader');
  const MIN_VISIBLE_MS = 850;
  const shownAt = Date.now();
  document.documentElement.classList.add('is-loading');

  function announceReady() {
    document.dispatchEvent(new CustomEvent('stackly:ready'));
  }

  if (!loader) { announceReady(); return; }

  function hideLoader() {
    const wait = Math.max(MIN_VISIBLE_MS - (Date.now() - shownAt), 0);
    setTimeout(() => {
      loader.classList.add('preloader-hide');
      document.documentElement.classList.remove('is-loading');
      announceReady();
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }, wait);
  }

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
})();

document.addEventListener('DOMContentLoaded', function () {

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';

  /* ---------- One orchestrated hero entrance ---------- */
  function playHeroIntro() {
    const heroEls = $$('[data-hero-el]');
    if (!heroEls.length) return;

    if (!hasGSAP || prefersReducedMotion) {
      heroEls.forEach(el => el.style.opacity = 1);
      return;
    }
    gsap.set(heroEls, { opacity: 0, y: 18 });
    gsap.to(heroEls, {
      opacity: 1, y: 0, duration: .8, stagger: .12, ease: 'power3.out', delay: .1
    });
  }
  document.addEventListener('stackly:ready', playHeroIntro);

  /* ---------- Navbar entrance + mobile menu ---------- */
  const navbarWrapper = $('#navbar-wrapper');
  const hamburgerBtn  = $('#nav-menu-hamburger');
  const navLinksPanel = $('#main-nav-links');
  const navItems      = $$('.nav-item');

  requestAnimationFrame(() => navbarWrapper && navbarWrapper.classList.add('active'));

  function closeMobileMenu() {
    if (!navLinksPanel || !hamburgerBtn) return;
    navLinksPanel.classList.remove('active');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleMobileMenu() {
    if (!navLinksPanel || !hamburgerBtn) return;
    const isOpen = navLinksPanel.classList.toggle('active');
    hamburgerBtn.classList.toggle('active', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMobileMenu);

  navItems.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
      navItems.forEach(i => i.classList.remove('active'));
      link.classList.add('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navLinksPanel || !navLinksPanel.classList.contains('active')) return;
    const inside = navLinksPanel.contains(e.target) || (hamburgerBtn && hamburgerBtn.contains(e.target));
    if (!inside) closeMobileMenu();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) closeMobileMenu(); });

  /* ---------- Scroll reveal: section headers + every card grid, staggered ---------- */
  const revealGroups = [
    '.stats-card', '.route-photo-row', '.cta-card',
    '.section-header',
    '.track-card', '.faculty-card', '.why-card',
    '.board-row:not(.board-row-head)', '.conn-card',
    '.rider-card', '.platform-item', '.faq-item', '.route-stop'
  ];
  revealGroups.forEach(sel => {
    $$(sel).forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = prefersReducedMotion ? '0s' : `${Math.min(i, 6) * 0.07}s`;
    });
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, o) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          o.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach(el => revealObserver.observe(el));
  } else {
    $$('[data-reveal]').forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Hero background parallax ---------- */
  const heroGridBg = $('.hero-grid-bg');
  const heroSection = $('.hero-section');
  if (heroGridBg && heroSection && !prefersReducedMotion) {
    window.addEventListener('scroll', () => {
      const rect = heroSection.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      heroGridBg.style.transform = `translateY(${window.scrollY * 0.08}px)`;
    }, { passive: true });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-answer').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
      answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
    });
  });

  /* ---------- Back to top ----------
     Fixed at a constant distance from the bottom of the viewport by
     default, but that means once the user scrolls far enough to see
     the footer, the button sits on top of the footer content (it
     overlapped the social icons row). To avoid that, as the footer's
     top edge creeps up into the viewport we push the button up by
     exactly that amount, so it always rests just above the footer. */
  const backToTop = $('#back-to-top');
  const siteFooter = $('.site-footer');
  if (backToTop) {
    const baseOffset = () => (window.innerWidth <= 860 ? 16 : 24); // matches CSS bottom value
    function updateBackToTop() {
      backToTop.classList.toggle('visible', window.scrollY > 700);
      if (siteFooter) {
        const footerRect = siteFooter.getBoundingClientRect();
        const overlap = window.innerHeight - footerRect.top;
        backToTop.style.bottom = overlap > 0 ? (baseOffset() + overlap) + 'px' : '';
      }
    }
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    window.addEventListener('resize', updateBackToTop);
    updateBackToTop();
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- Navbar shadow deepens on scroll ---------- */
  const navPill = $('.navbar-pill');
  if (navPill) {
    window.addEventListener('scroll', () => {
      navPill.style.boxShadow = window.scrollY > 40
        ? '0 14px 36px rgba(12,15,39,.14)'
        : '0 10px 30px rgba(12,15,39,.08)';
    }, { passive: true });
  }

  /* ---------- Scroll progress (nav active-state is click-driven only, see click handler above) ---------- */
  const progressBar = $('#page-scroll-indicator');

  function updateScrollProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateScrollProgress(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  updateScrollProgress();

  /* ---------- Stat counters ---------- */
  const statNumbers = $$('.stat-number');
  const statsCard = $('#statsCard');

  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (prefersReducedMotion) { el.textContent = target; return; }
    if (hasGSAP) {
      const counter = { val: 0 };
      gsap.to(counter, { val: target, duration: 1.5, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(counter.val); } });
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  if (statsCard) {
    let counted = false;
    function runCounters() { if (counted) return; counted = true; statNumbers.forEach(animateCount); }
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(entry => { if (entry.isIntersecting) { runCounters(); o.disconnect(); } });
      }, { threshold: 0.35 });
      obs.observe(statsCard);
    } else {
      runCounters();
    }
  }

  /* ---------- Live IST clock on hero board ---------- */
  const heroClock = $('#hero-clock');
  function updateClock() {
    if (!heroClock) return;
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hh = String(ist.getHours()).padStart(2, '0');
    const mm = String(ist.getMinutes()).padStart(2, '0');
    heroClock.textContent = `${hh}:${mm}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  /* ---------- Enquiry / contact form ---------- */
  const contactForm = $('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Request sent ✓';
      btn.disabled = true;
      setTimeout(() => {
        contactForm.reset();
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2400);
    });
  }

});