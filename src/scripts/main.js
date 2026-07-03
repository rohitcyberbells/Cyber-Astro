import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Matter from "matter-js";
import * as THREE from "three";

window.gsap = gsap;
window.Lenis = Lenis;
window.Matter = Matter;
window.THREE = THREE;

/* ================= SCROLL RESTORATION ================= */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
/* ================= END SCROLL RESTORATION ================= */

gsap.registerPlugin(ScrollTrigger);

const isDesktop = window.matchMedia('(min-width: 769px)').matches;

const platformStr = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
const isMacOS = /mac/i.test(platformStr) && !/iPhone|iPod/.test(navigator.userAgent);

const lenis = (isDesktop && !isMacOS)
  ? new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    touchMultiplier: 1.2,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    autoRaf: false,
  })
  : null;

if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

const SLOWED_MULTIPLIER = 0.25;
const NORMAL_MULTIPLIER = 1;


const lenisSpeed = { value: SLOWED_MULTIPLIER };
let speedTween = null;

//  page load syrup
if (lenis) {
  lenis.options.wheelMultiplier = SLOWED_MULTIPLIER;
  lenis.virtualScroll.options.wheelMultiplier = SLOWED_MULTIPLIER;
  lenis.options.touchMultiplier = SLOWED_MULTIPLIER;
  lenis.virtualScroll.options.touchMultiplier = SLOWED_MULTIPLIER;
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
      lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value;
      lenis.options.touchMultiplier = lenisSpeed.value;
      lenis.virtualScroll.options.touchMultiplier = lenisSpeed.value;
    }
  });
}
//Hero protection 
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
    if (heroProtectionActive) {
      let raw = e.deltaY;
      if (e.deltaMode === 1) raw *= LINE_HEIGHT;
      if (e.deltaMode === 2) raw *= window.innerHeight;

      const compressed = compress(raw);
      const factor = Math.abs(raw) > THRESHOLD ? Math.abs(compressed) / Math.abs(raw) : 1;

      lenis.options.wheelMultiplier = lenisSpeed.value * factor;
      lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value * factor;
    } else {
      lenis.options.wheelMultiplier = lenisSpeed.value;
      lenis.virtualScroll.options.wheelMultiplier = lenisSpeed.value;
    }
  }

  window.addEventListener('wheel', onWheel, { capture: true, passive: true });
}



const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });
}

/*  CARDS */
const heroCards = gsap.utils.toArray('.hero-cards-wrapper .ph-card');

const heroFanStates = [
  { x: -300, y: 10, rotation: -24, scale: 1 },
  { x: -200, y: 6, rotation: -16, scale: 1 },
  { x: -100, y: 5, rotation: -8, scale: 1 },
  { x: 0, y: 0, rotation: 0, scale: 1 },
  { x: 100, y: 8, rotation: 8, scale: 1 },
  { x: 200, y: 11, rotation: 16, scale: 1 },
  { x: 300, y: 15, rotation: 24, scale: 1 }
];

const mm = gsap.matchMedia();

