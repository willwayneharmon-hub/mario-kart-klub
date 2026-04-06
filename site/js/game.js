// Banana Dodge — WVU Mario Kart Klub mini-game
(function () {
  'use strict';

  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  var a11y = document.getElementById('game-a11y');

  var W = 480;
  var H = 320;

  // --- Audio ---
  var muted = true;
  var sounds = {};

  function initAudio() {
    // Generate simple sounds with Web Audio API
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var actx = new AudioCtx();

      sounds.coin = function () {
        if (muted) return;
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.connect(g);
        g.connect(actx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(988, actx.currentTime);
        o.frequency.setValueAtTime(1319, actx.currentTime + 0.08);
        g.gain.setValueAtTime(0.15, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
        o.start(actx.currentTime);
        o.stop(actx.currentTime + 0.2);
      };

      sounds.hit = function () {
        if (muted) return;
        var o = actx.createOscillator();
        var g = actx.createGain();
        o.connect(g);
        g.connect(actx.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, actx.currentTime);
        o.frequency.exponentialRampToValueAtTime(50, actx.currentTime + 0.3);
        g.gain.setValueAtTime(0.2, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
        o.start(actx.currentTime);
        o.stop(actx.currentTime + 0.3);
      };

      sounds.start = function () {
        if (muted) return;
        var times = [0, 0.3, 0.6, 0.9];
        var freqs = [440, 440, 440, 880];
        var durs  = [0.15, 0.15, 0.15, 0.3];
        for (var i = 0; i < 4; i++) {
          (function (idx) {
            var o = actx.createOscillator();
            var g = actx.createGain();
            o.connect(g);
            g.connect(actx.destination);
            o.type = 'square';
            o.frequency.setValueAtTime(freqs[idx], actx.currentTime + times[idx]);
            g.gain.setValueAtTime(0.12, actx.currentTime + times[idx]);
            g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + times[idx] + durs[idx]);
            o.start(actx.currentTime + times[idx]);
            o.stop(actx.currentTime + times[idx] + durs[idx]);
          })(i);
        }
      };
    } catch (e) {
      // Audio not supported — game works fine without it
    }
  }

  window.addEventListener('soundtoggle', function (e) {
    muted = e.detail.muted;
  });

  // --- Game state ---
  var STATE_START = 0;
  var STATE_PLAYING = 1;
  var STATE_OVER = 2;

  var state = STATE_START;
  var score = 0;
  var highScore = parseInt(localStorage.getItem('mkk-high'), 10) || 0;
  var gameTime = 0; // seconds elapsed in current run
  var scrollSpeed = 2;
  var roadOffset = 0;
  var audioInitialized = false;

  // Lanes: x-center positions for 3 lanes
  var ROAD_LEFT = 90;
  var ROAD_RIGHT = 390;
  var ROAD_W = ROAD_RIGHT - ROAD_LEFT;
  var LANE_W = ROAD_W / 3;
  var LANES = [
    ROAD_LEFT + LANE_W * 0.5,
    ROAD_LEFT + LANE_W * 1.5,
    ROAD_LEFT + LANE_W * 2.5
  ];

  // Player
  var player = {
    lane: 1,
    x: LANES[1],
    y: H - 60,
    w: 24,
    h: 32,
    rotation: 0,    // for spin-out
    spinSpeed: 0
  };

  // Obstacles & pickups
  var obstacles = [];
  var pickups = [];
  var particles = [];

  // Spawn timers (in frames)
  var obstacleTimer = 0;
  var pickupTimer = 0;

  // Blink timer for "PRESS START"
  var blinkTimer = 0;
  var blinkOn = true;

  // --- Difficulty ---
  function getSpawnInterval() {
    if (gameTime < 5) return 90;
    if (gameTime < 15) return 60;
    if (gameTime < 30) return 40;
    if (gameTime < 45) return 30;
    return 25;
  }

  function getScrollSpeed() {
    if (gameTime < 5) return 2;
    if (gameTime < 15) return 3;
    if (gameTime < 30) return 4;
    if (gameTime < 45) return 5;
    return 5.5;
  }

  function getObstacleTypes() {
    if (gameTime < 5) return ['banana'];
    if (gameTime < 15) return ['banana', 'shell'];
    if (gameTime < 30) return ['banana', 'shell', 'oil'];
    return ['banana', 'shell', 'oil', 'bomb'];
  }

  // --- Input ---
  var keys = {};
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var pendingSwipe = 0; // -1 left, 1 right, 0 none

  document.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }

    if (state === STATE_START && (e.key === ' ' || e.key === 'Enter')) {
      startGame();
    } else if (state === STATE_OVER && (e.key === ' ' || e.key === 'Enter')) {
      resetGame();
    } else if (state === STATE_PLAYING) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveLane(1);
      }
    }
  });

  document.addEventListener('keyup', function (e) {
    keys[e.key] = false;
  });

  canvas.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStartX;
    var dy = t.clientY - touchStartY;
    var dt = Date.now() - touchStartTime;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (state === STATE_START || state === STATE_OVER) {
      if (dist < 20) {
        if (state === STATE_START) startGame();
        else resetGame();
      } else if (Math.abs(dx) > 30 && dt < 400) {
        // swipe on start screen starts the game too
        if (state === STATE_START) startGame();
        else resetGame();
      }
      return;
    }

    // In-game swipe
    if (Math.abs(dx) > 30 && dt < 400 && Math.abs(dx) > Math.abs(dy)) {
      moveLane(dx > 0 ? 1 : -1);
    }
    e.preventDefault();
  }, { passive: false });

  // Also support tap-on-halves for mobile (left half = left, right half = right)
  canvas.addEventListener('click', function (e) {
    if (state !== STATE_PLAYING) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var mid = rect.width / 2;
    moveLane(x < mid ? -1 : 1);
  });

  function moveLane(dir) {
    var newLane = player.lane + dir;
    if (newLane >= 0 && newLane <= 2) {
      player.lane = newLane;
      player.x = LANES[newLane];
    }
  }

  // --- Game lifecycle ---
  function startGame() {
    if (!audioInitialized) {
      initAudio();
      audioInitialized = true;
    }
    state = STATE_PLAYING;
    score = 0;
    gameTime = 0;
    scrollSpeed = 2;
    obstacles = [];
    pickups = [];
    particles = [];
    player.lane = 1;
    player.x = LANES[1];
    player.rotation = 0;
    player.spinSpeed = 0;
    obstacleTimer = 0;
    pickupTimer = 0;
    if (sounds.start) sounds.start();
    if (a11y) a11y.textContent = 'Game started. Dodge obstacles using arrow keys or swipe.';
  }

  function resetGame() {
    state = STATE_START;
  }

  function gameOver() {
    state = STATE_OVER;
    player.spinSpeed = 0.3;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('mkk-high', highScore);
    }
    if (sounds.hit) sounds.hit();
    if (a11y) a11y.textContent = 'Game over. Your score: ' + score + '. Press space or tap to retry.';
  }

  // --- Spawning ---
  function spawnObstacle() {
    var types = getObstacleTypes();
    var type = types[Math.floor(Math.random() * types.length)];
    var lane = Math.floor(Math.random() * 3);

    // Occasionally spawn in 2 lanes (never all 3)
    var count = 1;
    if (gameTime > 20 && Math.random() < 0.3) count = 2;

    var usedLanes = [lane];
    if (count === 2) {
      var lane2;
      do { lane2 = Math.floor(Math.random() * 3); } while (lane2 === lane);
      usedLanes.push(lane2);
    }

    for (var i = 0; i < usedLanes.length; i++) {
      obstacles.push({
        type: type,
        lane: usedLanes[i],
        x: LANES[usedLanes[i]],
        y: -30,
        w: type === 'oil' ? 36 : 20,
        h: type === 'oil' ? 16 : 20,
        angle: 0
      });
    }
  }

  function spawnPickup() {
    var lane = Math.floor(Math.random() * 3);
    var type = Math.random() < 0.8 ? 'coin' : 'itembox';
    pickups.push({
      type: type,
      lane: lane,
      x: LANES[lane],
      y: -20,
      w: 16,
      h: 16,
      angle: 0
    });
  }

  // --- Collision ---
  function collides(a, b) {
    var pad = 4; // small forgiveness
    return (
      a.x - a.w / 2 + pad < b.x + b.w / 2 - pad &&
      a.x + a.w / 2 - pad > b.x - b.w / 2 + pad &&
      a.y - a.h / 2 + pad < b.y + b.h / 2 - pad &&
      a.y + a.h / 2 - pad > b.y - b.w / 2 + pad
    );
  }

  // --- Particles ---
  function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
  }

  // --- Update ---
  var frameCount = 0;

  function update() {
    frameCount++;

    if (state === STATE_START) {
      roadOffset = (roadOffset + 1) % 40;
      blinkTimer++;
      if (blinkTimer >= 30) { blinkOn = !blinkOn; blinkTimer = 0; }
      return;
    }

    if (state === STATE_OVER) {
      // Spin-out animation
      player.rotation += player.spinSpeed;
      player.spinSpeed *= 0.98;

      blinkTimer++;
      if (blinkTimer >= 30) { blinkOn = !blinkOn; blinkTimer = 0; }

      // Update particles
      updateParticles();
      return;
    }

    // Playing
    gameTime += 1 / 60;
    scrollSpeed = getScrollSpeed();
    roadOffset = (roadOffset + scrollSpeed) % 40;
    score += 1;

    // Spawn obstacles
    obstacleTimer++;
    if (obstacleTimer >= getSpawnInterval()) {
      spawnObstacle();
      obstacleTimer = 0;
    }

    // Spawn pickups
    pickupTimer++;
    if (pickupTimer >= 120) {
      spawnPickup();
      pickupTimer = 0;
    }

    // Move obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var ob = obstacles[i];
      ob.y += scrollSpeed;
      ob.angle += 0.05;
      if (ob.y > H + 40) {
        obstacles.splice(i, 1);
        continue;
      }

      // Collision with player
      var playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (collides(playerRect, ob)) {
        spawnParticles(player.x, player.y, '#FF4444', 15);
        spawnParticles(ob.x, ob.y, '#FFD700', 8);
        gameOver();
        return;
      }
    }

    // Move pickups
    for (var j = pickups.length - 1; j >= 0; j--) {
      var pk = pickups[j];
      pk.y += scrollSpeed;
      pk.angle += 0.08;
      if (pk.y > H + 40) {
        pickups.splice(j, 1);
        continue;
      }

      var playerRect2 = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (collides(playerRect2, pk)) {
        var pts = pk.type === 'coin' ? 50 : 100;
        score += pts;
        spawnParticles(pk.x, pk.y, '#FFD700', 8);
        if (sounds.coin) sounds.coin();
        pickups.splice(j, 1);
      }
    }

    // Update particles
    updateParticles();
  }

  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.95;
      p.vy *= 0.95;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // --- Drawing ---
  function render() {
    ctx.clearRect(0, 0, W, H);

    drawRoad();

    if (state === STATE_START) {
      drawStartScreen();
    } else if (state === STATE_PLAYING) {
      drawPickups();
      drawObstacles();
      drawPlayer();
      drawHUD();
    } else if (state === STATE_OVER) {
      drawPickups();
      drawObstacles();
      drawPlayerSpinout();
      drawParticles();
      drawGameOver();
    }
  }

  function drawRoad() {
    // Grass
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);

    // Grass checkerboard
    ctx.fillStyle = '#264812';
    for (var gy = -40 + (roadOffset % 20); gy < H; gy += 20) {
      for (var gx = 0; gx < ROAD_LEFT; gx += 20) {
        if ((Math.floor(gx / 20) + Math.floor(gy / 20)) % 2 === 0) {
          ctx.fillRect(gx, gy, 20, 20);
        }
      }
      for (var gx2 = ROAD_RIGHT; gx2 < W; gx2 += 20) {
        if ((Math.floor((gx2 - ROAD_RIGHT) / 20) + Math.floor(gy / 20)) % 2 === 0) {
          ctx.fillRect(gx2, gy, 20, 20);
        }
      }
    }

    // Road surface
    ctx.fillStyle = '#333';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

    // Road edges
    ctx.fillStyle = '#fff';
    ctx.fillRect(ROAD_LEFT, 0, 3, H);
    ctx.fillRect(ROAD_RIGHT - 3, 0, 3, H);

    // Lane dividers (dashed, scrolling)
    ctx.fillStyle = '#fff';
    var dashH = 20;
    var gapH = 20;
    var totalH = dashH + gapH;
    for (var lane = 1; lane <= 2; lane++) {
      var lx = ROAD_LEFT + lane * LANE_W - 1;
      for (var dy = -totalH + (roadOffset % totalH); dy < H; dy += totalH) {
        ctx.fillRect(lx, dy, 2, dashH);
      }
    }
  }

  function drawPlayer() {
    drawKart(player.x, player.y, 0);
  }

  function drawPlayerSpinout() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);
    drawKartAt(0, 0);
    ctx.restore();
  }

  function drawKart(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    drawKartAt(0, 0);
    ctx.restore();
  }

  function drawKartAt(x, y) {
    var w = player.w;
    var h = player.h;

    // Body
    ctx.fillStyle = '#EAAA00';
    ctx.fillRect(x - w / 2 + 3, y - h / 2, w - 6, h);

    // Full width at middle
    ctx.fillRect(x - w / 2, y - h / 2 + 6, w, h - 12);

    // Windshield
    ctx.fillStyle = '#002855';
    ctx.fillRect(x - w / 2 + 5, y - h / 2 + 2, w - 10, 8);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(x - w / 2 - 1, y - h / 2 + 2, 5, 8);    // front-left
    ctx.fillRect(x + w / 2 - 4, y - h / 2 + 2, 5, 8);    // front-right
    ctx.fillRect(x - w / 2 - 1, y + h / 2 - 10, 5, 8);   // rear-left
    ctx.fillRect(x + w / 2 - 4, y + h / 2 - 10, 5, 8);   // rear-right

    // "K" emblem
    ctx.fillStyle = '#002855';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', x, y + 4);
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var ob = obstacles[i];
      switch (ob.type) {
        case 'banana': drawBanana(ob); break;
        case 'shell': drawShell(ob); break;
        case 'oil': drawOil(ob); break;
        case 'bomb': drawBomb(ob); break;
      }
    }
  }

  function drawBanana(ob) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    ctx.rotate(ob.angle);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0.3, Math.PI - 0.3);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();
    // Tip
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShell(ob) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    // Outer shell
    ctx.fillStyle = '#00AA00';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // Inner spiral pattern
    ctx.fillStyle = '#008800';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#44DD44';
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawOil(ob) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sheen
    ctx.fillStyle = 'rgba(100, 100, 150, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-4, -2, 8, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBomb(ob) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    // Body
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-2.5, 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4.5, 0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Fuse
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(2, -14);
    ctx.stroke();
    // Spark
    var flicker = Math.sin(frameCount * 0.3) > 0;
    if (flicker) {
      ctx.fillStyle = '#FF4400';
      ctx.beginPath();
      ctx.arc(2, -15, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.arc(2, -15, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPickups() {
    for (var i = 0; i < pickups.length; i++) {
      var pk = pickups[i];
      if (pk.type === 'coin') {
        drawCoin(pk);
      } else {
        drawItemBox(pk);
      }
    }
  }

  function drawCoin(pk) {
    ctx.save();
    ctx.translate(pk.x, pk.y);
    // Outer circle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    // Inner
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // Shine
    ctx.fillStyle = '#FFEC8B';
    ctx.beginPath();
    ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItemBox(pk) {
    ctx.save();
    ctx.translate(pk.x, pk.y);
    ctx.rotate(pk.angle);

    // Box outline — cycling rainbow color
    var hue = (frameCount * 3) % 360;
    ctx.strokeStyle = 'hsl(' + hue + ', 100%, 50%)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);

    // Fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(-8, -8, 16, 16);

    // Question mark
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 1);
    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE: ' + score, W - 12, 8);

    // High score
    if (highScore > 0) {
      ctx.fillStyle = '#8892a4';
      ctx.font = '10px monospace';
      ctx.fillText('BEST: ' + highScore, W - 12, 28);
    }
  }

  function drawStartScreen() {
    // Dim overlay
    ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#EAAA00';
    ctx.font = 'bold 32px "Trebuchet MS", "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BANANA DODGE', W / 2, 70);

    // Subtitle
    ctx.fillStyle = '#f0f0f0';
    ctx.font = '14px monospace';
    ctx.fillText('WVU Mario Kart Klub', W / 2, 105);

    // Controls
    ctx.fillStyle = '#8892a4';
    ctx.font = '12px monospace';

    var isMobile = 'ontouchstart' in window;
    if (isMobile) {
      ctx.fillText('Swipe or Tap to Move', W / 2, 160);
    } else {
      ctx.fillText('\u2190 \u2192  or  A D  to Move', W / 2, 155);
      ctx.fillText('Dodge bananas, shells & more', W / 2, 175);
    }

    // High score
    if (highScore > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '12px monospace';
      ctx.fillText('BEST: ' + highScore, W / 2, 210);
    }

    // Press start
    if (blinkOn) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      if (isMobile) {
        ctx.fillText('TAP TO START', W / 2, 270);
      } else {
        ctx.fillText('PRESS SPACE TO START', W / 2, 270);
      }
    }
  }

  function drawGameOver() {
    drawParticles();

    // Overlay
    ctx.fillStyle = 'rgba(10, 14, 26, 0.8)';
    ctx.fillRect(0, 0, W, H);

    // Game over
    ctx.fillStyle = '#E52521';
    ctx.font = 'bold 36px "Trebuchet MS", "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, 60);

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SCORE: ' + score, W / 2, 110);

    // High score
    if (score >= highScore && highScore > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('NEW HIGH SCORE!', W / 2, 135);
    } else if (highScore > 0) {
      ctx.fillStyle = '#8892a4';
      ctx.font = '12px monospace';
      ctx.fillText('BEST: ' + highScore, W / 2, 135);
    }

    // Score tier message
    ctx.fillStyle = '#EAAA00';
    ctx.font = '13px monospace';
    ctx.fillText(getScoreMessage(score), W / 2, 168);

    // Retry prompt
    var isMobile = 'ontouchstart' in window;
    if (blinkOn) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(isMobile ? 'TAP TO RETRY' : 'PRESS SPACE TO RETRY', W / 2, 220);
    }

    // CTA
    ctx.fillStyle = '#8892a4';
    ctx.font = '12px monospace';
    ctx.fillText('Or join the real race \u2193', W / 2, 270);
  }

  function getScoreMessage(s) {
    if (s < 500) return '"Did you even try?"';
    if (s < 2000) return '"Not bad, but Toad would\'ve done better."';
    if (s < 5000) return '"Solid run! You might survive race night."';
    if (s < 10000) return '"Impressive! You\'re Klub material."';
    return '"Legendary. See you on Rainbow Road."';
  }

  // --- Main loop ---
  var lastTime = 0;
  var accumulator = 0;
  var TICK = 1000 / 60;

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    var delta = timestamp - lastTime;
    lastTime = timestamp;
    if (delta > 200) delta = 200; // cap after tab-away

    accumulator += delta;
    while (accumulator >= TICK) {
      update();
      accumulator -= TICK;
    }

    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
