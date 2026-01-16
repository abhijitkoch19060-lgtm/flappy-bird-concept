// Flappy Bird: Ancient Pillars Edition
// Main Game Logic and UI Implementation

// --- Constants and Settings ---
const ASPECT_RATIO = 16 / 9;
const BASE_WIDTH = 1280; // Logical canvas width
const BASE_HEIGHT = 720; // Logical canvas height

// Bird defaults
const DEFAULT_BIRD_COLOR = "#2ecc40";
const DEFAULT_EYE_SIZE = 16;

// Pillar settings
const PILLAR_WIDTH = 90;
const PILLAR_GAP = 260; // Wider than original for easier play
const PILLAR_MIN_HEIGHT = 80;
const PILLAR_MAX_HEIGHT = BASE_HEIGHT - PILLAR_GAP - 120;
const PILLAR_SPEED = 3.2;

// Physics
const GRAVITY = 0.38;
const FLAP_STRENGTH = -7.5;
const MAX_SCORE = 999;

// Audio placeholders
const MUSIC_MENU = "assets/music/menu-calm.mp3"; // Placeholder
const MUSIC_GAME = "assets/music/game-competitive.mp3"; // Placeholder
const SFX_PASS = "assets/sfx/pass.mp3"; // Placeholder
const SFX_CRASH = "assets/sfx/crash.mp3"; // Placeholder

// --- State Variables ---
let canvas, ctx;
let width, height, dpr;
let gameState = "menu"; // menu, settings, countdown, playing, gameover, quitting
let menuBgDemo = null; // Background demo loop instance

// Bird customization
let birdColor = DEFAULT_BIRD_COLOR;
let eyeSize = DEFAULT_EYE_SIZE;

// Audio state
let musicVolume = 0.6;
let sfxVolume = 0.8;
let muteAll = false;

// Game objects
let bird, pillars, score, highScore, music, sfxPass, sfxCrash;
let pillarTimer, nextPillarIn, gameStarted, gameOver, allowInput;

// --- DOM Elements ---
const overlay = document.getElementById("overlay");
const homeMenu = document.getElementById("home-menu");
const settingsMenu = document.getElementById("settings-menu");
const countdownOverlay = document.getElementById("countdown-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const quitOverlay = document.getElementById("quit-overlay");
const highScoreLabel = document.getElementById("high-score-label");
const finalScore = document.getElementById("final-score");
const birdPreview = document.getElementById("bird-preview");

// --- Utility Functions ---
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function formatScore(n) { return n.toString().padStart(3, "0"); }

// --- Responsive Canvas Setup ---
function resizeCanvas() {
  // Maintain 16:9 aspect ratio, fit to window
  const container = document.getElementById("game-container");
  const ww = window.innerWidth, wh = window.innerHeight;
  let w = ww, h = ww / ASPECT_RATIO;
  if (h > wh) { h = wh; w = h * ASPECT_RATIO; }
  canvas.width = BASE_WIDTH * window.devicePixelRatio;
  canvas.height = BASE_HEIGHT * window.devicePixelRatio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);
  width = BASE_WIDTH;
  height = BASE_HEIGHT;
  dpr = window.devicePixelRatio || 1;
}
window.addEventListener("resize", resizeCanvas);

