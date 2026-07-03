/* ==========================================================================
   SCROLL ENGINE + SECTIONS 1 & 2 — rebuilt
   Replaces: original lines ~1-462 (Lenis setup, hero protection, hero intro,
   scrollMaster, bindHeroProtectionZone, Mac Fanout Fix).
   Sections 3+ (gateway, marquee, physics, carousel, quote form) are untouched
   and should stay below this block, unmodified.
   ========================================================================== */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.gsap = gsap;
window.Lenis = Lenis;

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   1. ENVIRONMENT DETECTION
   One pass, done once. Everything downstream reads from these flags instead
   of re-sniffing UA strings in five different places.
   ========================================================================== */

const isDesktop = window.matchMedia('(min-width: 769px)').matches;

const platformStr = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;

// Catches macOS AND iPadOS-in-desktop-mode (iPad reports as "MacIntel").
const isMacOS = /mac/i.test(platformStr) && !/iPhone|iPod/.test(navigator.userAgent);

// Real Safari (WebKit), excluding Chrome/Firefox-on-iOS which are WebKit
// under the hood but don't have Safari's rubber-band/momentum quirks in the
// same way for our purposes here.
const isSafari =
  /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent) ||
  (navigator.vendor?.includes('Apple') && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));

// Platforms with native momentum scrolling that Lenis needs to *complement*,
// not fight. Anything in this bucket gets a gentler Lenis config.
const hasNativeMomentum = isMacOS || isSafari;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Rough device tier, used to gate expensive work (particle wave, physics,
 * scrub-heavy timelines). Deliberately conservative: `deviceMemory` and
 * `connection.saveData` aren't available in Safari, so we never rely on them
 * alone — hardwareConcurrency is the one signal available everywhere.
 */
function detectDeviceTier() {
  if (prefersReducedMotion) return 'reduced';

  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory; // undefined on Safari — treated as "unknown", not "high"
  const saveData = navigator.connection?.saveData;

  if (saveData) return 'low';
  if (cores <= 4 || (mem !== undefined && mem <= 4)) return 'low';
  if (cores <= 6) return 'mid';
  return 'high';
}

const deviceTier = detectDeviceTier();
const lowPowerMode = false; // Temporarily disabled for testing (was: deviceTier === 'low' || deviceTier === 'reduced')

/* ==========================================================================
   2. LENIS
   Runs on ALL desktop platforms now, including Mac/Safari — tuned down
   rather than switched off. This is what lets us delete the old
   "Mac Fanout Fix" hack entirely: with Lenis buffering scroll uniformly,
   raw window.scrollY never leaks into the scrub timelines, on any platform.

   On low-power / reduced-motion devices we skip Lenis altogether and let
   native scroll handle everything — Lenis's own RAF loop is not free, and
   ScrollTrigger works correctly against native scroll with zero setup.
   ========================================================================== */

let lenis = null;