/*  SECTION 1 */
function playHeroIntro(onIntroComplete) {
  if (heroCards.length < 7) {
    onIntroComplete?.();
    return;
  }

  const hiddenCards = heroCards.slice(0, 6);
  const topCard = heroCards[6];

  gsap.set(['.hero-word', '.hero-para', '.hero-btn', '.readmore-btn'], {
    y: 40,
    opacity: 0
  });

  const introMm = gsap.matchMedia();

  introMm.add(
    {
      isDesktop: '(min-width: 769px)',
      isMobile: '(max-width: 768px)'
    },
    (context) => {
      const { isDesktop } = context.conditions;
      const introTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (isDesktop) {
        gsap.set(hiddenCards, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0 });
        gsap.set(topCard, { x: 0, y: 800, rotation: 0, scale: 1, opacity: 0 });

        introTL
          .to(topCard, { y: 0, opacity: 1, duration: 0.55 })
          .set(hiddenCards, { opacity: 1 })
          .to(
            ['.hero-word', '.hero-para', '.hero-btn', '.readmore-btn'],
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.03 },
            '-=0.3'
          )
          .to(
            heroCards,
            {
              x: (i) => heroFanStates[i].x,
              y: (i) => heroFanStates[i].y,
              rotation: (i) => heroFanStates[i].rotation,
              scale: (i) => heroFanStates[i].scale,
              duration: 0.7,
              ease: 'power3.out'
            },
            '+=0.1'
          )
          .call(() => onIntroComplete?.());
      } else {
        const BASE_WIDTH = 768;
        const MIN_SCALE = 0.45;

        const applyMobileFan = () => {
          const fanScale = gsap.utils.clamp(
            MIN_SCALE,
            1,
            window.innerWidth / BASE_WIDTH
          );

          gsap.set(heroCards, {
            x: (i) => heroFanStates[i].x * fanScale,
            y: (i) => heroFanStates[i].y * fanScale,
            rotation: (i) => heroFanStates[i].rotation,
            scale: (i) => heroFanStates[i].scale,
            opacity: 1
          });
        };

        applyMobileFan();

        let mobileResizeTimeout;
        const onMobileResize = () => {
          clearTimeout(mobileResizeTimeout);
          mobileResizeTimeout = setTimeout(applyMobileFan, 150);
        };
        window.addEventListener('resize', onMobileResize);

        introTL
          .to(
            ['.hero-word', '.hero-para', '.hero-btn', '.readmore-btn'],
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.05 }
          )
          .call(() => onIntroComplete?.());

        return () => {
          clearTimeout(mobileResizeTimeout);
          window.removeEventListener('resize', onMobileResize);
        };
      }

      return () => introTL.kill();
    }
  );
}

/*  SECTION 2   */
function initScrollMaster() {
  if (lenis) lenis.start();

  const dcCards = gsap.utils.toArray('.dc-right .dc-card');
  if (dcCards.length) {
    gsap.set(dcCards, { opacity: 0 });
  }

  let targetX = 0;
  let targetY = 0;

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

    targetX = dc3Left - heroLeft;
    targetY = dc3Top - heroTop;
  }

  let resizeTimeout;
  function debouncedCalculateDeltas() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      calculateDeltas();
      ScrollTrigger.refresh();
    }, 150);
  }

  window.addEventListener('resize', debouncedCalculateDeltas);
  window.addEventListener('load', () => {
    calculateDeltas();
    ScrollTrigger.refresh();
  });
  calculateDeltas();

  const diagonalCardEl = document.querySelector('.diagonal-card');

  if (diagonalCardEl && window.matchMedia('(min-width: 769px)').matches) {
    ScrollTrigger.create({
      trigger: diagonalCardEl,
      start: 'top bottom',
      end: 'center center',
      onEnter: () => tweenLenisSpeed(SLOWED_MULTIPLIER, 0.9, 'power2.out'),
      onLeave: () => tweenLenisSpeed(NORMAL_MULTIPLIER, 1.1, 'power2.inOut'),
      onEnterBack: () => tweenLenisSpeed(SLOWED_MULTIPLIER, 0.9, 'power2.out'),
      onLeaveBack: () => tweenLenisSpeed(NORMAL_MULTIPLIER, 1.1, 'power2.inOut')
    });
  }

  mm.add(
    {
      isDesktop: '(min-width: 769px)',
      isMobile: '(max-width: 768px)'
    },
    (context) => {
      const { isDesktop } = context.conditions;
      if (!isDesktop || !diagonalCardEl || heroCards.length < 7 || dcCards.length < 1) {
        return;
      }

      gsap.set(['.diagonal-word', '.diagonal-join-btn', '.diagonal-readmore-btn'], {
        y: 50,
        opacity: 0
      });

      gsap.from(['.dc-bubble-a', '.dc-bubble-b', '.dc-bubble-c'], {
        scrollTrigger: {
          trigger: '.diagonal-card',
          start: 'center 75%',
          toggleActions: "play reverse play reverse"
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out'
      });

      const masterTL = gsap.timeline({
        scrollTrigger: {
          trigger: diagonalCardEl,
          start: 'top 80%',
          end: 'center center',
          scrub: 1.5,
          invalidateOnRefresh: true,
          onRefreshInit: calculateDeltas
        }
      });

      masterTL.fromTo(
        heroCards,
        {
          x: (i) => heroFanStates[i].x,
          y: (i) => heroFanStates[i].y,
          rotation: (i) => heroFanStates[i].rotation,
          scale: (i) => heroFanStates[i].scale
        },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 1.6,
          ease: 'power2.inOut'
        }
      );

      masterTL.to(heroCards, {
        x: () => targetX,
        y: () => targetY,
        duration: 2.4,
        ease: 'power1.inOut'
      });


      masterTL.to(
        ['.diagonal-word', '.diagonal-join-btn', '.diagonal-readmore-btn'],
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'power1.out' },
        '-=0.4'
      );
      const dealOffsets = [
        { x: -220, y: -100, rotation: 0 },
        { x: -120, y: -50, rotation: 0 },
        { x: 0, y: 0, rotation: 0 },
        { x: 120, y: 50, rotation: 0 },
        { x: 220, y: 100, rotation: 0 },
        { x: 320, y: 150, rotation: 0 },
        { x: 420, y: 200, rotation: 0 }
      ];

      masterTL.to(heroCards, {
        x: (i) => targetX + dealOffsets[i].x,
        y: (i) => targetY + dealOffsets[i].y,
        rotation: (i) => dealOffsets[i].rotation,
        duration: 1.6,
        stagger: 0.08,
        ease: 'power1.out'
      });

      masterTL.to(
        heroCards[4],
        { backgroundColor: '#fff', duration: 0.8, ease: 'power1.out' },
        '-=0.8'
      );

      const cleanupProtection = bindHeroProtectionZone(masterTL);
      return () => {
        masterTL.kill();
        cleanupProtection();
      };
    }
  );

  ScrollTrigger.refresh();
}

