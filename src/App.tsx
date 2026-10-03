import { useEffect, useRef, useState, useCallback } from 'react';

// ==========================================
// Типы
// ==========================================
type GameState = 'MENU' | 'PLAYING' | 'WIN' | 'GAME_OVER' | 'DIALOG';
type PlayerType = 'sasha' | 'anya';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Vec2 {
  x: number;
  y: number;
}

interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  roofColor: string;
  type: 'house' | 'shop' | 'cafe' | 'park' | 'fountain' | 'goal';
  label: string;
  doorSide: Direction; // с какой стороны дверь
  doorPos: Vec2; // позиция двери (центр)
  interactable: boolean;
}

interface Tree {
  x: number;
  y: number;
  size: number;
  type: 'round' | 'pine';
}

interface NPC {
  x: number;
  y: number;
  name: string;
  color: string;
  hairColor: string;
  dialog: string[];
  dialogIndex: number;
  direction: Direction;
  frame: number;
}

interface Collectible {
  x: number;
  y: number;
  type: 'key' | 'heart' | 'star' | 'coin';
  collected: boolean;
}

interface Enemy {
  x: number;
  y: number;
  speed: number;
  direction: Direction;
  type: 'dog' | 'ghost';
  patrolPoints: Vec2[];
  patrolIndex: number;
  frame: number;
  active: boolean;
}

