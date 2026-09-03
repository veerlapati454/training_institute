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

  /* ---------- Scroll reveal: staggered, grouped ---------- */
  const revealGroups = [
    '.section-header', '.method-card', '.form-card', '.next-card',
    '.visit-details', '.map-frame', '.response-item', '.faq-item'
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

  /* ---------- Sticky sub-nav: scrollspy ---------- */
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
        // vertical scroll position (the cause of the snap-back-up bug).
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

  /* ---------- Live "open now" status (signature effect) ----------
     Reads the visitor's local day/time and lights up the matching
     hours row + the phone/campus status dots — one honest, data-driven
     touch rather than decoration for its own sake. */
  const OPEN_HOUR = 9;   // 9am
  const CLOSE_HOUR = 19; // 7pm, Mon–Sat

  function getOpenState() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun
    const hour = now.getHours();
    const isOpenDay = day !== 0;
    const isOpenHour = hour >= OPEN_HOUR && hour < CLOSE_HOUR;
    return isOpenDay && isOpenHour;
  }

  function applyOpenState() {
    const open = getOpenState();

    $$('.method-status[data-live]').forEach(el => {
      el.classList.toggle('is-open', open);
      const label = el.querySelector('.status-label');
      if (label) label.textContent = open ? 'Open now' : 'Opens 9am tomorrow';
    });

    const todayIndex = (new Date().getDay() + 6) % 7; // Mon = 0 ... Sun = 6
    $$('.hours-row').forEach((row, i) => {
      row.classList.toggle('is-today', i === todayIndex);
    });
  }
  applyOpenState();

  /* ---------- Map: fade in once the iframe has actually loaded ---------- */
  const mapFrame = $('.map-frame iframe');
  const mapSkeleton = $('.map-frame-skeleton');
  if (mapFrame) {
    mapFrame.addEventListener('load', () => {
      mapFrame.classList.add('is-loaded');
      if (mapSkeleton) mapSkeleton.style.opacity = '0';
    });
  }

  /* ---------- Contact form: inline validation + demo submit ---------- */
  const form = $('#contact-form');
  if (form) {
    const successBox = $('#form-success');
    const submitBtn = $('#form-submit-btn');

    const nameField    = $('#fname', form);
    const emailField   = $('#femail', form);
    const phoneField   = $('#fphone', form);
    const messageField = $('#fmessage', form);

    /* Validation rules, kept in one place so the “what counts as valid”
       logic isn't scattered across the file. */
    const NAME_CHARS_RE   = /^[A-Za-z\s'.-]+$/;      // letters, spaces, apostrophes, hyphens, dots
    const NAME_HASLETTER  = /[A-Za-z]/;              // must contain at least one actual letter
    const EMAIL_RE        = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const PHONE_ALLOWED_RE = /^[0-9+\-\s()]+$/;      // digits + common phone punctuation only
    const MIN_MSG_LENGTH  = 10;

    /* ---- Live input filtering: stop the wrong characters from
       ever landing in the field, rather than only flagging them
       after the fact. ---- */
    if (nameField) {
      nameField.setAttribute('maxlength', '60');
      nameField.addEventListener('input', () => {
        const cleaned = nameField.value.replace(/[^A-Za-z\s'.-]/g, '');
        if (cleaned !== nameField.value) nameField.value = cleaned;
      });
    }
    if (phoneField) {
      phoneField.addEventListener('input', () => {
        const cleaned = phoneField.value.replace(/[^0-9+\-\s()]/g, '');
        if (cleaned !== phoneField.value) phoneField.value = cleaned;
      });
    }

    function showError(field, message) {
      const wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.add('has-error');
      const errEl = wrap.querySelector('.field-error');
      if (errEl) errEl.textContent = message;
    }
    function clearError(field) {
      const wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.remove('has-error');
      const errEl = wrap.querySelector('.field-error');
      if (errEl) errEl.textContent = '';
    }

    function validateField(field) {
      clearError(field);
      const value = field.value.trim();

      // Required check applies to every field first.
      if (field.hasAttribute('required') && !value) {
        showError(field, 'This field is required.');
        return false;
      }
      if (!value) return true; // empty + not required = fine

      switch (field.id) {
        case 'fname': {
          if (value.length < 2) {
            showError(field, 'Name must be at least 2 characters.');
            return false;
          }
          if (!NAME_CHARS_RE.test(value)) {
            showError(field, 'Name can only contain letters, spaces, and - \' .');
            return false;
          }
          if (!NAME_HASLETTER.test(value)) {
            showError(field, 'Name must contain letters.');
            return false;
          }
          break;
        }
        case 'femail': {
          if (!EMAIL_RE.test(value)) {
            showError(field, 'Enter a valid email address, e.g. name@example.com.');
            return false;
          }
          break;
        }
        case 'fphone': {
          if (!PHONE_ALLOWED_RE.test(value)) {
            showError(field, 'Phone can only contain digits, spaces, +, -, and ().');
            return false;
          }
          const digits = value.replace(/\D/g, '');
          if (digits.length < 10 || digits.length > 13) {
            showError(field, 'Enter a valid phone number (10-13 digits).');
            return false;
          }
          break;
        }
        case 'fmessage': {
          if (value.length < MIN_MSG_LENGTH) {
            showError(field, `Message should be at least ${MIN_MSG_LENGTH} characters.`);
            return false;
          }
          break;
        }
        default:
          break;
      }
      return true;
    }

    $$('input, select, textarea', form).forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => { if (field.closest('.field').classList.contains('has-error')) validateField(field); });
      field.addEventListener('change', () => { if (field.closest('.field').classList.contains('has-error')) validateField(field); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = $$('input, select, textarea', form);
      const allValid = fields.map(validateField).every(Boolean);
      if (!allValid) {
        const firstError = form.querySelector('.field.has-error input, .field.has-error select, .field.has-error textarea');
        if (firstError) firstError.focus();
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      // Demo submit — no backend wired up on this page yet.
      setTimeout(() => {
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send message';
        }
        if (successBox) successBox.classList.add('visible');
      }, 700);
    });
  }

});