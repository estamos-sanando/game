/**
 * entities.js — Clases Beaver, Tree, Dam, WaterZone
 * Cada entidad se actualiza y dibuja usando Canvas 2D
 * CASTORES — 80 años de impacto
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
//  ÁRBOL
// ═══════════════════════════════════════════════════════════════
class Tree {
  /**
   * @param {number} x - Posición X
   * @param {number} y - Posición Y
   * @param {number} radius - Radio de la copa (variedad visual)
   */
  constructor(x, y, radius = 20) {
    this.x         = x;
    this.y         = y;
    this.radius    = radius;    // Radio de copa (14-26)
    this.state     = 'healthy'; // healthy|being_cut|stump|dead|flooded
    this.cutProgress = 0;       // [0..1] progreso de tala
    this.age       = Math.random() * Math.PI * 2; // fase inicial aleatoria
    this.trunkH    = 12 + radius * 0.4;
    this.trunkW    = 4 + radius * 0.15;
    this.variant   = Math.floor(Math.random() * 3); // variante visual
    this.chopAnim  = 0;         // sacudida al ser cortado
    this.fallAngle = 0;         // ángulo de caída
    this.fallingDir= Math.random() < 0.5 ? 1 : -1;
    this.beingCutBy = null;     // referencia al castor que lo está cortando
    this.reserved  = false;     // evita que 2 castores vayan al mismo árbol
  }

  /** Actualiza el estado del árbol cada frame. */
  update(dt) {
    this.age += dt;

    if (this.state === 'being_cut') {
      // Animación de sacudida mientras lo cortan
      this.chopAnim = Math.sin(this.age * 15) * this.cutProgress * 0.06;
    }

    // Si está siendo cortado, se procesa en ai.js (el castor gestiona el progreso)

    // Animar caída del árbol
    if (this.state === 'being_cut' && this.cutProgress >= 1) {
      this.state = 'stump';
      this.fallAngle = 0;
    }
  }

  /**
   * Dibuja el árbol según su estado.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const t = this.age;
    ctx.save();
    ctx.translate(this.x, this.y);

    switch (this.state) {
      case 'healthy':
        this._drawHealthy(ctx, t);
        break;
      case 'being_cut':
        this._drawBeingCut(ctx, t);
        break;
      case 'stump':
        this._drawStump(ctx);
        break;
      case 'dead':
        this._drawDead(ctx, t);
        break;
      case 'flooded':
        this._drawFlooded(ctx, t);
        break;
    }

    ctx.restore();
  }

  _drawHealthy(ctx, t) {
    const r = this.radius;
    const sway = Math.sin(t * 0.7 + this.x * 0.01) * 1.5 + this.chopAnim * r;

    // Sombra suave en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(2, this.trunkH/2 + 2, r*0.7, r*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Tronco
    ctx.save();
    ctx.rotate(sway * 0.015);
    ctx.fillStyle = PALETTE.treeTrunk;
    ctx.beginPath();
    ctx.rect(-this.trunkW/2, -this.trunkH*0.1, this.trunkW, this.trunkH);
    ctx.fill();

    // Copa (3 capas para sensación de volumen)
    const variants = [
      [PALETTE.treeCanopy, PALETTE.treeCanM, PALETTE.treeCanL, PALETTE.treeCanHL],
      ['#1B5E20',          '#2E7D32',        '#388E3C',        '#4CAF50'        ],
      ['#33691E',          '#558B2F',        '#689F38',        '#8BC34A'        ],
    ];
    const pal = variants[this.variant];

    // Capa base (oscura, sombra)
    ctx.fillStyle = pal[0];
    ctx.beginPath();
    ctx.arc(sway * 0.5, -this.trunkH + 2, r, 0, Math.PI*2);
    ctx.fill();

    // Capa media
    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.arc(sway * 0.6 - 2, -this.trunkH - 2, r * 0.85, 0, Math.PI*2);
    ctx.fill();

    // Capa superior (más brillante)
    ctx.fillStyle = pal[2];
    ctx.beginPath();
    ctx.arc(sway * 0.7, -this.trunkH - 5, r * 0.68, 0, Math.PI*2);
    ctx.fill();

    // Highlight (brillo de luz)
    ctx.fillStyle = pal[3];
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(sway * 0.8 - 3, -this.trunkH - 8, r * 0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  _drawBeingCut(ctx, t) {
    const r = this.radius;
    const shake = Math.sin(t * 20) * (1 - this.cutProgress) * 3;

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(2, this.trunkH/2 + 2, r*0.7, r*0.25, 0, 0, Math.PI*2);
    ctx.fill();

    // Tronco con muesca
    ctx.save();
    ctx.translate(shake, 0);
    ctx.fillStyle = PALETTE.treeTrunk;
    ctx.beginPath();
    ctx.rect(-this.trunkW/2, -this.trunkH*0.1, this.trunkW, this.trunkH * (1 - this.cutProgress * 0.7));
    ctx.fill();

    // Muesca de corte (madera expuesta)
    const cutH = this.trunkH * 0.5;
    ctx.fillStyle = '#EFEBE9';
    ctx.beginPath();
    ctx.moveTo(-this.trunkW/2, cutH);
    ctx.lineTo(0, cutH - this.trunkW * this.cutProgress);
    ctx.lineTo(this.trunkW/2, cutH);
    ctx.fill();

    // Copa inclinada
    const tiltAngle = this.cutProgress * this.fallingDir * 0.3;
    ctx.rotate(tiltAngle);
    ctx.fillStyle = PALETTE.treeCanopy;
    ctx.beginPath();
    ctx.arc(0, -this.trunkH, r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = PALETTE.treeCanM;
    ctx.beginPath();
    ctx.arc(-2, -this.trunkH - 3, r * 0.75, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();

    // Partículas de viruta (pequeñas manchas de madera)
    ctx.fillStyle = '#D7CCC8';
    for (let i = 0; i < 3; i++) {
      const px = Math.sin(t * 5 + i * 2) * 12;
      const py = Math.cos(t * 4 + i) * 5 + this.trunkH * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
  }

  _drawStump(ctx) {
    // Tronco cortado
    ctx.fillStyle = PALETTE.treeStump;
    ctx.beginPath();
    ctx.ellipse(0, 2, this.trunkW + 2, this.trunkW * 0.7, 0, 0, Math.PI*2);
    ctx.fill();

    // Anillos del árbol
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 0.5;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(0, 2, (this.trunkW + 2) * ring / 4, (this.trunkW * 0.7) * ring / 4, 0, 0, Math.PI*2);
      ctx.stroke();
    }

    // Sombra del tronco caído (tronco en el suelo)
    ctx.fillStyle = 'rgba(93,64,55,0.4)';
    ctx.save();
    ctx.rotate(this.fallingDir * 0.5);
    ctx.beginPath();
    ctx.rect(-this.radius * 0.7, 3, this.radius * 2.5, this.trunkW * 0.8);
    ctx.fill();
    ctx.restore();
  }

  _drawDead(ctx, t) {
    const sway = Math.sin(t * 0.4 + this.x * 0.01) * 0.5;

    // Tronco muerto
    ctx.save();
    ctx.rotate(sway * 0.01);
    ctx.fillStyle = '#546E7A';
    ctx.beginPath();
    ctx.rect(-this.trunkW/2 * 0.7, -this.trunkH * 0.8, this.trunkW * 0.7, this.trunkH * 0.9);
    ctx.fill();

    // Ramas desnudas
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const branches = [
      {dx:-14, dy:-this.trunkH*0.75, len:12, angle:-0.8},
      {dx:12,  dy:-this.trunkH*0.65, len:10, angle:0.7},
      {dx:-8,  dy:-this.trunkH*0.5,  len:8,  angle:-0.5},
      {dx:6,   dy:-this.trunkH*0.45, len:7,  angle:0.4},
    ];
    branches.forEach(b => {
      ctx.beginPath();
      ctx.moveTo(b.dx, b.dy);
      ctx.lineTo(b.dx + Math.cos(b.angle) * b.len, b.dy - Math.sin(Math.abs(b.angle)) * b.len);
      ctx.stroke();
    });

    ctx.restore();
  }

  _drawFlooded(ctx, t) {
    // Agua alrededor de la base
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.ellipse(0, 6, this.radius * 0.8, this.radius * 0.35, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Tronco muerto sumergido
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.rect(-this.trunkW/2 * 0.5, -this.trunkH * 0.5, this.trunkW * 0.5, this.trunkH * 0.6);
    ctx.fill();

    // Ramitas muertas emergiendo
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -this.trunkH * 0.3);
    ctx.lineTo(-14, -this.trunkH * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -this.trunkH * 0.25);
    ctx.lineTo(12, -this.trunkH * 0.45);
    ctx.stroke();
  }

  /** Verifica si un punto está dentro del radio del árbol. */
  contains(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx*dx + dy*dy) < this.radius + 10;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DIQUE