/*  HERO PROTECTION  */
function bindHeroProtectionZone(masterTL) {
  if (!window.matchMedia('(min-width: 769px)').matches) return () => { };

  const st = masterTL.scrollTrigger;

  const zoneST = ScrollTrigger.create({
    trigger: st.vars.trigger,
    start: st.vars.start,
    end: st.vars.end,
    onEnter: () => { heroProtectionActive = true; },
    onLeave: () => { heroProtectionActive = false; },
    onEnterBack: () => { heroProtectionActive = true; },
    onLeaveBack: () => { heroProtectionActive = true; },
  });

  return () => {
    zoneST.kill();
  };
}
/* ================= MAC FANOUT FIX ================= */
// On Mac, browsers restore scroll position AFTER the first JS tick,
// so we wait two animation frames, force scroll to 0, then init.
// This prevents ScrollTrigger's scrub from pre-seeking and collapsing the fan.
//
// FIX (bug 2): Chrome's scroll anchoring can also nudge window.scrollY on its
// own — with no user input — while images/fonts load and shift layout above
// the fold. On Mac there's no Lenis buffering the raw scroll, so masterTL's
// scrub timeline reads that phantom scroll directly and animates the cards
// to match (looks like "fan spreads out, then re-stacks itself"). We guard
// scrollY back to 0 until a genuine user gesture happens. Pair this with
// `overflow-anchor: none;` in your CSS on html/body to kill it at the source.
if (isMacOS) {
  let userInteracted = false;
  const markInteracted = () => { userInteracted = true; };
  ['wheel', 'touchstart', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, markInteracted, { passive: true, once: true })
  );

  const guardScroll = () => {
    if (!userInteracted && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  };
  window.addEventListener('scroll', guardScroll, { passive: true });
  window.addEventListener('load', guardScroll);
  window.addEventListener('pageshow', guardScroll);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      playHeroIntro(() => {
        initScrollMaster();
        // Intro is done and the scrub timeline is live — stop fighting scroll.
        window.removeEventListener('scroll', guardScroll);
        window.removeEventListener('load', guardScroll);
        window.removeEventListener('pageshow', guardScroll);
      });
    });
  });
} else {
  playHeroIntro(initScrollMaster);
}
/* ================= END MAC FANOUT FIX ================= */

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

function initMatterPhysics() {
  const container = document.querySelector(".large-grid-top");
  const circles = document.querySelectorAll(".lgt-circle");

  if (!container || circles.length === 0 || !window.Matter) return;

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

function initFolderPhysics() {
  const container = document.querySelector(".folder-icons-cluster");
  const circles = document.querySelectorAll(".cluster-icon");

  if (!container || circles.length === 0 || !window.Matter) return;

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

function initParticleWave() {
  const container = document.getElementById('particle-wave-container');
  if (!container || !window.THREE) return;//net


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