/* =========================================================
   Force a genuine fresh page load/refresh to start at the top,
   without resetting scroll on bfcache restores (browser
   Back/Forward, or a backgrounded tab being reloaded from cache).
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

document.addEventListener('DOMContentLoaded', function () {

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

  document.addEventListener('click', (e) => {
    if (!navLinksPanel || !navLinksPanel.classList.contains('active')) return;
    const inside = navLinksPanel.contains(e.target) || (hamburgerBtn && hamburgerBtn.contains(e.target));
    if (!inside) closeMobileMenu();
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) closeMobileMenu(); });

  /* ---------- Scroll reveal: section headers + card grids, staggered ---------- */
  const revealGroups = [
    '.section-header', '.route-photo-row', '.overview-stat',
    '.rhythm-day', '.rhythm-gallery-item', '.capability-card',
    '.mentor-card', '.mentorship-note', '.assessment-card',
    '.support-card', '.faq-item'
  ];
  revealGroups.forEach(sel => {
    $$(sel).forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = prefersReducedMotion ? '0s' : `${Math.min(i, 6) * 0.06}s`;
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

  /* ---------- Back to top ---------- */
  const backToTop = $('#back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 700);
    }, { passive: true });
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

  /* ---------- Scroll progress bar ---------- */
  const progressBar = $('#page-scroll-indicator');
  function updateScrollProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  }

  /* ---------- Journey timeline: scroll-linked fill line ----------
     The signature effect for this page: the amber line down the
     six-stage process fills in as the section scrolls through the
     viewport, instead of a generic fade-in per step. */
  const journeyWrap = $('.journey-track-wrap');
  const journeyFill = $('#journey-fill');

  function updateJourneyFill() {
    if (!journeyWrap || !journeyFill) return;
    const rect = journeyWrap.getBoundingClientRect();
    const vh = window.innerHeight;

    // Fill starts growing once the top of the line is 85% down the
    // viewport, and reaches 100% once the bottom of the line is 40%
    // up from the bottom of the viewport — so it completes slightly
    // before the reader finishes scrolling past the last step.
    const startOffset = vh * 0.85;
    const endOffset = vh * 0.4;
    const totalDistance = rect.height + startOffset - endOffset;
    const scrolledDistance = startOffset - rect.top;

    let progress = totalDistance > 0 ? scrolledDistance / totalDistance : 0;
    progress = Math.max(0, Math.min(1, progress));
    journeyFill.style.height = (progress * 100) + '%';
  }

  /* ---------- Single rAF-throttled scroll handler for progress + journey fill ---------- */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        if (!prefersReducedMotion) updateJourneyFill();
        else if (journeyFill) journeyFill.style.height = '100%';
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  updateScrollProgress();
  if (prefersReducedMotion && journeyFill) {
    journeyFill.style.height = '100%';
  } else {
    updateJourneyFill();
  }

  /* ---------- Sticky sub-nav: scrollspy + smooth active state ---------- */
  const subnav = $('#subnav');
  if (subnav) {
    const pills = $$('.subnav-pill', subnav);
    const targets = pills
      .map(pill => ({ pill, section: document.querySelector(pill.getAttribute('href')) }))
      .filter(pair => pair.section);

    function setActivePill(pill) {
      pills.forEach(p => p.classList.remove('active'));
      if (pill) {
        pill.classList.add('active');
        const wrapRect = subnav.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();
        if (pillRect.left < wrapRect.left || pillRect.right > wrapRect.right) {
          // Scroll only the subnav strip itself (never the window).
          // pill.scrollIntoView() was used here before, but because the
          // subnav sits inside a position:sticky wrapper under a
          // position:fixed navbar, browsers can misjudge "nearest" and
          // also scroll the whole page vertically — causing a sudden
          // jump while the user is just scrolling normally.
          const targetLeft = pill.offsetLeft - (subnav.clientWidth - pill.offsetWidth) / 2;
          subnav.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      }
    }

    pills.forEach(pill => {
      pill.addEventListener('click', () => setActivePill(pill));
    });

    if ('IntersectionObserver' in window && targets.length) {
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 78;
      const subnavH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--subnav-h')) || 52;
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const match = targets.find(t => t.section === entry.target);
            if (match) setActivePill(match.pill);
          }
        });
      }, { rootMargin: `-${navH + subnavH + 20}px 0px -65% 0px`, threshold: 0 });
      targets.forEach(t => spy.observe(t.section));
    }
  }

  /* ---------- Subtle pointer-tilt effect on rhythm day cards (fine pointers only) ---------- */
  if (hasFinePointer && !prefersReducedMotion) {
    $$('.tilt-card').forEach(card => {
      const MAX_TILT = 4;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `translateY(-5px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

});