if (isDesktop && !lowPowerMode) {
  lenis = new Lenis({
    // Mac/Safari trackpads already have OS-level inertia. Stacking Lenis's
    // own lerp-smoothing on top of that produces the classic "double
    // smoothing" laggy feel — so momentum platforms get a lighter touch,
    // not a bigger one.
    lerp: hasNativeMomentum ? 0.06 : 0.1,
    wheelMultiplier: hasNativeMomentum ? 0.7 : 1,
    touchMultiplier: 1.2,
    smoothWheel: true,
    // Let touch input use native scroll rather than Lenis's synthetic path —
    // this matters most on iPad-as-desktop, where syncTouch fighting Safari's
    // own touch handling is a common source of jank/rubber-band glitches.
    syncTouch: false,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    autoRaf: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  // Fully disabling lag smoothing (threshold 0) removes GSAP's catch-up
  // jump on backgrounded tabs, but on Safari specifically that can show up
  // as a large scroll-position snap the instant the tab regains focus.
  // Bounding it instead — absorb up to 500ms of drift instantly, then
  // resume normal playback rather than fast-forwarding through it — avoids
  // both failure modes. Test with your actual scrub durations; adjust the
  // 500 if section 2's timeline is long enough that this still feels abrupt.
  gsap.ticker.lagSmoothing(500, 33);
  lenis.stop(); // held until hero intro completes, see bottom of file
}

window.lenis = lenis;

/*
  Safari-specific note (apply in CSS, not JS):
  Safari's elastic overscroll bounce at the top/bottom of the page can cause
  visible jitter around pinned ScrollTrigger sections, because Safari
  repaints fixed-position elements during the bounce. Add this once,
  globally, in your stylesheet:

    html, body { overscroll-behavior: none; }

  This has nothing to do with Lenis directly, but without it, even a
  perfectly-tuned Lenis config can look glitchy on Safari specifically.
*/

const SLOWED_MULTIPLIER = 0.25;
const NORMAL_MULTIPLIER = 1;

const lenisSpeed = { value: SLOWED_MULTIPLIER };
let speedTween = null;

if (lenis) {
  lenis.options.wheelMultiplier = SLOWED_MULTIPLIER;
  lenis.options.touchMultiplier = SLOWED_MULTIPLIER;
  // Fallback only — some Lenis versions have VirtualScroll capture its own
  // copy of these options at construction rather than reading `lenis.options`
  // live. Verify against your installed version; if `lenis.options` alone
  // works, delete these two lines.
  if (lenis.virtualScroll?.options) {
    lenis.virtualScroll.options.wheelMultiplier = SLOWED_MULTIPLIER;
    lenis.virtualScroll.options.touchMultiplier = SLOWED_MULTIPLIER;
  }
}

function tweenLenisSpeed(to, duration, ease) {
  if (!lenis) return;
  if (speedTween) speedTween.kill();
  speedTween = gsap.to(lenisSpeed, {
    value: to,
    duration,
    ease,
    onUpdate: () => {
      lenis.options.wheelMultiplier = lenisSpeed.value;
      lenis.options.touchMultiplier = lenisSpeed.value;
      if (lenis.virtualScroll?.options) {
        lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value;
        lenis.virtualScroll.options.touchMultiplier = lenisSpeed.value;
      }
    }
  });
}

/* ==========================================================================
   3. HERO PROTECTION (wheel compression)
   Now correctly runs on Mac/Safari too, since Lenis is active there.
   Previously this silently never ran on Mac because Lenis was null.
   ========================================================================== */

let heroProtectionActive = true;

if (isDesktop && lenis) {
  const THRESHOLD = 120;
  const BASE = 45;
  const LINE_HEIGHT = 100 / 6;

  function compress(raw) {
    const abs = Math.abs(raw);
    if (abs <= THRESHOLD) return raw;
    const excess = abs - THRESHOLD;
    return Math.sign(raw) * (THRESHOLD + BASE * Math.log(1 + excess / BASE));
  }

  function onWheel(e) {
    let raw = e.deltaY;
    if (e.deltaMode === 1) raw *= LINE_HEIGHT;
    if (e.deltaMode === 2) raw *= window.innerHeight;

    // Safari's momentum scroll occasionally fires isolated, unusually large
    // deltaY spikes at the end of a fling. Clamp before compressing so one
    // spike can't punch through the protection zone in a single tick.
    raw = gsap.utils.clamp(-4000, 4000, raw);

    if (heroProtectionActive) {
      const compressed = compress(raw);
      const factor = Math.abs(raw) > THRESHOLD ? Math.abs(compressed) / Math.abs(raw) : 1;
      lenis.options.wheelMultiplier = lenisSpeed.value * factor;
      if (lenis.virtualScroll?.options) lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value * factor;
    } else {
      lenis.options.wheelMultiplier = lenisSpeed.value;
      if (lenis.virtualScroll?.options) lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value;
    }
  }

  window.addEventListener('wheel', onWheel, { capture: true, passive: true });
}

/* ==========================================================================
   4. CARD STATE — single source of truth
   Every phase of both sections reads from here. Change a fan position or a
   deal offset once, and every timeline that uses it stays in sync.
   ========================================================================== */

const heroCards = gsap.utils.toArray('.hero-cards-wrapper .ph-card');

const heroFanStates = [
  { x: -300, y: 10, rotation: -24 },
  { x: -200, y: 6, rotation: -16 },
  { x: -100, y: 5, rotation: -8 },
  { x: 0, y: 0, rotation: 0 },
  { x: 100, y: 8, rotation: 8 },
  { x: 200, y: 11, rotation: 16 },
  { x: 300, y: 15, rotation: 24 },
];

const dealOffsets = [
  { x: -220, y: -100, rotation: 0 },
  { x: -120, y: -50, rotation: 0 },
  { x: 0, y: 0, rotation: 0 },
  { x: 120, y: 50, rotation: 0 },
  { x: 220, y: 100, rotation: 0 },
  { x: 320, y: 150, rotation: 0 },
  { x: 420, y: 200, rotation: 0 },
];

// targetX/targetY are computed by calculateDeltas() below and mutated in place.
const deal = { x: 0, y: 0 };

const CARD_STATES = {
  stacked: (i) => ({ x: 0, y: 0, rotation: 0, scale: 1 }),
  fanned: (i) => ({ ...heroFanStates[i], scale: 1 }),
  dealt: (i) => ({
    x: deal.x + dealOffsets[i].x,
    y: deal.y + dealOffsets[i].y,
    rotation: dealOffsets[i].rotation,
  }),
};

const mm = gsap.matchMedia();

/* ==========================================================================
   5. SECTION 1 — HERO INTRO
   ========================================================================== */

function buildHeroIntro(onIntroComplete) {
  if (heroCards.length < 7) {
    onIntroComplete?.();
    return () => {};
  }

  const hiddenCards = heroCards.slice(0, 6);
  const topCard = heroCards[6];
  const introText = gsap.utils.toArray('.hero-word, .hero-para, .hero-btn, .readmore-btn');

  gsap.set(introText, { y: 40, opacity: 0 });

  // Reduced motion / low-power: skip straight to the end state, no animation,
  // but still fire the completion callback so scrollMaster initializes.
  if (lowPowerMode) {
    gsap.set(hiddenCards, { ...CARD_STATES.stacked(), opacity: 1 });
    gsap.set(topCard, { ...CARD_STATES.stacked(), opacity: 1 });
    gsap.set(introText, { y: 0, opacity: 1 });
    onIntroComplete?.();
    return () => {};
  }

  const introMm = gsap.matchMedia();

  introMm.add(
    { isDesktop: '(min-width: 769px)', isMobile: '(max-width: 768px)' },
    (context) => {
      const { isDesktop } = context.conditions;
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (isDesktop) {
        gsap.set(hiddenCards, { ...CARD_STATES.stacked(), opacity: 0 });
        gsap.set(topCard, { ...CARD_STATES.stacked(), y: 800, opacity: 0 });

        tl.to(topCard, { y: 0, opacity: 1, duration: 0.55 }, 0)
          .set(hiddenCards, { opacity: 1 }, '<')
          .to(introText, { y: 0, opacity: 1, duration: 0.4, stagger: 0.03 }, '-=0.3')
          .to(
            heroCards,
            {
              x: (i) => CARD_STATES.fanned(i).x,
              y: (i) => CARD_STATES.fanned(i).y,
              rotation: (i) => CARD_STATES.fanned(i).rotation,
              duration: 0.7,
            },
            '+=0.1'
          )
          .call(() => onIntroComplete?.());
      } else {
        // Mobile: still a real animation (settle-in), not a hard cut to
        // end-state — a snap read as "we turned animation off," a short
        // fade+drift reads as intentional restraint.
        const BASE_WIDTH = 768;
        const MIN_SCALE = 0.45;

        const applyMobileFan = () => {
          const fanScale = gsap.utils.clamp(MIN_SCALE, 1, window.innerWidth / BASE_WIDTH);
          gsap.set(heroCards, {
            x: (i) => CARD_STATES.fanned(i).x * fanScale,
            y: (i) => CARD_STATES.fanned(i).y * fanScale,
            rotation: (i) => CARD_STATES.fanned(i).rotation,
          });
        };

        gsap.set(heroCards, { opacity: 0, y: 15 });
        applyMobileFan();

        tl.to(heroCards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.03 }, 0)
          .to(introText, { y: 0, opacity: 1, duration: 0.8, stagger: 0.05 }, '-=0.3')
          .call(() => onIntroComplete?.());

        const onResize = debounce(applyMobileFan, 150);
        window.addEventListener('resize', onResize);

        return () => {
          window.removeEventListener('resize', onResize);
          tl.kill();
        };
      }

      return () => tl.kill();
    }
  );

  return () => introMm.revert();
}

/* ==========================================================================
   6. SECTION 2 — SCROLL MASTER (fold → travel → deal)
   One ScrollTrigger drives both the timeline AND the hero-protection zone —
   previously these were two separate ScrollTrigger instances on the same
   trigger/start/end, doubling scroll-tick overhead for no reason.
   ========================================================================== */

function calculateDeltas() {
  const heroWrapper = document.querySelector('.hero-cards-wrapper .cards');
  const dcWrapper = document.querySelector('.dc-cards-wrapper');
  if (!heroWrapper || !dcWrapper) return;

  const heroRect = heroWrapper.getBoundingClientRect();
  const dcRect = dcWrapper.getBoundingClientRect();
  const scrollY = window.scrollY;

  const heroLeft = heroRect.left;
  const heroTop = heroRect.top + scrollY;
  const dc3Left = dcRect.left + 240;
  const dc3Top = dcRect.top + 220 + scrollY;

  deal.x = dc3Left - heroLeft;
  deal.y = dc3Top - heroTop;
}

function buildScrollMaster() {
  if (lenis) lenis.start();

  const dcCards = gsap.utils.toArray('.dc-right .dc-card');
  if (dcCards.length) gsap.set(dcCards, { opacity: 0 });

  const debouncedRecalc = debounce(() => {
    calculateDeltas();
    ScrollTrigger.refresh();
  }, 150);

  window.addEventListener('resize', debouncedRecalc);

  // buildScrollMaster() runs after the hero intro finishes, which is often
  // well after `load` has already fired — an addEventListener('load', ...)
  // registered at that point would simply never run. Check readyState first.
  const recalcOnLoad = () => {
    calculateDeltas();
    ScrollTrigger.refresh();
  };
  if (document.readyState === 'complete') {
    recalcOnLoad();
  } else {
    window.addEventListener('load', recalcOnLoad, { once: true });
  }

  calculateDeltas();

  const diagonalCardEl = document.querySelector('.diagonal-card');

  mm.add(
    { isDesktop: '(min-width: 769px)', isMobile: '(max-width: 768px)' },
    (context) => {
      const { isDesktop } = context.conditions;
      if (!isDesktop || !diagonalCardEl || heroCards.length < 7 || dcCards.length < 1) {
        return;
      }

      gsap.set('.diagonal-word, .diagonal-join-btn, .diagonal-readmore-btn', { y: 50, opacity: 0 });

      gsap.from('.dc-bubble-a, .dc-bubble-b, .dc-bubble-c', {
        scrollTrigger: {
          trigger: '.diagonal-card',
          start: 'center 75%',
          toggleActions: 'play reverse play reverse',
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
      });

      // quickSetters: this timeline scrubs continuously and touches 7 cards
      // x/y/rotation every frame. Writing through GSAP's normal tween
      // pipeline re-parses those properties every tick; quickSetter writes
      // straight to the transform, same trick already used correctly in the
      // Matter.js physics code. Matters most on mid/low-tier hardware.
      const setters = heroCards.map((el) => ({
        x: gsap.quickSetter(el, 'x', 'px'),
        y: gsap.quickSetter(el, 'y', 'px'),
        r: gsap.quickSetter(el, 'rotation', 'deg'),
      }));

      const state = heroCards.map((_, i) => ({ ...CARD_STATES.fanned(i) }));

      function applyState() {
        state.forEach((s, i) => {
          setters[i].x(s.x);
          setters[i].y(s.y);
          setters[i].r(s.rotation);
        });
      }

      const masterTL = gsap.timeline({
        scrollTrigger: {
          trigger: diagonalCardEl,
          start: 'top 80%',
          end: 'center center',
          scrub: 1.5,
          invalidateOnRefresh: true,
          onRefreshInit: calculateDeltas,
          // Hero protection zone now lives on THIS ScrollTrigger's own
          // callbacks instead of a second, duplicate ScrollTrigger instance.
          onEnter: () => { heroProtectionActive = true; },
          onLeave: () => { heroProtectionActive = false; },
          onEnterBack: () => { heroProtectionActive = true; },
          onLeaveBack: () => { heroProtectionActive = true; },
        },
      });

      // Each phase below tweens the plain `state` array (not the DOM
      // directly) — GSAP animates the numbers, applyState() (called once per
      // frame via onUpdate) pushes them to the DOM through the quickSetters.

      // fold: fanned -> stacked
      masterTL.to(state, {
        duration: 1.6,
        ease: 'power2.inOut',
        onUpdate: applyState,
        x: 0, y: 0, rotation: 0,
      }, 0);

      masterTL.to(state, {
        duration: 2.4,
        ease: 'power1.inOut',
        onUpdate: applyState,
        x: () => deal.x, y: () => deal.y,
      });

      masterTL.to(
        '.diagonal-word, .diagonal-join-btn, .diagonal-readmore-btn',
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'power1.out' },
        '-=0.4'
      );

      masterTL.to(state, {
        duration: 1.6,
        stagger: 0.08,
        ease: 'power1.out',
        onUpdate: applyState,
        x: (i) => CARD_STATES.dealt(i).x,
        y: (i) => CARD_STATES.dealt(i).y,
        rotation: (i) => CARD_STATES.dealt(i).rotation,
      });

      masterTL.to(
        heroCards[4],
        { backgroundColor: '#fff', duration: 0.8, ease: 'power1.out' },
        '-=0.8'
      );

      return () => masterTL.kill();
    }
  );

  ScrollTrigger.refresh();

  // Teardown — call this if the module is ever re-initialized (e.g. an
  // Astro view-transition re-runs this script) to avoid accumulating
  // duplicate resize listeners and orphaned ScrollTriggers on repeat calls.
  return () => {
    window.removeEventListener('resize', debouncedRecalc);
    window.removeEventListener('load', recalcOnLoad);
    mm.revert();
  };
}

/* ==========================================================================
   7. ENTRY POINT
   No more platform fork here — Lenis buffers scroll uniformly on every
   desktop platform now (Mac/Safari included), so there's exactly one code
   path instead of an isMacOS branch with a separate scroll-guard hack.
   ========================================================================== */

let teardownHeroIntro = () => {};
let teardownScrollMaster = () => {};

teardownHeroIntro = buildHeroIntro(() => {
  teardownScrollMaster = buildScrollMaster();
}) || (() => {});

/**
 * Call this if the page ever needs to re-run this module from scratch
 * (e.g. an Astro view-transition swaps content without a full reload).
 * Not called automatically on a normal static page load.
 */
export function teardownSectionsOneAndTwo() {
  teardownHeroIntro();
  teardownScrollMaster();
}


// Section 3
const tlGateway = gsap.timeline({
  scrollTrigger: {
    trigger: ".gateway",
    start: "top 80%",
    toggleActions: "play reverse play reverse"
  },
  defaults: { ease: "power3.out" }
});

tlGateway
  .from(".gateway-word", { y: 50, opacity: 0, duration: 1, stagger: 0.1 })
  .from(".gateway-img-wrapper", { y: 10, duration: 1 }, "-=0.6");

// Section 4
const tlMarquee = gsap.timeline({
  scrollTrigger: {
    trigger: ".marquee",
    start: "top 80%",
    toggleActions: "play reverse play reverse"
  },
  defaults: { ease: "power3.out" }
});

tlMarquee
  .from(".marquee-word", { y: 50, opacity: 0, duration: 1, stagger: 0.1 })
  .from(".marquee-para", { y: 50, opacity: 0, duration: 1 }, "-=0.6");


//Section 7
// ===== Marquee =====
const topMarquee = gsap.to(".top-track", {
  xPercent: -50,
  ease: "none",
  duration: 40,
  repeat: -1,
  paused: true
});

const bottomMarquee = gsap.fromTo(
  ".bottom-track",
  { xPercent: -50 },
  {
    xPercent: 0,
    ease: "none",
    duration: 40,
    repeat: -1,
    paused: true
  }
);

// ===== Play / Pause when section is visible =====
ScrollTrigger.create({
  trigger: ".wavy-cards",
  start: "top bottom",
  end: "bottom top",

  onEnter: playAnimations,
  onEnterBack: playAnimations,

  onLeave: pauseAnimations,
  onLeaveBack: pauseAnimations
});

function playAnimations() {
  topMarquee.resume();
  bottomMarquee.resume();
}

function pauseAnimations() {
  topMarquee.pause();
  bottomMarquee.pause();
}

mm.add("(min-width: 769px)", () => {
  gsap.from(".wavy-cards-word", {
    scrollTrigger: {
      trigger: ".wavy-cards-title",
      start: "top 80%",
      toggleActions: "play reverse play reverse"
    },
    y: 50,
    opacity: 0,
    duration: 1,
    stagger: 0.1,
    ease: "power3.out",
  });
  //Section 8
  const tlStoryHeader = gsap.timeline({
    scrollTrigger: {
      trigger: ".storytelling-header",
      start: "top 85%",
      toggleActions: "play reverse play reverse"
    },
    defaults: { ease: "power3.out" }
  });

  tlStoryHeader
    .from(".storytelling-header-word", { y: 50, opacity: 0, duration: 1, stagger: 0.15 })
    .from(".storytelling-word", { y: 50, opacity: 0, stagger: 0.12, duration: 1 }, "-=0.6");

  const cards = gsap.utils.toArray(".story-card");
  gsap.from(cards.slice(0, 2), {
    scrollTrigger: {
      trigger: cards[0],
      start: "top 80%",
      toggleActions: "play reverse play reverse"
    },
    y: 80,
    opacity: 0,
    stagger: 0.15,
    duration: 1.5,
    ease: "power4.out"
  });
  gsap.from(cards.slice(2, 4), {
    scrollTrigger: {
      trigger: cards[2],
      start: "top 85%",
      toggleActions: "play reverse play reverse"
    },
    y: 80,
    opacity: 0,
    stagger: 0.15,
    duration: 1.5,
    ease: "power4.out"
  });
  //Section 9
  const tlMarket = gsap.timeline({
    scrollTrigger: {
      trigger: ".market-title",
      start: "top 80%",
      toggleActions: "play reverse play reverse"
    }
  });

  tlMarket
    .from(".market-text", { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" })
    .from(".scrollbar-thumb", { scaleX: 0, transformOrigin: "left center", duration: 1, ease: "power3.out" }, "-=0.4");


  //Section 10
  const tl10 = gsap.timeline({
    scrollTrigger: {
      trigger: ".shrink-section",
      start: "top top",
      end: "+=150%",
      scrub: 0.8,
      pin: true,
      anticipatePin: 1
    }
  });
  tl10.to(".image", {
    top: "30vh",
    width: "20vw",
    height: "40vh",
    borderRadius: "20px",
    ease: "power2.inOut"
  }, 0);
  tl10.fromTo(".shrink-section .card",
    {
      opacity: 0,
      scale: 0.8,
      transformOrigin: "center center"
    },
    {
      opacity: 1,
      scale: 1,
      ease: "power2.inOut"
    },
    0
  );
  //Section 11
  const tlMembership = gsap.timeline({
    scrollTrigger: {
      trigger: ".membership",
      start: "top 80%",
      toggleActions: "play reverse play reverse"
    }
  });

  tlMembership
    .from(".membership-word", { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" })
    .from(".membercard", { y: 50, duration: 1, stagger: 0.2, ease: "power2.out" }, "-=0.5");
  //Section 12
  gsap.to(".lgt-marquee", {
    xPercent: -50,
    ease: "none",
    duration: 10,
    repeat: -1
  });

});

// Section 12
let physicsInitialized = false;

ScrollTrigger.create({
  trigger: ".large-grid-top",
  start: "top 70%",
  once: true,
  onEnter: () => {
    if (physicsInitialized) return;
    physicsInitialized = true;
    initMatterPhysics();
  }
});

async function initMatterPhysics() {
  const container = document.querySelector(".large-grid-top");
  const circles = document.querySelectorAll(".lgt-circle");

  if (!container || circles.length === 0) return;
  const Matter = await import("matter-js");

  const width = container.clientWidth;
  const height = container.clientHeight;
  const {
    Engine,
    Runner,
    Bodies,
    Composite,
    Body,
    Events
  } = Matter;

  const engine = Engine.create();
  engine.enableSleeping = true;
  engine.world.gravity.y = 0.55;
  const cores = window.navigator.hardwareConcurrency || 4;
  engine.positionIterations = cores > 4 ? 8 : 4;
  engine.velocityIterations = cores > 4 ? 8 : 4;
  engine.constraintIterations = 3;

  Composite.add(engine.world, [
    Bodies.rectangle(width / 2, height + 25, width, 50, {
      isStatic: true,
      angle: gsap.utils.random(-0.02, 0.02)
    }),
    Bodies.rectangle(-25, height / 2, 50, height * 3, {
      isStatic: true
    }),
    Bodies.rectangle(width + 25, height / 2, 50, height * 3, {
      isStatic: true
    })
  ]);

  gsap.set(circles, {
    top: 0,
    left: 0,
    xPercent: -50,
    yPercent: -50,
    opacity: 1,
    margin: 0,
    scale: () => gsap.utils.random(0.94, 1.06),
    rotation: () => gsap.utils.random(-12, 12)
  });

  const runner = Runner.create();
  Runner.run(runner, engine);

  const circleBodies = [];
  const radius = circles[0].offsetWidth / 2;


  const dropZoneX = width * 0.14;
  const dropZoneJitter = radius * 0.5;

  circles.forEach((circle, i) => {
    gsap.delayedCall(i * 0.08, () => {
      const x = dropZoneX + gsap.utils.random(-dropZoneJitter, dropZoneJitter);
      const y = -100 - i * 70 - gsap.utils.random(0, 40);

      const body = Bodies.circle(x, y, radius, {
        restitution: 0.2,
        friction: 0.15,
        frictionStatic: 0.3,
        frictionAir: 0.018,
        density: 0.04 + Math.random() * 0.03
      });
      Body.setVelocity(body, {
        x: gsap.utils.random(-0.3, 1.4),
        y: 0
      });
      Body.setAngularVelocity(body, gsap.utils.random(-0.2, 0.2));

      const xSet = gsap.quickSetter(circle, "x", "px");
      const ySet = gsap.quickSetter(circle, "y", "px");
      const rSet = gsap.quickSetter(circle, "rotation", "deg");

      circleBodies.push({
        body,
        dom: circle,
        xSet,
        ySet,
        rSet,
        landed: false
      });
      Composite.add(engine.world, body);
    });
  });

  let sleepCounter = 0;
  let settled = false;

  Events.on(engine, "afterUpdate", () => {
    if (settled) return;
    let sleeping = true;

    circleBodies.forEach(obj => {
      const b = obj.body;
      obj.xSet(b.position.x);
      obj.ySet(b.position.y);
      obj.rSet(b.angle * 180 / Math.PI);

      if (!obj.landed && b.speed > 3 && b.position.y > height * 0.6) {
        obj.landed = true;
        gsap.fromTo(obj.dom, {
          scale: 1.08
        },
          {
            scale: 1,
            duration: 0.45,
            ease: "elastic.out(1,0.45)"
          });
      }

      if (
        b.speed > 0.08 ||
        Math.abs(b.angularVelocity) > 0.008
      ) {
        sleeping = false;
      }
    });

    if (sleeping) {
      sleepCounter++;
      if (sleepCounter > 80) {
        settled = true;
        Runner.stop(runner);
        circleBodies.forEach(obj => {
          if (Math.random() < 0.55) {
            gsap.to(obj.dom, {
              rotation: "+=" + gsap.utils.random(-5, 5),
              x: "+=" + gsap.utils.random(-3, 3),
              y: "+=" + gsap.utils.random(-3, 3),
              duration: gsap.utils.random(5, 9),
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true
            });
          }
        });
      }
    } else {
      sleepCounter = 0;
    }
  });

  gsap.delayedCall(8, () => {
    gsap.timeline({
      repeat: -1,
      repeatDelay: gsap.utils.random(3, 6)
    }).call(() => {
      if (!settled) return;
      const obj =
        circleBodies[
        Math.floor(Math.random() * circleBodies.length)
        ];
      gsap.to(obj.dom, {
        x: "+=" + gsap.utils.random(-2, 2),
        rotation: "+=" + gsap.utils.random(-3, 3),
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 1
      });
    });
  });
}

mm.add("(min-width: 769px)", () => {
  gsap.from(".grid-bottom > div", {
    scrollTrigger: {
      trigger: ".grid-bottom",
      start: "top 80%",
      toggleActions: "play reverse play reverse"
    },
    y: 100,
    opacity: 0,
    stagger: 0.2,
    duration: 1,
    ease: "power3.out"
  });
});

let folderPhysicsInitialized = false;

ScrollTrigger.create({
  trigger: ".folder",
  start: "top 70%",
  once: true,
  onEnter: () => {
    if (folderPhysicsInitialized) return;
    folderPhysicsInitialized = true;
    initFolderPhysics();
  }
});

async function initFolderPhysics() {
  const container = document.querySelector(".folder-icons-cluster");
  const circles = document.querySelectorAll(".cluster-icon");

  if (!container || circles.length === 0) return;
  const Matter = await import("matter-js");

  const width = container.clientWidth;
  const height = container.clientHeight;
  const { Engine, Runner, Bodies, Composite, Body, Events } = Matter;

  const engine = Engine.create();
  engine.enableSleeping = true;
  engine.world.gravity.y = 1.8;
  const cores = window.navigator.hardwareConcurrency || 4;
  engine.positionIterations = cores > 4 ? 8 : 4;
  engine.velocityIterations = cores > 4 ? 8 : 4;
  engine.constraintIterations = 3;

  Composite.add(engine.world, [
    Bodies.rectangle(width / 2, height + 25, width, 50, {
      isStatic: true,
      angle: gsap.utils.random(-0.02, 0.02)
    }),
    Bodies.rectangle(-25, height / 2, 50, height * 3, { isStatic: true }),
    Bodies.rectangle(width + 25, height / 2, 50, height * 3, { isStatic: true })
  ]);

  gsap.set(circles, {
    top: 0,
    left: 0,
    xPercent: -50,
    yPercent: -50,
    opacity: 1,
    margin: 0,
    scale: () => gsap.utils.random(0.94, 1.06),
    rotation: () => gsap.utils.random(-12, 12)
  });

  const runner = Runner.create();
  Runner.run(runner, engine);

  const circleBodies = [];
  const radius = circles[0].offsetWidth / 2;

  const dropZoneX = width * 0.5;
  const dropZoneJitter = radius * 0.8;

  circles.forEach((circle, i) => {
    let delay = 0;


    if (i < 3) delay = 0;
    else if (i < 5) delay = 0.4;
    else delay = 0.8 + (i - 5) * 0.2;

    gsap.delayedCall(delay, () => {
      let x, y;
      let isPyramid = i < 5;

      if (i === 0) x = dropZoneX - radius * 2.1;
      else if (i === 1) x = dropZoneX;
      else if (i === 2) x = dropZoneX + radius * 2.1;
      else if (i === 3) x = dropZoneX - radius * 1.05;
      else if (i === 4) x = dropZoneX + radius * 1.05;
      else x = dropZoneX + gsap.utils.random(-dropZoneJitter * 2, dropZoneJitter * 2);

      y = -50 - gsap.utils.random(0, 10);

      const body = Bodies.circle(x, y, radius, {
        restitution: isPyramid ? 0 : 0.1,
        friction: 0.8,
        frictionStatic: 1,
        frictionAir: isPyramid ? 0.02 : 0.001,
        density: 0.05
      });

      Body.setVelocity(body, {
        x: isPyramid ? 0 : gsap.utils.random(-0.5, 0.5),
        y: 0
      });
      Body.setAngularVelocity(body, isPyramid ? 0 : gsap.utils.random(-0.2, 0.2));

      const xSet = gsap.quickSetter(circle, "x", "px");
      const ySet = gsap.quickSetter(circle, "y", "px");
      const rSet = gsap.quickSetter(circle, "rotation", "deg");

      circleBodies.push({
        body,
        dom: circle,
        xSet,
        ySet,
        rSet,
        landed: false
      });
      Composite.add(engine.world, body);
    });
  });

  let sleepCounter = 0;
  let settled = false;

  Events.on(engine, "afterUpdate", () => {
    if (settled) return;
    let sleeping = true;

    circleBodies.forEach(obj => {
      const b = obj.body;
      obj.xSet(b.position.x);
      obj.ySet(b.position.y);
      obj.rSet(b.angle * 180 / Math.PI);

      if (!obj.landed && b.speed > 3 && b.position.y > height * 0.6) {
        obj.landed = true;
        gsap.fromTo(obj.dom, { scale: 1.1 }, { scale: 1, duration: 0.45, ease: "elastic.out(1,0.45)" });
      }

      if (b.speed > 0.08 || Math.abs(b.angularVelocity) > 0.008) {
        sleeping = false;
      }
    });

    if (sleeping) {
      sleepCounter++;
      if (sleepCounter > 80) {
        settled = true;
        Runner.stop(runner);
      }
    } else {
      sleepCounter = 0;
    }
  });
}

// Section 3
const slides = document.querySelectorAll(".carousel-slide");
const nextBtn = document.querySelector(".next-btn");
const prevBtn = document.querySelector(".prev-btn");
let currentSlide = 0;
let slideInterval;

if (slides.length > 0 && nextBtn && prevBtn) {
  function showSlide(index) {
    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add("active");
      } else {
        slide.classList.remove("active");
      }
    });
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  }

  function startAutoplay() {
    slideInterval = setInterval(nextSlide, 5000);
  }

  function resetAutoplay() {
    clearInterval(slideInterval);
    startAutoplay();
  }

  nextBtn.addEventListener("click", () => {
    nextSlide();
    resetAutoplay();
  });

  prevBtn.addEventListener("click", () => {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(currentSlide);
    resetAutoplay();
  });

  startAutoplay();
}

/*  SECTION 5  */
const svgEl = document.querySelector('.marketplace svg');
if (svgEl) {
  svgEl.pauseAnimations(); // Start paused
  ScrollTrigger.create({
    trigger: ".marketplace",
    start: "top bottom",
    end: "bottom top",
    onEnter: () => svgEl.unpauseAnimations(),
    onEnterBack: () => svgEl.unpauseAnimations(),
    onLeave: () => svgEl.pauseAnimations(),
    onLeaveBack: () => svgEl.pauseAnimations(),
  });
}

async function initParticleWave() {
  const container = document.getElementById('particle-wave-container');
  if (!container) return;

  const THREE = await import("three");
  const W = () => container.clientWidth;
  const H = () => container.clientHeight;

  //  Scene 
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.02);

  //  Camera 
  const camera = new THREE.PerspectiveCamera(75, W() / H(), 1, 1000);
  camera.position.set(0, 20, 50);
  camera.lookAt(0, 0, 0);

  //  Renderer 
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W(), H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff);
  container.appendChild(renderer.domElement);

  //  Particle Grid 
  const AMOUNT_X = 50;
  const AMOUNT_Z = 50;
  const SEPARATION = 2.5;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(AMOUNT_X * AMOUNT_Z * 3);
  const colors = new Float32Array(AMOUNT_X * AMOUNT_Z * 3);
  let c = 0;
  let k = 0;
  for (let ix = 0; ix < AMOUNT_X; ix++) {
    for (let iz = 0; iz < AMOUNT_Z; iz++) {
      positions[k] = ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2;
      positions[k + 1] = 0;
      positions[k + 2] = iz * SEPARATION - (AMOUNT_Z * SEPARATION) / 2;



      if (Math.random() < 0.2) {
        colors[c] = 1.0;
        colors[c + 1] = 0.2;
        colors[c + 2] = 0.2;
      } else {
        colors[c] = 0.8;
        colors[c + 1] = 0.8;
        colors[c + 2] = 0.8;
      }
      k += 3;
      c += 3;
    }
  }
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );

  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(colors, 3)
  );
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // dOTS
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = 25;
  dotCanvas.height = 16;
  const dotCtx = dotCanvas.getContext('2d');
  dotCtx.beginPath();
  dotCtx.arc(8, 8, 8, 0, Math.PI * 2);
  dotCtx.fillStyle = 'white';
  dotCtx.fill();
  const dotTexture = new THREE.CanvasTexture(dotCanvas);

  const material = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    map: dotTexture,
    transparent: true,
    alphaTest: 0.1,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // loop
  let count = 0;
  let reqId;
  let isPlaying = false;

  function animate() {
    if (!isPlaying) return;
    reqId = requestAnimationFrame(animate);

    const pos = points.geometry.attributes.position.array;
    let j = 0;
    for (let ix = 0; ix < AMOUNT_X; ix++) {
      for (let iz = 0; iz < AMOUNT_Z; iz++) {
        pos[j + 1] = (Math.sin((ix + count) * 0.2) * 3) +
          (Math.cos((iz + count) * 0.2) * 3);
        j += 3;
      }
    }
    points.geometry.attributes.position.needsUpdate = true;
    count += 0.05;
    renderer.render(scene, camera);
  }

  ScrollTrigger.create({
    trigger: container,
    start: "top bottom",
    end: "bottom top",
    onEnter: () => {
      if (!isPlaying) {
        isPlaying = true;
        animate();
      }
    },
    onEnterBack: () => {
      if (!isPlaying) {
        isPlaying = true;
        animate();
      }
    },
    onLeave: () => {
      isPlaying = false;
      if (reqId) cancelAnimationFrame(reqId);
    },
    onLeaveBack: () => {
      isPlaying = false;
      if (reqId) cancelAnimationFrame(reqId);
    }
  });


  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });
}