// ═══════════════════════════════════════════════════════════════
class Dam {
  /**
   * @param {number} x - Centro X del dique
   * @param {number} y - Centro Y del dique
   */
  constructor(x, y) {
    this.x     = x;
    this.y     = y;
    this.built = false;
    this.buildProgress = 0;  // [0..1]
    this.size  = 1 + Math.random() * 0.5;  // variación visual
    this.age   = 0;
  }

  update(dt) {
    this.age += dt;
    if (this.buildProgress >= 1 && !this.built) {
      this.built = true;
      // Aumentar nivel del agua
      GameState.waterLevel += 0.18;
      GameState.totalDams++;
      GameState.firstDamBuilt = true;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  CASTOR
// ═══════════════════════════════════════════════════════════════
class Beaver {
  /**
   * @param {number} x - Posición inicial X
   * @param {number} y - Posición inicial Y
   * @param {number} id - Identificador único
   */
  constructor(x, y, id) {
    this.id    = id;
    this.x     = x;
    this.y     = y;
    this.vx    = 0;
    this.vy    = 0;

    // Estado de la IA
    this.state       = 'idle';    // idle|walking|cutting|carrying|building|wandering|celebrating
    this.targetTree  = null;
    this.targetDam   = null;
    this.cutTimer    = 0;
    this.buildTimer  = 0;
    this.carryLog    = false;
    this.damPosition = null;      // punto de construcción en el río

    // Velocidad base (varía levemente entre castores)
    this.speed     = WALK_SPEED + (Math.random() - 0.5) * 16;
    this.carrySpd  = CARRY_SPEED + (Math.random() - 0.5) * 10;

    // Animación
    this.animTime  = Math.random() * Math.PI * 2;
    this.facing    = 1;           // 1=derecha, -1=izquierda
    this.legPhase  = Math.random() * Math.PI * 2;
    this.tailWag   = Math.random() * Math.PI * 2;
    this.celebTimer= 0;

    // Escala de velocidad por deterioro (se ralentiza al final)
    this.speedMultiplier = 1.0;

    // El castor recién nacido hace una pequeña animación de aparición
    this.spawnTimer = 0.5;
    this.spawnScale = 0.1;
  }

  /**
   * Dibuja el castor con todas sus animaciones.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Animación de spawn (aparición)
    if (this.spawnTimer > 0) {
      const s = 1 - (this.spawnTimer / 0.5);
      ctx.scale(s + 0.1, s + 0.1);
    }

    // Flip horizontal según dirección
    ctx.scale(this.facing, 1);

    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 5, 0, 0, Math.PI*2);
    ctx.fill();

    switch (this.state) {
      case 'idle':        this._drawIdle(ctx); break;
      case 'walking':     this._drawWalking(ctx); break;
      case 'cutting':     this._drawCutting(ctx); break;
      case 'carrying':    this._drawCarrying(ctx); break;
      case 'building':    this._drawBuilding(ctx); break;
      case 'wandering':   this._drawWalking(ctx); break;
      case 'celebrating': this._drawCelebrating(ctx); break;
      default:            this._drawIdle(ctx);
    }

    ctx.restore();
  }

  _drawIdle(ctx) {
    const t = this.animTime;
    const breathe = Math.sin(t * 1.5) * 0.5;

    this._drawBody(ctx, 0, breathe);
    this._drawTail(ctx, Math.sin(t * 2) * 0.1);
    this._drawHead(ctx, 0, breathe - 1);
    this._drawLegs(ctx, 0);
  }

  _drawWalking(ctx) {
    const t = this.animTime;
    const walkBob = Math.sin(t * 8) * 1.5;
    const legAmp  = Math.sin(t * 8) * 8;

    this._drawBody(ctx, 0, walkBob);
    this._drawTail(ctx, Math.sin(t * 8) * 0.12);
    this._drawHead(ctx, Math.sin(t * 8) * 0.05, walkBob - 1);
    this._drawLegs(ctx, legAmp);
  }

  _drawCutting(ctx) {
    const t = this.animTime;
    const chop = Math.sin(t * 10) * 4;

    this._drawBody(ctx, 2, 0);
    this._drawTail(ctx, -0.05);
    this._drawHead(ctx, 0.15, -1);

    // Brazos en posición de corte
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(8, -2 + chop, 6, 4, 0.4 + Math.sin(t*10)*0.3, 0, Math.PI*2);
    ctx.fill();

    // Hacha / palo
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, -2 + chop);
    ctx.lineTo(15, -8 + chop * 2);
    ctx.stroke();
    // Hoja del hacha
    ctx.fillStyle = '#90A4AE';
    ctx.beginPath();
    ctx.moveTo(15, -8 + chop * 2);
    ctx.lineTo(19, -10 + chop * 2);
    ctx.lineTo(16, -4 + chop * 2);
    ctx.closePath();
    ctx.fill();

    this._drawLegs(ctx, 0);
  }

  _drawCarrying(ctx) {
    const t = this.animTime;
    const walkBob = Math.sin(t * 7) * 1;

    this._drawBody(ctx, 0, walkBob);

    // Tronco que lleva encima
    ctx.fillStyle = '#8D6E63';
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-14, -12, 28, 6);
    ctx.fill();
    ctx.stroke();
    // Anillos del tronco
    ctx.strokeStyle = '#A1887F';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-14, -9, 3, 5, Math.PI/2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(14, -9, 3, 5, Math.PI/2, 0, Math.PI*2); ctx.stroke();

    this._drawTail(ctx, Math.sin(t * 7) * 0.08);
    this._drawHead(ctx, 0, walkBob - 2);
    this._drawLegs(ctx, Math.sin(t * 7) * 7);
  }

  _drawBuilding(ctx) {
    const t = this.animTime;
    const push = Math.sin(t * 6) * 3;

    this._drawBody(ctx, 3, push);
    this._drawTail(ctx, -0.15);
    this._drawHead(ctx, 0.2, push - 2);

    // Brazos empujando hacia adelante
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(10 + push, -1, 6, 3.5, 0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10 + push, 4, 6, 3.5, -0.2, 0, Math.PI*2);
    ctx.fill();

    this._drawLegs(ctx, 0);
  }

  _drawCelebrating(ctx) {
    const t = this.animTime;
    const jump = Math.abs(Math.sin(t * 6)) * -8;

    ctx.translate(0, jump);
    this._drawBody(ctx, 0, 0);
    this._drawTail(ctx, Math.sin(t * 8) * 0.25);

    // Brazos en V (victoria)
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(-6, -12, 4, 7, -0.5, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -12, 4, 7, 0.5, 0, Math.PI*2);
    ctx.fill();

    this._drawHead(ctx, 0, -2);
    this._drawLegs(ctx, Math.sin(t * 8) * 10);

    // Estrellas de celebración
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 4; i++) {
      const angle = t * 3 + i * Math.PI / 2;
      const r = 18;
      const sx = Math.cos(angle) * r;
      const sy = Math.sin(angle) * r - 8;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI*2);
      ctx.fill();
    }
  }

  /** Dibuja el cuerpo del castor. */
  _drawBody(ctx, tiltX, tiltY) {
    ctx.save();
    ctx.translate(tiltX, tiltY);

    // Cuerpo principal (elipse)
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(0, 2, 12, 9, 0, 0, Math.PI*2);
    ctx.fill();

    // Vientre (más claro)
    ctx.fillStyle = PALETTE.beaverBelly;
    ctx.beginPath();
    ctx.ellipse(1, 4, 7, 6, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  /** Dibuja la cola plana del castor. */
  _drawTail(ctx, angle) {
    ctx.save();
    ctx.translate(-10, 6);
    ctx.rotate(angle);

    // Cola plana oval
    ctx.fillStyle = PALETTE.beaverTail;
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(-6, 0, 10, 5, 0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // Textura escamada
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = -14; i <= -4; i += 4) {
      ctx.beginPath();
      ctx.arc(i, 0, 2, 0, Math.PI*2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** Dibuja la cabeza del castor. */
  _drawHead(ctx, tiltAngle, tiltY) {
    ctx.save();
    ctx.translate(6, -2 + tiltY);
    ctx.rotate(tiltAngle);

    // Cabeza grande (círculo)
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI*2);
    ctx.fill();

    // Mejilla (más claro)
    ctx.fillStyle = PALETTE.beaverBelly;
    ctx.beginPath();
    ctx.arc(2, 3, 7, 0, Math.PI*2);
    ctx.fill();

    // Ojo izquierdo
    ctx.fillStyle = PALETTE.beaverEye;
    ctx.beginPath();
    ctx.arc(-3, -2, 3.5, 0, Math.PI*2);
    ctx.fill();
    // Brillo del ojo
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-4, -3, 1.2, 0, Math.PI*2);
    ctx.fill();

    // Ojo derecho
    ctx.fillStyle = PALETTE.beaverEye;
    ctx.beginPath();
    ctx.arc(4, -2, 3.5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(3, -3, 1.2, 0, Math.PI*2);
    ctx.fill();

    // Nariz (en V)
    ctx.fillStyle = '#C62828';
    ctx.beginPath();
    ctx.arc(0, 4, 2.5, 0, Math.PI*2);
    ctx.fill();

    // Sonrisa / expresión
    ctx.strokeStyle = '#5D1A1A';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 5, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Dientes
    ctx.fillStyle = '#FFFDE7';
    ctx.beginPath();
    ctx.rect(-2.5, 5, 2, 3.5);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(0.5, 5, 2, 3.5);
    ctx.fill();

    // Orejas
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(-8, -7, 3.5, 4.5, -0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#D4956A';
    ctx.beginPath();
    ctx.ellipse(-8, -7, 2, 3, -0.3, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  /** Dibuja las patas animadas del castor. */
  _drawLegs(ctx, swing) {
    // Pata delantera izquierda
    ctx.fillStyle = PALETTE.beaverBody;
    ctx.beginPath();
    ctx.ellipse(-2, 8 + swing * 0.3, 4, 3, -0.3, 0, Math.PI*2);
    ctx.fill();

    // Pata delantera derecha
    ctx.beginPath();
    ctx.ellipse(8, 8 - swing * 0.3, 4, 3, 0.3, 0, Math.PI*2);
    ctx.fill();

    // Pata trasera izquierda
    ctx.fillStyle = '#6D4C41';
    ctx.beginPath();
    ctx.ellipse(-7, 10 - swing * 0.4, 4.5, 3.5, -0.4, 0, Math.PI*2);
    ctx.fill();

    // Pata trasera derecha
    ctx.beginPath();
    ctx.ellipse(5, 10 + swing * 0.4, 4.5, 3.5, 0.4, 0, Math.PI*2);
    ctx.fill();
  }

  /**
   * Actualiza el tiempo de animación del castor.
   * La IA actualiza el estado en ai.js.
   */
  update(dt) {
    this.animTime += dt;
    this.tailWag  += dt;

    // Animación de spawn
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      this.spawnScale = 1 - this.spawnTimer / 0.5;
    }

    // Si está celebrando, decrementar timer
    if (this.state === 'celebrating') {
      this.celebTimer -= dt;
      if (this.celebTimer <= 0) {
        this.state = 'idle';
      }
    }
  }

  /**
   * Mueve el castor hacia un punto objetivo.
   * @param {number} tx - X destino
   * @param {number} ty - Y destino
   * @param {number} spd - Velocidad
   * @param {number} dt - Delta time
   * @returns {boolean} true si llegó al destino
   */
  moveTo(tx, ty, spd, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const threshold = 8;

    if (dist < threshold) return true;

    const move = spd * this.speedMultiplier * dt;
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
    this.facing = dx > 0 ? 1 : -1;

    return false;
  }
}

// ─── Factory functions ──────────────────────────────────────────

/** Crea los árboles iniciales del mapa en posiciones naturales. */
function createInitialTrees() {
  GameState.trees = [];

  // Clusters de árboles en la zona izquierda del río
  const treeConfigs = [
    // Cluster superior izquierdo (denso)
    {x:60,  y:50,  r:22}, {x:110, y:40,  r:20}, {x:80,  y:95,  r:18},
    {x:150, y:60,  r:24}, {x:130, y:115, r:19}, {x:185, y:50,  r:21},
    {x:210, y:90,  r:17}, {x:170, y:140, r:20}, {x:240, y:60,  r:22},
    {x:270, y:105, r:18}, {x:300, y:55,  r:20}, {x:320, y:100, r:19},
    {x:350, y:55,  r:22}, {x:375, y:100, r:20}, {x:405, y:60,  r:19},
    {x:430, y:105, r:21}, {x:460, y:55,  r:18}, {x:480, y:100, r:20},
    {x:510, y:55,  r:19}, {x:530, y:100, r:22},

    // Cluster central superior
    {x:90,  y:160, r:20}, {x:130, y:180, r:19}, {x:70,  y:210, r:21},
    {x:160, y:215, r:18}, {x:200, y:160, r:22}, {x:230, y:200, r:20},
    {x:265, y:155, r:21}, {x:290, y:200, r:19}, {x:325, y:155, r:20},
    {x:355, y:195, r:22}, {x:390, y:155, r:18}, {x:415, y:195, r:21},
    {x:450, y:155, r:20}, {x:480, y:195, r:19}, {x:510, y:160, r:22},

    // Cluster inferior (más disperso)
    {x:80,  y:280, r:20}, {x:130, y:295, r:22}, {x:165, y:275, r:18},
    {x:200, y:305, r:21}, {x:245, y:275, r:20}, {x:275, y:305, r:19},
    {x:310, y:275, r:22}, {x:345, y:310, r:20}, {x:380, y:275, r:18},
    {x:415, y:305, r:21}, {x:450, y:275, r:20}, {x:490, y:305, r:22},
    {x:525, y:270, r:19},

    // Algunos árboles aislados en la zona media
    {x:155, y:370, r:18}, {x:220, y:375, r:21}, {x:310, y:370, r:19},
    {x:390, y:370, r:20}, {x:460, y:375, r:18},
  ];

  treeConfigs.forEach(cfg => {
    // Añadir variación de posición para naturalidad
    const jitterX = (Math.random() - 0.5) * 12;
    const jitterY = (Math.random() - 0.5) * 12;
    const tree = new Tree(
      cfg.x + jitterX,
      cfg.y + jitterY,
      cfg.r + (Math.random() - 0.5) * 4
    );
    GameState.trees.push(tree);
  });

  GameState.initialTreeCount = GameState.trees.length;
}

/** Crea un nuevo castor en el punto de spawn. */
function spawnBeaver() {
  if (GameState.beavers.length >= MAX_BEAVERS) return null;
  if (GameState.ended) return null;

  GameState.totalBeavers++;
  const id = GameState.totalBeavers;

  // Posición de spawn con pequeño jitter
  const x = SPAWN.x + (Math.random() - 0.5) * 20;
  const y = SPAWN.y + (Math.random() - 0.5) * 20;

  const beaver = new Beaver(x, y, id);
  GameState.beavers.push(beaver);
  return beaver;
}

/** Encuentra el árbol sano más cercano a una posición, excluyendo reservados. */
function findNearestTree(bx, by, excludeTree = null) {
  let nearest  = null;
  let minDist  = Infinity;

  GameState.trees.forEach(tree => {
    if (tree.state !== 'healthy') return;
    if (tree.reserved && tree !== excludeTree) return;
    if (tree === excludeTree) return;

    const dx   = tree.x - bx;
    const dy   = tree.y - by;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < minDist) {
      minDist  = dist;
      nearest  = tree;
    }
  });

  return nearest;
}

/** Encuentra un punto libre en el río para construir un dique. */
function findDamPosition() {
  // Puntos posibles a lo largo del río
  const damSlots = [
    {x: RIVER.centerX - 5, y: 120},
    {x: RIVER.centerX + 5, y: 220},
    {x: RIVER.centerX - 8, y: 310},
    {x: RIVER.centerX + 5, y: 400},
    {x: RIVER.centerX,     y: 165},
    {x: RIVER.centerX - 3, y: 265},
    {x: RIVER.centerX + 8, y: 355},
    {x: RIVER.centerX,     y: 450},
  ];

  // Verificar cuáles están ocupados
  const occupiedY = GameState.dams.map(d => d.y);

  for (const slot of damSlots) {
    const isTaken = occupiedY.some(oy => Math.abs(oy - slot.y) < 40);
    if (!isTaken) return slot;
  }

  // Si todos están tomados, devolver un punto aleatorio
  return {
    x: RIVER.centerX + (Math.random() - 0.5) * 20,
    y: 100 + Math.random() * 380,
  };
}
