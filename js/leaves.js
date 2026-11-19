/*
 * Falling leaves background.
 * - Leaves drift down, sway and tumble.
 * - The breeze follows your cursor: move left and leaves drift left, move right and they drift right.
 * - Leaves near the cursor get pushed away (a little gust), and flicks of the mouse send them spinning.
 * - If the visitor's device asks for reduced motion, leaves move more slowly and calmly
 *   but still react to the cursor (set calmWhenReducedMotion to false to ignore that setting).
 *
 * Tweak the settings below to change the feel.
 */
(function () {
  const SETTINGS = {
    leavesPerMegapixel: 26,   // density
    minLeaves: 16,
    maxLeaves: 48,
    sizeScale: 1.45,          // make every leaf bigger or smaller (1 = original size)
    pushRadius: 190,          // how close the cursor must be to push a leaf (px)
    pushStrength: 2.4,
    breeze: 1.3,              // how strongly the cursor position steers the drift
    calmWhenReducedMotion: true,
    calmSpeed: 0.4,           // speed multiplier used in calm mode
    mapleShare: 0.7,          // fraction of leaves that are maple; the rest are slim leaves
    colours: ['#4f7a3a', '#6f9150', '#8aae5c', '#3f6b45', '#a7c06a', '#c9b458', '#d08a3c', '#b85a30']
  };

  // Right half of a maple leaf outline (x, y), from the top tip down to the stem.
  // The left half is drawn as a mirror image. Units are multiples of the leaf size.
  const MAPLE_RIGHT = [
    [0, -1], [0.1, -0.74], [0.2, -0.82], [0.17, -0.52],
    [0.38, -0.64], [0.43, -0.5], [0.64, -0.6], [0.56, -0.34],
    [0.82, -0.3], [0.64, -0.1], [0.98, 0.0], [0.62, 0.17],
    [0.74, 0.4], [0.38, 0.3], [0.33, 0.5], [0.12, 0.36], [0.05, 0.6]
  ];
  // Slight random distortion per leaf so no two maples look identical
  function jitteredMaple() {
    const amt = 0.07;
    const right = MAPLE_RIGHT.map(([x, y], i) =>
      i === 0 || i === MAPLE_RIGHT.length - 1 ? [x, y] : [x + rand(-amt, amt), y + rand(-amt, amt)]);
    const stretch = rand(0.88, 1.12);  // some wider, some taller
    return right.map(([x, y]) => [x * stretch, y]);
  }

  const canvas = document.getElementById('leaves');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = reduceMotion && SETTINGS.calmWhenReducedMotion ? SETTINGS.calmSpeed : 1;

  let w = 0, h = 0, dpr = 1;
  let leaves = [];
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, lastT: 0 };
  let wind = 0;          // current breeze, eases toward target
  let running = false;

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeLeaf(startAbove) {
    const depth = rand(0.45, 1);             // further-away leaves are smaller, slower, fainter
    const maple = Math.random() < SETTINGS.mapleShare;
    return {
      shape: maple ? jitteredMaple() : null,
      x: rand(-20, w + 20),
      y: startAbove ? rand(-h * 0.2, -20) : rand(-20, h),
      size: (maple ? rand(10, 26) : rand(8, 18)) * (0.6 + depth * 0.6) * SETTINGS.sizeScale,
      depth,
      vx: 0,
      vy: rand(0.3, 0.8) * depth,
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.02, 0.02),
      flip: rand(0, Math.PI * 2),
      flipSpeed: rand(0.01, 0.035),
      sway: rand(0, Math.PI * 2),
      swaySpeed: rand(0.008, 0.02),
      colour: SETTINGS.colours[Math.floor(Math.random() * SETTINGS.colours.length)],
      alpha: 0.35 + depth * 0.5
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.max(SETTINGS.minLeaves,
      Math.min(SETTINGS.maxLeaves, Math.round((w * h) / 1e6 * SETTINGS.leavesPerMegapixel)));
    while (leaves.length < target) leaves.push(makeLeaf(false));
    leaves.length = target;
    draw();
  }

  function drawLeaf(l) {
    const s = l.size;
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.scale(Math.cos(l.flip) * 0.85 + 0.15 * Math.sign(Math.cos(l.flip) || 1), 1); // tumbling
    ctx.globalAlpha = l.alpha;

    ctx.fillStyle = l.colour;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(0.8, s * 0.06);

    if (l.shape) {
      // maple: right half, then mirrored left half
      const pts = l.shape;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(-pts[i][0] * s, pts[i][1] * s);
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.fill();

      // veins out to the three main lobes, plus the stem
      const base = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(0, base); ctx.lineTo(0, -s * 0.85);
      ctx.moveTo(0, base); ctx.lineTo(s * 0.8, -s * 0.05);
      ctx.moveTo(0, base); ctx.lineTo(-s * 0.8, -s * 0.05);
      ctx.moveTo(0, base); ctx.lineTo(s * 0.55, s * 0.35);
      ctx.moveTo(0, base); ctx.lineTo(-s * 0.55, s * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.55); ctx.lineTo(s * 0.05, s * 1.15);
      ctx.strokeStyle = l.colour;
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.stroke();
    } else {
      // slim leaf
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.75, -s * 0.55, s * 0.6, s * 0.55, 0, s);
      ctx.bezierCurveTo(-s * 0.6, s * 0.55, -s * 0.75, -s * 0.55, 0, -s);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(0, s * 1.25);
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const l of leaves) drawLeaf(l);
  }

  function step() {
    if (!running) return;

    // breeze steered by where the cursor sits horizontally
    const targetWind = pointer.active ? ((pointer.x / w) - 0.5) * 2 * SETTINGS.breeze : 0.15;
    wind += (targetWind - wind) * 0.02;

    for (const l of leaves) {
      // cursor gust
      if (pointer.active) {
        const dx = l.x - pointer.x;
        const dy = l.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < SETTINGS.pushRadius && dist > 0.01) {
          const f = (1 - dist / SETTINGS.pushRadius) * SETTINGS.pushStrength;
          l.vx += (dx / dist) * f + pointer.vx * 0.04 * f;
          l.vy += (dy / dist) * f * 0.6 + pointer.vy * 0.04 * f;
          l.spin += (Math.random() - 0.5) * 0.02 * f;
        }
      }

      l.sway += l.swaySpeed * speed;
      l.flip += l.flipSpeed * speed;

      // drift back towards a gentle fall
      const fallSpeed = 0.35 + l.depth * 0.75;
      l.vy += (fallSpeed - l.vy) * 0.02;
      l.vx += (wind * l.depth - l.vx) * 0.03;

      l.x += (l.vx + Math.sin(l.sway) * 0.6 * l.depth) * speed;
      l.y += l.vy * speed;
      l.rot += (l.spin + Math.sin(l.sway) * 0.004) * speed;
      l.spin *= 0.99;

      // recycle leaves that leave the screen
      if (l.y > h + l.size * 2 || l.x < -80 || l.x > w + 80 || l.y < -h * 0.4) {
        Object.assign(l, makeLeaf(true));
        if (wind > 0.3 && Math.random() < 0.4) { l.x = rand(-60, -20); l.y = rand(0, h * 0.6); }
        if (wind < -0.3 && Math.random() < 0.4) { l.x = rand(w + 20, w + 60); l.y = rand(0, h * 0.6); }
      }
    }

    pointer.vx *= 0.85;
    pointer.vy *= 0.85;

    draw();
    requestAnimationFrame(step);
  }

  function onMove(x, y) {
    const now = performance.now();
    if (pointer.active && now - pointer.lastT < 100) {
      pointer.vx = x - pointer.x;
      pointer.vy = y - pointer.y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.lastT = now;
    pointer.active = true;
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false; else start();
  });

  resize();
  start();
})();
