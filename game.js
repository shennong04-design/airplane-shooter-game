const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");

const BASE_WIDTH = 900;
const BASE_HEIGHT = 640;
const keys = new Set();

const state = {
  running: false,
  paused: false,
  gameOver: false,
  lastTime: 0,
  score: 0,
  bestScore: Number(localStorage.getItem("airplaneShooterBestScore") || 0),
  lives: 3,
  level: 1,
  spawnTimer: 0,
  powerTimer: 0,
  enemyBulletTimer: 0,
  shotCooldown: 0,
  shake: 0,
  pointerDown: false,
  autoFire: false,
};

const player = {
  x: BASE_WIDTH / 2,
  y: BASE_HEIGHT - 82,
  w: 42,
  h: 54,
  speed: 390,
  shield: 0,
  rapid: 0,
  spread: 0,
  invincible: 0,
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let stars = [];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resizeCanvas() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = Math.round(BASE_WIDTH * dpr);
  canvas.height = Math.round(BASE_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initStars() {
  stars = Array.from({ length: 120 }, () => ({
    x: rand(0, BASE_WIDTH),
    y: rand(0, BASE_HEIGHT),
    r: rand(0.8, 2.2),
    speed: rand(18, 92),
    alpha: rand(0.35, 0.95),
  }));
}

function resetGame() {
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = performance.now();
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.spawnTimer = 0;
  state.powerTimer = 0;
  state.enemyBulletTimer = 0;
  state.shotCooldown = 0;
  state.shake = 0;
  state.autoFire = false;

  player.x = BASE_WIDTH / 2;
  player.y = BASE_HEIGHT - 82;
  player.shield = 0;
  player.rapid = 0;
  player.spread = 0;
  player.invincible = 1.2;

  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  powerups = [];

  updateHud();
  hideOverlay();
}

function updateHud() {
  scoreEl.textContent = state.score;
  bestScoreEl.textContent = state.bestScore;
  livesEl.textContent = state.lives;
  levelEl.textContent = state.level;
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function addExplosion(x, y, color = "#ffcf5e", count = 18) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: rand(-210, 210),
      vy: rand(-210, 210),
      r: rand(2, 5),
      life: rand(0.42, 0.86),
      maxLife: 0.86,
      color,
    });
  }
}

function spawnEnemy() {
  const level = state.level;
  const roll = Math.random();
  let enemy;

  if (level >= 4 && roll > 0.82) {
    enemy = {
      type: "heavy",
      x: rand(48, BASE_WIDTH - 88),
      y: -70,
      w: 72,
      h: 58,
      hp: 5 + Math.floor(level / 2),
      speed: rand(58, 92) + level * 6,
      score: 80,
      fireRate: rand(1.0, 1.9),
      fireTimer: rand(0.4, 1.1),
      drift: rand(-30, 30),
    };
  } else if (level >= 2 && roll > 0.62) {
    enemy = {
      type: "fast",
      x: rand(34, BASE_WIDTH - 66),
      y: -54,
      w: 46,
      h: 42,
      hp: 2,
      speed: rand(160, 225) + level * 8,
      score: 42,
      fireRate: rand(1.7, 2.8),
      fireTimer: rand(0.8, 1.5),
      drift: rand(-70, 70),
    };
  } else {
    enemy = {
      type: "scout",
      x: rand(34, BASE_WIDTH - 66),
      y: -50,
      w: 48,
      h: 42,
      hp: 1 + Math.floor(level / 4),
      speed: rand(95, 150) + level * 8,
      score: 30,
      fireRate: rand(2.0, 3.4),
      fireTimer: rand(0.9, 1.9),
      drift: rand(-34, 34),
    };
  }

  enemies.push(enemy);
}

function spawnPowerup() {
  const types = ["spread", "rapid", "shield"];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    type,
    x: rand(50, BASE_WIDTH - 50),
    y: -34,
    w: 34,
    h: 34,
    speed: rand(95, 135),
    angle: 0,
  });
}

function shoot() {
  if (!state.running || state.paused || state.gameOver || state.shotCooldown > 0) return;

  const cooldown = player.rapid > 0 ? 0.13 : 0.25;
  state.shotCooldown = cooldown;

  const baseBullet = {
    x: player.x - 4,
    y: player.y - player.h / 2 - 16,
    w: 8,
    h: 22,
    vy: -570,
    damage: 1,
  };

  bullets.push({ ...baseBullet, vx: 0 });

  if (player.spread > 0) {
    bullets.push({ ...baseBullet, vx: -185, x: baseBullet.x - 12 });
    bullets.push({ ...baseBullet, vx: 185, x: baseBullet.x + 12 });
  }
}

