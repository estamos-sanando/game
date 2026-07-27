/**
 * map.js — Renderizador del mapa (Canvas 2D)
 * Dibuja el terreno, río, senderos, cabaña, cartel y objetos estáticos
 * CASTORES — 80 años de impacto
 */

'use strict';

// ─── Referencia al canvas ──────────────────────────────────────
let mapCanvas, mapCtx;

// ─── Tiempo acumulado para animaciones del mapa ────────────────
let mapTime = 0;

// ─── Objetos decorativos del mapa ─────────────────────────────
const MAP_DECORATIONS = [];

// ─── Configuración del río (curva de Bézier) ──────────────────
const RIVER_PATH = [
  { x: 590, y: 0   },
  { x: 640, y: 130 },
  { x: 610, y: 260 },
  { x: 650, y: 390 },
  { x: 620, y: 520 },
];

// ─── Puntos del sendero principal ────────────────────────────
const PATH_POINTS = [
  { x: 0,   y: 450 },
  { x: 100, y: 440 },
  { x: 250, y: 445 },
  { x: 400, y: 435 },
  { x: 550, y: 440 },
  { x: RIVER.left - 5, y: 442 },
];

/**
 * Inicializa el mapa: obtiene referencia al canvas y genera decoraciones.
 */
function initMap(canvas) {
  mapCanvas = canvas;
  mapCtx    = canvas.getContext('2d');
  generateDecorations();
}

/**
 * Genera posiciones aleatorias para flores, arbustos y rocas decorativas.
 * Se llama una sola vez al iniciar para consistencia visual.
 */
function generateDecorations() {
  MAP_DECORATIONS.length = 0;

  // Flores (zona izquierda / inferior)
  const flowerPositions = [
    {x:60,y:80},{x:110,y:150},{x:80,y:220},{x:190,y:90},{x:160,y:320},
    {x:250,y:180},{x:330,y:260},{x:70,y:350},{x:200,y:400},{x:130,y:460},
    {x:310,y:390},{x:380,y:460},{x:440,y:480},{x:50,y:430},{x:480,y:400},
  ];
  flowerPositions.forEach(p => {
    MAP_DECORATIONS.push({
      type: 'flower',
      x: p.x + Math.random() * 20 - 10,
      y: p.y + Math.random() * 20 - 10,
      color: ['#FFD54F','#FF8A65','#CE93D8','#EF9A9A','#80CBC4'][Math.floor(Math.random()*5)],
      size: 3 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    });
  });

  // Arbustos medianos
  const bushPositions = [
    {x:140,y:100},{x:280,y:70},{x:380,y:120},{x:200,y:250},{x:350,y:300},
    {x:100,y:300},{x:480,y:200},{x:500,y:300},{x:450,y:140},{x:520,y:140},
  ];
  bushPositions.forEach(p => {
    MAP_DECORATIONS.push({
      type: 'bush',
      x: p.x,
      y: p.y,
      r: 10 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
    });
  });

  // Rocas decorativas pequeñas
  const rockPositions = [
    {x:700,y:60},{x:740,y:120},{x:810,y:90},{x:860,y:200},{x:780,y:300},
    {x:720,y:380},{x:850,y:420},{x:800,y:470},
  ];
  rockPositions.forEach(p => {
    MAP_DECORATIONS.push({
      type: 'rock-sm',
      x: p.x,
      y: p.y,
      size: 6 + Math.random() * 8,
      angle: Math.random() * Math.PI,
    });
  });
}

/**
 * Dibuja el mapa completo en cada frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} dt - Delta time en segundos
 */
function drawMap(ctx, dt) {
  mapTime += dt;
  const w = CANVAS_W;
  const h = CANVAS_H;

  // ── 1. Fondo base (pasto) ──
  drawGrassBase(ctx, w, h);

  // ── 2. Sendero principal ──
  drawPath(ctx);

  // ── 3. Río ──
  drawRiver(ctx, mapTime);

  // ── 4. Zona árida/deteriorada (según deterioro) ──
  if (GameState.deterioration > THRESHOLDS.MILD) {
    drawDegradation(ctx, mapTime);
  }

  // ── 5. Decoraciones (flores, arbustos, rocas) ──
  drawDecorations(ctx, mapTime);

  // ── 6. Cabaña ──
  drawCabin(ctx, 790, 80);

  // ── 7. Cartel bienvenida ──
  drawSign(ctx, 150, 470);
}

/**
 * Dibuja el fondo de pasto con variación de tono para dar profundidad.
 */
