import * as THREE from 'three';
import { CyberpunkWorld } from './world.js';
import { PlayerHoverCraft } from './player.js';
import { ObstacleAndOrbSpawner } from './spawner.js';
import { SynthAudioEngine } from './audio.js';

const BASE_SPEED = 28;
const MAX_SPEED = 70;
const BASE_FOV = 64;
const MAX_FOV = 82;
const MAGNET_DURATION = 10;
const HIGHSCORE_KEY = 'neon_drift_highscore_v1';

/**
 * Pooled neon burst particles for orb pickups, shield shatters, and crash impacts.
 */
class ParticleBurstPool {
  constructor(scene, poolSize = 48) {
    this.particles = [];
    const geo = new THREE.OctahedronGeometry(0.14, 0);

    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);

      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.4,
      });
    }
  }

  burst(origin, colorHex, count = 10, speedScale = 9) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.life > 0) continue;
      p.mesh.position.copy(origin);
      p.mesh.material.color.setHex(colorHex);
      p.mesh.material.opacity = 1;
      p.mesh.scale.setScalar(0.8 + Math.random() * 0.8);
      p.mesh.visible = true;

      p.vel.set(
        (Math.random() - 0.5) * speedScale,
        Math.random() * speedScale * 0.75 + 1.5,
        (Math.random() - 0.5) * speedScale
      );
      p.maxLife = 0.28 + Math.random() * 0.24;
      p.life = p.maxLife;

      spawned++;
      if (spawned >= count) break;
    }
  }

  update(dt, worldSpeed) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 18 * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += (p.vel.z + worldSpeed * 0.35) * dt;
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 9;

      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(t);
    }
  }
}

class NeonDriftGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this._cacheUI();

    // Renderer & Scene
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      BASE_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      260
    );
    this.camera.position.set(0, 4.4, 8.6);
    this.camera.lookAt(0, 1.35, -14);

    // Core systems
    this.world = new CyberpunkWorld(this.scene);
    this.player = new PlayerHoverCraft(this.scene);
    this.spawner = new ObstacleAndOrbSpawner(this.scene);
    this.particles = new ParticleBurstPool(this.scene, 64);
    this.audio = new SynthAudioEngine();

    // Game state
    this.state = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
    this.speed = BASE_SPEED;
    this.score = 0;
    this.distance = 0;
    this.orbsCollected = 0;
    this.orbStreak = 0;
    this.multiplier = 1;
    this.maxMultiplier = 1;
    this.elapsed = 0;
    this.runTime = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.highScore = this._loadHighScore();
    this.fpsFrames = 0;
    this.fpsLastSample = performance.now();
    this.currentFps = 60;

    // Touch swipe state
    this.touchStartX = 0;
    this.touchStartY = 0;

    this._refreshBestDisplays();
    this._bindEvents();

    // Start main 60 FPS loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _cacheUI() {
    this.ui = {
      hud: document.getElementById('hud'),
      score: document.getElementById('hud-score'),
      multiplier: document.getElementById('hud-multiplier'),
      distance: document.getElementById('hud-distance'),
      best: document.getElementById('hud-best'),
      speed: document.getElementById('hud-speed'),
      fps: document.getElementById('hud-fps'),
      shieldBadge: document.getElementById('powerup-shield'),
      magnetBadge: document.getElementById('powerup-magnet'),
      magnetFill: document.getElementById('magnet-bar-fill'),
      toast: document.getElementById('toast'),
      btnMute: document.getElementById('btn-mute'),
      muteIcon: document.getElementById('mute-icon'),
      btnPause: document.getElementById('btn-pause'),
      startOverlay: document.getElementById('start-overlay'),
      startBestWrap: document.getElementById('start-best-wrap'),
      startBestValue: document.getElementById('start-best-value'),
      btnStart: document.getElementById('btn-start'),
      pauseOverlay: document.getElementById('pause-overlay'),
      btnResume: document.getElementById('btn-resume'),
      btnPauseRestart: document.getElementById('btn-pause-restart'),
      gameoverOverlay: document.getElementById('gameover-overlay'),
      newRecordBadge: document.getElementById('new-record-badge'),
      goScore: document.getElementById('go-score'),
      goBest: document.getElementById('go-best'),
      goDistance: document.getElementById('go-distance'),
      goOrbs: document.getElementById('go-orbs'),
      btnRestart: document.getElementById('btn-restart'),
    };
  }

  _loadHighScore() {
    try {
      const val = parseInt(localStorage.getItem(HIGHSCORE_KEY) || '0', 10);
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch {
      return 0;
    }
  }

  _saveHighScore(value) {
    try {
      localStorage.setItem(HIGHSCORE_KEY, String(Math.floor(value)));
    } catch {
      // Ignore storage access errors in restricted private browsing modes
    }
  }

  _refreshBestDisplays() {
    const formatted = Math.floor(this.highScore).toLocaleString();
    this.ui.best.textContent = formatted;
    if (this.highScore > 0) {
      this.ui.startBestWrap.classList.remove('hidden');
      this.ui.startBestValue.textContent = formatted;
    } else {
      this.ui.startBestWrap.classList.add('hidden');
    }
  }

  _showToast(message, variant = '') {
    const el = this.ui.toast;
    el.className = `toast ${variant}`.trim();
    el.textContent = message;
    // Restart CSS animation cleanly
    void el.offsetWidth;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, 1220);
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.ui.btnStart.addEventListener('click', () => this.startRun());
    this.ui.btnRestart.addEventListener('click', () => this.startRun());
    this.ui.btnResume.addEventListener('click', () => this.resumeRun());
    this.ui.btnPauseRestart.addEventListener('click', () => this.startRun());
    this.ui.btnPause.addEventListener('click', () => this.togglePause());
    this.ui.btnMute.addEventListener('click', () => this._toggleMute());

    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyM') {
        this._toggleMute();
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') {
          this.togglePause();
        }
        return;
      }

      if (this.state === 'menu' || this.state === 'gameover') {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.startRun();
        }
        return;
      }

      if (this.state !== 'playing' || e.repeat) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (this.player.moveLeft()) this.audio.playLaneSwitch(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (this.player.moveRight()) this.audio.playLaneSwitch(1);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (this.player.jump()) this.audio.playJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        const res = this.player.slide();
        this.audio.playSlide(res === 'quickdrop');
      }
    });

    // Touch swipe controls for mobile / trackpad touchscreens
    window.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 0) return;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      (e) => {
        if (this.state !== 'playing' || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        const dy = e.changedTouches[0].clientY - this.touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (Math.max(absX, absY) < 28) return;

        if (absX > absY) {
          if (dx < 0 && this.player.moveLeft()) this.audio.playLaneSwitch(-1);
          if (dx > 0 && this.player.moveRight()) this.audio.playLaneSwitch(1);
        } else {
          if (dy < 0 && this.player.jump()) this.audio.playJump();
          if (dy > 0) {
            const res = this.player.slide();
            this.audio.playSlide(res === 'quickdrop');
          }
        }
      },
      { passive: true }
    );
  }

  _toggleMute() {
    const muted = this.audio.toggleMute();
    this.ui.btnMute.classList.toggle('muted', muted);
    this.ui.muteIcon.textContent = muted ? '✕' : '♪';
  }

  startRun() {
    this.state = 'playing';
    this.speed = BASE_SPEED;
    this.score = 0;
    this.distance = 0;
    this.orbsCollected = 0;
    this.orbStreak = 0;
    this.multiplier = 1;
    this.maxMultiplier = 1;
    this.runTime = 0;
    this.shakeTime = 0;

    this.player.reset();
    this.spawner.reset();

    this.ui.startOverlay.classList.add('hidden');
    this.ui.pauseOverlay.classList.add('hidden');
    this.ui.gameoverOverlay.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.ui.shieldBadge.classList.add('hidden');
    this.ui.magnetBadge.classList.add('hidden');

    this._updateHUD();
    this.audio.playStart();
    this.audio.startPulse();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.pauseOverlay.classList.remove('hidden');
      this.audio.stopPulse();
    } else if (this.state === 'paused') {
      this.resumeRun();
    }
  }

  resumeRun() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.pauseOverlay.classList.add('hidden');
    this.lastFrameTime = performance.now();
    this.audio.startPulse();
  }

  _handleObstacleHit(obs) {
    if (this.player.invulnTimer > 0) return;

    const hitPos = new THREE.Vector3(this.player.currentX, this.player.jumpY + 0.9, -0.4);

    if (this.player.shieldActive) {
      this.player.consumeShield();
      this.orbStreak = 0;
      this.multiplier = Math.max(1, Math.floor(this.multiplier / 2));
      this.shakeTime = 0.32;
      this.shakeIntensity = 0.34;
      this.particles.burst(hitPos, 0x00f5ff, 22, 13);
      this.audio.playShieldBreak();
      this._showToast('SHIELD ABSORBED IMPACT', '');
      return;
    }

    // Fatal crash -> Game Over
    this.state = 'gameover';
    this.shakeTime = 0.45;
    this.shakeIntensity = 0.55;
    this.particles.burst(hitPos, 0xff2a9d, 30, 16);
    this.particles.burst(hitPos, 0xffd166, 16, 11);
    this.audio.stopPulse();
    this.audio.playCrash();

    const finalScore = Math.floor(this.score);
    let isNewRecord = false;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      this._saveHighScore(this.highScore);
      isNewRecord = true;
    }

    this._refreshBestDisplays();
    this.ui.goScore.textContent = finalScore.toLocaleString();
    this.ui.goBest.textContent = Math.floor(this.highScore).toLocaleString();
    this.ui.goDistance.textContent = `${Math.floor(this.distance).toLocaleString()} m`;
    this.ui.goOrbs.textContent = `${this.orbsCollected} · x${this.maxMultiplier}`;
    this.ui.newRecordBadge.classList.toggle('hidden', !isNewRecord);

    // Slight delay so player sees the impact burst before overlay appears
    setTimeout(() => {
      if (this.state === 'gameover') {
        this.ui.gameoverOverlay.classList.remove('hidden');
      }
    }, 360);
  }

  _handleOrbCollect(pos) {
    this.orbsCollected++;
    this.orbStreak++;

    // Scale multiplier every 8 orbs up to x10
    const nextMult = Math.min(10, 1 + Math.floor(this.orbStreak / 8));
    if (nextMult > this.multiplier) {
      this.multiplier = nextMult;
      this.maxMultiplier = Math.max(this.maxMultiplier, this.multiplier);
      this._showToast(`MULTIPLIER x${this.multiplier}`, 'gold');
    }

    this.score += 25 * this.multiplier;
    this.particles.burst(pos, 0xffd166, 7, 7);
    this.audio.playOrb(this.orbStreak - 1);
  }

  _handlePowerUpCollect(type, pos) {
    if (type === 'shield') {
      this.player.activateShield();
      this.particles.burst(pos, 0x00f5ff, 18, 10);
      this._showToast('SHIELD ONLINE', '');
    } else if (type === 'magnet') {
      this.player.activateMagnet(MAGNET_DURATION);
      this.particles.burst(pos, 0xff2a9d, 18, 10);
      this._showToast('ORB MAGNET ENGAGED', 'magenta');
    }
    this.audio.playPowerUp(type);
  }

  _updateHUD() {
    this.ui.score.textContent = Math.floor(this.score).toLocaleString();
    this.ui.multiplier.textContent = `x${this.multiplier}`;
    this.ui.distance.textContent = `${Math.floor(this.distance).toLocaleString()} m`;

    const displayBest = Math.max(this.highScore, Math.floor(this.score));
    this.ui.best.textContent = displayBest.toLocaleString();

    // Stylized cyber-skyway speed & live FPS readout
    this.ui.speed.textContent = Math.round(this.speed * 4.4);
    this.ui.fps.textContent = String(this.currentFps);

    this.ui.shieldBadge.classList.toggle('hidden', !this.player.shieldActive);

    const hasMagnet = this.player.magnetTimer > 0;
    this.ui.magnetBadge.classList.toggle('hidden', !hasMagnet);
    if (hasMagnet) {
      const pct = Math.max(0, Math.min(100, (this.player.magnetTimer / MAGNET_DURATION) * 100));
      this.ui.magnetFill.style.width = `${pct}%`;
    }
  }

  _updateCamera(dt) {
    const speedNorm = (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    const targetFov = BASE_FOV + speedNorm * (MAX_FOV - BASE_FOV);
    if (Math.abs(this.camera.fov - targetFov) > 0.02) {
      this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-5 * dt));
      this.camera.updateProjectionMatrix();
    }

    const followX = this.player.currentX * 0.42;
    const followY = 4.35 + this.player.jumpY * 0.32;
    const followZ = 8.6 + speedNorm * 0.65;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const decay = this.shakeTime * 2.5;
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * decay;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * decay;
    }

    this.camera.position.x += (followX - this.camera.position.x) * (1 - Math.exp(-8 * dt));
    this.camera.position.y += (followY - this.camera.position.y) * (1 - Math.exp(-8 * dt));
    this.camera.position.z += (followZ - this.camera.position.z) * (1 - Math.exp(-6 * dt));

    this.camera.position.x += shakeX;
    this.camera.position.y += shakeY;
    this.camera.lookAt(this.player.currentX * 0.25, 1.35 + this.player.jumpY * 0.2, -16);
  }

  _loop(now) {
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    this.fpsFrames++;
    if (now - this.fpsLastSample >= 500) {
      this.currentFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastSample));
      this.fpsFrames = 0;
      this.fpsLastSample = now;
    }

    if (this.state === 'paused') {
      return;
    }

    this.elapsed += dt;

    if (this.state === 'menu') {
      // Smooth showcase glide down the illuminated skyway on the Start screen
      const demoSpeed = 22;
      this.world.update(dt, demoSpeed, this.elapsed);
      this.player.update(dt, demoSpeed, this.elapsed);
      this.camera.position.x = Math.sin(this.elapsed * 0.45) * 1.4;
      this.camera.position.y = 4.6 + Math.sin(this.elapsed * 0.8) * 0.2;
      this.camera.position.z = 9.0;
      this.camera.lookAt(0, 1.4, -18);
    } else if (this.state === 'playing') {
      this.runTime += dt;
      // Progressive speed increase
      this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.runTime * 0.34);
      const speedNorm = (this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
      this.audio.setSpeedFactor(speedNorm);

      // Distance & passive score accumulation
      const distStep = this.speed * dt * 0.65;
      this.distance += distStep;
      this.score += distStep * 1.4 * this.multiplier;

      this.world.update(dt, this.speed, this.elapsed);
      this.player.update(dt, this.speed, this.elapsed);
      this.spawner.update(dt, this.speed, this.elapsed, this.player, {
        onObstacleHit: (obs) => this._handleObstacleHit(obs),
        onOrbCollect: (pos) => this._handleOrbCollect(pos),
        onPowerUpCollect: (type, pos) => this._handlePowerUpCollect(type, pos),
      });
      this.particles.update(dt, this.speed);
      this._updateCamera(dt);
      this._updateHUD();
    } else if (this.state === 'gameover') {
      // Gently decelerate world & let crash particles settle
      this.speed = Math.max(4, this.speed * (1 - Math.min(1, dt * 3.5)));
      this.world.update(dt, this.speed, this.elapsed);
      this.particles.update(dt, this.speed);
      this._updateCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new NeonDriftGame();
