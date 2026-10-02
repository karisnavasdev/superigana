(function () {
  const canvas = document.getElementById("si-game");
  const shell = document.getElementById("game-shell");
  const overlay = document.getElementById("game-overlay");
  const startBtn = document.getElementById("game-start");
  const titleEl = document.getElementById("game-title");
  const blurbEl = document.getElementById("game-blurb");
  const scoreEl = document.getElementById("game-score");
  const bestEl = document.getElementById("game-best");
  if (!canvas || !shell || !overlay || !startBtn) return;

  const ctx = canvas.getContext("2d");
  const sprite = new Image();
  sprite.src = "Meme/super_iguana_01_500x500.png";

  const state = {
    running: false,
    over: false,
    y: 0,
    vy: 0,
    score: 0,
    best: 0,
    obstacles: [],
    coins: [],
    spawnX: 0,
    city: 0,
    particles: [],
    shake: 0
  };

  let W = 960;
  let H = 540;
  let raf = 0;
  let last = 0;
  let audioCtx = null;
  let paused = false;
  let grace = 0;

  function setOverlay(show) {
    overlay.classList.toggle("is-hidden", !show);
  }

  try {
    state.best = Number(localStorage.getItem("si-moon-best") || 0);
  } catch {
    state.best = 0;
  }
  bestEl.textContent = "BEST " + state.best;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, rect.width);
    H = Math.max(200, rect.height);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tone(freq, dur, type) {
    try {
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.035;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur);
    } catch {
      /* sound is optional */
    }
  }

  function reset() {
    state.y = H * 0.46;
    state.score = 0;
    state.obstacles = [];
    state.coins = [];
    state.particles = [];
    state.shake = 0;
    state.over = false;
    grace = 1.7;
    state.vy = -160;
    state.spawnX = W + 140;
    for (let i = 0; i < 4; i += 1) spawn();
    paintScore();
  }

  function spawn() {
    const gap = Math.max(148, 228 - state.score * 1.1);
    const margin = 36;
    const gapY = margin + Math.random() * Math.max(20, H - gap - margin * 2);
    state.obstacles.push({ x: state.spawnX, gapY, gap, w: 56, scored: false });
    if (Math.random() > 0.22) {
      state.coins.push({
        x: state.spawnX + 28,
        y: gapY + gap * (0.35 + Math.random() * 0.3),
        r: 13,
        got: false
      });
    }
    state.spawnX += 270;
  }

  function boost() {
    if (!state.running) return;
    state.vy = -430;
    tone(520, 0.08, "square");
    for (let i = 0; i < 5; i += 1) {
      state.particles.push({
        x: W * 0.26,
        y: state.y + 10,
        vx: -40 - Math.random() * 80,
        vy: 40 + Math.random() * 80,
        life: 0.35
      });
    }
  }

  function paintScore() {
    scoreEl.textContent = String(state.score);
    bestEl.textContent = "BEST " + state.best;
  }

  function loop() {
    paused = false;
    setOverlay(false);
    state.running = true;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    fit();
    reset();
    titleEl.textContent = "FLY THE CAPE";
    blurbEl.textContent = "Space, click, or tap to boost. Collect $SI. Miss a candle and the run is over.";
    startBtn.textContent = "PLAY";
    loop();
    tone(340, 0.1, "square");
  }

  function finish() {
    state.running = false;
    state.over = true;
    state.shake = 8;
    cancelAnimationFrame(raf);
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem("si-moon-best", String(state.best)); } catch { /* ignore */ }
    }
    paintScore();
    paused = false;
    titleEl.textContent = "CAPE DOWN";
    blurbEl.textContent = "Score " + state.score + ". Best " + state.best + ". The candles win this round. Run it back.";
    startBtn.textContent = "PLAY AGAIN";
    setOverlay(true);
    tone(140, 0.22, "sawtooth");
    draw();
  }

  function circleRect(cx, cy, r, x, y, w, h) {
    const nx = Math.max(x, Math.min(cx, x + w));
    const ny = Math.max(y, Math.min(cy, y + h));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function update(dt) {
    const speed = Math.min(430, 190 + state.score * 2.4);
    if (grace > 0) grace -= dt;
    state.vy = Math.min(720, state.vy + 1180 * dt);
    if (grace > 0 && state.y > H * 0.62) state.vy = -240;
    state.y += state.vy * dt;
    state.city = (state.city + speed * dt) % 80;
    state.shake = Math.max(0, state.shake - dt * 18);

    state.obstacles.forEach((item) => { item.x -= speed * dt; });
    state.coins.forEach((coin) => { coin.x -= speed * dt; });
    state.particles.forEach((bit) => {
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.life -= dt;
    });
    state.particles = state.particles.filter((bit) => bit.life > 0);

    const playerX = W * 0.26;
    const radius = Math.max(16, Math.min(26, W * 0.028));
    if (state.y < radius + 6) {
      state.y = radius + 6;
      if (state.vy < 0) state.vy = 40;
    }
    if (grace <= 0 && state.y > H - radius - 8) {
      finish();
      return;
    }

    state.obstacles.forEach((item) => {
      if (!state.running) return;
      const hitTop = circleRect(playerX, state.y, radius * 0.82, item.x, 0, item.w, item.gapY);
      const bottomY = item.gapY + item.gap;
      const hitBottom = circleRect(playerX, state.y, radius * 0.82, item.x, bottomY, item.w, H - bottomY);
      if (grace <= 0 && (hitTop || hitBottom)) finish();
      if (!state.running || item.scored || item.x + item.w >= playerX) return;
      item.scored = true;
      state.score += 1;
      paintScore();
      tone(680, 0.06, "square");
    });

    if (!state.running) return;

    state.coins.forEach((coin) => {
      if (coin.got) return;
      const dx = coin.x - playerX;
      const dy = coin.y - state.y;
      if (dx * dx + dy * dy < (radius + coin.r) * (radius + coin.r)) {
        coin.got = true;
        state.score += 5;
        paintScore();
        tone(880, 0.09, "triangle");
      }
    });

    const right = state.obstacles.reduce((max, item) => Math.max(max, item.x), 0);
    if (right < W + 20) {
      state.spawnX = right + 270;
      spawn();
    }
    state.obstacles = state.obstacles.filter((item) => item.x > -80);
    state.coins = state.coins.filter((coin) => coin.x > -40);
  }

  function drawCandle(x, y, w, h) {
    if (h < 4) return;
    ctx.fillStyle = "#e10600";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ffb0a8";
    ctx.fillRect(x + w * 0.42, y - 8, 6, h + 16);
  }

  function draw() {
    ctx.save();
    if (state.shake) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07182c");
    sky.addColorStop(0.55, "#0c3b1e");
    sky.addColorStop(1, "#04140c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(198, 255, 58, 0.16)";
    for (let i = 0; i < 28; i += 1) {
      const sx = (i * 97 + state.city * 0.3) % W;
      const sy = (i * 53) % (H * 0.6);
      ctx.fillRect(sx, sy, 2, 2);
    }

    const moonR = Math.min(H * 0.28, 70 + state.score);
    ctx.beginPath();
    ctx.fillStyle = "#d9ff8a";
    ctx.arc(W * 0.78, H * 0.22, moonR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#06210f";
    for (let i = 0; i < 16; i += 1) {
      const bw = W / 14;
      const bx = i * bw - (state.city % bw);
      const bh = 40 + ((i * 37) % 70);
      ctx.fillRect(bx, H - bh, bw - 6, bh);
    }

    state.obstacles.forEach((item) => {
      drawCandle(item.x, 0, item.w, item.gapY);
      drawCandle(item.x, item.gapY + item.gap, item.w, H - (item.gapY + item.gap));
    });

    state.coins.forEach((coin) => {
      if (coin.got) return;
      ctx.beginPath();
      ctx.fillStyle = "#ffc857";
      ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#6d4d0c";
      ctx.stroke();
      ctx.fillStyle = "#06210f";
      ctx.font = "700 9px Unbounded, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SI", coin.x, coin.y + 0.5);
    });

    state.particles.forEach((bit) => {
      ctx.globalAlpha = Math.max(0, bit.life * 2);
      ctx.fillStyle = "#c6ff3a";
      ctx.fillRect(bit.x, bit.y, 4, 4);
      ctx.globalAlpha = 1;
    });

    const px = W * 0.26;
    const radius = Math.max(18, Math.min(30, W * 0.034));
    ctx.save();
    ctx.translate(px, state.y);
    ctx.rotate(Math.max(-0.7, Math.min(0.8, state.vy / 620)));
    ctx.beginPath();
    ctx.fillStyle = "#e10600";
    ctx.moveTo(-radius * 0.2, -radius * 0.2);
    ctx.lineTo(-radius * 1.35, radius * 0.15);
    ctx.lineTo(-radius * 0.1, radius * 0.55);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
    if (sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
    else {
      ctx.fillStyle = "#c6ff3a";
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(px, state.y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#c6ff3a";
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    if (!state.running) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    update(dt);
    if (state.running) {
      draw();
      raf = requestAnimationFrame(frame);
    }
  }

  startBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (paused && !state.over) loop();
    else start();
  });

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!state.running) return;
    boost();
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "ArrowUp") return;
    if (event.target && event.target.closest && event.target.closest("input, textarea")) return;
    const box = document.getElementById("lightbox");
    if (box && box.open) return;
    const rect = shell.getBoundingClientRect();
    const visible = rect.bottom > 80 && rect.top < window.innerHeight - 40;
    if (!visible && !state.running) return;
    event.preventDefault();
    if (!state.running) {
      if (!overlay.classList.contains("is-hidden")) {
        if (paused && !state.over) loop();
        else start();
      }
      return;
    }
    boost();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) {
      paused = true;
      state.running = false;
      cancelAnimationFrame(raf);
      titleEl.textContent = "PAUSED";
      blurbEl.textContent = "Super Iguana is holding the cape. Resume to boost again.";
      startBtn.textContent = "RESUME";
      setOverlay(true);
    }
  });

  window.addEventListener("resize", () => {
    fit();
    if (!state.running) draw();
  });

  sprite.addEventListener("load", () => { if (!state.running) draw(); });
  fit();
  draw();
})();
