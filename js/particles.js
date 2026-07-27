/**
 * particles.js — Sistema de partículas reutilizable (object pool)
 * Efectos: hojas, astillas de madera, ondas de agua, polvo, partículas de celebración
 * CASTORES — 80 años de impacto
 */

'use strict';

// ─── Pool de partículas ────────────────────────────────────────
const PARTICLE_POOL = [];
const MAX_PARTICLES = 250;

/**
 * Clase Particle — representa una partícula individual.
 */
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.life = 0; this.maxLife = 1;
    this.size = 3;
    this.color = '#4CAF50';
    this.type = 'leaf';   // leaf|chip|water|dust|star|ripple
    this.rotation = 0;
    this.rotSpeed = 0;
    this.gravity  = 0;
    this.alpha    = 1;
    this.scale    = 1;
  }

  /** Actualiza la partícula cada frame. Devuelve false si debe morir. */
  update(dt) {
    if (!this.active) return false;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }

    const progress = 1 - (this.life / this.maxLife);  // 0..1
    this.alpha     = 1 - progress * progress;          // fade cuadrático
    this.x        += this.vx * dt;
    this.y        += this.vy * dt;
    this.vy       += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;

    // Fricción suave
    this.vx *= 0.98;
    this.vy *= (this.type === 'ripple') ? 0.92 : 0.99;

    // Escala para ripples (se expanden)
    if (this.type === 'ripple') {
      this.scale = 0.3 + progress * 2.5;
    }

    return true;
  }

  /** Dibuja la partícula en el canvas. */
  draw(ctx) {
    if (!this.active || this.alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    switch (this.type) {
      case 'leaf':
        this._drawLeaf(ctx);
        break;
      case 'chip':
        this._drawChip(ctx);
        break;
      case 'water':
        this._drawWater(ctx);
        break;
      case 'dust':
        this._drawDust(ctx);
        break;
      case 'star':
        this._drawStar(ctx);
        break;
      case 'ripple':
        this._drawRipple(ctx);
        break;
    }

    ctx.restore();
  }

  _drawLeaf(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI*2);
    ctx.fill();
    // Nervadura central
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0); ctx.lineTo(this.size, 0);
    ctx.stroke();
  }

  _drawChip(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(-this.size/2, -this.size/3, this.size, this.size*0.6);
    ctx.fill();
  }

  _drawWater(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI*2);
    ctx.fill();
  }

  _drawDust(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.7, 0, Math.PI*2);
    ctx.fill();
  }

  _drawStar(ctx) {
    ctx.fillStyle = this.color;
    const points = 4;
    const outer  = this.size;
    const inner  = this.size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
      else         ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill();
  }

  _drawRipple(ctx) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI*2);
    ctx.stroke();
  }
}

// ─── Inicializar pool ──────────────────────────────────────────
for (let i = 0; i < MAX_PARTICLES; i++) {
  PARTICLE_POOL.push(new Particle());
}

/** Obtiene una partícula inactiva del pool. */
function getParticle() {
  for (let i = 0; i < PARTICLE_POOL.length; i++) {
    if (!PARTICLE_POOL[i].active) {
      PARTICLE_POOL[i].reset();
      PARTICLE_POOL[i].active = true;
      return PARTICLE_POOL[i];
    }
  }
  return null; // Pool lleno
}

// ─── Funciones de emisión ──────────────────────────────────────

/**
 * Partículas de astillas al cortar un árbol.
 * @param {number} x @param {number} y
 */
function spawnChipParticles(x, y) {
  const colors = ['#D7CCC8','#A1887F','#BCAAA4','#EFEBE9','#8D6E63'];
  const count  = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    if (!p) return;
    const angle  = (Math.random() - 0.5) * Math.PI;
    const speed  = 30 + Math.random() * 50;
    p.type     = 'chip';
    p.x        = x + (Math.random()-0.5)*8;
    p.y        = y;
    p.vx       = Math.cos(angle) * speed;
    p.vy       = Math.sin(angle) * speed - 20;
    p.gravity  = 80;
    p.life     = 0.5 + Math.random() * 0.4;
    p.maxLife  = p.life;
    p.size     = 2 + Math.random() * 3;
    p.color    = colors[Math.floor(Math.random() * colors.length)];
    p.rotation = Math.random() * Math.PI * 2;
    p.rotSpeed = (Math.random()-0.5) * 6;
  }
}

/**
 * Partículas de hojas y tronco al caer un árbol.
 * @param {number} x @param {number} y @param {number} radius - radio del árbol
 */