interface Player {
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  frame: number;
  moving: boolean;
  lives: number;
  invincible: number;
  keys: number;
  coins: number;
  superSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ==========================================
// Константы
// ==========================================
const TILE = 48;
const MAP_W = 80; // в тайлах
const MAP_H = 60;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const PLAYER_SIZE = 28;
const MOVE_SPEED = 3;
const SUPER_SPEED = 5.5;

// ==========================================
// Генерация карты города
// ==========================================
function generateCity(): {
  buildings: Building[];
  trees: Tree[];
  npcs: NPC[];
  collectibles: Collectible[];
  enemies: Enemy[];
  goalPos: Vec2;
} {
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const npcs: NPC[] = [];
  const collectibles: Collectible[] = [];
  const enemies: Enemy[] = [];

  // Вспомогательная функция для создания здания
  const addBuilding = (
    tx: number, ty: number, tw: number, th: number,
    type: Building['type'], label: string, color: string, roofColor: string,
    doorSide: Direction = 'down'
  ) => {
    const bx = tx * TILE;
    const by = ty * TILE;
    const bw = tw * TILE;
    const bh = th * TILE;
    let doorPos: Vec2;
    switch (doorSide) {
      case 'down': doorPos = { x: bx + bw / 2, y: by + bh }; break;
      case 'up': doorPos = { x: bx + bw / 2, y: by }; break;
      case 'left': doorPos = { x: bx, y: by + bh / 2 }; break;
      case 'right': doorPos = { x: bx + bw, y: by + bh / 2 }; break;
    }
    buildings.push({
      x: bx, y: by, w: bw, h: bh,
      color, roofColor, type, label,
      doorSide, doorPos,
      interactable: type !== 'fountain',
    });
  };

  // === КВАРТАЛ 1 (верхний левый) ===
  addBuilding(2, 2, 5, 4, 'house', 'Дом 🏠', '#D2691E', '#8B0000', 'down');
  addBuilding(9, 2, 4, 3, 'shop', 'Магазин 🛒', '#4682B4', '#2F4F4F', 'down');
  addBuilding(2, 8, 4, 3, 'cafe', 'Кафе ☕', '#DEB887', '#8B4513', 'down');
  addBuilding(9, 7, 5, 4, 'house', 'Дом 🏡', '#CD853F', '#A0522D', 'down');

  // === КВАРТАЛ 2 (верхний правый) ===
  addBuilding(18, 2, 6, 5, 'house', 'Большой дом 🏘', '#BC8F8F', '#800000', 'down');
  addBuilding(26, 2, 4, 3, 'shop', 'Цветы 💐', '#FF69B4', '#C71585', 'down');
  addBuilding(18, 9, 5, 3, 'cafe', 'Пиццерия 🍕', '#F4A460', '#D2691E', 'down');
  addBuilding(25, 8, 5, 4, 'house', 'Дом 🏠', '#D2B48C', '#8B4513', 'down');

  // === КВАРТАЛ 3 (центральный левый) ===
  addBuilding(2, 15, 5, 4, 'house', 'Дом 🏠', '#A0522D', '#654321', 'right');
  addBuilding(2, 21, 4, 3, 'shop', 'Книги 📚', '#6495ED', '#191970', 'right');
  addBuilding(9, 15, 4, 4, 'house', 'Дом 🏡', '#DEB887', '#8B4513', 'down');
  addBuilding(8, 21, 5, 3, 'cafe', 'Мороженое 🍦', '#FFB6C1', '#DB7093', 'down');

  // === ПАРК (центр) ===
  addBuilding(17, 15, 8, 6, 'park', 'Парк 🌳', '#228B22', '#006400', 'down');
  addBuilding(19, 17, 3, 2, 'fountain', 'Фонтан ⛲', '#4169E1', '#1E90FF', 'down');

  // === КВАРТАЛ 4 (центральный правый) ===
  addBuilding(28, 15, 5, 4, 'house', 'Дом 🏠', '#BC8F8F', '#800000', 'left');
  addBuilding(28, 21, 4, 3, 'shop', 'Игрушки 🧸', '#FFD700', '#DAA520', 'left');
  addBuilding(35, 15, 5, 5, 'house', 'Особняк 🏰', '#C0C0C0', '#696969', 'down');

  // === КВАРТАЛ 5 (нижний левый) ===
  addBuilding(2, 28, 5, 4, 'house', 'Дом 🏠', '#D2691E', '#8B0000', 'up');
  addBuilding(9, 28, 4, 3, 'cafe', 'Пекарня 🥐', '#F5DEB3', '#D2691E', 'up');
  addBuilding(2, 34, 4, 4, 'shop', 'Кондитерская 🍰', '#FF69B4', '#C71585', 'up');
  addBuilding(9, 34, 5, 3, 'house', 'Дом 🏡', '#CD853F', '#A0522D', 'up');

  // === КВАРТАЛ 6 (нижний правый) ===
  addBuilding(18, 28, 5, 4, 'house', 'Дом 🏠', '#DEB887', '#8B4513', 'up');
  addBuilding(25, 28, 4, 3, 'shop', 'Музыка 🎵', '#9370DB', '#4B0082', 'up');
  addBuilding(18, 34, 4, 4, 'cafe', 'Чайная 🍵', '#98FB98', '#2E8B57', 'up');
  addBuilding(25, 34, 5, 3, 'house', 'Дом 🏡', '#F0E68C', '#BDB76B', 'up');

  // === ДОПОЛНИТЕЛЬНЫЕ ЗДАНИЯ ===
  addBuilding(35, 28, 5, 4, 'house', 'Дом 🏠', '#BC8F8F', '#800000', 'down');
  addBuilding(35, 34, 4, 3, 'shop', 'Аптека 💊', '#87CEEB', '#4682B4', 'down');
  addBuilding(35, 2, 5, 5, 'house', 'Башня 🗼', '#B0C4DE', '#708090', 'down');

  // Деревья по городу
  const treePositions = [
    // Парк
    { x: 17.5, y: 15.5 }, { x: 24, y: 15.5 }, { x: 17.5, y: 20 }, { x: 24, y: 20 },
    { x: 19, y: 16 }, { x: 23, y: 16 }, { x: 19, y: 19.5 }, { x: 23, y: 19.5 },
    // Вдоль улиц
    { x: 1, y: 1 }, { x: 7.5, y: 1 }, { x: 14, y: 1 }, { x: 17, y: 1 },
    { x: 25, y: 1 }, { x: 31, y: 1 }, { x: 34, y: 1 },
    { x: 1, y: 13 }, { x: 7.5, y: 13 }, { x: 14, y: 13 },
    { x: 26, y: 13 }, { x: 33, y: 13 },
    { x: 1, y: 26 }, { x: 7.5, y: 26 }, { x: 14, y: 26 },
    { x: 26, y: 26 }, { x: 33, y: 26 },
    { x: 1, y: 39 }, { x: 7.5, y: 39 }, { x: 14, y: 39 },
    { x: 26, y: 39 }, { x: 33, y: 39 },
    // Случайные
    { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 30, y: 5 }, { x: 30, y: 10 },
    { x: 15, y: 30 }, { x: 15, y: 35 }, { x: 30, y: 30 }, { x: 30, y: 35 },
  ];

  for (const tp of treePositions) {
    trees.push({
      x: tp.x * TILE,
      y: tp.y * TILE,
      size: 14 + Math.random() * 8,
      type: Math.random() > 0.5 ? 'round' : 'pine',
    });
  }

  // NPC
  npcs.push({
    x: 7 * TILE, y: 5 * TILE,
    name: 'Бабушка Валя',
    color: '#FF69B4',
    hairColor: '#C0C0C0',
    dialog: [
      'Привет, милый! ❤️',
      'Ты ищешь свою половинку?',
      'Она в дальнем конце города!',
      'Иди через парк, там красиво 🌸',
    ],
    dialogIndex: 0,
    direction: 'down',
    frame: 0,
  });

  npcs.push({
    x: 22 * TILE, y: 5 * TILE,
    name: 'Дедушка Петя',
    color: '#4169E1',
    hairColor: '#FFFFFF',
    dialog: [
      'Ого, кто к нам пришёл!',
      'Собирай ключи 🔑 по дороге!',
      'Они откроют путь к цели!',
      'Удачи тебе, дружище! 🍀',
    ],
    dialogIndex: 0,
    direction: 'down',
    frame: 0,
  });

  npcs.push({
    x: 20 * TILE, y: 18 * TILE,
    name: 'Кот Барсик',
    color: '#FF8C00',
    hairColor: '#FF8C00',
    dialog: [
      'Мяу! 🐱',
      'Я видел кого-то у фонтана...',
      'Но это был не тот, кого ты ищешь!',
      'Иди дальше, не сдавайся!',
    ],
    dialogIndex: 0,
    direction: 'left',
    frame: 0,
  });

  npcs.push({
    x: 30 * TILE, y: 20 * TILE,
    name: 'Почтальон Печкин',
    color: '#32CD32',
    hairColor: '#8B4513',
    dialog: [
      'А посылка-то для тебя есть!',
      'Только ключиков не хватает...',
      'Собери все 🔑 и иди к цели!',
      'Она ждёт тебя! 💕',
    ],
    dialogIndex: 0,
    direction: 'down',
    frame: 0,
  });

  npcs.push({
    x: 5 * TILE, y: 32 * TILE,
    name: 'Девочка Маша',
    color: '#FF1493',
    hairColor: '#FFD700',
    dialog: [
      'Привет! Ты такой смелый!',
      'Остерегайся собак на улице! 🐕',
      'Они не злые, просто охраняют',
      'свою территорию!',
    ],
    dialogIndex: 0,
    direction: 'right',
    frame: 0,
  });

  // Коллекционные предметы
  const collectiblePositions: { x: number; y: number; type: Collectible['type'] }[] = [
    // Ключи (нужно 3 для открытия финальной двери)
    { x: 4, y: 4, type: 'key' },
    { x: 28, y: 4, type: 'key' },
    { x: 20, y: 18, type: 'key' },
    // Монеты
    { x: 6, y: 13, type: 'coin' },
    { x: 14, y: 7, type: 'coin' },
    { x: 22, y: 13, type: 'coin' },
    { x: 30, y: 7, type: 'coin' },
    { x: 6, y: 26, type: 'coin' },
    { x: 14, y: 30, type: 'coin' },
    { x: 22, y: 26, type: 'coin' },
    { x: 30, y: 30, type: 'coin' },
    { x: 37, y: 13, type: 'coin' },
    { x: 37, y: 26, type: 'coin' },
    { x: 4, y: 37, type: 'coin' },
    { x: 12, y: 37, type: 'coin' },
    // Сердца
    { x: 10, y: 13, type: 'heart' },
    { x: 30, y: 13, type: 'heart' },
    { x: 20, y: 37, type: 'heart' },
    // Звёзды (супер-скорость)
    { x: 14, y: 20, type: 'star' },
    { x: 33, y: 37, type: 'star' },
  ];

  for (const cp of collectiblePositions) {
    collectibles.push({
      x: cp.x * TILE,
      y: cp.y * TILE,
      type: cp.type,
      collected: false,
    });
  }

  // Враги (собаки патрулируют улицы)
  const enemyDefs = [
    {
      type: 'dog' as const,
      patrol: [{ x: 15, y: 6 }, { x: 15, y: 12 }, { x: 17, y: 12 }, { x: 17, y: 6 }],
      speed: 1.5,
    },
    {
      type: 'dog' as const,
      patrol: [{ x: 27, y: 6 }, { x: 27, y: 12 }, { x: 29, y: 12 }, { x: 29, y: 6 }],
      speed: 1.8,
    },
    {
      type: 'ghost' as const,
      patrol: [{ x: 15, y: 27 }, { x: 15, y: 33 }, { x: 17, y: 33 }, { x: 17, y: 27 }],
      speed: 1.2,
    },
    {
      type: 'dog' as const,
      patrol: [{ x: 27, y: 27 }, { x: 27, y: 33 }, { x: 29, y: 33 }, { x: 29, y: 27 }],
      speed: 1.6,
    },
    {
      type: 'ghost' as const,
      patrol: [{ x: 34, y: 8 }, { x: 34, y: 12 }, { x: 36, y: 12 }, { x: 36, y: 8 }],
      speed: 1.3,
    },
    {
      type: 'dog' as const,
      patrol: [{ x: 34, y: 30 }, { x: 34, y: 37 }, { x: 36, y: 37 }, { x: 36, y: 30 }],
      speed: 1.7,
    },
  ];

  for (const ed of enemyDefs) {
    enemies.push({
      x: ed.patrol[0].x * TILE,
      y: ed.patrol[0].y * TILE,
      speed: ed.speed,
      direction: 'down',
      type: ed.type,
      patrolPoints: ed.patrol.map(p => ({ x: p.x * TILE, y: p.y * TILE })),
      patrolIndex: 0,
      frame: 0,
      active: true,
    });
  }

  // Цель - в правом нижнем углу
  const goalPos = { x: 37 * TILE, y: 37 * TILE };

  // Добавим финальное здание (цель)
  addBuilding(36, 36, 3, 3, 'goal', 'Цель 💕', '#FF69B4', '#FF1493', 'up');

  return { buildings, trees, npcs, collectibles, enemies, goalPos };
}

// ==========================================
// Звуковой менеджер
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  play(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.2) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }

  step() { this.play(100, 0.05, 'sine', 0.05); }
  coin() { this.play(800, 0.1); this.play(1200, 0.15); }
  key() { this.play(600, 0.15); this.play(900, 0.2); }
  heart() { this.play(500, 0.1); this.play(700, 0.15); }
  star() { this.play(400, 0.1); this.play(800, 0.15); this.play(1200, 0.2); }
  hurt() { this.play(200, 0.2, 'sawtooth', 0.3); }
  dialog() { this.play(600, 0.05, 'square', 0.1); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.play(f, 0.3, 'sine', 0.25), i * 150);
    });
  }
}

