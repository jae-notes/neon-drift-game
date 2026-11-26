import * as THREE from 'three';
import { LANE_POSITIONS, createGlowTexture } from './world.js';

const JUMP_VELOCITY = 17.8;
const GRAVITY = 49.0;
const QUICK_DROP_VELOCITY = -36.0;
const SLIDE_DURATION = 0.68;
const TRAIL_POINTS = 26;

/**
 * Dynamic ribbon light trail updated in-place (zero allocations per frame).
 */
class NeonTrail {
  constructor(scene, colorHex, width = 0.16) {
    this.width = width;
    this.points = Array.from({ length: TRAIL_POINTS }, () => new THREE.Vector3(0, 0.7, 0));

    const vertCount = TRAIL_POINTS * 2;
    this.positions = new Float32Array(vertCount * 3);
    this.colors = new Float32Array(vertCount * 3);

    const baseColor = new THREE.Color(colorHex);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const fade = Math.pow(1 - i / (TRAIL_POINTS - 1), 1.7);
      for (let side = 0; side < 2; side++) {
        const idx = (i * 2 + side) * 3;
        this.colors[idx] = baseColor.r * fade;
        this.colors[idx + 1] = baseColor.g * fade;
        this.colors[idx + 2] = baseColor.b * fade;
      }
    }

    const indices = [];
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  reset(x, y, z) {
    for (let i = 0; i < TRAIL_POINTS; i++) {
      this.points[i].set(x, y, z + i * 0.22);
    }
    this._rebuildGeometry();
  }

  update(headX, headY, headZ, speed, dt) {
    const stepZ = speed * dt;
    // Shift existing history backward along +Z
    for (let i = TRAIL_POINTS - 1; i > 0; i--) {
      this.points[i].copy(this.points[i - 1]);
      this.points[i].z += stepZ;
    }
    this.points[0].set(headX, headY, headZ);
    this._rebuildGeometry();
  }

  _rebuildGeometry() {
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const p = this.points[i];
      const taper = 1 - i / TRAIL_POINTS;
      const halfW = this.width * 0.5 * taper;
      const leftIdx = i * 6;
      const rightIdx = leftIdx + 3;

      this.positions[leftIdx] = p.x - halfW;
      this.positions[leftIdx + 1] = p.y;
      this.positions[leftIdx + 2] = p.z;

      this.positions[rightIdx] = p.x + halfW;
      this.positions[rightIdx + 1] = p.y;
      this.positions[rightIdx + 2] = p.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}

export class PlayerHoverCraft {
  constructor(scene) {
    this.scene = scene;

    // Gameplay state
    this.laneIndex = 1; // 0 = left, 1 = center, 2 = right
    this.currentX = 0;
    this.jumpY = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.queuedSlide = false;
    this.invulnTimer = 0;
    this.shieldActive = false;
    this.magnetTimer = 0;
    this.bankAngle = 0;

    // Root & inner craft group
    this.group = new THREE.Group();
    this.craft = new THREE.Group();
    this.group.add(this.craft);
    this.scene.add(this.group);

    this._buildCraftMesh();
    this._buildPowerUpVisuals();

    // Dual wingtip/thruster neon trails
    this.leftTrail = new NeonTrail(scene, 0x00f5ff, 0.24);
    this.rightTrail = new NeonTrail(scene, 0x00f5ff, 0.24);
    this.centerTrail = new NeonTrail(scene, 0xff2a9d, 0.3);

    this.reset();
  }