// --- Bird Drawing and Customization ---
function drawBird(ctx, x, y, r, color, eyeSz) {
  // Body
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.shadowColor = "#1e6e2c";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Belly highlight
  ctx.beginPath();
  ctx.arc(-r * 0.3, r * 0.3, r * 0.5, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fillStyle = "#b2f7c1";
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Beak
  ctx.beginPath();
  ctx.moveTo(r * 0.9, 0);
  ctx.lineTo(r * 1.3, -r * 0.18);
  ctx.lineTo(r * 1.3, r * 0.18);
  ctx.closePath();
  ctx.fillStyle = "#f7c873";
  ctx.strokeStyle = "#e2a13a";
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // Eye (right)
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.25, eyeSz / 2, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.25, eyeSz / 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#222";
  ctx.fill();

  // Eye (left)
  ctx.beginPath();
  ctx.arc(r * 0.15, -r * 0.18, eyeSz / 2.2, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.15, -r * 0.18, eyeSz / 4.2, 0, 2 * Math.PI);
  ctx.fillStyle = "#222";
  ctx.fill();

  // Wing
  ctx.save();
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, r * 0.2, r * 0.38, r * 0.18, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "#1e6e2c";
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.restore();

  ctx.restore();
}

// --- Pillar Drawing (Ancient Style) ---
function drawPillar(ctx, x, y, w, h, isTop) {
  // Shaft
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.fillStyle = "#bfc6c9";
  ctx.shadowColor = "#888";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Capital (top)
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, 0);
  ctx.lineTo(w * 1.12, 0);
  ctx.lineTo(w * 1.04, -w * 0.18);
  ctx.lineTo(-w * 0.04, -w * 0.18);
  ctx.closePath();
  ctx.fillStyle = "#dbe3e6";
  ctx.fill();
  ctx.strokeStyle = "#a0a7aa";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Base (bottom)
  ctx.beginPath();
  ctx.moveTo(-w * 0.08, h);
  ctx.lineTo(w * 1.08, h);
  ctx.lineTo(w * 1.02, h + w * 0.14);
  ctx.lineTo(-w * 0.02, h + w * 0.14);
  ctx.closePath();
  ctx.fillStyle = "#dbe3e6";
  ctx.fill();
  ctx.stroke();

  // Cracks and vines (decorative)
  ctx.strokeStyle = "#8b8f91";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 2; ++i) {
    let cx = randInt(w * 0.2, w * 0.8);
    ctx.beginPath();
    ctx.moveTo(cx, randInt(10, h - 20));
    ctx.lineTo(cx + randInt(-8, 8), randInt(20, h - 10));
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Vines (optional)
  ctx.strokeStyle = "#6fa86f";
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h * 0.1);
  ctx.bezierCurveTo(w * 0.8, h * 0.3, w * 0.6, h * 0.7, w * 0.9, h * 0.9);
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

// --- Cloud Drawing ---
function drawCloud(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, 32, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(40, -16, 28, Math.PI * 1.0, Math.PI * 2.0);
  ctx.arc(60, 8, 20, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#b2e0ff";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

// --- Audio Management ---
function createAudio(src, loop = false, volume = 1.0) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  return audio;
}
function playAudio(audio, volume = 1.0) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.volume = muteAll ? 0 : volume;
  audio.play();
}
function stopAudio(audio) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

// --- Game State Management ---
function resetGame() {
  // Bird
  bird = {
    x: width * 0.28,
    y: height * 0.5,
    r: 32,
    vy: 0,
    alive: true,
    color: birdColor,
    eyeSize: eyeSize,
  };
  // Pillars
  pillars = [];
  nextPillarIn = 0;
  pillarTimer = 0;
  // Score
  score = 0;
  gameStarted = false;
  gameOver = false;
  allowInput = false;
}

function addPillar() {
  // Randomize gap position
  const gapY = randInt(PILLAR_MIN_HEIGHT, PILLAR_MAX_HEIGHT);
  pillars.push({
    x: width + 40,
    w: PILLAR_WIDTH,
    top: { y: 0, h: gapY },
    bottom: { y: gapY + PILLAR_GAP, h: height - (gapY + PILLAR_GAP) },
    passed: false,
  });
}

function updateGame() {
  // Physics
  if (!gameStarted) return;
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  // Pillar movement
  for (let p of pillars) p.x -= PILLAR_SPEED;
  // Remove off-screen pillars
  while (pillars.length && pillars[0].x + PILLAR_WIDTH < -40) pillars.shift();
  // Add new pillar
  nextPillarIn -= PILLAR_SPEED;
  if (nextPillarIn <= 0) {
    addPillar();
    nextPillarIn = width / 2.2 + randInt(-40, 40);
  }
  // Collision detection
  for (let p of pillars) {
    // Top pillar
    if (circleRectCollide(bird.x, bird.y, bird.r * 0.85, p.x, p.top.y, p.w, p.top.h) ||
        circleRectCollide(bird.x, bird.y, bird.r * 0.85, p.x, p.bottom.y, p.w, p.bottom.h)) {
      triggerGameOver();
      return;
    }
    // Score
    if (!p.passed && p.x + p.w < bird.x - bird.r) {
      p.passed = true;
      score = clamp(score + 1, 0, MAX_SCORE);
      playAudio(sfxPass, sfxVolume);
    }
  }
  // Ground/ceiling collision
  if (bird.y + bird.r > height - 8 || bird.y - bird.r < 0) {
    triggerGameOver();
    return;
  }
}

