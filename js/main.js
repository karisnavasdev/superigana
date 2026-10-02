const SI = {
  contract: "0xxomingsoon",
  twitter: "https://x.com/SuperIguana_"
};

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const loader = document.getElementById("loader");
const toastEl = document.getElementById("toast");
let toastTimer = 0;
let lenis = null;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function finishLoader() {
  if (document.body.classList.contains("is-ready")) return;
  document.documentElement.classList.add("is-ready");
  document.body.classList.add("is-ready");
  loader.classList.add("is-done");
  loader.setAttribute("aria-hidden", "true");
  setTimeout(() => loader.remove(), 900);
}

const bootAt = performance.now();
function revealWhenReady() {
  const wait = Math.max(0, 900 - (performance.now() - bootAt));
  setTimeout(finishLoader, wait);
}

if (document.readyState === "complete") revealWhenReady();
else window.addEventListener("load", revealWhenReady);
setTimeout(finishLoader, 3200);

function copyContract() {
  const text = SI.contract;
  const done = () => {
    const btn = document.getElementById("copy-btn");
    btn.textContent = "COPIED";
    toast("Contract copied");
    setTimeout(() => { btn.textContent = "COPY"; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-999px";
  document.body.appendChild(area);
  area.select();
  try { document.execCommand("copy"); done(); }
  catch { toast(text); }
  area.remove();
}

document.getElementById("copy-btn").addEventListener("click", copyContract);

function telegramNote() {
  toast("Telegram opens with launch. The army is on X for now.");
}

document.getElementById("telegram-btn").addEventListener("click", telegramNote);
document.getElementById("telegram-footer").addEventListener("click", telegramNote);

const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const navLinks = document.getElementById("nav-links");

function closeMenu() {
  navLinks.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
  if (lenis) lenis.start();
}

burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.setAttribute("aria-expanded", open ? "true" : "false");
  if (lenis) {
    if (open) lenis.stop();
    else lenis.start();
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -84 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });
});

const progress = document.getElementById("progress");
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? window.scrollY / max : 0;
  progress.style.transform = `scaleX(${p})`;
  nav.classList.toggle("is-stuck", window.scrollY > 24);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const glow = document.getElementById("cursor-glow");
if (finePointer && !reduce) {
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let gx = mx;
  let gy = my;
  window.addEventListener("pointermove", (event) => {
    mx = event.clientX;
    my = event.clientY;
  });
  const follow = () => {
    gx += (mx - gx) * 0.16;
    gy += (my - gy) * 0.16;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    requestAnimationFrame(follow);
  };
  follow();
}

const starCanvas = document.getElementById("stars");
if (starCanvas && !reduce) {
  const ctx = starCanvas.getContext("2d");
  let stars = [];
  let running = true;
  const hero = document.querySelector(".hero");

  function layoutStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    starCanvas.width = starCanvas.offsetWidth * dpr;
    starCanvas.height = starCanvas.offsetHeight * dpr;
    const count = Math.min(70, Math.floor(window.innerWidth / 18));
    stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.4,
      v: Math.random() * 0.00035 + 0.00008,
      a: Math.random() * Math.PI * 2,
      gold: Math.random() > 0.84
    }));
  }

  function drawStars() {
    if (!running) return;
    const visible = hero.getBoundingClientRect().bottom > 0;
    if (visible && !document.hidden) {
      const w = starCanvas.width;
      const h = starCanvas.height;
      ctx.clearRect(0, 0, w, h);
      stars.forEach((star) => {
        star.y -= star.v;
        if (star.y < 0) star.y = 1;
        star.a += 0.03;
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(star.a)) * 0.55;
        ctx.fillStyle = star.gold ? "#ffc857" : "#e7ff9a";
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r * (window.devicePixelRatio || 1), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(drawStars);
  }

  layoutStars();
  drawStars();
  window.addEventListener("resize", layoutStars);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) drawStars();
  });
}

