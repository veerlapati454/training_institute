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

document.addEventListener('DOMContentLoaded', function () {

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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
  playHeroIntro();

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
    '.rider-card', '.platform-item', '.faq-item', '.route-stop',
    '.track-select-card', '.skill-group', '.mentor-card',
    '.eligibility-card', '.outcome-stat', '.finance-card', '.roadmap-note'
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

  /* ---------- Scroll progress ---------- */
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

  /* ---------- Stat / outcome counters (works for any .stat-number, animates once each) ---------- */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-target')) || 0;
    const isFloat = String(target).indexOf('.') !== -1 || el.getAttribute('data-target').indexOf('.') !== -1;
    if (prefersReducedMotion) { el.textContent = target; return; }
    if (hasGSAP) {
      const counter = { val: 0 };
      gsap.to(counter, {
        val: target, duration: 1.5, ease: 'power2.out',
        onUpdate: () => { el.textContent = isFloat ? counter.val.toFixed(1) : Math.round(counter.val); }
      });
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = isFloat ? (eased * target).toFixed(1) : Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = isFloat ? target.toFixed(1) : target;
    }
    requestAnimationFrame(tick);
  }

  const statNumbers = $$('.stat-number');
  if (statNumbers.length) {
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, o) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            o.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      statNumbers.forEach(el => counterObserver.observe(el));
    } else {
      statNumbers.forEach(animateCount);
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
        // keep the active pill in view on the horizontally-scrolling mobile bar
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

  /* ---------- Subtle pointer-tilt effect on select card grids (fine pointers only) ---------- */
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