function triggerGameOver() {
  if (gameOver) return;
  gameOver = true;
  bird.alive = false;
  playAudio(sfxCrash, sfxVolume);
  stopAudio(music);
  showGameOver();
  // High score
  if (score > highScore) {
    highScore = score;
    try { localStorage.setItem("ancientFlappyHighScore", highScore); } catch {}
  }
}

// --- Collision Detection: Circle-Rectangle ---
function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  // Clamp circle center to rectangle bounds
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) < (cr * cr);
}

// --- Drawing the Game Scene ---
function drawGame() {
  // Background sky
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = ctx.createLinearGradient(0, 0, 0, height);
  ctx.fillStyle.addColorStop ? ctx.fillStyle.addColorStop(0, "#7ecbff") : null;
  ctx.fillStyle.addColorStop ? ctx.fillStyle.addColorStop(1, "#eaf6ff") : null;
  ctx.fillRect(0, 0, width, height);

  // Clouds
  for (let i = 0; i < 3; ++i) {
    drawCloud(ctx, (width * 0.2 + i * 320 + (pillarTimer * 0.2) % width) % width, 80 + i * 40, 1.1 - i * 0.2);
  }

  // Pillars
  for (let p of pillars) {
    drawPillar(ctx, p.x, p.top.y, p.w, p.top.h, true);
    drawPillar(ctx, p.x, p.bottom.y, p.w, p.bottom.h, false);
  }

  // Bird
  drawBird(ctx, bird.x, bird.y, bird.r, bird.color, bird.eyeSize);

  // Score
  ctx.save();
  ctx.font = "bold 48px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#2d7fc1";
  ctx.lineWidth = 4;
  ctx.strokeText(formatScore(score), width / 2, 80);
  ctx.fillText(formatScore(score), width / 2, 80);
  ctx.restore();
}

// --- Main Game Loop ---
function gameLoop() {
  if (gameState === "playing") {
    updateGame();
    drawGame();
  } else if (gameState === "menu" || gameState === "settings") {
    // Background demo loop
    if (!menuBgDemo) menuBgDemo = createMenuBgDemo();
    menuBgDemo.update();
    menuBgDemo.draw();
  }
  requestAnimationFrame(gameLoop);
}

// --- Menu Background Demo (Endless AI Bird) ---
function createMenuBgDemo() {
  // Simple AI bird that never crashes
  let demoBird = {
    x: width * 0.28,
    y: height * 0.5,
    r: 32,
    vy: 0,
    color: birdColor,
    eyeSize: eyeSize,
  };
  let demoPillars = [];
  let demoNextPillar = 0;
  let demoScore = 0;
  function update() {
    demoBird.vy += GRAVITY;
    demoBird.y += demoBird.vy;
    // AI: Flap if approaching pillar gap
    let next = demoPillars.find(p => p.x + p.w > demoBird.x - demoBird.r);
    if (next) {
      let gapY = next.top.h + PILLAR_GAP / 2;
      if (demoBird.y > gapY + 8) demoBird.vy = FLAP_STRENGTH * 0.9;
    }
    // Pillar movement
    for (let p of demoPillars) p.x -= PILLAR_SPEED;
    while (demoPillars.length && demoPillars[0].x + PILLAR_WIDTH < -40) demoPillars.shift();
    demoNextPillar -= PILLAR_SPEED;
    if (demoNextPillar <= 0) {
      const gapY = randInt(PILLAR_MIN_HEIGHT, PILLAR_MAX_HEIGHT);
      demoPillars.push({
        x: width + 40,
        w: PILLAR_WIDTH,
        top: { y: 0, h: gapY },
        bottom: { y: gapY + PILLAR_GAP, h: height - (gapY + PILLAR_GAP) },
      });
      demoNextPillar = width / 2.2 + randInt(-40, 40);
    }
    // Loop bird position if out of bounds
    if (demoBird.y + demoBird.r > height - 8) demoBird.y = height * 0.5;
  }
  function draw() {
    // Draw as in drawGame, but faded
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#eaf6ff";
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 3; ++i) {
      drawCloud(ctx, (width * 0.2 + i * 320 + (pillarTimer * 0.2) % width) % width, 80 + i * 40, 1.1 - i * 0.2);
    }
    for (let p of demoPillars) {
      drawPillar(ctx, p.x, p.top.y, p.w, p.top.h, true);
      drawPillar(ctx, p.x, p.bottom.y, p.w, p.bottom.h, false);
    }
    drawBird(ctx, demoBird.x, demoBird.y, demoBird.r, demoBird.color, demoBird.eyeSize);
    ctx.restore();
  }
  return { update, draw };
}