const bubble = document.getElementById("bubble");
const mascotTilt = document.getElementById("mascot-tilt");
const meetStage = document.getElementById("meet-stage");
const moods = ["STAY SUPER.", "$SI.", "OBVIOUSLY.", "TO THE MOON."];
let moodIndex = 0;

if (!reduce) {
  setInterval(() => {
    if (meetStage.matches(":hover")) return;
    moodIndex = (moodIndex + 1) % moods.length;
    bubble.textContent = moods[moodIndex];
  }, 3200);
}

meetStage.querySelectorAll(".p-card").forEach((card) => {
  card.addEventListener("pointerenter", () => {
    bubble.textContent = card.dataset.mood || "STAY SUPER.";
    card.classList.add("is-hot");
  });
  card.addEventListener("pointerleave", () => card.classList.remove("is-hot"));
});

if (finePointer && !reduce) {
  meetStage.addEventListener("pointermove", (event) => {
    const rect = mascotTilt.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
    const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
    mascotTilt.style.transform = `rotateY(${dx * 10}deg) rotateX(${-dy * 8}deg)`;
  });
  meetStage.addEventListener("pointerleave", () => {
    mascotTilt.style.transform = "rotateY(0deg) rotateX(0deg)";
  });
}

document.getElementById("mascot-img").addEventListener("click", () => {
  const lines = ["STAY SUPER.", "SEND IT.", "$SI.", "OBVIOUSLY.", "SUPER."];
  bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
});

function tiltCards(selector) {
  if (!finePointer || reduce) return;
  document.querySelectorAll(selector).forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

tiltCards(".why-card");
tiltCards(".meme-card");

const cards = [...document.querySelectorAll(".meme-card")];
const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lb-img");
const lbCap = document.getElementById("lb-cap");
let lbIndex = 0;

function showMeme(index) {
  lbIndex = (index + cards.length) % cards.length;
  const card = cards[lbIndex];
  const img = card.querySelector("img");
  lbImg.src = img.currentSrc || img.src;
  lbImg.alt = img.alt;
  lbCap.textContent = card.dataset.title || "";
}

function openMeme(index) {
  showMeme(index);
  if (!lightbox.open) lightbox.showModal();
  if (lenis) lenis.stop();
}

cards.forEach((card, index) => {
  card.addEventListener("click", () => openMeme(index));
});

document.getElementById("lb-close").addEventListener("click", () => lightbox.close());
document.getElementById("lb-prev").addEventListener("click", () => showMeme(lbIndex - 1));
document.getElementById("lb-next").addEventListener("click", () => showMeme(lbIndex + 1));

lightbox.addEventListener("click", (event) => {
  const rect = lightbox.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) lightbox.close();
});

lightbox.addEventListener("close", () => { if (lenis) lenis.start(); });

document.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;
  if (event.key === "ArrowRight") showMeme(lbIndex + 1);
  if (event.key === "ArrowLeft") showMeme(lbIndex - 1);
});

const army = document.getElementById("army-field");
const armyCount = window.innerWidth < 700 ? 26 : 64;
for (let i = 0; i < armyCount; i += 1) {
  const img = document.createElement("img");
  img.src = "logo.jpg";
  img.alt = "";
  const size = 36 + Math.random() * 58;
  img.style.left = `${Math.random() * 100}%`;
  img.style.top = `${Math.random() * 100}%`;
  img.style.width = `${size}px`;
  img.style.animationDuration = `${6 + Math.random() * 7}s`;
  img.style.animationDelay = `${-Math.random() * 8}s`;
  img.style.opacity = `${0.22 + Math.random() * 0.45}`;
  army.appendChild(img);
}