initParticleWave();

/* ================= QUOTE MODAL & EMAILJS ================= */

const EMAILJS_SERVICE_ID = "service_eep78lq";
const EMAILJS_TEMPLATE_ID = "template_qf4h9f7";
const EMAILJS_PUBLIC_KEY = "kgkW6ojrFO4untUGs";


// Initialize EmailJS
if (window.emailjs) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

const quoteModal = document.getElementById('quoteModal');
const openQuoteModalBtn = document.getElementById('openQuoteModalBtn');
const closeQuoteBtn = document.querySelector('.quote-close-btn');
const quoteForm = document.getElementById('quoteForm');
const quoteSubmitBtn = document.getElementById('quoteSubmitBtn');
const btnText = quoteSubmitBtn?.querySelector('.btn-text');
const btnLoader = quoteSubmitBtn?.querySelector('.btn-loader');
const quoteSuccessMsg = document.getElementById('quoteSuccessMsg');

if (openQuoteModalBtn && quoteModal) {
  openQuoteModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    quoteModal.classList.add('show');
    if (window.lenis) window.lenis.stop();
  });

  closeQuoteBtn.addEventListener('click', () => {
    quoteModal.classList.remove('show');
    if (window.lenis) window.lenis.start();
  });

  window.addEventListener('click', (e) => {
    if (e.target === quoteModal) {
      quoteModal.classList.remove('show');
      if (window.lenis) window.lenis.start();
    }
  });
}