// --- Countdown Sequence ---
function startCountdown(callback) {
  let count = 3;
  countdownOverlay.textContent = count;
  countdownOverlay.style.display = "block";
  gameState = "countdown";
  allowInput = false;
  let interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownOverlay.textContent = count;
    } else if (count === 0) {
      countdownOverlay.textContent = "Go!";
    } else {
      clearInterval(interval);
      countdownOverlay.style.display = "none";
      callback();
    }
  }, 700);
}

// --- Game Over Overlay ---
function showGameOver() {
  finalScore.textContent = `Score: ${formatScore(score)}`;
  gameoverOverlay.style.display = "flex";
  gameState = "gameover";
}

// --- Menu and Settings UI Logic ---
function showMenu() {
  gameState = "menu";
  homeMenu.classList.add("active");
  settingsMenu.classList.remove("active");
  gameoverOverlay.style.display = "none";
  quitOverlay.style.display = "none";
  overlay.style.pointerEvents = "auto";
  // High score
  highScoreLabel.textContent = highScore > 0 ? `High Score: ${formatScore(highScore)}` : "";
  stopAudio(music);
  playMenuMusic();
}
function hideMenu() {
  homeMenu.classList.remove("active");
  overlay.style.pointerEvents = "none";
}
function showSettings() {
  gameState = "settings";
  settingsMenu.classList.add("active");
  homeMenu.classList.remove("active");
  overlay.style.pointerEvents = "auto";
  // Set current values
  document.getElementById("bird-color").value = birdColor;
  document.getElementById("eye-size").value = eyeSize;
  document.getElementById("eye-size-value").textContent = eyeSize;
  document.getElementById("music-volume").value = Math.round(musicVolume * 100);
  document.getElementById("music-volume-value").textContent = Math.round(musicVolume * 100);
  document.getElementById("sfx-volume").value = Math.round(sfxVolume * 100);
  document.getElementById("sfx-volume-value").textContent = Math.round(sfxVolume * 100);
  document.getElementById("mute-all").checked = muteAll;
  drawBirdPreview();
}
function hideSettings() {
  settingsMenu.classList.remove("active");
  overlay.style.pointerEvents = "none";
}
function showQuit() {
  quitOverlay.style.display = "flex";
  gameState = "quitting";
}
function hideQuit() {
  quitOverlay.style.display = "none";
  gameState = "menu";
}

// --- Bird Preview in Settings ---
function drawBirdPreview() {
  const ctxPrev = birdPreview.getContext("2d");
  ctxPrev.clearRect(0, 0, 64, 64);
  drawBird(ctxPrev, 32, 32, 24, document.getElementById("bird-color").value, parseInt(document.getElementById("eye-size").value));
}

// --- Audio Control ---
function playMenuMusic() {
  stopAudio(music);
  music = createAudio(MUSIC_MENU, true, muteAll ? 0 : musicVolume);
  music.play();
}
function playGameMusic() {
  stopAudio(music);
  music = createAudio(MUSIC_GAME, true, muteAll ? 0 : musicVolume);
  music.play();
}
function updateAudioVolumes() {
  if (music) music.volume = muteAll ? 0 : musicVolume;
  if (sfxPass) sfxPass.volume = muteAll ? 0 : sfxVolume;
  if (sfxCrash) sfxCrash.volume = muteAll ? 0 : sfxVolume;
}

