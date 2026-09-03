/* =========================================================
   Force every page load/refresh to start at the top.
   ========================================================= */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
window.addEventListener('pageshow', () => window.scrollTo(0, 0));

document.addEventListener('DOMContentLoaded', function () {

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Navbar entrance + mobile menu ---------- */
  const navbarWrapper = $('#navbar-wrapper');
  const hamburgerBtn  = $('#nav-menu-hamburger');
  const navLinksPanel = $('#main-nav-links');

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
    '.section-header', '.faculty-photo-row', '.overview-stat',
    '.bar-card', '.roster-card', '.mentor-card',
    '.philosophy-note', '.faq-item'
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
  window.addEventListener('scroll', () => requestAnimationFrame(updateScrollProgress), { passive: true });
  updateScrollProgress();

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
        // Scroll the pill strip's OWN horizontal scrollbar only — never
        // scrollIntoView() here, since that can also drag the page's
        // vertical scroll position (causes an auto snap-back-up on mobile).
        const wrapRect = subnav.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();
        const isOutOfView = pillRect.left < wrapRect.left || pillRect.right > wrapRect.right;
        if (isOutOfView) {
          const targetLeft = (pill.offsetLeft + pill.offsetWidth / 2) - (subnav.clientWidth / 2);
          subnav.scrollTo({ left: Math.max(0, targetLeft), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
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

  /* ---------- Roster filter tabs ---------- */
  const filterBtns = $$('.roster-filter-btn');
  const rosterCards = $$('.roster-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const track = btn.getAttribute('data-track');
      rosterCards.forEach(card => {
        const match = track === 'all' || card.getAttribute('data-track') === track;
        card.classList.toggle('is-hidden', !match);
      });
    });
  });

  /* ---------- "By the numbers": scroll-triggered count-up (signature effect) ----------
     Each stat counts from 0 to its target once the stats section scrolls into
     view, giving the page one deliberate animated moment rather than scattered
     hover effects everywhere. */
  const statNumbers = $$('.stat-number');

  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count-to')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    if (prefersReducedMotion) {
      el.textContent = target + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(target * eased);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(tick);
  }

  if (statNumbers.length) {
    if ('IntersectionObserver' in window) {
      const statsObserver = new IntersectionObserver((entries, o) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            o.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      statNumbers.forEach(el => statsObserver.observe(el));
    } else {
      statNumbers.forEach(animateCount);
    }
  }

});