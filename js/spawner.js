import * as THREE from 'three';
import { LANE_POSITIONS, createGlowTexture } from './world.js';

const SPAWN_HORIZON_Z = -155;
const DESPAWN_Z = 16;

export class ObstacleAndOrbSpawner {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.orbs = [];
    this.powerups = [];
    this.nextWaveZ = -55;
    this.waveCounter = 0;

    this._initSharedAssets();
  }

  _initSharedAssets() {
    // Shared materials
    this.darkArmorMat = new THREE.MeshStandardMaterial({
      color: 0x120e28,
      metalness: 0.8,
      roughness: 0.25,
    });

    this.barrierBeamMat = new THREE.MeshBasicMaterial({ color: 0xff6b2b });
    this.barrierFieldMat = new THREE.MeshBasicMaterial({
      color: 0xff2a9d,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.laserBeamMat = new THREE.MeshBasicMaterial({ color: 0xff1e7a });
    this.cyanAccentMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    this.magentaAccentMat = new THREE.MeshBasicMaterial({ color: 0xff2a9d });

    this.orbCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffa600,
      emissiveIntensity: 0.95,
      metalness: 0.35,
      roughness: 0.15,
    });
    this.orbRingMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    this.magnetCoreMat = new THREE.MeshStandardMaterial({
      color: 0xff2a9d,
      emissive: 0xff2a9d,
      emissiveIntensity: 0.9,
      metalness: 0.3,
      roughness: 0.2,
    });
    this.magnetRingMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    this.shieldCoreMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.95,
      metalness: 0.2,
      roughness: 0.15,
    });

    // Shared glow sprite materials
    this.orbHaloMat = new THREE.SpriteMaterial({
      map: createGlowTexture('#fff8d6', '#ffae00'),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shieldHaloMat = new THREE.SpriteMaterial({
      map: createGlowTexture('#ffffff', '#00f5ff'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.magnetHaloMat = new THREE.SpriteMaterial({
      map: createGlowTexture('#ffffff', '#ff2a9d'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Shared geometries — Low Energy Barrier (Jump Over)
    this.lowPylonGeo = new THREE.BoxGeometry(0.28, 1.2, 0.44);
    this.lowBarGeo = new THREE.BoxGeometry(2.35, 0.14, 0.14);
    this.lowFieldGeo = new THREE.PlaneGeometry(2.26, 0.85);

    // Shared geometries — High Laser Gate (Slide Under)
    this.highPostGeo = new THREE.BoxGeometry(0.28, 3.45, 0.44);
    this.highHeaderGeo = new THREE.BoxGeometry(2.85, 0.42, 0.56);
    this.highLaserGeo = new THREE.BoxGeometry(2.36, 0.12, 0.12);
    this.highCurtainGeo = new THREE.PlaneGeometry(2.32, 1.9);
    this.slideFloorStripGeo = new THREE.PlaneGeometry(1.75, 0.5);

    // Shared geometries — Full-Lane Neon Monolith (Switch Lanes)
    this.monoBodyGeo = new THREE.BoxGeometry(2.45, 3.4, 1.65);
    this.monoStripeGeo = new THREE.BoxGeometry(2.54, 0.16, 1.72);
    this.monoVertGlowGeo = new THREE.BoxGeometry(0.14, 3.1, 1.72);
    this.monoBaseGeo = new THREE.BoxGeometry(2.1, 0.12, 1.35);

    // Shared geometries — Orbs & Power-ups
    this.orbGeo = new THREE.OctahedronGeometry(0.36, 0);
    this.orbRingGeo = new THREE.TorusGeometry(0.5, 0.045, 6, 18);

    this.powerOrbGeo = new THREE.OctahedronGeometry(0.48, 0);
    this.powerRingOuterGeo = new THREE.TorusGeometry(0.76, 0.06, 8, 24);
    this.powerRingInnerGeo = new THREE.TorusGeometry(0.58, 0.045, 8, 20);
  }

  reset() {
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    for (const c of this.orbs) this.scene.remove(c.mesh);
    for (const p of this.powerups) this.scene.remove(p.mesh);

    this.obstacles.length = 0;
    this.orbs.length = 0;
    this.powerups.length = 0;
    this.nextWaveZ = -52;
    this.waveCounter = 0;
  }

  /**
   * 1. Low Energy Barrier (Jump Over)
   */
  _spawnLowBarrier(laneIdx, z) {
    const x = LANE_POSITIONS[laneIdx];
    const group = new THREE.Group();

    const leftPylon = new THREE.Mesh(this.lowPylonGeo, this.darkArmorMat);
    leftPylon.position.set(-1.24, 0.6, 0);
    group.add(leftPylon);

    const rightPylon = new THREE.Mesh(this.lowPylonGeo, this.darkArmorMat);
    rightPylon.position.set(1.24, 0.6, 0);
    group.add(rightPylon);

    const topBar = new THREE.Mesh(this.lowBarGeo, this.barrierBeamMat);
    topBar.position.set(0, 1.05, 0);
    group.add(topBar);

    const midBar = new THREE.Mesh(this.lowBarGeo, this.magentaAccentMat);
    midBar.position.set(0, 0.56, 0);
    group.add(midBar);

    const field = new THREE.Mesh(this.lowFieldGeo, this.barrierFieldMat);
    field.position.set(0, 0.62, 0);
    group.add(field);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.obstacles.push({
      type: 'low',
      lane: laneIdx,
      mesh: group,
      x,
      z,
      halfX: 1.16,
      minY: 0,
      maxY: 1.12,
      halfZ: 0.42,
      hit: false,
    });
  }

  /**
   * 2. High Laser Gate (Slide / Duck Under)
   */
  _spawnHighGate(laneIdx, z) {
    const x = LANE_POSITIONS[laneIdx];
    const group = new THREE.Group();

    // Tall arch posts
    const leftPost = new THREE.Mesh(this.highPostGeo, this.darkArmorMat);
    leftPost.position.set(-1.32, 1.72, 0);
    group.add(leftPost);

    const rightPost = new THREE.Mesh(this.highPostGeo, this.darkArmorMat);
    rightPost.position.set(1.32, 1.72, 0);
    group.add(rightPost);

    // Armored top gantry beam
    const header = new THREE.Mesh(this.highHeaderGeo, this.darkArmorMat);
    header.position.set(0, 3.28, 0);
    group.add(header);

    // Cyan floor pass-under cue strip
    const floorStrip = new THREE.Mesh(this.slideFloorStripGeo, this.cyanAccentMat);
    floorStrip.rotation.x = -Math.PI / 2;
    floorStrip.position.set(0, 0.04, 0);
    group.add(floorStrip);

    // Hanging crimson-magenta laser beams (clear gap below y = 1.02)
    for (const ly of [1.14, 1.65, 2.18, 2.72]) {
      const beam = new THREE.Mesh(this.highLaserGeo, this.laserBeamMat);
      beam.position.set(0, ly, 0);
      group.add(beam);
    }

    const curtain = new THREE.Mesh(this.highCurtainGeo, this.barrierFieldMat);
    curtain.position.set(0, 2.08, 0);
    group.add(curtain);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.obstacles.push({
      type: 'high',
      lane: laneIdx,
      mesh: group,
      x,
      z,
      halfX: 1.16,
      minY: 1.02,
      maxY: 3.4,
      halfZ: 0.42,
      hit: false,
    });
  }

  /**
   * 3. Full-Lane Neon Monolith / Hover-Barricade (Must Switch Lanes)
   */
  _spawnFullMonolith(laneIdx, z) {
    const x = LANE_POSITIONS[laneIdx];
    const group = new THREE.Group();

    const body = new THREE.Mesh(this.monoBodyGeo, this.darkArmorMat);
    body.position.set(0, 1.85, 0);
    group.add(body);

    // Glowing horizontal hazard stripes
    for (const sy of [0.65, 1.85, 3.05]) {
      const stripe = new THREE.Mesh(
        this.monoStripeGeo,
        sy === 1.85 ? this.cyanAccentMat : this.magentaAccentMat
      );
      stripe.position.set(0, sy, 0);
      group.add(stripe);
    }

    // Glowing vertical conduit edges
    for (const side of [-1, 1]) {
      const conduit = new THREE.Mesh(this.monoVertGlowGeo, this.magentaAccentMat);
      conduit.position.set(side * 1.18, 1.85, 0);
      group.add(conduit);
    }

    // Glowing hover base pad
    const hoverPad = new THREE.Mesh(this.monoBaseGeo, this.cyanAccentMat);
    hoverPad.position.set(0, 0.14, 0);
    group.add(hoverPad);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.obstacles.push({
      type: 'full',
      lane: laneIdx,
      mesh: group,
      x,
      z,
      halfX: 1.2,
      minY: 0,
      maxY: 3.6,
      halfZ: 0.86,
      hit: false,
    });
  }

  _spawnOrb(x, y, z) {
    const group = new THREE.Group();

    const core = new THREE.Mesh(this.orbGeo, this.orbCoreMat);
    group.add(core);

    const ring = new THREE.Mesh(this.orbRingGeo, this.orbRingMat);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    const halo = new THREE.Sprite(this.orbHaloMat);
    halo.scale.set(1.5, 1.5, 1);
    group.add(halo);

    group.position.set(x, y, z);
    this.scene.add(group);

    this.orbs.push({
      mesh: group,
      core,
      ring,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  _spawnOrbLine(laneIdx, startZ, count, spacing = 3.0, y = 1.05) {
    const x = LANE_POSITIONS[laneIdx];
    for (let i = 0; i < count; i++) {
      this._spawnOrb(x, y, startZ - i * spacing);
    }
  }

  _spawnOrbJumpArc(laneIdx, centerZ) {
    const x = LANE_POSITIONS[laneIdx];
    const offsets = [-6.2, -3.1, 0, 3.1, 6.2];
    const heights = [1.25, 2.35, 2.85, 2.35, 1.25];
    for (let i = 0; i < offsets.length; i++) {
      this._spawnOrb(x, heights[i], centerZ + offsets[i]);
    }
  }

  _spawnPowerUp(type, laneIdx, z) {
    const x = LANE_POSITIONS[laneIdx];
    const group = new THREE.Group();

    const isShield = type === 'shield';
    const core = new THREE.Mesh(
      this.powerOrbGeo,
      isShield ? this.shieldCoreMat : this.magnetCoreMat
    );
    group.add(core);

    const ringOuter = new THREE.Mesh(
      this.powerRingOuterGeo,
      isShield ? this.cyanAccentMat : this.magnetRingMat
    );
    group.add(ringOuter);

    const ringInner = new THREE.Mesh(
      this.powerRingInnerGeo,
      isShield ? this.magentaAccentMat : this.magentaAccentMat
    );
    ringInner.rotation.x = Math.PI / 2;
    group.add(ringInner);

    const halo = new THREE.Sprite(isShield ? this.shieldHaloMat : this.magnetHaloMat);
    halo.scale.set(2.4, 2.4, 1);
    group.add(halo);

    const baseY = 1.25;
    group.position.set(x, baseY, z);
    this.scene.add(group);

    this.powerups.push({
      type,
      mesh: group,
      core,
      ringOuter,
      ringInner,
      baseY,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  /**
   * Generates a guaranteed-passable wave of obstacles, guiding orb patterns,
   * and periodic Magnet / Shield power-ups.
   */
  _spawnWave(z, speed) {
    this.waveCounter++;
    const lanes = [0, 1, 2];
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const shuffled = [...lanes].sort(() => Math.random() - 0.5);

    // Choose pattern variety (early waves slightly gentler, ramping smoothly)
    const maxPattern = this.waveCounter <= 2 ? 3 : 6;
    const pattern = Math.floor(Math.random() * maxPattern);

    let safeOrbLane = shuffled[0];

    if (pattern === 0) {
      // Single low barrier with jump orb arc + optional monolith in another lane
      const jumpLane = shuffled[0];
      this._spawnLowBarrier(jumpLane, z);
      this._spawnOrbJumpArc(jumpLane, z);
      if (this.waveCounter > 1 && Math.random() > 0.35) {
        this._spawnFullMonolith(shuffled[1], z);
      }
      safeOrbLane = shuffled[2];
    } else if (pattern === 1) {
      // High laser gate with low slide-guiding orbs + monolith beside it
      const slideLane = shuffled[0];
      this._spawnHighGate(slideLane, z);
      this._spawnOrbLine(slideLane, z + 4.5, 4, 3.0, 0.52);
      if (Math.random() > 0.3) {
        this._spawnFullMonolith(shuffled[1], z);
      }
      safeOrbLane = shuffled[2];
    } else if (pattern === 2) {
      // Two full monoliths leaving one crisp open corridor lined with orbs
      this._spawnFullMonolith(shuffled[0], z);
      this._spawnFullMonolith(shuffled[1], z);
      safeOrbLane = shuffled[2];
      this._spawnOrbLine(safeOrbLane, z + 6, 5, 3.0, 1.05);
    } else if (pattern === 3) {
      // Full-track jump challenge (all 3 lanes low barrier) with guiding jump arc
      for (const l of lanes) this._spawnLowBarrier(l, z);
      safeOrbLane = pickRandom(lanes);
      this._spawnOrbJumpArc(safeOrbLane, z);
    } else if (pattern === 4) {
      // Full-track laser slide gate (all 3 lanes high gate) with low guiding orbs
      for (const l of lanes) this._spawnHighGate(l, z);
      safeOrbLane = pickRandom(lanes);
      this._spawnOrbLine(safeOrbLane, z + 4.5, 4, 3.0, 0.52);
    } else {
      // Mixed tactical wave: 1 monolith + 1 low barrier + 1 high gate (every lane has a distinct move!)
      this._spawnFullMonolith(shuffled[0], z);
      this._spawnLowBarrier(shuffled[1], z);
      this._spawnHighGate(shuffled[2], z);
      if (Math.random() > 0.5) {
        this._spawnOrbJumpArc(shuffled[1], z);
        safeOrbLane = shuffled[1];
      } else {
        this._spawnOrbLine(shuffled[2], z + 4.5, 4, 3.0, 0.52);
        safeOrbLane = shuffled[2];
      }
    }

    // Spawn a Magnet or Shield power-up every 5 waves in a clear spot ahead of the wave
    if (this.waveCounter >= 3 && this.waveCounter % 5 === 0) {
      const puType = Math.random() > 0.48 ? 'magnet' : 'shield';
      const puLane = safeOrbLane;
      this._spawnPowerUp(puType, puLane, z - 11);
    }

    // Scale spacing with speed so reaction windows stay fair and exhilarating
    const spacing = Math.max(24, speed * 0.72) + Math.random() * 7;
    this.nextWaveZ = z - spacing;
  }

  update(dt, speed, elapsed, player, callbacks) {
    const moveZ = speed * dt;

    // Advance spawn cursor & populate upcoming waves
    this.nextWaveZ += moveZ;
    while (this.nextWaveZ > SPAWN_HORIZON_Z) {
      this._spawnWave(this.nextWaveZ, speed);
    }

    const hitbox = player.getHitbox();
    const playerX = player.currentX;
    const playerY = player.jumpY + (player.isSliding ? 0.35 : 0.78);
    const magnetActive = player.magnetTimer > 0;

    // 1. Update Obstacles & Check Collisions
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z += moveZ;
      obs.mesh.position.z = obs.z;

      if (obs.z > DESPAWN_Z) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (!obs.hit) {
        const overlapX = hitbox.maxX > obs.x - obs.halfX && hitbox.minX < obs.x + obs.halfX;
        const overlapY = hitbox.maxY > obs.minY && hitbox.minY < obs.maxY;
        const overlapZ = hitbox.maxZ > obs.z - obs.halfZ && hitbox.minZ < obs.z + obs.halfZ;

        if (overlapX && overlapY && overlapZ) {
          obs.hit = true;
          callbacks.onObstacleHit(obs);
        }
      }
    }

    // 2. Update Energy Orbs (Spin + Magnet Pull + Collection)
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      const pos = orb.mesh.position;
      pos.z += moveZ;

      if (pos.z > DESPAWN_Z || orb.collected) {
        this.scene.remove(orb.mesh);
        this.orbs.splice(i, 1);
        continue;
      }

      // Spin & gentle vertical float
      orb.core.rotation.y += dt * 3.4;
      orb.ring.rotation.z += dt * 2.8;
      pos.y = orb.baseY + Math.sin(elapsed * 4 + orb.phase) * 0.12;

      // Magnet attraction
      const dx = playerX - pos.x;
      const dy = playerY - pos.y;
      const dz = 0 - pos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (magnetActive && distSq < 225) {
        const pull = 1 - Math.exp(-13 * dt);
        pos.x += dx * pull;
        orb.baseY += dy * pull;
        pos.y = orb.baseY;
        pos.z += dz * pull * 0.85;
      }

      // Pickup threshold
      const collectRadius = magnetActive ? 2.1 : 1.55;
      if (distSq < collectRadius * collectRadius) {
        orb.collected = true;
        callbacks.onOrbCollect(pos.clone());
        this.scene.remove(orb.mesh);
        this.orbs.splice(i, 1);
      }
    }

    // 3. Update Power-Ups (Shield & Magnet)
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      const pos = pu.mesh.position;
      pos.z += moveZ;

      if (pos.z > DESPAWN_Z || pu.collected) {
        this.scene.remove(pu.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      pu.core.rotation.y += dt * 2.6;
      pu.ringOuter.rotation.y -= dt * 3.2;
      pu.ringOuter.rotation.x += dt * 1.6;
      pu.ringInner.rotation.z += dt * 4.0;
      pos.y = pu.baseY + Math.sin(elapsed * 3.5 + pu.phase) * 0.18;

      const dx = playerX - pos.x;
      const dy = playerY - pos.y;
      const dz = 0 - pos.z;
      if (dx * dx + dy * dy + dz * dz < 3.4) {
        pu.collected = true;
        callbacks.onPowerUpCollect(pu.type, pos.clone());
        this.scene.remove(pu.mesh);
        this.powerups.splice(i, 1);
      }
    }
  }
}