if (quoteForm) {
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get values
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    // Reset errors
    document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-group input, .form-group textarea').forEach(el => el.style.borderColor = '');

    // Validate
    const errors = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      email: !email.trim() || !/\S+@\S+\.\S+/.test(email),
      message: !message.trim()
    };

    let hasError = false;
    Object.entries(errors).forEach(([field, isError]) => {
      if (isError) {
        document.getElementById(`err-${field}`).style.display = 'block';
        document.getElementById(field).style.borderColor = '#ef4444';
        hasError = true;
      }
    });

    if (hasError) return;

    // Loading state
    quoteSubmitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
    quoteSuccessMsg.style.display = 'none';

    // Send via EmailJS
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          firstName: firstName,
          lastName: lastName,
          email: email,
          message: message,
        }
      );

      // Success state
      quoteSuccessMsg.style.display = 'block';
      quoteForm.reset();

      setTimeout(() => {
        quoteSuccessMsg.style.display = 'none';
      }, 5000);

    } catch (err) {
      console.error("EmailJS error:", err);
      alert("Sorry, something went wrong. Please try again later.");
    } finally {
      // Reset button
      quoteSubmitBtn.disabled = false;
      btnText.style.display = 'inline-block';
      btnLoader.style.display = 'none';
    }
  });
}