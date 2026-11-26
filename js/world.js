import * as THREE from 'three';

export const LANE_WIDTH = 3.2;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
export const TRACK_WIDTH = 10.8;
const SEGMENT_LENGTH = 50;
const SEGMENT_COUNT = 5;
const TRACK_WRAP_Z = 35;

/**
 * Generates a crisp procedural cyan/magenta neon glass grid texture for the skyway deck.
 */
function createSkywayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Deep translucent cyber-glass base
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 0);
  bgGrad.addColorStop(0, '#0a0720');
  bgGrad.addColorStop(0.5, '#0d0c2a');
  bgGrad.addColorStop(1, '#0a0720');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 1024);

  // Glowing cyan sub-grid
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.28)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Glowing horizontal magenta pulse lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 42, 157, 0.45)';
  ctx.shadowColor = '#ff2a9d';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  for (let y = 0; y <= 1024; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  ctx.restore();

  // Lane divider lines at x = -1.6 and +1.6 on a 10.8-wide track
  // Normalized positions: (5.4 - 1.6)/10.8 = 0.35185, (5.4 + 1.6)/10.8 = 0.64815
  const laneXs = [512 * 0.35185, 512 * 0.64815];
  ctx.save();
  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4;
  ctx.setLineDash([42, 22]);
  for (const lx of laneXs) {
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, 1024);
    ctx.stroke();
  }
  ctx.restore();

  // Outer glowing edge stripes
  ctx.save();
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 16;
  ctx.fillRect(0, 0, 10, 1024);
  ctx.fillRect(502, 0, 10, 1024);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates procedural skyscraper facade texture with glowing cyberpunk window strips.
 */
function createBuildingTexture(accentHex, secondaryHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#070414';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle vertical structural ribs
  ctx.fillStyle = '#0f0a24';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 6, 512);
  }

  // Glowing window rows
  const cols = 8;
  const rows = 28;
  const padX = 10;
  const padY = 8;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (512 - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    const bandLit = Math.random() > 0.35;
    for (let c = 0; c < cols; c++) {
      if (!bandLit && Math.random() > 0.15) continue;
      if (Math.random() > 0.52) continue;
      const isSecondary = Math.random() > 0.72;
      ctx.fillStyle = isSecondary ? secondaryHex : accentHex;
      ctx.globalAlpha = 0.3 + Math.random() * 0.65;
      ctx.fillRect(
        padX + c * cellW + 4,
        padY + r * cellH + 4,
        cellW - 8,
        cellH - 8
      );
    }
  }
  ctx.globalAlpha = 1;

  // Bright vertical neon trim edge
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.65;
  ctx.fillRect(0, 0, 4, 512);
  ctx.fillRect(252, 0, 4, 512);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a procedural retro synthwave sun & horizon glow texture.
 */
function createSynthwaveSunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Outer atmospheric halo
  const halo = ctx.createRadialGradient(256, 256, 70, 256, 256, 250);
  halo.addColorStop(0, 'rgba(255, 70, 175, 0.55)');
  halo.addColorStop(0.5, 'rgba(130, 30, 190, 0.22)');
  halo.addColorStop(1, 'rgba(10, 4, 28, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 512, 512);

  // Sun disc with horizontal retro scanline cutouts
  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 256, 136, 0, Math.PI * 2);
  ctx.clip();

  const sunGrad = ctx.createLinearGradient(256, 120, 256, 392);
  sunGrad.addColorStop(0, '#ffe066');
  sunGrad.addColorStop(0.42, '#ff6b9d');
  sunGrad.addColorStop(0.75, '#ff1e8e');
  sunGrad.addColorStop(1, '#7b2cbf');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(110, 110, 292, 292);

  // Horizontal scanline slices on the lower half
  ctx.globalCompositeOperation = 'destination-out';
  const slices = [
    [258, 4],
    [276, 6],
    [296, 8],
    [318, 10],
    [342, 13],
    [368, 16],
  ];
  for (const [y, h] of slices) {
    ctx.fillRect(110, y, 292, h);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a soft radial glow texture for additive sprites & particle halos.
 */
export function createGlowTexture(innerColor = '#ffffff', outerColor = '#00f5ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.32, outerColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class CyberpunkWorld {
  constructor(scene) {
    this.scene = scene;
    this.trackSegments = [];
    this.buildings = [];
    this.speedParticles = null;

    this._setupAtmosphere();
    this._setupLights();
    this._setupHorizon();
    this._setupTrack();
    this._setupCitySkyline();
    this._setupSpeedParticles();
  }

  _setupAtmosphere() {
    this.scene.background = new THREE.Color(0x090418);
    this.scene.fog = new THREE.FogExp2(0x0d0622, 0.0095);
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0x6c4bff, 0x090418, 1.15);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0x88f7ff, 1.2);
    dirLight.position.set(12, 26, 16);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xff2a9d, 0.9);
    rimLight.position.set(-14, 14, -28);
    this.scene.add(rimLight);
  }

  _setupHorizon() {
    // Distant synthwave sun
    const sunTex = createSynthwaveSunTexture();
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      fog: false,
      depthWrite: false,
    });
    const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), sunMat);
    sunMesh.position.set(0, 26, -195);
    this.scene.add(sunMesh);
    this.sunMesh = sunMesh;

    // Horizon neon haze band
    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x3b0d5e,
      transparent: true,
      opacity: 0.45,
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(360, 42), hazeMat);
    haze.position.set(0, 4, -200);
    this.scene.add(haze);

    // Starfield above the megacity
    const starCount = 340;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x00f5ff),
      new THREE.Color(0xff5ec4),
      new THREE.Color(0xb388ff),
    ];

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 320;
      positions[i * 3 + 1] = 16 + Math.random() * 110;
      positions[i * 3 + 2] = -70 - Math.random() * 150;
      const col = palette[i % palette.length];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      fog: false,
    });
    this.scene.add(new THREE.Points(starGeo, starMat));

    // Deep city-floor grid glow far below the elevated skyway
    const belowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 320),
      new THREE.MeshBasicMaterial({
        color: 0x05020f,
      })
    );
    belowFloor.rotation.x = -Math.PI / 2;
    belowFloor.position.set(0, -34, -85);
    this.scene.add(belowFloor);
  }

  _setupTrack() {
    const deckTex = createSkywayTexture();

    const deckGeo = new THREE.PlaneGeometry(TRACK_WIDTH, SEGMENT_LENGTH);
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckTex,
      emissive: new THREE.Color(0x0f1f3a),
      emissiveMap: deckTex,
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.55,
      transparent: true,
      opacity: 0.92,
    });

    const railGeo = new THREE.BoxGeometry(0.24, 0.34, SEGMENT_LENGTH);
    const railBaseMat = new THREE.MeshStandardMaterial({
      color: 0x100c24,
      metalness: 0.8,
      roughness: 0.25,
    });

    const neonTubeGeo = new THREE.BoxGeometry(0.11, 0.11, SEGMENT_LENGTH);
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const magentaNeonMat = new THREE.MeshBasicMaterial({ color: 0xff2a9d });

    // Under-deck structural beam + glow ribs for elevated skyway depth
    const beamGeo = new THREE.BoxGeometry(TRACK_WIDTH + 0.5, 0.28, 0.8);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x0b0820,
      metalness: 0.75,
      roughness: 0.35,
    });

    // Overhead cyber-pylon arches spaced along each segment for velocity cues
    const pylonGeo = new THREE.BoxGeometry(0.28, 5.4, 0.34);
    const archTopGeo = new THREE.BoxGeometry(TRACK_WIDTH + 2.2, 0.22, 0.3);
    const archGlowGeo = new THREE.BoxGeometry(TRACK_WIDTH + 1.4, 0.08, 0.12);

    const railX = TRACK_WIDTH / 2 + 0.14;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const group = new THREE.Group();

      // Main glass-and-neon skyway deck
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.rotation.x = -Math.PI / 2;
      group.add(deck);

      // Left & right guard rails with cyan upper tube + magenta lower accent
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(railGeo, railBaseMat);
        rail.position.set(side * railX, 0.17, 0);
        group.add(rail);

        const topNeon = new THREE.Mesh(neonTubeGeo, cyanNeonMat);
        topNeon.position.set(side * railX, 0.4, 0);
        group.add(topNeon);

        const lowerNeon = new THREE.Mesh(neonTubeGeo, magentaNeonMat);
        lowerNeon.position.set(side * (railX + 0.08), 0.1, 0);
        group.add(lowerNeon);
      }

      // Cross-beams beneath the elevated skyway
      for (let z = -SEGMENT_LENGTH / 2 + 6; z < SEGMENT_LENGTH / 2; z += 12.5) {
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, -0.22, z);
        group.add(beam);
      }

      // Sleek cyber-gantry light frame (2 per 50m segment)
      for (const archZ of [-12.5, 12.5]) {
        const leftPylon = new THREE.Mesh(pylonGeo, railBaseMat);
        leftPylon.position.set(-(railX + 0.65), 2.5, archZ);
        leftPylon.rotation.z = -0.14;
        group.add(leftPylon);

        const rightPylon = new THREE.Mesh(pylonGeo, railBaseMat);
        rightPylon.position.set(railX + 0.65, 2.5, archZ);
        rightPylon.rotation.z = 0.14;
        group.add(rightPylon);

        const topBar = new THREE.Mesh(archTopGeo, railBaseMat);
        topBar.position.set(0, 5.15, archZ);
        group.add(topBar);

        const topGlow = new THREE.Mesh(
          archGlowGeo,
          archZ < 0 ? cyanNeonMat : magentaNeonMat
        );
        topGlow.position.set(0, 5.02, archZ);
        group.add(topGlow);
      }

      group.position.z = TRACK_WRAP_Z - SEGMENT_LENGTH / 2 - i * SEGMENT_LENGTH;
      this.scene.add(group);
      this.trackSegments.push(group);
    }
  }

  _setupCitySkyline() {
    const texCyan = createBuildingTexture('#00f5ff', '#7b2cbf');
    const texMagenta = createBuildingTexture('#ff2a9d', '#00f5ff');
    const texViolet = createBuildingTexture('#9b5cff', '#ffd166');

    const buildingMats = [texCyan, texMagenta, texViolet].map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          color: 0x16122c,
          map: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex,
          emissiveIntensity: 0.72,
          roughness: 0.45,
          metalness: 0.4,
        })
    );

    const roofCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const roofMagMat = new THREE.MeshBasicMaterial({ color: 0xff2a9d });

    const totalDepth = SEGMENT_LENGTH * SEGMENT_COUNT;
    const countPerSide = 26;

    for (const side of [-1, 1]) {
      for (let i = 0; i < countPerSide; i++) {
        const width = 5.5 + Math.random() * 9.5;
        const depth = 6 + Math.random() * 10;
        const height = 28 + Math.random() * 58;
        const laneOffset = 13.5 + Math.random() * 38;

        const bGroup = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          buildingMats[(i + (side > 0 ? 1 : 0)) % buildingMats.length]
        );
        bGroup.add(body);

        // Glowing rooftop neon crown
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.25, 0.35, depth + 0.25),
          Math.random() > 0.5 ? roofCyanMat : roofMagMat
        );
        cap.position.y = height / 2 + 0.18;
        bGroup.add(cap);

        // Position skyscrapers starting deep below the skyway so they tower from the abyss
        bGroup.position.set(
          side * (laneOffset + width * 0.5),
          -34 + height / 2,
          TRACK_WRAP_Z - Math.random() * totalDepth
        );

        this.scene.add(bGroup);
        this.buildings.push(bGroup);
      }
    }

    this.cityDepth = totalDepth;
  }

  _setupSpeedParticles() {
    const count = 160;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x00f5ff);
    const c2 = new THREE.Color(0xff2a9d);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = 0.5 + Math.random() * 11;
      positions[i * 3 + 2] = 15 - Math.random() * 155;

      const c = i % 2 === 0 ? c1 : c2;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.speedParticles = new THREE.Points(geo, mat);
    this.scene.add(this.speedParticles);
  }

  update(dt, speed, elapsed) {
    const moveZ = speed * dt;
    const totalTrack = SEGMENT_LENGTH * SEGMENT_COUNT;

    // Recycle skyway segments seamlessly
    for (const seg of this.trackSegments) {
      seg.position.z += moveZ;
      if (seg.position.z > TRACK_WRAP_Z + SEGMENT_LENGTH / 2) {
        seg.position.z -= totalTrack;
      }
    }

    // Parallax-speed skyscrapers
    const cityMove = moveZ * 0.72;
    for (const b of this.buildings) {
      b.position.z += cityMove;
      if (b.position.z > TRACK_WRAP_Z + 12) {
        b.position.z -= this.cityDepth;
      }
    }

    // Rush neon air particles past camera
    const posAttr = this.speedParticles.geometry.attributes.position;
    const arr = posAttr.array;
    const particleMove = moveZ * 1.45;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 2] += particleMove;
      if (arr[i + 2] > 18) {
        arr[i] = (Math.random() - 0.5) * 34;
        arr[i + 1] = 0.5 + Math.random() * 11;
        arr[i + 2] = -140 - Math.random() * 20;
      }
    }
    posAttr.needsUpdate = true;

    // Subtle synthwave sun pulse
    if (this.sunMesh) {
      const pulse = 1 + Math.sin(elapsed * 1.4) * 0.015;
      this.sunMesh.scale.set(pulse, pulse, 1);
    }
  }
}