function spawnTreeFallParticles(x, y, radius) {
  // Hojas
  const leafColors = ['#4CAF50','#66BB6A','#2E7D32','#81C784','#388E3C','#C8E6C9'];
  for (let i = 0; i < 16; i++) {
    const p = getParticle();
    if (!p) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 80;
    p.type    = 'leaf';
    p.x       = x + Math.cos(angle) * radius * 0.5;
    p.y       = y - radius + Math.sin(angle) * radius * 0.5;
    p.vx      = Math.cos(angle) * speed;
    p.vy      = Math.sin(angle) * speed - 30;
    p.gravity = 60;
    p.life    = 1.2 + Math.random() * 0.8;
    p.maxLife = p.life;
    p.size    = 3 + Math.random() * 4;
    p.color   = leafColors[Math.floor(Math.random() * leafColors.length)];
    p.rotation= Math.random() * Math.PI * 2;
    p.rotSpeed= (Math.random()-0.5) * 5;
  }

  // Astillas grandes
  for (let i = 0; i < 8; i++) {
    const p = getParticle();
    if (!p) break;
    const angle = (Math.random() - 0.5) * Math.PI * 1.2;
    const speed = 40 + Math.random() * 60;
    p.type    = 'chip';
    p.x       = x + (Math.random()-0.5)*10;
    p.y       = y - 5;
    p.vx      = Math.cos(angle) * speed;
    p.vy      = Math.sin(angle) * speed - 40;
    p.gravity = 100;
    p.life    = 0.8 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.size    = 4 + Math.random() * 5;
    p.color   = '#8D6E63';
    p.rotation= Math.random() * Math.PI * 2;
    p.rotSpeed= (Math.random()-0.5) * 8;
  }

  // Polvo
  for (let i = 0; i < 6; i++) {
    const p = getParticle();
    if (!p) break;
    p.type    = 'dust';
    p.x       = x + (Math.random()-0.5)*20;
    p.y       = y + 5;
    p.vx      = (Math.random()-0.5) * 20;
    p.vy      = -20 - Math.random() * 15;
    p.gravity = 5;
    p.life    = 1.5 + Math.random();
    p.maxLife = p.life;
    p.size    = 6 + Math.random() * 8;
    p.color   = 'rgba(180,150,100,0.5)';
  }
}

/**
 * Partículas de agua al construir un dique.
 * @param {number} x @param {number} y
 */
function spawnWaterParticles(x, y) {
  const colors = ['#42A5F5','#64B5F6','#90CAF9','#BBDEFB'];
  for (let i = 0; i < 6; i++) {
    const p = getParticle();
    if (!p) break;
    const angle = (Math.random() - 0.5) * Math.PI * 1.5;
    const speed = 20 + Math.random() * 40;
    p.type    = 'water';
    p.x       = x + (Math.random()-0.5)*20;
    p.y       = y + (Math.random()-0.5)*8;
    p.vx      = Math.cos(angle) * speed;
    p.vy      = Math.sin(angle) * speed - 30;
    p.gravity = 80;
    p.life    = 0.5 + Math.random() * 0.4;
    p.maxLife = p.life;
    p.size    = 2 + Math.random() * 3;
    p.color   = colors[Math.floor(Math.random() * colors.length)];
  }

  // Onda circular
  const ripple = getParticle();
  if (ripple) {
    ripple.type    = 'ripple';
    ripple.x       = x;
    ripple.y       = y;
    ripple.vx      = 0;
    ripple.vy      = 0;
    ripple.gravity = 0;
    ripple.life    = 1.2;
    ripple.maxLife = 1.2;
    ripple.size    = 12;
    ripple.color   = 'rgba(33,150,243,0.6)';
    ripple.scale   = 0.3;
  }
}

/**
 * Partículas de polvo al caminar sobre tierra.
 * @param {number} x @param {number} y
 */
function spawnDustParticles(x, y) {
  if (Math.random() > 0.15) return;  // Solo ocasionalmente
  const p = getParticle();
  if (!p) return;
  p.type    = 'dust';
  p.x       = x + (Math.random()-0.5)*8;
  p.y       = y + 8;
  p.vx      = (Math.random()-0.5) * 10;
  p.vy      = -5 - Math.random() * 8;
  p.gravity = 2;
  p.life    = 0.8 + Math.random() * 0.4;
  p.maxLife = p.life;
  p.size    = 3 + Math.random() * 4;
  p.color   = 'rgba(160,120,60,0.35)';
}

/**
 * Partículas de celebración del castor.
 * @param {number} x @param {number} y
 */
function spawnCelebrationParticles(x, y) {
  const colors = ['#FFD700','#FF6B6B','#4FC3F7','#69F0AE','#CE93D8','#FFB74D'];
  for (let i = 0; i < 10; i++) {
    const p = getParticle();
    if (!p) break;
    const angle = (i / 10) * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    p.type    = 'star';
    p.x       = x;
    p.y       = y - 12;
    p.vx      = Math.cos(angle) * speed;
    p.vy      = Math.sin(angle) * speed - 60;
    p.gravity = 100;
    p.life    = 0.8 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.size    = 4 + Math.random() * 3;
    p.color   = colors[i % colors.length];
    p.rotation= Math.random() * Math.PI * 2;
    p.rotSpeed= (Math.random()-0.5) * 8;
  }
}

/**
 * Actualiza y dibuja todas las partículas activas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt
 */
function updateAndDrawParticles(ctx, dt) {
  PARTICLE_POOL.forEach(p => {
    if (p.active) {
      p.update(dt);
      p.draw(ctx);
    }
  });
}