// --- Event Listeners and Controls ---
function setupEventListeners() {
  // Home menu buttons
  document.getElementById("btn-new-game").onclick = () => {
    hideMenu();
    startCountdown(() => {
      resetGame();
      gameState = "playing";
      allowInput = true;
      playGameMusic();
    });
  };
  document.getElementById("btn-settings").onclick = showSettings;
  document.getElementById("btn-quit").onclick = showQuit;

  // Settings menu
  document.getElementById("btn-settings-save").onclick = () => {
    birdColor = document.getElementById("bird-color").value;
    eyeSize = parseInt(document.getElementById("eye-size").value);
    musicVolume = parseInt(document.getElementById("music-volume").value) / 100;
    sfxVolume = parseInt(document.getElementById("sfx-volume").value) / 100;
    muteAll = document.getElementById("mute-all").checked;
    updateAudioVolumes();
    hideSettings();
    showMenu();
  };
  document.getElementById("btn-settings-cancel").onclick = () => {
    hideSettings();
    showMenu();
  };
  document.getElementById("bird-color").oninput = drawBirdPreview;
  document.getElementById("eye-size").oninput = (e) => {
    document.getElementById("eye-size-value").textContent = e.target.value;
    drawBirdPreview();
  };
  document.getElementById("music-volume").oninput = (e) => {
    document.getElementById("music-volume-value").textContent = e.target.value;
    musicVolume = parseInt(e.target.value) / 100;
    updateAudioVolumes();
  };
  document.getElementById("sfx-volume").oninput = (e) => {
    document.getElementById("sfx-volume-value").textContent = e.target.value;
    sfxVolume = parseInt(e.target.value) / 100;
    updateAudioVolumes();
  };
  document.getElementById("mute-all").onchange = (e) => {
    muteAll = e.target.checked;
    updateAudioVolumes();
  };

  // Game over overlay
  document.getElementById("btn-restart").onclick = () => {
    gameoverOverlay.style.display = "none";
    startCountdown(() => {
      resetGame();
      gameState = "playing";
      allowInput = true;
      playGameMusic();
    });
  };
  document.getElementById("btn-home").onclick = () => {
    gameoverOverlay.style.display = "none";
    showMenu();
  };

  // Quit overlay
  document.getElementById("btn-quit-yes").onclick = () => {
    quitOverlay.style.display = "none";
    window.close(); // May not work in all browsers
  };
  document.getElementById("btn-quit-no").onclick = () => {
    hideQuit();
    showMenu();
  };

  // Keyboard and touch controls
  window.addEventListener("keydown", (e) => {
    if (!allowInput) return;
    if (gameState === "playing" && (e.code === "Space" || e.code === "ArrowUp")) {
      flap();
      e.preventDefault();
    }
    if (gameState === "gameover" && e.code === "Space") {
      document.getElementById("btn-restart").click();
    }
  });
  canvas.addEventListener("mousedown", () => {
    if (!allowInput) return;
    if (gameState === "playing") flap();
  });
  canvas.addEventListener("touchstart", (e) => {
    if (!allowInput) return;
    if (gameState === "playing") flap();
    e.preventDefault();
  }, { passive: false });
}

// --- Bird Flap Action ---
function flap() {
  if (!bird.alive) return;
  bird.vy = FLAP_STRENGTH;
}

// --- Initialization ---
function init() {
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  // Load high score
  try {
    highScore = parseInt(localStorage.getItem("ancientFlappyHighScore")) || 0;
  } catch { highScore = 0; }
  // Preload SFX
  sfxPass = createAudio(SFX_PASS, false, sfxVolume);
  sfxCrash = createAudio(SFX_CRASH, false, sfxVolume);
  // Initial state
  showMenu();
  resetGame();
  setupEventListeners();
  requestAnimationFrame(gameLoop);
}

// --- Start ---
window.onload = init;