  _buildCraftMesh() {
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x10132a,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x080c24,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x1d1642,
      metalness: 0.75,
      roughness: 0.25,
    });

    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const magentaGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2a9d });

    // Central sleek fuselage
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 2.3), hullMat);
    fuselage.position.set(0, 0.05, 0.05);
    this.craft.add(fuselage);

    // Tapered nose cone pointing forward (-Z)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.35, 4), hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.scale.set(1.15, 1, 0.42);
    nose.position.set(0, 0.03, -1.7);
    this.craft.add(nose);

    // Glowing cyan cockpit canopy
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.9,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 1.05), canopyMat);
    canopy.position.set(0, 0.26, -0.15);
    canopy.rotation.x = 0.12;
    this.craft.add(canopy);

    // Swept delta wings (left & right)
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.11, 1.45), trimMat);
      wing.position.set(side * 0.78, -0.02, 0.35);
      wing.rotation.y = side * 0.28;
      wing.rotation.z = side * -0.12;
      this.craft.add(wing);

      // Wingtip neon cyan edge strip
      const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), cyanGlowMat);
      wingEdge.position.set(side * 1.18, -0.05, 0.48);
      wingEdge.rotation.y = side * 0.28;
      this.craft.add(wingEdge);

      // Side magenta accent rail
      const sideStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.75), magentaGlowMat);
      sideStrip.position.set(side * 0.5, 0.11, -0.05);
      this.craft.add(sideStrip);

      // Rear twin thruster pods
      const thruster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.42, 12),
        trimMat
      );
      thruster.rotation.x = Math.PI / 2;
      thruster.position.set(side * 0.34, 0.04, 1.24);
      this.craft.add(thruster);

      // Thruster plasma core
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.05, 0.55, 10),
        side === -1 ? cyanGlowMat : cyanGlowMat
      );
      core.rotation.x = Math.PI / 2;
      core.position.set(side * 0.34, 0.04, 1.56);
      this.craft.add(core);
      if (side === -1) this.leftFlame = core;
      else this.rightFlame = core;
    }

    // Center magenta afterburner bar
    const tailGlow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.1), magentaGlowMat);
    tailGlow.position.set(0, 0.18, 1.22);
    this.craft.add(tailGlow);

    // Underglow additive halo cast beneath the hover-craft
    const glowTex = createGlowTexture('#ffffff', '#00f5ff');
    const underglow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 3.6),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    underglow.rotation.x = -Math.PI / 2;
    underglow.position.set(0, 0.05, 0);
    this.underglow = underglow;
    this.group.add(underglow);

    // Dynamic local point light illuminating nearby track & barriers
    this.craftLight = new THREE.PointLight(0x00f5ff, 2.2, 11, 1.6);
    this.craftLight.position.set(0, 0.8, 0.4);
    this.group.add(this.craftLight);
  }

  _buildPowerUpVisuals() {
    // Translucent cyan energy shield dome
    const shieldGeo = new THREE.IcosahedronGeometry(1.55, 1);
    const shieldWireMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const shieldShellMat = new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.shieldGroup = new THREE.Group();
    this.shieldGroup.add(new THREE.Mesh(shieldGeo, shieldWireMat));
    this.shieldGroup.add(new THREE.Mesh(shieldGeo, shieldShellMat));
    this.shieldGroup.visible = false;
    this.craft.add(this.shieldGroup);

    // Rotating magnet field ring around the hover-craft
    const magRingGeo = new THREE.TorusGeometry(1.45, 0.055, 8, 32);
    const magRingMat = new THREE.MeshBasicMaterial({
      color: 0xff2a9d,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    this.magnetRing = new THREE.Mesh(magRingGeo, magRingMat);
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.visible = false;
    this.craft.add(this.magnetRing);
  }

  reset() {
    this.laneIndex = 1;
    this.currentX = LANE_POSITIONS[1];
    this.jumpY = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.queuedSlide = false;
    this.invulnTimer = 0;
    this.shieldActive = false;
    this.magnetTimer = 0;
    this.bankAngle = 0;

    this.group.position.set(0, 0, 0);
    this.craft.position.set(0, 0.72, 0);
    this.craft.rotation.set(0, 0, 0);
    this.craft.scale.set(1, 1, 1);
    this.craft.visible = true;
    this.shieldGroup.visible = false;
    this.magnetRing.visible = false;

    this.leftTrail.reset(-1.12, 0.68, 0.8);
    this.rightTrail.reset(1.12, 0.68, 0.8);
    this.centerTrail.reset(0, 0.72, 1.35);
  }

  moveLeft() {
    if (this.laneIndex > 0) {
      this.laneIndex--;
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.laneIndex < 2) {
      this.laneIndex++;
      return true;
    }
    return false;
  }

  jump() {
    if (this.isGrounded) {
      this.vy = JUMP_VELOCITY;
      this.isGrounded = false;
      this.slideTimer = 0;
      this.queuedSlide = false;
      return true;
    }
    return false;
  }

  slide() {
    if (!this.isGrounded) {
      // Mid-air quick-drop into immediate slide on landing
      this.vy = Math.min(this.vy, QUICK_DROP_VELOCITY);
      this.queuedSlide = true;
      return 'quickdrop';
    }
    this.slideTimer = SLIDE_DURATION;
    return 'slide';
  }

  activateShield() {
    this.shieldActive = true;
    this.shieldGroup.visible = true;
  }

  consumeShield() {
    this.shieldActive = false;
    this.shieldGroup.visible = false;
    this.invulnTimer = 1.25;
  }

  activateMagnet(duration = 10) {
    this.magnetTimer = duration;
    this.magnetRing.visible = true;
  }

  get isSliding() {
    return this.isGrounded && this.slideTimer > 0;
  }

  /**
   * Returns accurate world-space collision bounds for fair obstacle checks.
   */
  getHitbox() {
    const height = this.isSliding ? 0.62 : 1.32;
    return {
      minX: this.currentX - 0.72,
      maxX: this.currentX + 0.72,
      minY: this.jumpY,
      maxY: this.jumpY + height,
      minZ: -1.15,
      maxZ: 0.95,
    };
  }

  update(dt, speed, elapsed) {
    // 1. Smooth 3-lane horizontal interpolation + banking
    const targetX = LANE_POSITIONS[this.laneIndex];
    const dx = targetX - this.currentX;
    const lerpFactor = 1 - Math.exp(-16 * dt);
    this.currentX += dx * lerpFactor;

    const targetBank = THREE.MathUtils.clamp(-dx * 0.24, -0.42, 0.42);
    this.bankAngle += (targetBank - this.bankAngle) * (1 - Math.exp(-14 * dt));

    // 2. Jump / gravity / quick-drop physics
    if (!this.isGrounded) {
      this.vy -= GRAVITY * dt;
      this.jumpY += this.vy * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.vy = 0;
        this.isGrounded = true;
        if (this.queuedSlide) {
          this.slideTimer = SLIDE_DURATION;
          this.queuedSlide = false;
        }
      }
    }

    // 3. Slide timer
    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // 4. Magnet timer
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
      if (this.magnetTimer <= 0) {
        this.magnetRing.visible = false;
      }
    }

    // 5. Invulnerability flash after shield absorb
    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      this.craft.visible = Math.floor(this.invulnTimer * 22) % 2 === 0;
    } else {
      this.craft.visible = true;
    }

    // 6. Position & attitude transforms
    const hoverBob = this.isGrounded && !this.isSliding ? Math.sin(elapsed * 7.5) * 0.06 : 0;
    const baseHeight = this.isSliding ? 0.3 : 0.72;
    const craftY = baseHeight + this.jumpY + hoverBob;

    this.group.position.x = this.currentX;
    this.craft.position.y = craftY;

    // Flatten craft subtly during crouch/slide for clear visual feedback
    const targetScaleY = this.isSliding ? 0.56 : 1.0;
    const targetScaleX = this.isSliding ? 1.12 : 1.0;
    this.craft.scale.y += (targetScaleY - this.craft.scale.y) * (1 - Math.exp(-18 * dt));
    this.craft.scale.x += (targetScaleX - this.craft.scale.x) * (1 - Math.exp(-18 * dt));

    // Pitch up while ascending, nose down on dive/quick-drop
    const targetPitch = this.isGrounded
      ? this.isSliding
        ? -0.06
        : 0
      : THREE.MathUtils.clamp(this.vy * 0.022, -0.38, 0.32);

    this.craft.rotation.z = this.bankAngle;
    this.craft.rotation.x += (targetPitch - this.craft.rotation.x) * (1 - Math.exp(-14 * dt));

    // Pulse thrusters
    const flamePulse = 0.85 + Math.sin(elapsed * 42) * 0.22 + (speed - 28) * 0.012;
    this.leftFlame.scale.set(1, flamePulse, 1);
    this.rightFlame.scale.set(1, flamePulse, 1);

    // Keep underglow projected cleanly on the skyway deck
    const glowScale = Math.max(0.4, 1 - this.jumpY * 0.16);
    this.underglow.scale.set(glowScale, glowScale, 1);
    this.underglow.material.opacity = 0.5 * glowScale;

    // Animate power-up shields/rings
    if (this.shieldGroup.visible) {
      this.shieldGroup.rotation.y += dt * 1.4;
      this.shieldGroup.rotation.x += dt * 0.7;
    }
    if (this.magnetRing.visible) {
      this.magnetRing.rotation.z += dt * 4.5;
      const mPulse = 1 + Math.sin(elapsed * 10) * 0.07;
      this.magnetRing.scale.set(mPulse, mPulse, 1);
    }

    // Update ribbon neon light trails
    const bankCos = Math.cos(this.bankAngle);
    const bankSin = Math.sin(this.bankAngle);
    const wingX = 1.12 * this.craft.scale.x;

    this.leftTrail.update(
      this.currentX - wingX * bankCos,
      craftY - wingX * bankSin - 0.04,
      0.85,
      speed,
      dt
    );
    this.rightTrail.update(
      this.currentX + wingX * bankCos,
      craftY + wingX * bankSin - 0.04,
      0.85,
      speed,
      dt
    );
    this.centerTrail.update(this.currentX, craftY + 0.04, 1.45, speed, dt);
  }
}