const finale = document.getElementById("finale");
const flMain = document.getElementById("fl-main");
const flMid = document.getElementById("fl-mid");
const flSub = document.getElementById("fl-sub");
let finalePlaying = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playFinale() {
  if (finalePlaying) return;
  finalePlaying = true;
  finale.classList.remove("is-lit");
  finale.classList.add("is-playing");
  flMain.classList.remove("is-glitch");
  flMain.textContent = "";
  flMid.textContent = "";
  flSub.textContent = "";

  flMain.textContent = "THE WORLD HAS INTELLIGENCE.";
  await wait(1000);
  flMid.textContent = "NOW IT NEEDS";
  await wait(850);
  flSub.textContent = "SUPER INTELLIGENCE.";
  await wait(1000);
  flMain.classList.add("is-glitch");
  await wait(420);
  flMain.classList.remove("is-glitch");
  flMain.textContent = "SUPER IGUANA.";
  flMid.textContent = "";
  flSub.textContent = "$SI";
  await wait(420);
  finale.classList.add("is-lit");
  finale.classList.remove("is-playing");
  finalePlaying = false;
}

document.getElementById("replay").addEventListener("click", () => {
  if (reduce) return;
  playFinale();
});

function setupMotion() {
  if (!window.gsap || !window.ScrollTrigger) {
    finale.classList.add("is-lit");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis && !reduce) {
    lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  if (reduce) {
    finale.classList.add("is-lit");
    return;
  }

  flMain.textContent = "THE WORLD HAS INTELLIGENCE.";
  flMid.textContent = "";
  flSub.textContent = "";

  gsap.utils.toArray("[data-step]").forEach((panel, index) => {
    gsap.from(panel, {
      y: 40,
      opacity: 0,
      duration: 0.7,
      delay: index * 0.05,
      ease: "power3.out",
      scrollTrigger: { trigger: panel, start: "top 82%" }
    });
  });

  gsap.from(".origin-copy p", {
    y: 24,
    opacity: 0,
    stagger: 0.12,
    duration: 0.6,
    ease: "power2.out",
    scrollTrigger: { trigger: ".origin-copy", start: "top 80%" }
  });

  gsap.from(".p-card", {
    y: 28,
    opacity: 0,
    stagger: 0.08,
    duration: 0.6,
    ease: "power2.out",
    scrollTrigger: { trigger: ".meet-stage", start: "top 75%" }
  });

  gsap.from(".why-card", {
    y: 30,
    opacity: 0,
    stagger: 0.1,
    duration: 0.6,
    scrollTrigger: { trigger: ".why-grid", start: "top 80%" }
  });

  gsap.from(".coin", {
    scale: 0.8,
    opacity: 0,
    duration: 0.8,
    ease: "back.out(1.4)",
    scrollTrigger: { trigger: ".token", start: "top 75%" }
  });

  const mm = gsap.matchMedia();
  mm.add("(min-width: 801px)", () => {
    const track = document.getElementById("comic-track");
    const viewport = document.getElementById("comic-viewport");
    const tween = gsap.to(track, {
      x: () => -(track.scrollWidth - viewport.offsetWidth),
      ease: "none",
      scrollTrigger: {
        trigger: "#comic-pin",
        start: "top top",
        end: () => `+=${Math.max(track.scrollWidth - viewport.offsetWidth, 1)}`,
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
    return () => tween.scrollTrigger && tween.scrollTrigger.kill();
  });

  ScrollTrigger.create({
    trigger: "#soon",
    start: "top 65%",
    once: true,
    onEnter: () => {
      const soon = document.getElementById("soon");
      soon.classList.add("shake");
      setTimeout(() => soon.classList.remove("shake"), 450);
    }
  });

  ScrollTrigger.create({
    trigger: "#finale",
    start: "top 62%",
    once: true,
    onEnter: () => playFinale()
  });

  const sectionLinks = [...document.querySelectorAll(".nav-links a")];
  sectionLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: "top 40%",
      end: "bottom 40%",
      onToggle: (self) => {
        if (self.isActive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    });
  });
}

setupMotion();