function enemyShoot(enemy) {
  const dx = player.x - (enemy.x + enemy.w / 2);
  const dy = player.y - (enemy.y + enemy.h / 2);
  const len = Math.max(1, Math.hypot(dx, dy));
  const speed = enemy.type === "heavy" ? 185 : 155;

  enemyBullets.push({
    x: enemy.x + enemy.w / 2 - 5,
    y: enemy.y + enemy.h,
    w: 10,
    h: 16,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
  });
}

function hitPlayer() {
  if (player.invincible > 0) return;

  if (player.shield > 0) {
    player.shield = 0;
    player.invincible = 0.8;
    state.shake = 10;
    addExplosion(player.x, player.y, "#5ee7ff", 22);
    return;
  }

  state.lives -= 1;
  player.invincible = 1.15;
  state.shake = 16;
  addExplosion(player.x, player.y, "#ff5d7a", 28);

  if (state.lives <= 0) {
    endGame();
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("airplaneShooterBestScore", String(state.bestScore));
  }

  updateHud();
  showOverlay("任务结束", `本次得分：${state.score}。点击按钮重新起飞。`, "再玩一次");
}

function togglePause() {
  if (!state.running || state.gameOver) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay("已暂停", "按 P 或点击继续按钮回到战场。", "继续游戏");
  } else {
    state.lastTime = performance.now();
    hideOverlay();
  }
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    player.x += (mx / len) * player.speed * dt;
    player.y += (my / len) * player.speed * dt;
  }

  player.x = clamp(player.x, player.w / 2 + 8, BASE_WIDTH - player.w / 2 - 8);
  player.y = clamp(player.y, player.h / 2 + 8, BASE_HEIGHT - player.h / 2 - 8);

  player.invincible = Math.max(0, player.invincible - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.rapid = Math.max(0, player.rapid - dt);
  player.spread = Math.max(0, player.spread - dt);
}

function update(dt) {
  if (!state.running || state.paused) return;

  state.score += Math.floor(dt * 7);
  state.level = 1 + Math.floor(state.score / 600);

  state.shotCooldown = Math.max(0, state.shotCooldown - dt);
  state.spawnTimer -= dt;
  state.powerTimer -= dt;
  state.shake = Math.max(0, state.shake - dt * 32);

  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = Math.max(0.28, 0.92 - state.level * 0.055);
  }

  if (state.powerTimer <= 0) {
    spawnPowerup();
    state.powerTimer = rand(7.0, 11.0);
  }

  if (keys.has("Space") || state.autoFire) shoot();

  updatePlayer(dt);

  for (const s of stars) {
    s.y += s.speed * dt;
    if (s.y > BASE_HEIGHT + 10) {
      s.y = -10;
      s.x = rand(0, BASE_WIDTH);
    }
  }

  for (const b of bullets) {
    b.x += (b.vx || 0) * dt;
    b.y += b.vy * dt;
  }
  bullets = bullets.filter((b) => b.y + b.h > -40 && b.x > -50 && b.x < BASE_WIDTH + 50);

  for (const eb of enemyBullets) {
    eb.x += eb.vx * dt;
    eb.y += eb.vy * dt;
  }
  enemyBullets = enemyBullets.filter((b) => b.y < BASE_HEIGHT + 60 && b.x > -60 && b.x < BASE_WIDTH + 60);

  for (const e of enemies) {
    e.y += e.speed * dt;
    e.x += Math.sin((e.y + e.w) * 0.015) * e.drift * dt;
    e.fireTimer -= dt;

    if (e.fireTimer <= 0 && e.y > 15 && e.y < BASE_HEIGHT * 0.66) {
      enemyShoot(e);
      e.fireTimer = e.fireRate;
    }
  }

  for (const p of powerups) {
    p.y += p.speed * dt;
    p.angle += dt * 4;
  }

  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= dt;
  }
  particles = particles.filter((p) => p.life > 0);

  handleCollisions();

  enemies = enemies.filter((e) => e.y < BASE_HEIGHT + 90 && e.hp > 0);
  powerups = powerups.filter((p) => p.y < BASE_HEIGHT + 60);

  updateHud();
}