function drawGrassBase(ctx, w, h) {
  // Base verde
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0,   '#2E7D32');
  grad.addColorStop(0.4, '#388E3C');
  grad.addColorStop(1,   '#2D5A1B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Variación de textura del pasto (manchas más claras/oscuras)
  const grassPatches = [
    {x:80,  y:60,  r:90,  c:'rgba(67,160,71,0.3)'},
    {x:300, y:150, r:120, c:'rgba(56,142,60,0.2)'},
    {x:150, y:350, r:100, c:'rgba(76,175,80,0.25)'},
    {x:500, y:200, r:80,  c:'rgba(67,160,71,0.2)'},
    {x:420, y:420, r:110, c:'rgba(46,125,50,0.3)'},
    {x:700, y:300, r:90,  c:'rgba(27,94,32,0.25)'},
    {x:850, y:150, r:100, c:'rgba(56,142,60,0.2)'},
  ];

  grassPatches.forEach(p => {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, p.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Zona seca a la derecha del río (terreno más árido)
  const dryGrad = ctx.createLinearGradient(RIVER.right, 0, CANVAS_W, 0);
  dryGrad.addColorStop(0, 'rgba(0,0,0,0)');
  dryGrad.addColorStop(1, 'rgba(100,70,20,0.15)');
  ctx.fillStyle = dryGrad;
  ctx.fillRect(RIVER.right, 0, CANVAS_W - RIVER.right, CANVAS_H);
}

/**
 * Dibuja el sendero de tierra que lleva al río.
 */
function drawPath(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (let i = 1; i < PATH_POINTS.length; i++) {
    const p = PATH_POINTS[i];
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#A07820';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Borde interior del sendero (más claro)
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#B8892A';
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja el río animado con efecto de movimiento de agua.
 */
function drawRiver(ctx, t) {
  const pts = RIVER_PATH;

  ctx.save();
  // Cuerpo principal del río
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.bezierCurveTo(
    pts[1].x, pts[1].y,
    pts[2].x, pts[2].y,
    pts[3].x, pts[3].y
  );
  ctx.bezierCurveTo(
    pts[3].x + 20, pts[3].y + 60,
    pts[4].x, pts[4].y,
    pts[4].x, pts[4].y
  );

  // Ancho del río
  ctx.lineWidth = 70 + GameState.waterLevel * 25;
  ctx.strokeStyle = '#1565C0';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Reflejo animado
  ctx.lineWidth = 20 + GameState.waterLevel * 8;
  ctx.strokeStyle = `rgba(66,165,245,${0.4 + Math.sin(t * 1.2) * 0.1})`;
  ctx.setLineDash([30, 20]);
  ctx.lineDashOffset = t * 40;
  ctx.stroke();
  ctx.setLineDash([]);

  // Segunda capa de destello
  ctx.lineWidth = 8;
  ctx.strokeStyle = `rgba(187,222,251,${0.35 + Math.sin(t * 1.8 + 1) * 0.1})`;
  ctx.setLineDash([15, 40]);
  ctx.lineDashOffset = -t * 30;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // Expansión de agua si hay diques
  if (GameState.waterLevel > 0) {
    drawFloodingWater(ctx, t);
  }
}

/**
 * Dibuja el agua de inundación que se expande desde el río.
 */
function drawFloodingWater(ctx, t) {
  const wl = GameState.waterLevel;
  ctx.save();

  // Zona inundada izquierda (más intensa conforme aumenta waterLevel)
  const floodLeft = RIVER.left - wl * 80;
  const floodAlpha = Math.min(0.5, wl * 0.2);

  ctx.globalAlpha = floodAlpha;
  const floodGrad = ctx.createLinearGradient(floodLeft, 0, RIVER.left, 0);
  floodGrad.addColorStop(0, 'rgba(21,101,192,0)');
  floodGrad.addColorStop(1, 'rgba(21,101,192,0.7)');
  ctx.fillStyle = floodGrad;
  ctx.fillRect(floodLeft, 0, RIVER.left - floodLeft, CANVAS_H);

  // Charcos individuales si el nivel es alto
  if (wl > 0.5) {
    ctx.globalAlpha = 0.4 + Math.sin(t * 0.8) * 0.05;
    const charcos = [
      {x:480,y:200,rx:40,ry:20},{x:420,y:350,rx:50,ry:25},
      {x:350,y:150,rx:30,ry:15},{x:480,y:420,rx:60,ry:28},
      {x:300,y:300,rx:35,ry:18},{x:530,y:300,rx:45,ry:22},
    ];
    ctx.fillStyle = 'rgba(33,150,243,0.55)';
    charcos.forEach(c => {
      if (wl > c.rx / 100) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx * Math.min(1, wl), c.ry * Math.min(1, wl), 0, 0, Math.PI*2);
        ctx.fill();
      }
    });
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Dibuja el efecto de degradación del suelo según avanza el deterioro.
 */
function drawDegradation(ctx, t) {
  const d = GameState.deterioration;
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, (d - THRESHOLDS.MILD) * 1.5);

  // Manchas de suelo árido
  const areasDegradar = [
    {x:200,y:120,r:70},{x:350,y:200,r:80},{x:150,y:280,r:60},
    {x:430,y:320,r:90},{x:280,y:400,r:75},{x:100,y:420,r:60},
  ];
  areasDegradar.forEach(a => {
    const g = ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,a.r);
    g.addColorStop(0,'rgba(92,64,22,0.5)');
    g.addColorStop(1,'rgba(92,64,22,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, a.r, a.r * 0.6, 0, 0, Math.PI*2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Dibuja flores, arbustos y rocas decorativas.
 */
function drawDecorations(ctx, t) {
  MAP_DECORATIONS.forEach(d => {
    if (d.type === 'flower') {
      // No dibujar flores en zonas inundadas
      if (isInFlooding(d.x, d.y)) return;
      ctx.save();
      // Oscilación suave
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.sin(t * 1.5 + d.phase) * 0.08);

      // Pétalos
      ctx.fillStyle = d.color;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a)*d.size*0.8, Math.sin(a)*d.size*0.8, d.size*0.6, d.size*0.4, a, 0, Math.PI*2);
        ctx.fill();
      }
      // Centro
      ctx.fillStyle = '#FFF176';
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

    } else if (d.type === 'bush') {
      if (isInFlooding(d.x, d.y)) return;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(1, 1 + Math.sin(t * 0.8 + d.phase) * 0.02);

      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(0, 0, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(-d.r*0.3, -d.r*0.2, d.r*0.7, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#43A047';
      ctx.beginPath();
      ctx.arc(d.r*0.2, -d.r*0.3, d.r*0.55, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

    } else if (d.type === 'rock-sm') {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.fillStyle = '#78909C';
      ctx.beginPath();
      ctx.ellipse(0, 0, d.size, d.size*0.65, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#90A4AE';
      ctx.beginPath();
      ctx.ellipse(-d.size*0.1, -d.size*0.15, d.size*0.5, d.size*0.3, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  });
}

/**
 * Dibuja la pequeña cabaña en vista top-down.
 */
function drawCabin(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(2, 8, 30, 12, 0, 0, Math.PI*2);
  ctx.fill();

  // Paredes
  ctx.fillStyle = PALETTE.cabinWall;
  ctx.strokeStyle = '#6D4C2A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-28, -22, 56, 44);
  ctx.fill();
  ctx.stroke();

  // Techo (triángulo simulado en top-down con perspectiva)
  ctx.fillStyle = PALETTE.cabinRoof;
  ctx.beginPath();
  ctx.rect(-30, -30, 60, 18);
  ctx.fill();
  ctx.stroke();

  // Línea de cumbrera
  ctx.strokeStyle = '#6B1A00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-30, -30); ctx.lineTo(30, -30);
  ctx.stroke();

  // Detalles del techo (tejas en X)
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let i = -25; i < 25; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, -30); ctx.lineTo(i + 5, -12);
    ctx.stroke();
  }

  // Puerta
  ctx.fillStyle = PALETTE.cabinDoor;
  ctx.beginPath();
  ctx.rect(-8, -5, 14, 22);
  ctx.fill();

  // Ventanas
  ctx.fillStyle = '#B3E5FC';
  ctx.strokeStyle = '#6D4C2A';
  ctx.lineWidth = 1.5;
  // Ventana izquierda
  ctx.beginPath(); ctx.rect(-24, -12, 10, 10); ctx.fill(); ctx.stroke();
  // Ventana derecha
  ctx.beginPath(); ctx.rect(14, -12, 10, 10); ctx.fill(); ctx.stroke();

  // Cruz de la ventana
  ctx.strokeStyle = '#6D4C2A';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-19,-12); ctx.lineTo(-19,-2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-24,-7); ctx.lineTo(-14,-7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(19,-12); ctx.lineTo(19,-2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(14,-7); ctx.lineTo(24,-7); ctx.stroke();

  // Chimenea
  ctx.fillStyle = '#B71C1C';
  ctx.beginPath(); ctx.rect(14, -36, 8, 16); ctx.fill();
  ctx.strokeStyle = '#7B0000'; ctx.lineWidth = 1; ctx.stroke();

  ctx.restore();
}

/**
 * Dibuja el cartel de bienvenida.
 */
function drawSign(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Poste
  ctx.fillStyle = PALETTE.signPost;
  ctx.beginPath();
  ctx.rect(-3, -40, 6, 40);
  ctx.fill();

  // Tablero
  ctx.fillStyle = PALETTE.sign;
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-32, -55, 64, 26, 4);
  ctx.fill();
  ctx.stroke();

  // Texto del cartel
  ctx.fillStyle = '#4A3200';
  ctx.font = 'bold 7px Atkinson Hyperlegible, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TIERRA DEL FUEGO', 0, -44);
  ctx.font = '6px Atkinson Hyperlegible, sans-serif';
  ctx.fillText('Bienvenidos', 0, -36);

  ctx.restore();
}

/**
 * Dibuja el snapshot del mapa para el comparador ANTES/DESPUÉS.
 * @param {HTMLCanvasElement} targetCanvas
 * @param {boolean} isBefore - Si es true dibuja estado inicial
 */
function drawComparisonSnapshot(targetCanvas, isBefore) {
  const ctx = targetCanvas.getContext('2d');
  const w = targetCanvas.width;
  const h = targetCanvas.height;

  ctx.save();
  ctx.scale(w / CANVAS_W, h / CANVAS_H);

  if (isBefore) {
    // Dibuja el estado ANTES con pasto verde y árboles sanos
    const grad = ctx.createLinearGradient(0,0,CANVAS_W,CANVAS_H);
    grad.addColorStop(0,'#2E7D32');
    grad.addColorStop(1,'#1B5E20');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

    // Río
    ctx.beginPath();
    ctx.moveTo(590,0);
    ctx.bezierCurveTo(640,130,610,260,650,390);
    ctx.lineTo(620,520);
    ctx.lineWidth = 70;
    ctx.strokeStyle = '#1565C0';
    ctx.stroke();

    // Árboles de ejemplo
    const treeSamplePos = [
      {x:100,y:80},{x:200,y:100},{x:150,y:200},{x:300,y:150},{x:80,y:300},
      {x:250,y:280},{x:350,y:80},{x:420,y:200},{x:180,y:380},{x:480,y:100},
    ];
    treeSamplePos.forEach(p => {
      drawTreeSimple(ctx, p.x, p.y, 'healthy');
    });

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#A5D6A7';
    ctx.font = 'bold 28px Crimson Pro, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Bosque sano', CANVAS_W/2, CANVAS_H/2);

  } else {
    // Dibuja el estado DESPUÉS con deterioro
    const grad = ctx.createLinearGradient(0,0,CANVAS_W,CANVAS_H);
    grad.addColorStop(0,'#4E342E');
    grad.addColorStop(1,'#3E2723');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

    // Río más ancho (inundado)
    ctx.beginPath();
    ctx.moveTo(540,0);
    ctx.bezierCurveTo(600,130,570,260,620,390);
    ctx.lineTo(600,520);
    ctx.lineWidth = 120;
    ctx.strokeStyle = '#1565C0';
    ctx.stroke();

    // Árboles muertos
    const treeSamplePos = [
      {x:100,y:80},{x:200,y:100},{x:150,y:200},{x:300,y:150},{x:480,y:100},
    ];
    treeSamplePos.forEach(p => {
      drawTreeSimple(ctx, p.x, p.y, 'dead');
    });

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#FFCCBC';
    ctx.font = 'bold 28px Crimson Pro, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ecosistema alterado', CANVAS_W/2, CANVAS_H/2);
  }

  ctx.restore();
}

/**
 * Dibuja un árbol simple para snapshots (sin animación).
 */
function drawTreeSimple(ctx, x, y, state) {
  ctx.save();
  ctx.translate(x, y);
  if (state === 'healthy') {
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath(); ctx.arc(0,-18,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#43A047';
    ctx.beginPath(); ctx.arc(0,-22,11,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-3,-2,6,14);
  } else {
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(0,-20); ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(-10,-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(10,-8); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Detecta si una posición está dentro del área inundada.
 */
function isInFlooding(x, y) {
  const wl = GameState.waterLevel;
  if (wl < 0.3) return false;
  const distToRiver = Math.abs(x - RIVER.centerX);
  return distToRiver < RIVER.width/2 + wl * 60;
}

/**
 * Dibuja los diques sobre el río.
 */
function drawDams(ctx) {
  GameState.dams.forEach(dam => {
    if (!dam.built) return;
    ctx.save();
    ctx.translate(dam.x, dam.y);

    // Base del dique (troncos apilados)
    ctx.fillStyle = '#795548';
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;

    const W = 60 + dam.size * 10;
    const H = 12;

    // Rectángulo principal
    ctx.beginPath();
    ctx.rect(-W/2, -H/2, W, H);
    ctx.fill();
    ctx.stroke();

    // Troncos individuales
    for (let i = -W/2 + 8; i < W/2 - 5; i += 16) {
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(i, 0, 7, 5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Ondas de agua alrededor del dique
    ctx.globalAlpha = 0.3 + Math.sin(mapTime * 2 + dam.x) * 0.1;
    ctx.strokeStyle = '#42A5F5';
    ctx.lineWidth = 2;
    ctx.setLineDash([4,6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, W/2 + 10, 20, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.restore();
  });
}