const sound = new SoundManager();

// ==========================================
// Рисование человечка (вид сверху)
// ==========================================
function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  direction: Direction,
  frame: number,
  moving: boolean,
  bodyColor: string,
  hairColor: string,
  skinColor: string = '#FFDAB9',
  size: number = PLAYER_SIZE,
  invincible: number = 0,
) {
  // Мигание при неуязвимости
  if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(x, y);

  const s = size;
  const legSwing = moving ? Math.sin(frame * 0.3) * 4 : 0;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.4, s * 0.35, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Определяем позиции частей тела по направлению
  let headOx = 0, headOy = -s * 0.25;
  let bodyOy = 0;
  let leg1Ox = -s * 0.15, leg2Ox = s * 0.15;
  let leg1Oy = s * 0.2, leg2Oy = s * 0.2;
  let arm1Ox = -s * 0.35, arm2Ox = s * 0.35;
  let arm1Oy = 0, arm2Oy = 0;

  if (direction === 'up') {
    headOy = -s * 0.3;
    leg1Oy = s * 0.15 + legSwing;
    leg2Oy = s * 0.15 - legSwing;
    arm1Oy = -legSwing * 0.5;
    arm2Oy = legSwing * 0.5;
  } else if (direction === 'down') {
    headOy = -s * 0.15;
    leg1Oy = s * 0.25 + legSwing;
    leg2Oy = s * 0.25 - legSwing;
    arm1Oy = legSwing * 0.5;
    arm2Oy = -legSwing * 0.5;
  } else if (direction === 'left') {
    headOx = -s * 0.1;
    headOy = -s * 0.2;
    leg1Ox = -s * 0.05;
    leg2Ox = s * 0.05;
    leg1Oy = s * 0.2 + legSwing;
    leg2Oy = s * 0.2 - legSwing;
    arm1Ox = -s * 0.25;
    arm2Ox = s * 0.15;
    arm1Oy = -legSwing * 0.7;
    arm2Oy = legSwing * 0.7;
  } else { // right
    headOx = s * 0.1;
    headOy = -s * 0.2;
    leg1Ox = -s * 0.05;
    leg2Ox = s * 0.05;
    leg1Oy = s * 0.2 + legSwing;
    leg2Oy = s * 0.2 - legSwing;
    arm1Ox = -s * 0.15;
    arm2Ox = s * 0.25;
    arm1Oy = legSwing * 0.7;
    arm2Oy = -legSwing * 0.7;
  }

  // Ноги
  ctx.fillStyle = '#2F4F4F';
  ctx.beginPath();
  ctx.ellipse(leg1Ox, leg1Oy, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(leg2Ox, leg2Oy, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Тело
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, bodyOy, s * 0.25, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Руки
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(arm1Ox, arm1Oy, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(arm2Ox, arm2Oy, s * 0.08, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Голова
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(headOx, headOy, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Волосы
  ctx.fillStyle = hairColor;
  if (direction === 'up') {
    // Видны волосы сзади
    ctx.beginPath();
    ctx.arc(headOx, headOy, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (direction === 'down') {
    // Волосы сверху + чёлка
    ctx.beginPath();
    ctx.arc(headOx, headOy - s * 0.05, s * 0.22, Math.PI, Math.PI * 2);
    ctx.fill();
    // Чёлка
    ctx.beginPath();
    ctx.arc(headOx, headOy - s * 0.1, s * 0.18, Math.PI * 1.2, Math.PI * 1.8);
    ctx.fill();
  } else {
    // Волосы сбоку
    ctx.beginPath();
    ctx.arc(headOx, headOy - s * 0.05, s * 0.22, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
  }

  // Глаза (если смотрит вниз или вбок)
  if (direction !== 'up') {
    ctx.fillStyle = '#000';
    const eyeOffX = direction === 'left' ? -s * 0.08 : direction === 'right' ? s * 0.08 : 0;
    const eyeSpread = direction === 'down' ? s * 0.08 : s * 0.04;
    ctx.beginPath();
    ctx.arc(headOx + eyeOffX - eyeSpread, headOy + s * 0.02, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headOx + eyeOffX + eyeSpread, headOy + s * 0.02, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ==========================================
// Рисование собаки
// ==========================================
function drawDog(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  direction: Direction,
  frame: number,
) {
  ctx.save();
  ctx.translate(x, y);

  const legSwing = Math.sin(frame * 0.3) * 3;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Тело
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Голова
  let hx = 0, hy = -8;
  if (direction === 'left') hx = -10;
  if (direction === 'right') hx = 10;
  if (direction === 'up') hy = -12;
  if (direction === 'down') hy = -4;

  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.arc(hx, hy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Уши
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.ellipse(hx - 5, hy - 5, 3, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 5, hy - 5, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Глаза
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx - 3, hy, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 3, hy, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Нос
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hx, hy + 3, 2, 0, Math.PI * 2);
  ctx.fill();

  // Лапы
  ctx.fillStyle = '#654321';
  const lx1 = direction === 'left' || direction === 'right' ? -8 : -6;
  const lx2 = direction === 'left' || direction === 'right' ? 8 : 6;
  ctx.beginPath();
  ctx.ellipse(lx1, 10 + legSwing, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(lx2, 10 - legSwing, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Хвост
  const tailWag = Math.sin(frame * 0.5) * 5;
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.quadraticCurveTo(tailWag, -18, tailWag * 1.5, -20);
  ctx.stroke();

  ctx.restore();
}

// ==========================================
// Рисование призрака
// ==========================================
function drawGhost(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number,
) {
  ctx.save();
  ctx.translate(x, y);

  const bob = Math.sin(frame * 0.05) * 3;
  const alpha = 0.6 + Math.sin(frame * 0.03) * 0.2;

  ctx.globalAlpha = alpha;

  // Тело призрака
  ctx.fillStyle = '#E0E0FF';
  ctx.beginPath();
  ctx.arc(0, bob - 5, 14, Math.PI, 0);
  ctx.lineTo(14, bob + 10);
  // Волнистый низ
  for (let i = 0; i < 5; i++) {
    const wx = 14 - i * 7;
    const wy = bob + 10 + (i % 2 === 0 ? 5 : 0);
    ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.fill();

  // Глаза
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(-5, bob - 5, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, bob - 5, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Зрачки
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(-5, bob - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, bob - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Рот
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(0, bob + 3, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ==========================================
// Рисование здания
// ==========================================
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  camX: number, camY: number,
  frame: number,
) {
  const sx = b.x - camX;
  const sy = b.y - camY;

  // Тень здания
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(sx + 5, sy + 5, b.w, b.h);

  // Стены
  ctx.fillStyle = b.color;
  ctx.fillRect(sx, sy, b.w, b.h);

  // Обводка
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, b.w, b.h);

  // Крыша (полоска сверху)
  ctx.fillStyle = b.roofColor;
  ctx.fillRect(sx, sy, b.w, 8);

  // Окна
  if (b.type !== 'fountain' && b.type !== 'park') {
    ctx.fillStyle = '#87CEEB';
    const winSize = 12;
    const winGap = 20;
    const cols = Math.floor((b.w - 20) / winGap);
    const rows = Math.floor((b.h - 30) / winGap);
    for (let r = 0; r < Math.min(rows, 3); r++) {
      for (let c = 0; c < Math.min(cols, 5); c++) {
        const wx = sx + 12 + c * winGap;
        const wy = sy + 16 + r * winGap;
        ctx.fillRect(wx, wy, winSize, winSize);
        // Рама
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, winSize, winSize);
        // Крест
        ctx.beginPath();
        ctx.moveTo(wx + winSize / 2, wy);
        ctx.lineTo(wx + winSize / 2, wy + winSize);
        ctx.moveTo(wx, wy + winSize / 2);
        ctx.lineTo(wx + winSize, wy + winSize / 2);
        ctx.stroke();
      }
    }
  }

  // Дверь
  if (b.type !== 'fountain') {
    const doorW = 14;
    const doorH = 20;
    let dx = sx + b.w / 2 - doorW / 2;
    let dy = sy + b.h - doorH;

    if (b.doorSide === 'up') { dy = sy; }
    if (b.doorSide === 'left') { dx = sx; dy = sy + b.h / 2 - doorH / 2; }
    if (b.doorSide === 'right') { dx = sx + b.w - doorW; dy = sy + b.h / 2 - doorH / 2; }

    ctx.fillStyle = '#4A2800';
    ctx.fillRect(dx, dy, doorW, doorH);
    // Ручка
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(dx + doorW - 4, dy + doorH / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Фонтан - рисуем воду
  if (b.type === 'fountain') {
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.ellipse(sx + b.w / 2, sy + b.h / 2, b.w * 0.35, b.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Брызги
    ctx.fillStyle = '#87CEFA';
    for (let i = 0; i < 5; i++) {
      const angle = frame * 0.02 + i * Math.PI * 2 / 5;
      const r = 8 + Math.sin(frame * 0.05 + i) * 4;
      ctx.beginPath();
      ctx.arc(
        sx + b.w / 2 + Math.cos(angle) * r,
        sy + b.h / 2 + Math.sin(angle) * r,
        2, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  // Парк - рисуем траву
  if (b.type === 'park') {
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(sx + 2, sy + 2, b.w - 4, b.h - 4);
    // Дорожки
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(sx + b.w / 2 - 4, sy, 8, b.h);
    ctx.fillRect(sx, sy + b.h / 2 - 4, b.w, 8);
  }

  // Цель - пульсация
  if (b.type === 'goal') {
    const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 105, 180, ${pulse * 0.3})`;
    ctx.fillRect(sx - 5, sy - 5, b.w + 10, b.h + 10);

    // Сердечки
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const angle = frame * 0.02 + i * Math.PI * 2 / 3;
      const hx = sx + b.w / 2 + Math.cos(angle) * 30;
      const hy = sy - 10 + Math.sin(angle) * 10;
      ctx.fillText('💕', hx, hy);
    }
  }

  // Название здания
  if (b.label) {
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(b.label, sx + b.w / 2, sy - 5);
    ctx.fillText(b.label, sx + b.w / 2, sy - 5);
  }
}

// ==========================================
// Рисование дерева
// ==========================================
function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  type: 'round' | 'pine',
) {
  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + size * 0.6, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ствол
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - 3, y, 6, size * 0.5);

  if (type === 'round') {
    // Круглая крона
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.1, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x - 3, y - size * 0.2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ёлка
    ctx.fillStyle = '#006400';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.8);
    ctx.lineTo(x - size * 0.5, y + size * 0.1);
    ctx.lineTo(x + size * 0.5, y + size * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x - size * 0.35, y);
    ctx.lineTo(x + size * 0.35, y);
    ctx.closePath();
    ctx.fill();
  }
}

// ==========================================
// Основной компонент
// ==========================================
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [score, setScore] = useState(0);
  const [dialogText, setDialogText] = useState<string[]>([]);
  const [dialogName, setDialogName] = useState('');
  const [dialogStep, setDialogStep] = useState(0);

  const gameRef = useRef<{
    player: Player;
    buildings: Building[];
    trees: Tree[];
    npcs: NPC[];
    collectibles: Collectible[];
    enemies: Enemy[];
    goalPos: Vec2;
    camX: number;
    camY: number;
    keys: { up: boolean; down: boolean; left: boolean; right: boolean };
    frame: number;
    canvasW: number;
    canvasH: number;
    particles: Particle[];
    stepTimer: number;
    dialogActive: boolean;
    currentNPC: NPC | null;
    dialogStepLocal: number;
  } | null>(null);

  const animRef = useRef(0);
  const stateRef = useRef<GameState>('MENU');
  const playerRef = useRef<PlayerType | null>(null);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerRef.current = selectedPlayer; }, [selectedPlayer]);

  // ==========================================
  // Инициализация
  // ==========================================
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const city = generateCity();

    gameRef.current = {
      player: {
        x: 3 * TILE,
        y: 3 * TILE,
        direction: 'down',
        speed: MOVE_SPEED,
        frame: 0,
        moving: false,
        lives: 3,
        invincible: 0,
        keys: 0,
        coins: 0,
        superSpeed: 0,
      },
      buildings: city.buildings,
      trees: city.trees,
      npcs: city.npcs,
      collectibles: city.collectibles,
      enemies: city.enemies,
      goalPos: city.goalPos,
      camX: 0,
      camY: 0,
      keys: { up: false, down: false, left: false, right: false },
      frame: 0,
      canvasW: canvas.width,
      canvasH: canvas.height,
      particles: [],
      stepTimer: 0,
      dialogActive: false,
      currentNPC: null,
      dialogStepLocal: 0,
    };
  }, []);

  // ==========================================
  // Коллизия с зданиями
  // ==========================================
  const checkBuildingCollision = useCallback((
    x: number, y: number, size: number, buildings: Building[]
  ): boolean => {
    const half = size / 2;
    for (const b of buildings) {
      if (b.type === 'park' || b.type === 'fountain') {
        // Парк проходим (кроме фонтана)
        if (b.type === 'fountain') {
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h / 2;
          const dx = x - cx;
          const dy = y - cy;
          if (Math.sqrt(dx * dx + dy * dy) < b.w * 0.3 + half) return true;
        }
        continue;
      }
      if (
        x + half > b.x &&
        x - half < b.x + b.w &&
        y + half > b.y &&
        y - half < b.y + b.h
      ) {
        return true;
      }
    }
    return false;
  }, []);

  // ==========================================
  // Коллизия с деревьями
  // ==========================================
  const checkTreeCollision = useCallback((
    x: number, y: number, size: number, trees: Tree[]
  ): boolean => {
    const half = size / 2;
    for (const t of trees) {
      const dx = x - t.x;
      const dy = y - (t.y + t.size * 0.2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < t.size * 0.3 + half * 0.5) return true;
    }
    return false;
  }, []);

  // ==========================================
  // Добавление частиц
  // ==========================================
  const addParticles = useCallback((
    x: number, y: number, color: string, count: number
  ) => {
    if (!gameRef.current) return;
    for (let i = 0; i < count; i++) {
      gameRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // ==========================================
  // Игровой цикл
  // ==========================================
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const g = gameRef.current;

    if (!canvas || !ctx || !g) {
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (stateRef.current !== 'PLAYING') {
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    g.frame++;
    const { player, buildings, trees, npcs, collectibles, enemies, goalPos } = g;
    const w = g.canvasW;
    const h = g.canvasH;

    // === ОБНОВЛЕНИЕ ===
    if (!g.dialogActive) {
      // Движение игрока
      let dx = 0, dy = 0;
      const spd = player.superSpeed > 0 ? SUPER_SPEED : MOVE_SPEED;

      if (g.keys.up) { dy = -spd; player.direction = 'up'; }
      if (g.keys.down) { dy = spd; player.direction = 'down'; }
      if (g.keys.left) { dx = -spd; player.direction = 'left'; }
      if (g.keys.right) { dx = spd; player.direction = 'right'; }

      // Диагональное движение
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      player.moving = dx !== 0 || dy !== 0;
      if (player.moving) player.frame++;

      // Шаг-звук
      if (player.moving) {
        g.stepTimer++;
        if (g.stepTimer % 15 === 0) sound.step();
      }

      // Пробуем двигаться по X
      const newX = player.x + dx;
      if (!checkBuildingCollision(newX, player.y, PLAYER_SIZE, buildings) &&
          !checkTreeCollision(newX, player.y, PLAYER_SIZE, trees) &&
          newX > PLAYER_SIZE / 2 && newX < WORLD_W - PLAYER_SIZE / 2) {
        player.x = newX;
      }

      // Пробуем двигаться по Y
      const newY = player.y + dy;
      if (!checkBuildingCollision(player.x, newY, PLAYER_SIZE, buildings) &&
          !checkTreeCollision(player.x, newY, PLAYER_SIZE, trees) &&
          newY > PLAYER_SIZE / 2 && newY < WORLD_H - PLAYER_SIZE / 2) {
        player.y = newY;
      }

      // Неуязвимость и супер-скорость
      if (player.invincible > 0) player.invincible--;
      if (player.superSpeed > 0) player.superSpeed--;

      // === СБОР ПРЕДМЕТОВ ===
      for (const c of collectibles) {
        if (c.collected) continue;
        const dist = Math.sqrt((player.x - c.x) ** 2 + (player.y - c.y) ** 2);
        if (dist < 25) {
          c.collected = true;
          if (c.type === 'coin') {
            player.coins += 10;
            sound.coin();
            addParticles(c.x, c.y, '#FFD700', 8);
          } else if (c.type === 'key') {
            player.keys++;
            sound.key();
            addParticles(c.x, c.y, '#FFD700', 12);
          } else if (c.type === 'heart') {
            if (player.lives < 5) player.lives++;
            sound.heart();
            addParticles(c.x, c.y, '#FF0000', 10);
          } else if (c.type === 'star') {
            player.superSpeed = 300;
            sound.star();
            addParticles(c.x, c.y, '#FFFF00', 15);
          }
        }
      }

      // === NPC ВЗАИМОДЕЙСТВИЕ ===
      for (const npc of npcs) {
        npc.frame++;
        const dist = Math.sqrt((player.x - npc.x) ** 2 + (player.y - npc.y) ** 2);
        if (dist < 40) {
          // Показываем индикатор взаимодействия
          // Автоматический диалог при приближении
          if (!g.dialogActive) {
            g.dialogActive = true;
            g.currentNPC = npc;
            g.dialogStepLocal = 0;
            setDialogText(npc.dialog);
            setDialogName(npc.name);
            setDialogStep(0);
            setGameState('DIALOG');
            sound.dialog();
          }
        }
      }

      // === ВРАГИ ===
      for (const e of enemies) {
        if (!e.active) continue;
        e.frame++;

        // Патрулирование
        const target = e.patrolPoints[e.patrolIndex];
        const edx = target.x - e.x;
        const edy = target.y - e.y;
        const eDist = Math.sqrt(edx * edx + edy * edy);

        if (eDist < 5) {
          e.patrolIndex = (e.patrolIndex + 1) % e.patrolPoints.length;
        } else {
          const nx = edx / eDist;
          const ny = edy / eDist;
          e.x += nx * e.speed;
          e.y += ny * e.speed;

          if (Math.abs(nx) > Math.abs(ny)) {
            e.direction = nx > 0 ? 'right' : 'left';
          } else {
            e.direction = ny > 0 ? 'down' : 'up';
          }
        }

        // Коллизия с игроком
        const pDist = Math.sqrt((player.x - e.x) ** 2 + (player.y - e.y) ** 2);
        if (pDist < 25 && player.invincible <= 0) {
          player.lives--;
          player.invincible = 90;
          sound.hurt();
          addParticles(player.x, player.y, '#FF0000', 10);

          // Отбрасывание
          const pushDx = player.x - e.x;
          const pushDy = player.y - e.y;
          const pushDist = Math.sqrt(pushDx * pushDx + pushDy * pushDy) || 1;
          player.x += (pushDx / pushDist) * 30;
          player.y += (pushDy / pushDist) * 30;

          if (player.lives <= 0) {
            setScore(player.coins);
            setGameState('GAME_OVER');
          }
        }
      }

      // === ЦЕЛЬ ===
      const goalDist = Math.sqrt((player.x - goalPos.x) ** 2 + (player.y - goalPos.y) ** 2);
      if (goalDist < 40 && player.keys >= 3) {
        setScore(player.coins);
        setGameState('WIN');
        sound.win();
      }
    }

    // === ЧАСТИЦЫ ===
    g.particles = g.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      return p.life > 0;
    });

    // === КАМЕРА ===
    const targetCamX = player.x - w / 2;
    const targetCamY = player.y - h / 2;
    g.camX += (targetCamX - g.camX) * 0.08;
    g.camY += (targetCamY - g.camY) * 0.08;
    g.camX = Math.max(0, Math.min(WORLD_W - w, g.camX));
    g.camY = Math.max(0, Math.min(WORLD_H - h, g.camY));

    // === РЕНДЕРИНГ ===
    const cx = g.camX;
    const cy = g.camY;

    // Фон - асфальт/дороги
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, w, h);

    // Рисуем "траву" между зданиями
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(-cx, -cy, WORLD_W, WORLD_H);

    // Дороги (горизонтальные и вертикальные)
    ctx.fillStyle = '#666';
    // Горизонтальные дороги
    const roadYs = [13, 26, 39];
    for (const ry of roadYs) {
      ctx.fillRect(-cx, ry * TILE - cx * 0 + 0, WORLD_W, TILE);
      // Разметка
      ctx.fillStyle = '#FFD700';
      for (let x = 0; x < WORLD_W; x += 40) {
        ctx.fillRect(x - cx, ry * TILE + TILE / 2 - 1, 20, 2);
      }
      ctx.fillStyle = '#666';
    }
    // Вертикальные дороги
    const roadXs = [15, 27, 34];
    for (const rx of roadXs) {
      ctx.fillStyle = '#666';
      ctx.fillRect(rx * TILE, -cy, TILE, WORLD_H);
      ctx.fillStyle = '#FFD700';
      for (let y = 0; y < WORLD_H; y += 40) {
        ctx.fillRect(rx * TILE + TILE / 2 - 1, y - cy, 2, 20);
      }
    }

    // Тротуары
    ctx.fillStyle = '#999';
    for (const ry of roadYs) {
      ctx.fillRect(-cx, ry * TILE - 3, WORLD_W, 3);
      ctx.fillRect(-cx, (ry + 1) * TILE, WORLD_W, 3);
    }
    for (const rx of roadXs) {
      ctx.fillRect(rx * TILE - 3, -cy, 3, WORLD_H);
      ctx.fillRect((rx + 1) * TILE, -cy, 3, WORLD_H);
    }

    // Здания
    for (const b of buildings) {
      if (b.x + b.w < cx || b.x > cx + w || b.y + b.h < cy || b.y > cy + h) continue;
      drawBuilding(ctx, b, cx, cy, g.frame);
    }

    // Деревья
    for (const t of trees) {
      if (t.x < cx - 30 || t.x > cx + w + 30 || t.y < cy - 30 || t.y > cy + h + 30) continue;
      drawTree(ctx, t.x - cx, t.y - cy, t.size, t.type);
    }

    // Коллекционные предметы
    for (const c of collectibles) {
      if (c.collected) continue;
      const sx = c.x - cx;
      const sy = c.y - cy;
      if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;

      const bob = Math.sin(g.frame * 0.05 + c.x) * 3;

      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      if (c.type === 'coin') ctx.fillText('🪙', sx, sy + bob);
      else if (c.type === 'key') ctx.fillText('🔑', sx, sy + bob);
      else if (c.type === 'heart') ctx.fillText('❤️', sx, sy + bob);
      else if (c.type === 'star') ctx.fillText('⭐', sx, sy + bob);

      // Свечение
      ctx.fillStyle = c.type === 'key' ? 'rgba(255,215,0,0.2)' :
                      c.type === 'star' ? 'rgba(255,255,0,0.2)' :
                      c.type === 'heart' ? 'rgba(255,0,0,0.15)' :
                      'rgba(255,200,0,0.1)';
      ctx.beginPath();
      ctx.arc(sx, sy + bob, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // NPC
    for (const npc of npcs) {
      const sx = npc.x - cx;
      const sy = npc.y - cy;
      if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
      drawPerson(ctx, sx, sy, npc.direction, npc.frame, false, npc.color, npc.hairColor, '#FFDAB9', 26);

      // Имя над NPC
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(npc.name, sx, sy - 22);
      ctx.fillText(npc.name, sx, sy - 22);

      // Индикатор диалога
      const pDist = Math.sqrt((player.x - npc.x) ** 2 + (player.y - npc.y) ** 2);
      if (pDist < 60 && !g.dialogActive) {
        ctx.font = '14px serif';
        const talkBob = Math.sin(g.frame * 0.08) * 3;
        ctx.fillText('💬', sx, sy - 30 + talkBob);
      }
    }

    // Враги
    for (const e of enemies) {
      if (!e.active) continue;
      const sx = e.x - cx;
      const sy = e.y - cy;
      if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;

      if (e.type === 'dog') {
        drawDog(ctx, sx, sy, e.direction, e.frame);
      } else {
        drawGhost(ctx, sx, sy, e.frame);
      }
    }

    // Цель (партнёр)
    const gsx = goalPos.x - cx;
    const gsy = goalPos.y - cy;
    if (gsx > -50 && gsx < w + 50 && gsy > -50 && gsy < h + 50) {
      const partnerType = playerRef.current === 'sasha' ? 'anya' : 'sasha';
      const bodyColor = partnerType === 'sasha' ? '#4169E1' : '#FF69B4';
      const hairColor = partnerType === 'sasha' ? '#4A3728' : '#FFD700';
      const bob = Math.sin(g.frame * 0.04) * 3;
      drawPerson(ctx, gsx, gsy + bob, 'down', g.frame, false, bodyColor, hairColor, '#FFDAB9', 30);

      // Если ключей недостаточно - показать замок
      if (player.keys < 3) {
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', gsx, gsy - 25);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Нужно ${3 - player.keys} 🔑`, gsx, gsy - 35);
      }
    }

    // Игрок
    const psx = player.x - cx;
    const psy = player.y - cy;
    const pBodyColor = playerRef.current === 'sasha' ? '#4169E1' : '#FF69B4';
    const pHairColor = playerRef.current === 'sasha' ? '#4A3728' : '#FFD700';

    drawPerson(ctx, psx, psy, player.direction, player.frame, player.moving,
      pBodyColor, pHairColor, '#FFDAB9', PLAYER_SIZE, player.invincible);

    // Эффект супер-скорости
    if (player.superSpeed > 0) {
      ctx.fillStyle = 'rgba(255,255,0,0.3)';
      ctx.beginPath();
      ctx.arc(psx, psy, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Частицы
    for (const p of g.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cx, p.y - cy, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === UI ===
    // Жизни
    ctx.font = '22px serif';
    ctx.textAlign = 'left';
    let livesStr = '';
    for (let i = 0; i < player.lives; i++) livesStr += '❤️';
    ctx.fillText(livesStr, 10, 30);

    // Ключи
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`🔑 ${player.keys}/3`, 10, 55);
    ctx.fillText(`🔑 ${player.keys}/3`, 10, 55);

    // Монеты
    ctx.strokeText(`🪙 ${player.coins}`, 10, 78);
    ctx.fillText(`🪙 ${player.coins}`, 10, 78);

    // Супер-скорость
    if (player.superSpeed > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.strokeText(`⭐ ${Math.ceil(player.superSpeed / 60)}с`, 10, 100);
      ctx.fillText(`⭐ ${Math.ceil(player.superSpeed / 60)}с`, 10, 100);
    }

    // Мини-карта
    const mmW = 120;
    const mmH = 90;
    const mmX = w - mmW - 10;
    const mmY = 10;
    const mmScaleX = mmW / WORLD_W;
    const mmScaleY = mmH / WORLD_H;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
    ctx.fillStyle = '#3a6b30';
    ctx.fillRect(mmX, mmY, mmW, mmH);

    // Здания на мини-карте
    for (const b of buildings) {
      ctx.fillStyle = b.type === 'goal' ? '#FF69B4' :
                      b.type === 'park' ? '#228B22' :
                      b.type === 'fountain' ? '#4169E1' : '#888';
      ctx.fillRect(
        mmX + b.x * mmScaleX,
        mmY + b.y * mmScaleY,
        Math.max(2, b.w * mmScaleX),
        Math.max(2, b.h * mmScaleY)
      );
    }

    // Игрок на мини-карте
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(mmX + player.x * mmScaleX, mmY + player.y * mmScaleY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Цель на мини-карте
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(mmX + goalPos.x * mmScaleX, mmY + goalPos.y * mmScaleY, 3, 0, Math.PI * 2);
    ctx.fill();

    // NPC на мини-карте
    for (const npc of npcs) {
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(mmX + npc.x * mmScaleX, mmY + npc.y * mmScaleY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [checkBuildingCollision, checkTreeCollision, addParticles]);

  // ==========================================
  // Ресайз
  // ==========================================
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameRef.current) {
      gameRef.current.canvasW = canvas.width;
      gameRef.current.canvasH = canvas.height;
    }
  }, []);

  // ==========================================
  // Управление
  // ==========================================
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameRef.current) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') gameRef.current.keys.up = true;
    if (k === 'arrowdown' || k === 's') gameRef.current.keys.down = true;
    if (k === 'arrowleft' || k === 'a') gameRef.current.keys.left = true;
    if (k === 'arrowright' || k === 'd') gameRef.current.keys.right = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!gameRef.current) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') gameRef.current.keys.up = false;
    if (k === 'arrowdown' || k === 's') gameRef.current.keys.down = false;
    if (k === 'arrowleft' || k === 'a') gameRef.current.keys.left = false;
    if (k === 'arrowright' || k === 'd') gameRef.current.keys.right = false;
  }, []);

  // ==========================================
  // Эффекты
  // ==========================================
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const preventTouch = (e: TouchEvent) => {
      if (stateRef.current === 'PLAYING') e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('touchmove', preventTouch);
      cancelAnimationFrame(animRef.current);
    };
  }, [resizeCanvas, handleKeyDown, handleKeyUp, gameLoop]);

  // ==========================================
  // UI обработчики
  // ==========================================
  const handleSelectPlayer = (p: PlayerType) => setSelectedPlayer(p);

  const handleStart = () => {
    if (!selectedPlayer) return;
    resizeCanvas();
    initGame();
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    setGameState('MENU');
    setSelectedPlayer(null);
    setScore(0);
  };

  const handleDialogNext = () => {
    const g = gameRef.current;
    if (!g || !g.currentNPC) return;

    const npc = g.currentNPC;
    if (g.dialogStepLocal < npc.dialog.length - 1) {
      g.dialogStepLocal++;
      setDialogStep(g.dialogStepLocal);
      sound.dialog();
    } else {
      // Закрываем диалог
      g.dialogActive = false;
      g.currentNPC = null;
      setGameState('PLAYING');
    }
  };

  // Тач-джойстик
  const touchStartRef = useRef<Vec2 | null>(null);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartRef.current = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current || !gameRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - rect.left - rect.width / 2;
    const dy = clientY - rect.top - rect.height / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      gameRef.current.keys = { up: false, down: false, left: false, right: false };
      return;
    }

    const angle = Math.atan2(dy, dx);
    const keys = { up: false, down: false, left: false, right: false };

    if (angle > -Math.PI * 0.75 && angle < -Math.PI * 0.25) keys.up = true;
    if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) keys.down = true;
    if (angle > Math.PI * 0.75 || angle < -Math.PI * 0.75) keys.left = true;
    if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25) keys.right = true;

    gameRef.current.keys = keys;
  };

  const handleJoystickEnd = () => {
    touchStartRef.current = null;
    if (gameRef.current) {
      gameRef.current.keys = { up: false, down: false, left: false, right: false };
    }
  };

  // ==========================================
  // РЕНДЕР
  // ==========================================
  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* МЕНЮ */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/95 to-purple-950/95 z-10 overflow-y-auto py-4">
          <div className="text-center px-4 max-w-lg">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-1 drop-shadow-lg">
              Найди друг друга
            </h1>
            <p className="text-base md:text-lg text-pink-200 mb-6">❤️ Городское приключение ❤️</p>

            <h2 className="text-lg md:text-xl text-yellow-200 mb-4 font-semibold">
              За кого играем?
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-4">
              <button
                onClick={() => handleSelectPlayer('sasha')}
                className={`w-40 h-48 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  selectedPlayer === 'sasha'
                    ? 'bg-blue-500 scale-110 shadow-xl shadow-blue-500/50 ring-4 ring-blue-300'
                    : 'bg-blue-500/50 hover:bg-blue-500/70'
                }`}
              >
                <div className="w-16 h-20 relative mb-2">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-700" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFDAB9]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-4 rounded-t-full bg-[#4A3728]" />
                </div>
                <span className="text-white text-lg font-bold">Саша</span>
                <span className="text-blue-100 text-xs mt-1">ищет Аню</span>
              </button>

              <button
                onClick={() => handleSelectPlayer('anya')}
                className={`w-40 h-48 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  selectedPlayer === 'anya'
                    ? 'bg-pink-500 scale-110 shadow-xl shadow-pink-500/50 ring-4 ring-pink-300'
                    : 'bg-pink-500/50 hover:bg-pink-500/70'
                }`}
              >
                <div className="w-16 h-20 relative mb-2">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-pink-600" />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFDAB9]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-5 rounded-t-full bg-[#FFD700]" />
                </div>
                <span className="text-white text-lg font-bold">Аня</span>
                <span className="text-pink-100 text-xs mt-1">ищет Сашу</span>
              </button>
            </div>

            {selectedPlayer && (
              <p className="text-yellow-100 text-base mb-3 animate-pulse">
                Найди {selectedPlayer === 'sasha' ? 'Аню 💕' : 'Сашу 💕'} в городе!
              </p>
            )}

            <div className="bg-white/10 rounded-xl p-3 mb-4 text-left text-sm text-gray-200">
              <p className="font-bold text-yellow-200 mb-1">Как играть:</p>
              <p>🕹 Джойстик / WASD — движение</p>
              <p>🔑 Собери 3 ключа, чтобы открыть путь</p>
              <p>💬 Подходи к жителям — они дадут подсказки</p>
              <p>🐕 Остерегайся собак и призраков!</p>
            </div>

            <button
              onClick={handleStart}
              disabled={!selectedPlayer}
              className={`px-8 py-3 rounded-full text-lg font-bold transition-all ${
                selectedPlayer
                  ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg hover:scale-105 active:scale-95'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              🎮 Начать приключение
            </button>
          </div>
        </div>
      )}

      {/* ДИАЛОГ */}
      {gameState === 'DIALOG' && (
        <div className="absolute inset-0 flex items-end justify-center z-20 p-4 pointer-events-auto"
          onClick={handleDialogNext}
          onTouchStart={(e) => { e.preventDefault(); handleDialogNext(); }}
        >
          <div className="bg-gray-900/95 border-2 border-yellow-400 rounded-2xl p-4 max-w-md w-full mb-8">
            <p className="text-yellow-300 font-bold text-sm mb-1">{dialogName}</p>
            <p className="text-white text-base">{dialogText[dialogStep]}</p>
            <p className="text-gray-400 text-xs mt-2 text-right">
              {dialogStep + 1}/{dialogText.length} — нажми чтобы продолжить ▶
            </p>
          </div>
        </div>
      )}

      {/* ПОБЕДА */}
      {gameState === 'WIN' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-pink-900/95 to-red-950/95 z-10">
          <div className="text-center px-4">
            <div className="text-6xl mb-4 animate-bounce">💕</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {selectedPlayer === 'sasha'
                ? 'Саша нашёл Аню!'
                : 'Аня нашла Сашу!'}
            </h1>
            <p className="text-xl text-pink-200 mb-6">
              Они будут вместе навсегда ❤️
            </p>
            <div className="bg-white/10 rounded-xl p-4 mb-6 inline-block">
              <p className="text-yellow-200 text-lg">🪙 Монет: {score}</p>
            </div>
            <br />
            <button
              onClick={handleRestart}
              className="px-8 py-3 rounded-full text-lg font-bold bg-green-500 hover:bg-green-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🔄 Играть снова
            </button>
          </div>
        </div>
      )}

      {/* ПРОИГРЫШ */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/95 to-black/95 z-10">
          <div className="text-center px-4">
            <div className="text-6xl mb-4">😢</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Не сдавайся!</h1>
            <p className="text-xl text-gray-300 mb-6">Попробуй ещё раз 💪</p>
            <div className="bg-white/10 rounded-xl p-4 mb-6 inline-block">
              <p className="text-yellow-200 text-lg">🪙 Монет: {score}</p>
            </div>
            <br />
            <button
              onClick={handleRestart}
              className="px-8 py-3 rounded-full text-lg font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🔄 Заново
            </button>
          </div>
        </div>
      )}

      {/* Мобильный джойстик */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
          <div
            className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center relative"
            onTouchStart={(e) => { e.preventDefault(); handleJoystickStart(e); }}
            onTouchMove={(e) => { e.preventDefault(); handleJoystickMove(e); }}
            onTouchEnd={(e) => { e.preventDefault(); handleJoystickEnd(); }}
            onMouseDown={handleJoystickStart}
            onMouseMove={(e) => { if (touchStartRef.current) handleJoystickMove(e); }}
            onMouseUp={handleJoystickEnd}
            onMouseLeave={handleJoystickEnd}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/30 border-2 border-white/40" />
            {/* Стрелки-подсказки */}
            <span className="absolute top-2 text-white/40 text-xl">↑</span>
            <span className="absolute bottom-2 text-white/40 text-xl">↓</span>
            <span className="absolute left-2 text-white/40 text-xl">←</span>
            <span className="absolute right-2 text-white/40 text-xl">→</span>
          </div>
        </div>
      )}
    </div>
  );
}