function handleCollisions() {
  const playerBox = {
    x: player.x - player.w / 2,
    y: player.y - player.h / 2,
    w: player.w,
    h: player.h,
  };

  for (const b of bullets) {
    for (const e of enemies) {
      if (e.hp > 0 && intersects(b, e)) {
        b.y = -100;
        e.hp -= b.damage;
        addExplosion(b.x, b.y, "#5ee7ff", 5);

        if (e.hp <= 0) {
          state.score += e.score;
          addExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === "heavy" ? "#ffcf5e" : "#7cf7a4", e.type === "heavy" ? 32 : 18);
          state.shake = Math.max(state.shake, e.type === "heavy" ? 8 : 4);
        }
      }
    }
  }

  for (const e of enemies) {
    if (e.hp > 0 && intersects(playerBox, e)) {
      e.hp = 0;
      hitPlayer();
      addExplosion(e.x + e.w / 2, e.y + e.h / 2, "#ff5d7a", 24);
    }
  }

  for (const eb of enemyBullets) {
    if (intersects(playerBox, eb)) {
      eb.y = BASE_HEIGHT + 100;
      hitPlayer();
    }
  }

  for (const p of powerups) {
    if (intersects(playerBox, p)) {
      p.y = BASE_HEIGHT + 100;

      if (p.type === "spread") player.spread = 8;
      if (p.type === "rapid") player.rapid = 8;
      if (p.type === "shield") player.shield = 10;

      state.score += 20;
      addExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ffffff", 16);
    }
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  ctx.shadowColor = "#5ee7ff";
  ctx.shadowBlur = 18;

  const gradient = ctx.createLinearGradient(0, -34, 0, 34);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#5ee7ff");
  gradient.addColorStop(1, "#1b65ff");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(22, 22);
  ctx.lineTo(8, 15);
  ctx.lineTo(0, 32);
  ctx.lineTo(-8, 15);
  ctx.lineTo(-22, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffcf5e";
  ctx.beginPath();
  ctx.moveTo(-7, 26);
  ctx.lineTo(0, 46 + Math.sin(performance.now() / 70) * 5);
  ctx.lineTo(7, 26);
  ctx.closePath();
  ctx.fill();

  if (player.shield > 0) {
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#5ee7ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);

  const color = enemy.type === "heavy" ? "#ff8a3d" : enemy.type === "fast" ? "#ff5d7a" : "#b56dff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, enemy.h / 2);
  ctx.lineTo(enemy.w / 2, -enemy.h / 4);
  ctx.lineTo(enemy.w / 5, -enemy.h / 2);
  ctx.lineTo(0, -enemy.h / 4);
  ctx.lineTo(-enemy.w / 5, -enemy.h / 2);
  ctx.lineTo(-enemy.w / 2, -enemy.h / 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(-enemy.w * 0.13, -enemy.h * 0.18, enemy.w * 0.26, enemy.h * 0.24);

  ctx.restore();
}

function drawBullet(b, enemy = false) {
  ctx.save();
  ctx.fillStyle = enemy ? "#ffcf5e" : "#5ee7ff";
  ctx.shadowColor = enemy ? "#ffcf5e" : "#5ee7ff";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.restore();
}

function drawPowerup(p) {
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate(p.angle);

  const colors = {
    spread: "#5ee7ff",
    rapid: "#7cf7a4",
    shield: "#ffcf5e",
  };
  ctx.fillStyle = colors[p.type];
  ctx.shadowColor = colors[p.type];
  ctx.shadowBlur = 16;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const r = i % 2 === 0 ? 18 : 10;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, "#061029");
  gradient.addColorStop(0.55, "#07152e");
  gradient.addColorStop(1, "#020713");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#dceeff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStatusText() {
  const items = [];
  if (player.spread > 0) items.push(`三连发 ${Math.ceil(player.spread)}s`);
  if (player.rapid > 0) items.push(`快速 ${Math.ceil(player.rapid)}s`);
  if (player.shield > 0) items.push(`护盾 ${Math.ceil(player.shield)}s`);

  if (!items.length) return;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(items.join("  |  "), 20, BASE_HEIGHT - 18);
  ctx.restore();
}

function render() {
  ctx.save();

  if (state.shake > 0) {
    ctx.translate(rand(-state.shake, state.shake) * 0.25, rand(-state.shake, state.shake) * 0.25);
  }

  drawBackground();

  for (const p of powerups) drawPowerup(p);
  for (const b of bullets) drawBullet(b, false);
  for (const b of enemyBullets) drawBullet(b, true);
  for (const e of enemies) drawEnemy(e);
  drawPlayer();

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawStatusText();

  ctx.restore();
}

function gameLoop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function pointerToGame(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0] ? e.touches[0] : e;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * BASE_WIDTH,
    y: ((touch.clientY - rect.top) / rect.height) * BASE_HEIGHT,
  };
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "KeyP") {
    togglePause();
    return;
  }

  keys.add(e.code);

  if (e.code === "Space") shoot();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("pointerdown", (e) => {
  if (!state.running && !state.gameOver) return;
  const pos = pointerToGame(e);
  player.x = pos.x;
  player.y = pos.y;
  state.pointerDown = true;
  state.autoFire = true;
  shoot();
});

canvas.addEventListener("pointermove", (e) => {
  if (!state.pointerDown || !state.running || state.paused) return;
  const pos = pointerToGame(e);
  player.x = pos.x;
  player.y = pos.y;
});

window.addEventListener("pointerup", () => {
  state.pointerDown = false;
  state.autoFire = false;
});

canvas.addEventListener("click", () => shoot());

startBtn.addEventListener("click", () => {
  if (state.paused) {
    togglePause();
  } else {
    resetGame();
  }
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

resizeCanvas();
initStars();
updateHud();
render();
requestAnimationFrame(gameLoop);
