import { useEffect, useRef, useState } from 'react';

// ==========================================
// Типы
// ==========================================
type GameState = 'MENU' | 'PLAYING' | 'WIN' | 'GAME_OVER' | 'DIALOG';
type PlayerType = 'sasha' | 'anya';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Vec2 { x: number; y: number }

interface Building {
  x: number; y: number; w: number; h: number;
  color: string; roofColor: string;
  type: 'house' | 'shop' | 'cafe' | 'park' | 'fountain' | 'goal';
  label: string;
  doorSide: Direction;
}

interface Tree { x: number; y: number; size: number; type: 'round' | 'pine' }

interface NPC {
  x: number; y: number; name: string;
  color: string; hairColor: string;
  dialog: string[];
  direction: Direction; frame: number;
  isAnimal: 'none' | 'cat' | 'dog';
}

interface Collectible {
  x: number; y: number;
  type: 'key' | 'heart' | 'star' | 'coin';
  collected: boolean;
}

interface Enemy {
  x: number; y: number; speed: number;
  direction: Direction;
  type: 'dog' | 'ghost';
  patrolPoints: Vec2[];
  patrolIndex: number;
  frame: number; active: boolean;
}

interface Player {
  x: number; y: number;
  direction: Direction; speed: number;
  frame: number; moving: boolean;
  lives: number; invincible: number;
  keys: number; coins: number; superSpeed: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

// ==========================================
// Константы
// ==========================================
const TILE = 48;
const MAP_W = 80;
const MAP_H = 60;
const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
const PLAYER_SIZE = 28;
const MOVE_SPEED = 3;
const SUPER_SPEED = 5.5;

// ==========================================
// Генерация города
// ==========================================
function generateCity() {
  const buildings: Building[] = [];
  const trees: Tree[] = [];
  const npcs: NPC[] = [];
  const collectibles: Collectible[] = [];
  const enemies: Enemy[] = [];

  const addBuilding = (
    tx: number, ty: number, tw: number, th: number,
    type: Building['type'], label: string, color: string, roofColor: string,
  ) => {
    buildings.push({
      x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE,
      color, roofColor, type, label,
      doorSide: 'down',
    });
  };

  // Кварталы
  addBuilding(2, 2, 5, 4, 'house', 'Дом 🏠', '#D2691E', '#8B0000');
  addBuilding(9, 2, 4, 3, 'shop', 'Магазин 🛒', '#4682B4', '#2F4F4F');
  addBuilding(2, 8, 4, 3, 'cafe', 'Кафе ☕', '#DEB887', '#8B4513');
  addBuilding(9, 7, 5, 4, 'house', 'Дом 🏡', '#CD853F', '#A0522D');

  addBuilding(18, 2, 6, 5, 'house', 'Большой дом 🏘', '#BC8F8F', '#800000');
  addBuilding(26, 2, 4, 3, 'shop', 'Цветы 💐', '#FF69B4', '#C71585');
  addBuilding(18, 9, 5, 3, 'cafe', 'Пиццерия 🍕', '#F4A460', '#D2691E');
  addBuilding(25, 8, 5, 4, 'house', 'Дом 🏠', '#D2B48C', '#8B4513');

  addBuilding(2, 15, 5, 4, 'house', 'Дом 🏠', '#A0522D', '#654321');
  addBuilding(2, 21, 4, 3, 'shop', 'Книги 📚', '#6495ED', '#191970');
  addBuilding(9, 15, 4, 4, 'house', 'Дом 🏡', '#DEB887', '#8B4513');
  addBuilding(8, 21, 5, 3, 'cafe', 'Мороженое 🍦', '#FFB6C1', '#DB7093');

  addBuilding(17, 15, 8, 6, 'park', 'Парк 🌳', '#228B22', '#006400');
  addBuilding(19, 17, 3, 2, 'fountain', 'Фонтан ⛲', '#4169E1', '#1E90FF');

  addBuilding(28, 15, 5, 4, 'house', 'Дом 🏠', '#BC8F8F', '#800000');
  addBuilding(28, 21, 4, 3, 'shop', 'Игрушки 🧸', '#FFD700', '#DAA520');
  addBuilding(35, 15, 5, 5, 'house', 'Особняк 🏰', '#C0C0C0', '#696969');

  addBuilding(2, 28, 5, 4, 'house', 'Дом 🏠', '#D2691E', '#8B0000');
  addBuilding(9, 28, 4, 3, 'cafe', 'Пекарня 🥐', '#F5DEB3', '#D2691E');
  addBuilding(2, 34, 4, 4, 'shop', 'Кондитерская 🍰', '#FF69B4', '#C71585');
  addBuilding(9, 34, 5, 3, 'house', 'Дом 🏡', '#CD853F', '#A0522D');

  addBuilding(18, 28, 5, 4, 'house', 'Дом 🏠', '#DEB887', '#8B4513');
  addBuilding(25, 28, 4, 3, 'shop', 'Музыка 🎵', '#9370DB', '#4B0082');
  addBuilding(18, 34, 4, 4, 'cafe', 'Чайная 🍵', '#98FB98', '#2E8B57');
  addBuilding(25, 34, 5, 3, 'house', 'Дом 🏡', '#F0E68C', '#BDB76B');

  addBuilding(35, 28, 5, 4, 'house', 'Дом 🏠', '#BC8F8F', '#800000');
  addBuilding(35, 34, 4, 3, 'shop', 'Аптека 💊', '#87CEEB', '#4682B4');
  addBuilding(35, 2, 5, 5, 'house', 'Башня 🗼', '#B0C4DE', '#708090');

  // Деревья
  const treePositions = [
    { x: 17.5, y: 15.5 }, { x: 24, y: 15.5 }, { x: 17.5, y: 20 }, { x: 24, y: 20 },
    { x: 19, y: 16 }, { x: 23, y: 16 }, { x: 19, y: 19.5 }, { x: 23, y: 19.5 },
    { x: 1, y: 1 }, { x: 7.5, y: 1 }, { x: 14, y: 1 }, { x: 17, y: 1 },
    { x: 25, y: 1 }, { x: 31, y: 1 }, { x: 34, y: 1 },
    { x: 1, y: 13 }, { x: 7.5, y: 13 }, { x: 14, y: 13 },
    { x: 26, y: 13 }, { x: 33, y: 13 },
    { x: 1, y: 26 }, { x: 7.5, y: 26 }, { x: 14, y: 26 },
    { x: 26, y: 26 }, { x: 33, y: 26 },
    { x: 1, y: 39 }, { x: 7.5, y: 39 }, { x: 14, y: 39 },
    { x: 26, y: 39 }, { x: 33, y: 39 },
    { x: 15, y: 5 }, { x: 15, y: 10 }, { x: 30, y: 5 }, { x: 30, y: 10 },
    { x: 15, y: 30 }, { x: 15, y: 35 }, { x: 30, y: 30 }, { x: 30, y: 35 },
  ];
  for (const tp of treePositions) {
    trees.push({
      x: tp.x * TILE, y: tp.y * TILE,
      size: 14 + Math.random() * 8,
      type: Math.random() > 0.5 ? 'round' : 'pine',
    });
  }

  // NPC - люди
  npcs.push({ x: 7*TILE, y: 5*TILE, name: 'Бабушка Валя', color: '#FF69B4', hairColor: '#C0C0C0',
    dialog: ['Привет, милый! ❤️','Ты ищешь свою половинку?','Она в дальнем конце города!','Иди через парк 🌸'],
    direction: 'down', frame: 0, isAnimal: 'none' });
  npcs.push({ x: 22*TILE, y: 5*TILE, name: 'Дедушка Петя', color: '#4169E1', hairColor: '#FFF',
    dialog: ['Ого, кто к нам пришёл!','Собирай ключи 🔑 по дороге!','Они откроют путь к цели!','Удачи, дружище! 🍀'],
    direction: 'down', frame: 0, isAnimal: 'none' });
  npcs.push({ x: 20*TILE, y: 18*TILE, name: 'Кот Барсик', color: '#FF8C00', hairColor: '#FF8C00',
    dialog: ['Мяу! 🐱','Я видел кого-то у фонтана...','Но это был не тот, кого ты ищешь!','Иди дальше!'],
    direction: 'left', frame: 0, isAnimal: 'none' });
  npcs.push({ x: 30*TILE, y: 20*TILE, name: 'Почтальон Печкин', color: '#32CD32', hairColor: '#8B4513',
    dialog: ['А посылка-то для тебя есть!','Только ключиков не хватает...','Собери все 🔑 и иди к цели!','Она ждёт тебя! 💕'],
    direction: 'down', frame: 0, isAnimal: 'none' });
  npcs.push({ x: 5*TILE, y: 32*TILE, name: 'Девочка Маша', color: '#FF1493', hairColor: '#FFD700',
    dialog: ['Привет! Ты такой смелый!','Остерегайся собак на улице! 🐕','Они не злые, просто охраняют','свою территорию!'],
    direction: 'right', frame: 0, isAnimal: 'none' });

  // Кот Рыжик
  npcs.push({ x: 14*TILE, y: 14*TILE, name: 'Кот Рыжик', color: '#FF8C00', hairColor: '#FF6347',
    dialog: ['Мяу! Я Рыжик! 🐱','Я живу в этом районе давно.','Знаю все секретные тропинки!','Иди на восток, там есть ключ 🔑','Осторожнее с призраками 👻'],
    direction: 'left', frame: 0, isAnimal: 'cat' });

  // Пёс Персик
  npcs.push({ x: 26*TILE, y: 26*TILE, name: 'Пёс Персик', color: '#DEB887', hairColor: '#D2691E',
    dialog: ['Гав! Я Персик! 🐕','Не бойся моих братьев-собак!','Они просто играют в догонялки.','Прыгни на них сверху —','они убегут! 💪'],
    direction: 'up', frame: 0, isAnimal: 'dog' });

  // Коллекционные предметы
  const collectibleDefs = [
    { x: 4, y: 4, type: 'key' as const },
    { x: 28, y: 4, type: 'key' as const },
    { x: 20, y: 18, type: 'key' as const },
    { x: 6, y: 13, type: 'coin' as const }, { x: 14, y: 7, type: 'coin' as const },
    { x: 22, y: 13, type: 'coin' as const }, { x: 30, y: 7, type: 'coin' as const },
    { x: 6, y: 26, type: 'coin' as const }, { x: 14, y: 30, type: 'coin' as const },
    { x: 22, y: 26, type: 'coin' as const }, { x: 30, y: 30, type: 'coin' as const },
    { x: 37, y: 13, type: 'coin' as const }, { x: 37, y: 26, type: 'coin' as const },
    { x: 4, y: 37, type: 'coin' as const }, { x: 12, y: 37, type: 'coin' as const },
    { x: 10, y: 13, type: 'heart' as const }, { x: 30, y: 13, type: 'heart' as const },
    { x: 20, y: 37, type: 'heart' as const },
    { x: 14, y: 20, type: 'star' as const }, { x: 33, y: 37, type: 'star' as const },
  ];
  for (const c of collectibleDefs) {
    collectibles.push({ x: c.x*TILE, y: c.y*TILE, type: c.type, collected: false });
  }

  // Враги
  const enemyDefs = [
    { type: 'dog' as const, patrol: [{x:15,y:6},{x:15,y:12},{x:17,y:12},{x:17,y:6}], speed: 1.5 },
    { type: 'dog' as const, patrol: [{x:27,y:6},{x:27,y:12},{x:29,y:12},{x:29,y:6}], speed: 1.8 },
    { type: 'ghost' as const, patrol: [{x:15,y:27},{x:15,y:33},{x:17,y:33},{x:17,y:27}], speed: 1.2 },
    { type: 'dog' as const, patrol: [{x:27,y:27},{x:27,y:33},{x:29,y:33},{x:29,y:27}], speed: 1.6 },
    { type: 'ghost' as const, patrol: [{x:34,y:8},{x:34,y:12},{x:36,y:12},{x:36,y:8}], speed: 1.3 },
    { type: 'dog' as const, patrol: [{x:34,y:30},{x:34,y:37},{x:36,y:37},{x:36,y:30}], speed: 1.7 },
  ];
  for (const e of enemyDefs) {
    enemies.push({
      x: e.patrol[0].x*TILE, y: e.patrol[0].y*TILE,
      speed: e.speed, direction: 'down', type: e.type,
      patrolPoints: e.patrol.map(p => ({x: p.x*TILE, y: p.y*TILE})),
      patrolIndex: 0, frame: 0, active: true,
    });
  }

  addBuilding(36, 36, 3, 3, 'goal', 'Цель 💕', '#FF69B4', '#FF1493');
  const goalPos = { x: 37*TILE, y: 37*TILE };

  return { buildings, trees, npcs, collectibles, enemies, goalPos };
}

// ==========================================
// Звук
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;
  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }
  play(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
    } catch { /* ignore */ }
  }
  step() { this.play(100, 0.05, 'sine', 0.05); }
  coin() { this.play(800, 0.1); }
  key() { this.play(600, 0.15); this.play(900, 0.2); }
  heart() { this.play(500, 0.1); this.play(700, 0.15); }
  star() { this.play(400, 0.1); this.play(800, 0.15); this.play(1200, 0.2); }
  hurt() { this.play(200, 0.2, 'sawtooth', 0.3); }
  dialog() { this.play(600, 0.05, 'square', 0.1); }
  win() { [523,659,784,1047].forEach((f,i) => setTimeout(() => this.play(f, 0.3, 'sine', 0.25), i*150)); }
}
const sound = new SoundManager();

// ==========================================
// Рисование персонажей
// ==========================================
function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number,
  direction: Direction, frame: number, moving: boolean,
  bodyColor: string, hairColor: string, skinColor = '#FFDAB9',
  size = PLAYER_SIZE, invincible = 0) {
  if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;
  ctx.save();
  ctx.translate(x, y);
  const s = size;
  const legSwing = moving ? Math.sin(frame * 0.3) * 4 : 0;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, s*0.4, s*0.35, s*0.15, 0, 0, Math.PI*2);
  ctx.fill();

  let headOx = 0, headOy = -s*0.25;
  let leg1Ox = -s*0.15, leg2Ox = s*0.15;
  let leg1Oy = s*0.2, leg2Oy = s*0.2;
  let arm1Ox = -s*0.35, arm2Ox = s*0.35;
  let arm1Oy = 0, arm2Oy = 0;

  if (direction === 'up') { headOy = -s*0.3; leg1Oy = s*0.15+legSwing; leg2Oy = s*0.15-legSwing; arm1Oy = -legSwing*0.5; arm2Oy = legSwing*0.5; }
  else if (direction === 'down') { headOy = -s*0.15; leg1Oy = s*0.25+legSwing; leg2Oy = s*0.25-legSwing; arm1Oy = legSwing*0.5; arm2Oy = -legSwing*0.5; }
  else if (direction === 'left') { headOx = -s*0.1; headOy = -s*0.2; leg1Oy = s*0.2+legSwing; leg2Oy = s*0.2-legSwing; arm1Ox = -s*0.25; arm2Ox = s*0.15; arm1Oy = -legSwing*0.7; arm2Oy = legSwing*0.7; }
  else { headOx = s*0.1; headOy = -s*0.2; leg1Oy = s*0.2+legSwing; leg2Oy = s*0.2-legSwing; arm1Ox = -s*0.15; arm2Ox = s*0.25; arm1Oy = legSwing*0.7; arm2Oy = -legSwing*0.7; }

  // Ноги
  ctx.fillStyle = '#2F4F4F';
  ctx.beginPath(); ctx.ellipse(leg1Ox, leg1Oy, s*0.1, s*0.12, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(leg2Ox, leg2Oy, s*0.1, s*0.12, 0, 0, Math.PI*2); ctx.fill();
  // Тело
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.25, s*0.22, 0, 0, Math.PI*2); ctx.fill();
  // Руки
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.ellipse(arm1Ox, arm1Oy, s*0.08, s*0.1, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(arm2Ox, arm2Oy, s*0.08, s*0.1, 0, 0, Math.PI*2); ctx.fill();
  // Голова
  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.arc(headOx, headOy, s*0.2, 0, Math.PI*2); ctx.fill();
  // Волосы
  ctx.fillStyle = hairColor;
  if (direction === 'up') { ctx.beginPath(); ctx.arc(headOx, headOy, s*0.22, 0, Math.PI*2); ctx.fill(); }
  else if (direction === 'down') { ctx.beginPath(); ctx.arc(headOx, headOy-s*0.05, s*0.22, Math.PI, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(headOx, headOy-s*0.1, s*0.18, Math.PI*1.2, Math.PI*1.8); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(headOx, headOy-s*0.05, s*0.22, Math.PI*0.8, Math.PI*2.2); ctx.fill(); }
  // Глаза
  if (direction !== 'up') {
    ctx.fillStyle = '#000';
    const eyeOffX = direction === 'left' ? -s*0.08 : direction === 'right' ? s*0.08 : 0;
    const eyeSpread = direction === 'down' ? s*0.08 : s*0.04;
    ctx.beginPath(); ctx.arc(headOx+eyeOffX-eyeSpread, headOy+s*0.02, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(headOx+eyeOffX+eyeSpread, headOy+s*0.02, 2, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  const legSwing = Math.sin(frame * 0.3) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 10, 12, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#FF6347'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-4,-3); ctx.lineTo(-4,3); ctx.moveTo(0,-4); ctx.lineTo(0,4); ctx.moveTo(4,-3); ctx.lineTo(4,3); ctx.stroke();
  let hx = 0, hy = -7;
  if (direction === 'left') hx = -9;
  if (direction === 'right') hx = 9;
  if (direction === 'up') hy = -10;
  if (direction === 'down') hy = -4;
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FF6347';
  ctx.beginPath(); ctx.moveTo(hx-5,hy-3); ctx.lineTo(hx-3,hy-8); ctx.lineTo(hx-1,hy-3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx+5,hy-3); ctx.lineTo(hx+3,hy-8); ctx.lineTo(hx+1,hy-3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFB6C1';
  ctx.beginPath(); ctx.moveTo(hx-4,hy-4); ctx.lineTo(hx-3,hy-7); ctx.lineTo(hx-2,hy-4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx+4,hy-4); ctx.lineTo(hx+3,hy-7); ctx.lineTo(hx+2,hy-4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#32CD32';
  ctx.beginPath(); ctx.ellipse(hx-2.5, hy, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+2.5, hy, 2, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(hx-2.5, hy, 1, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+2.5, hy, 1, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FF69B4';
  ctx.beginPath(); ctx.moveTo(hx,hy+2); ctx.lineTo(hx-1.5,hy+3.5); ctx.lineTo(hx+1.5,hy+3.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(hx-3,hy+2); ctx.lineTo(hx-7,hy+1); ctx.moveTo(hx-3,hy+3); ctx.lineTo(hx-7,hy+3);
  ctx.moveTo(hx+3,hy+2); ctx.lineTo(hx+7,hy+1); ctx.moveTo(hx+3,hy+3); ctx.lineTo(hx+7,hy+3); ctx.stroke();
  ctx.fillStyle = '#FF6347';
  const lx1 = direction==='left'||direction==='right' ? -7 : -5;
  const lx2 = direction==='left'||direction==='right' ? 7 : 5;
  ctx.beginPath(); ctx.ellipse(lx1, 8+legSwing, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(lx2, 8-legSwing, 3, 2.5, 0, 0, Math.PI*2); ctx.fill();
  const tailWag = Math.sin(frame*0.4)*8;
  ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,-4); ctx.quadraticCurveTo(tailWag,-15,tailWag*1.2,-18); ctx.stroke();
  ctx.restore();
}

function drawPersik(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  const legSwing = Math.sin(frame * 0.3) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#DEB887';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
  let hx = 0, hy = -8;
  if (direction === 'left') hx = -10;
  if (direction === 'right') hx = 10;
  if (direction === 'up') hy = -12;
  if (direction === 'down') hy = -4;
  ctx.fillStyle = '#D2691E';
  ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#A0522D';
  ctx.beginPath(); ctx.ellipse(hx-6, hy-2, 4, 6, -0.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+6, hy-2, 4, 6, 0.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(hx-3, hy, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx+3, hy, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(hx, hy+3, 2.5, 0, Math.PI*2); ctx.fill();
  if (direction === 'down') { ctx.fillStyle = '#FF69B4'; ctx.beginPath(); ctx.ellipse(hx, hy+5, 2, 3, 0, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle = '#A0522D';
  const lx1 = direction==='left'||direction==='right' ? -8 : -6;
  const lx2 = direction==='left'||direction==='right' ? 8 : 6;
  ctx.beginPath(); ctx.ellipse(lx1, 10+legSwing, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(lx2, 10-legSwing, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  const tailWag = Math.sin(frame*0.5)*6;
  ctx.strokeStyle = '#DEB887'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,-5); ctx.quadraticCurveTo(tailWag,-18,tailWag*1.3,-22); ctx.stroke();
  ctx.restore();
}

function drawEnemyDog(ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  const legSwing = Math.sin(frame * 0.3) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 12, 14, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8B4513';
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
  let hx = 0, hy = -8;
  if (direction === 'left') hx = -10;
  if (direction === 'right') hx = 10;
  if (direction === 'up') hy = -12;
  if (direction === 'down') hy = -4;
  ctx.fillStyle = '#A0522D';
  ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#654321';
  ctx.beginPath(); ctx.ellipse(hx-5, hy-5, 3, 5, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+5, hy-5, 3, 5, 0.3, 0, Math.PI*2); ctx.fill();
  // Красные глаза (злой)
  ctx.fillStyle = '#FF0000';
  ctx.beginPath(); ctx.arc(hx-3, hy, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx+3, hy, 2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(hx, hy+3, 2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#654321';
  const lx1 = direction==='left'||direction==='right' ? -8 : -6;
  const lx2 = direction==='left'||direction==='right' ? 8 : 6;
  ctx.beginPath(); ctx.ellipse(lx1, 10+legSwing, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(lx2, 10-legSwing, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  const tailWag = Math.sin(frame*0.5)*5;
  ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,-5); ctx.quadraticCurveTo(tailWag,-18,tailWag*1.5,-20); ctx.stroke();
  ctx.restore();
}

function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(frame * 0.05) * 3;
  const alpha = 0.6 + Math.sin(frame * 0.03) * 0.2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#E0E0FF';
  ctx.beginPath(); ctx.arc(0, bob-5, 14, Math.PI, 0);
  ctx.lineTo(14, bob+10);
  for (let i = 0; i < 5; i++) { ctx.lineTo(14-i*7, bob+10+(i%2===0?5:0)); }
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(-5, bob-5, 3, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, bob-5, 3, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(-5, bob-6, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, bob-6, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.ellipse(0, bob+3, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, camX: number, camY: number, frame: number) {
  const sx = b.x - camX;
  const sy = b.y - camY;
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(sx+5, sy+5, b.w, b.h);
  ctx.fillStyle = b.color;
  ctx.fillRect(sx, sy, b.w, b.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, b.w, b.h);
  ctx.fillStyle = b.roofColor;
  ctx.fillRect(sx, sy, b.w, 8);

  if (b.type !== 'fountain' && b.type !== 'park') {
    ctx.fillStyle = '#87CEEB';
    const winSize = 12, winGap = 20;
    const cols = Math.floor((b.w-20)/winGap);
    const rows = Math.floor((b.h-30)/winGap);
    for (let r = 0; r < Math.min(rows, 3); r++) {
      for (let c = 0; c < Math.min(cols, 5); c++) {
        const wx = sx+12+c*winGap;
        const wy = sy+16+r*winGap;
        ctx.fillRect(wx, wy, winSize, winSize);
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, winSize, winSize);
        ctx.beginPath();
        ctx.moveTo(wx+winSize/2, wy); ctx.lineTo(wx+winSize/2, wy+winSize);
        ctx.moveTo(wx, wy+winSize/2); ctx.lineTo(wx+winSize, wy+winSize/2);
        ctx.stroke();
      }
    }
    // Дверь
    const doorW = 14, doorH = 20;
    const dx = sx + b.w/2 - doorW/2;
    const dy = sy + b.h - doorH;
    ctx.fillStyle = '#4A2800'; ctx.fillRect(dx, dy, doorW, doorH);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(dx+doorW-4, dy+doorH/2, 2, 0, Math.PI*2); ctx.fill();
  }

  if (b.type === 'fountain') {
    ctx.fillStyle = '#4169E1';
    ctx.beginPath(); ctx.ellipse(sx+b.w/2, sy+b.h/2, b.w*0.35, b.h*0.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#87CEFA';
    for (let i = 0; i < 5; i++) {
      const angle = frame*0.02 + i*Math.PI*2/5;
      const r = 8 + Math.sin(frame*0.05+i)*4;
      ctx.beginPath(); ctx.arc(sx+b.w/2+Math.cos(angle)*r, sy+b.h/2+Math.sin(angle)*r, 2, 0, Math.PI*2); ctx.fill();
    }
  }

  if (b.type === 'park') {
    ctx.fillStyle = '#32CD32'; ctx.fillRect(sx+2, sy+2, b.w-4, b.h-4);
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(sx+b.w/2-4, sy, 8, b.h);
    ctx.fillRect(sx, sy+b.h/2-4, b.w, 8);
  }

  if (b.type === 'goal') {
    const pulse = Math.sin(frame*0.05)*0.3+0.7;
    ctx.fillStyle = `rgba(255,105,180,${pulse*0.3})`;
    ctx.fillRect(sx-5, sy-5, b.w+10, b.h+10);
    ctx.font = '16px serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const angle = frame*0.02 + i*Math.PI*2/3;
      ctx.fillText('💕', sx+b.w/2+Math.cos(angle)*30, sy-10+Math.sin(angle)*10);
    }
  }

  if (b.label) {
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(b.label, sx+b.w/2, sy-5);
    ctx.fillStyle = '#FFF';
    ctx.fillText(b.label, sx+b.w/2, sy-5);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: 'round'|'pine') {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(x+3, y+size*0.6, size*0.6, size*0.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8B4513'; ctx.fillRect(x-3, y, 6, size*0.5);
  if (type === 'round') {
    ctx.fillStyle = '#228B22';
    ctx.beginPath(); ctx.arc(x, y-size*0.1, size*0.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.beginPath(); ctx.arc(x-3, y-size*0.2, size*0.35, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = '#006400';
    ctx.beginPath(); ctx.moveTo(x, y-size*0.8); ctx.lineTo(x-size*0.5, y+size*0.1); ctx.lineTo(x+size*0.5, y+size*0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#228B22';
    ctx.beginPath(); ctx.moveTo(x, y-size*0.6); ctx.lineTo(x-size*0.35, y); ctx.lineTo(x+size*0.35, y); ctx.closePath(); ctx.fill();
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
  const [nearbyNPC, setNearbyNPC] = useState<NPC | null>(null);

  // Все игровые данные в одном ref
  const gameRef = useRef<{
    player: Player;
    buildings: Building[];
    trees: Tree[];
    npcs: NPC[];
    collectibles: Collectible[];
    enemies: Enemy[];
    goalPos: Vec2;
    camX: number; camY: number;
    keys: { up: boolean; down: boolean; left: boolean; right: boolean };
    frame: number;
    canvasW: number; canvasH: number;
    particles: Particle[];
    stepTimer: number;
    dialogActive: boolean;
    currentNPC: NPC | null;
    dialogStepLocal: number;
    // Для джойстика
    joystickActive: boolean;
    joystickCenterX: number;
    joystickCenterY: number;
    // Ближайший NPC для кнопки взаимодействия
    nearestNPCForButton: NPC | null;
  } | null>(null);

  const animRef = useRef(0);
  const stateRef = useRef<GameState>('MENU');
  const playerRef = useRef<PlayerType | null>(null);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerRef.current = selectedPlayer; }, [selectedPlayer]);

  // Коллизии
  const checkCollision = (x: number, y: number, size: number, _buildings: Building[], trees: Tree[]): boolean => {
    const half = size / 2;
    // Здания проходимы — можно заходить внутрь!
    // Коллизия только с фонтаном и деревьями
    for (const t of trees) {
      const dx = x - t.x, dy = y - (t.y + t.size*0.2);
      if (Math.sqrt(dx*dx + dy*dy) < t.size*0.3 + half*0.5) return true;
    }
    // Фонтан — непроходимый
    const fountain = _buildings.find(b => b.type === 'fountain');
    if (fountain) {
      const cx = fountain.x + fountain.w/2, cy = fountain.y + fountain.h/2;
      if (Math.sqrt((x-cx)**2 + (y-cy)**2) < fountain.w*0.3 + half) return true;
    }
    return false;
  };

  const addParticles = (x: number, y: number, color: string, count: number) => {
    if (!gameRef.current) return;
    for (let i = 0; i < count; i++) {
      gameRef.current.particles.push({
        x, y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
        life: 30+Math.random()*20, maxLife: 50, color, size: 2+Math.random()*3,
      });
    }
  };

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const city = generateCity();
    gameRef.current = {
      player: {
        x: 7.5 * TILE, y: 6.5 * TILE,
        direction: 'down', speed: MOVE_SPEED,
        frame: 0, moving: false,
        lives: 3, invincible: 0,
        keys: 0, coins: 0, superSpeed: 0,
      },
      buildings: city.buildings,
      trees: city.trees,
      npcs: city.npcs,
      collectibles: city.collectibles,
      enemies: city.enemies,
      goalPos: city.goalPos,
      camX: 0, camY: 0,
      keys: { up: false, down: false, left: false, right: false },
      frame: 0,
      canvasW: canvas.width, canvasH: canvas.height,
      particles: [],
      stepTimer: 0,
      dialogActive: false,
      currentNPC: null,
      dialogStepLocal: 0,
      joystickActive: false,
      joystickCenterX: 0,
      joystickCenterY: 0,
      nearestNPCForButton: null,
    };
  };

  // ==========================================
  // Игровой цикл (стабильный, без зависимостей)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ресайз
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameRef.current) {
        gameRef.current.canvasW = canvas.width;
        gameRef.current.canvasH = canvas.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Клавиатура
    const onKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') gameRef.current.keys.up = true;
      if (k === 'arrowdown' || k === 's') gameRef.current.keys.down = true;
      if (k === 'arrowleft' || k === 'a') gameRef.current.keys.left = true;
      if (k === 'arrowright' || k === 'd') gameRef.current.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') gameRef.current.keys.up = false;
      if (k === 'arrowdown' || k === 's') gameRef.current.keys.down = false;
      if (k === 'arrowleft' || k === 'a') gameRef.current.keys.left = false;
      if (k === 'arrowright' || k === 'd') gameRef.current.keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Предотвращение скролла
    const preventTouch = (e: TouchEvent) => {
      if (stateRef.current === 'PLAYING') e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    // Основной цикл
    const loop = () => {
      const g = gameRef.current;
      const w = canvas.width;
      const h = canvas.height;

      if (g && stateRef.current === 'PLAYING') {
        g.frame++;
        const { player, buildings, trees, npcs, collectibles, enemies, goalPos } = g;

        if (!g.dialogActive) {
          // Движение
          let dx = 0, dy = 0;
          const spd = player.superSpeed > 0 ? SUPER_SPEED : MOVE_SPEED;
          if (g.keys.up) { dy = -spd; player.direction = 'up'; }
          if (g.keys.down) { dy = spd; player.direction = 'down'; }
          if (g.keys.left) { dx = -spd; player.direction = 'left'; }
          if (g.keys.right) { dx = spd; player.direction = 'right'; }
          if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

          player.moving = dx !== 0 || dy !== 0;
          if (player.moving) player.frame++;

          if (player.moving) { g.stepTimer++; if (g.stepTimer % 15 === 0) sound.step(); }

          // Движение по X
          const newX = player.x + dx;
          if (!checkCollision(newX, player.y, PLAYER_SIZE, buildings, trees) &&
              newX > PLAYER_SIZE/2 && newX < WORLD_W - PLAYER_SIZE/2) {
            player.x = newX;
          }
          // Движение по Y
          const newY = player.y + dy;
          if (!checkCollision(player.x, newY, PLAYER_SIZE, buildings, trees) &&
              newY > PLAYER_SIZE/2 && newY < WORLD_H - PLAYER_SIZE/2) {
            player.y = newY;
          }

          if (player.invincible > 0) player.invincible--;
          if (player.superSpeed > 0) player.superSpeed--;

          // Сбор предметов
          for (const c of collectibles) {
            if (c.collected) continue;
            const dist = Math.sqrt((player.x-c.x)**2 + (player.y-c.y)**2);
            if (dist < 25) {
              c.collected = true;
              if (c.type === 'coin') { player.coins += 10; sound.coin(); addParticles(c.x, c.y, '#FFD700', 8); }
              else if (c.type === 'key') { player.keys++; sound.key(); addParticles(c.x, c.y, '#FFD700', 12); }
              else if (c.type === 'heart') { if (player.lives < 5) player.lives++; sound.heart(); addParticles(c.x, c.y, '#FF0000', 10); }
              else if (c.type === 'star') { player.superSpeed = 300; sound.star(); addParticles(c.x, c.y, '#FFFF00', 15); }
            }
          }

          // NPC — ищем ближайшего для кнопки взаимодействия
          let closestNPC: NPC | null = null;
          let closestDist = Infinity;
          for (const npc of npcs) {
            npc.frame++;
            const dist = Math.sqrt((player.x-npc.x)**2 + (player.y-npc.y)**2);
            if (dist < 55 && dist < closestDist) {
              closestDist = dist;
              closestNPC = npc;
            }
          }
          // Обновляем ближайшего NPC для кнопки
          if (closestNPC !== g.nearestNPCForButton) {
            g.nearestNPCForButton = closestNPC;
            setNearbyNPC(closestNPC);
          }

          // Враги
          for (const e of enemies) {
            if (!e.active) continue;
            e.frame++;
            const target = e.patrolPoints[e.patrolIndex];
            const edx = target.x - e.x, edy = target.y - e.y;
            const eDist = Math.sqrt(edx*edx + edy*edy);
            if (eDist < 5) {
              e.patrolIndex = (e.patrolIndex + 1) % e.patrolPoints.length;
            } else {
              e.x += (edx/eDist) * e.speed;
              e.y += (edy/eDist) * e.speed;
              if (Math.abs(edx) > Math.abs(edy)) e.direction = edx > 0 ? 'right' : 'left';
              else e.direction = edy > 0 ? 'down' : 'up';
            }
            const pDist = Math.sqrt((player.x-e.x)**2 + (player.y-e.y)**2);
            if (pDist < 25 && player.invincible <= 0) {
              player.lives--;
              player.invincible = 90;
              sound.hurt();
              addParticles(player.x, player.y, '#FF0000', 10);
              const pushDx = player.x - e.x, pushDy = player.y - e.y;
              const pushDist = Math.sqrt(pushDx*pushDx + pushDy*pushDy) || 1;
              player.x += (pushDx/pushDist) * 30;
              player.y += (pushDy/pushDist) * 30;
              if (player.lives <= 0) { setScore(player.coins); setGameState('GAME_OVER'); }
            }
          }

          // Цель
          const goalDist = Math.sqrt((player.x-goalPos.x)**2 + (player.y-goalPos.y)**2);
          if (goalDist < 40 && player.keys >= 3) {
            setScore(player.coins);
            setGameState('WIN');
            sound.win();
          }
        }

        // Частицы
        g.particles = g.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; return p.life > 0; });

        // Камера
        const targetCamX = player.x - w/2;
        const targetCamY = player.y - h/2;
        g.camX += (targetCamX - g.camX) * 0.08;
        g.camY += (targetCamY - g.camY) * 0.08;
        g.camX = Math.max(0, Math.min(WORLD_W - w, g.camX));
        g.camY = Math.max(0, Math.min(WORLD_H - h, g.camY));

        // === РЕНДЕР ===
        const cx = g.camX, cy = g.camY;
        ctx.fillStyle = '#4a7c3f';
        ctx.fillRect(-cx, -cy, WORLD_W, WORLD_H);

        // Дороги
        ctx.fillStyle = '#666';
        const roadYs = [13, 26, 39];
        for (const ry of roadYs) {
          ctx.fillRect(-cx, ry*TILE, WORLD_W, TILE);
          ctx.fillStyle = '#FFD700';
          for (let x = 0; x < WORLD_W; x += 40) ctx.fillRect(x-cx, ry*TILE+TILE/2-1, 20, 2);
          ctx.fillStyle = '#666';
        }
        const roadXs = [15, 27, 34];
        for (const rx of roadXs) {
          ctx.fillStyle = '#666';
          ctx.fillRect(rx*TILE, -cy, TILE, WORLD_H);
          ctx.fillStyle = '#FFD700';
          for (let y = 0; y < WORLD_H; y += 40) ctx.fillRect(rx*TILE+TILE/2-1, y-cy, 2, 20);
        }
        // Тротуары
        ctx.fillStyle = '#999';
        for (const ry of roadYs) {
          ctx.fillRect(-cx, ry*TILE-3, WORLD_W, 3);
          ctx.fillRect(-cx, (ry+1)*TILE, WORLD_W, 3);
        }
        for (const rx of roadXs) {
          ctx.fillRect(rx*TILE-3, -cy, 3, WORLD_H);
          ctx.fillRect((rx+1)*TILE, -cy, 3, WORLD_H);
        }

        // Здания
        for (const b of buildings) {
          if (b.x+b.w < cx || b.x > cx+w || b.y+b.h < cy || b.y > cy+h) continue;
          drawBuilding(ctx, b, cx, cy, g.frame);
        }
        // Деревья
        for (const t of trees) {
          if (t.x < cx-30 || t.x > cx+w+30 || t.y < cy-30 || t.y > cy+h+30) continue;
          drawTree(ctx, t.x-cx, t.y-cy, t.size, t.type);
        }
        // Предметы
        for (const c of collectibles) {
          if (c.collected) continue;
          const sx = c.x-cx, sy = c.y-cy;
          if (sx < -30 || sx > w+30 || sy < -30 || sy > h+30) continue;
          const bob = Math.sin(g.frame*0.05+c.x)*3;
          ctx.font = '20px serif'; ctx.textAlign = 'center';
          if (c.type === 'coin') ctx.fillText('🪙', sx, sy+bob);
          else if (c.type === 'key') ctx.fillText('🔑', sx, sy+bob);
          else if (c.type === 'heart') ctx.fillText('❤️', sx, sy+bob);
          else if (c.type === 'star') ctx.fillText('⭐', sx, sy+bob);
          ctx.fillStyle = c.type==='key'?'rgba(255,215,0,0.2)':c.type==='star'?'rgba(255,255,0,0.2)':c.type==='heart'?'rgba(255,0,0,0.15)':'rgba(255,200,0,0.1)';
          ctx.beginPath(); ctx.arc(sx, sy+bob, 15, 0, Math.PI*2); ctx.fill();
        }
        // NPC
        for (const npc of npcs) {
          const sx = npc.x-cx, sy = npc.y-cy;
          if (sx < -40 || sx > w+40 || sy < -40 || sy > h+40) continue;
          if (npc.isAnimal === 'cat') drawCat(ctx, sx, sy, npc.direction, npc.frame);
          else if (npc.name === 'Пёс Персик') drawPersik(ctx, sx, sy, npc.direction, npc.frame);
          else drawPerson(ctx, sx, sy, npc.direction, npc.frame, false, npc.color, npc.hairColor, '#FFDAB9', 26);
          ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
          ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
          ctx.strokeText(npc.name, sx, sy-22);
          ctx.fillStyle = '#FFF';
          ctx.fillText(npc.name, sx, sy-22);
          const pDist = Math.sqrt((player.x-npc.x)**2 + (player.y-npc.y)**2);
          if (pDist < 55 && !g.dialogActive) {
            // Индикатор — можно поговорить
            ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            const bobY = Math.sin(g.frame*0.08)*3;
            ctx.strokeText('💬 Тап!', sx, sy-30+bobY);
            ctx.fillText('💬 Тап!', sx, sy-30+bobY);
          }
        }
        // Враги
        for (const e of enemies) {
          if (!e.active) continue;
          const sx = e.x-cx, sy = e.y-cy;
          if (sx < -40 || sx > w+40 || sy < -40 || sy > h+40) continue;
          if (e.type === 'dog') drawEnemyDog(ctx, sx, sy, e.direction, e.frame);
          else drawGhost(ctx, sx, sy, e.frame);
        }
        // Цель
        const gsx = goalPos.x-cx, gsy = goalPos.y-cy;
        if (gsx > -50 && gsx < w+50 && gsy > -50 && gsy < h+50) {
          const partnerType = playerRef.current === 'sasha' ? 'anya' : 'sasha';
          const bodyColor = partnerType === 'sasha' ? '#4169E1' : '#FF69B4';
          const hairColor = partnerType === 'sasha' ? '#4A3728' : '#FFD700';
          drawPerson(ctx, gsx, gsy+Math.sin(g.frame*0.04)*3, 'down', g.frame, false, bodyColor, hairColor, '#FFDAB9', 30);
          if (player.keys < 3) {
            ctx.font = '20px serif'; ctx.textAlign = 'center';
            ctx.fillText('🔒', gsx, gsy-25);
            ctx.font = '10px sans-serif'; ctx.fillStyle = '#FFD700';
            ctx.fillText(`Нужно ${3-player.keys} 🔑`, gsx, gsy-35);
          }
        }
        // Игрок
        const psx = player.x-cx, psy = player.y-cy;
        const pBodyColor = playerRef.current === 'sasha' ? '#4169E1' : '#FF69B4';
        const pHairColor = playerRef.current === 'sasha' ? '#4A3728' : '#FFD700';
        drawPerson(ctx, psx, psy, player.direction, player.frame, player.moving, pBodyColor, pHairColor, '#FFDAB9', PLAYER_SIZE, player.invincible);
        if (player.superSpeed > 0) {
          ctx.fillStyle = 'rgba(255,255,0,0.3)';
          ctx.beginPath(); ctx.arc(psx, psy, 20, 0, Math.PI*2); ctx.fill();
        }
        // Частицы
        for (const p of g.particles) {
          ctx.globalAlpha = p.life/p.maxLife;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x-cx, p.y-cy, p.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // UI
        ctx.font = '22px serif'; ctx.textAlign = 'left';
        let livesStr = '';
        for (let i = 0; i < player.lives; i++) livesStr += '❤️';
        ctx.fillText(livesStr, 10, 30);
        ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeText(`🔑 ${player.keys}/3`, 10, 55);
        ctx.fillText(`🔑 ${player.keys}/3`, 10, 55);
        ctx.strokeText(`🪙 ${player.coins}`, 10, 78);
        ctx.fillText(`🪙 ${player.coins}`, 10, 78);
        if (player.superSpeed > 0) {
          ctx.fillStyle = '#FFD700';
          ctx.strokeText(`⭐ ${Math.ceil(player.superSpeed/60)}с`, 10, 100);
          ctx.fillText(`⭐ ${Math.ceil(player.superSpeed/60)}с`, 10, 100);
        }

        // Мини-карта
        const mmW = 120, mmH = 90;
        const mmX = w-mmW-10, mmY = 10;
        const mmScaleX = mmW/WORLD_W, mmScaleY = mmH/WORLD_H;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(mmX-2, mmY-2, mmW+4, mmH+4);
        ctx.fillStyle = '#3a6b30';
        ctx.fillRect(mmX, mmY, mmW, mmH);
        for (const b of buildings) {
          ctx.fillStyle = b.type==='goal'?'#FF69B4':b.type==='park'?'#228B22':b.type==='fountain'?'#4169E1':'#888';
          ctx.fillRect(mmX+b.x*mmScaleX, mmY+b.y*mmScaleY, Math.max(2,b.w*mmScaleX), Math.max(2,b.h*mmScaleY));
        }
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(mmX+player.x*mmScaleX, mmY+player.y*mmScaleY, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(mmX+goalPos.x*mmScaleX, mmY+goalPos.y*mmScaleY, 3, 0, Math.PI*2); ctx.fill();
        for (const npc of npcs) {
          ctx.fillStyle = '#00FF00';
          ctx.beginPath(); ctx.arc(mmX+npc.x*mmScaleX, mmY+npc.y*mmScaleY, 2, 0, Math.PI*2); ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('touchmove', preventTouch);
      cancelAnimationFrame(animRef.current);
    };
  }, []); // Пустой массив — эффект запускается ОДИН раз

  // ==========================================
  // UI обработчики
  // ==========================================
  const handleSelectPlayer = (p: PlayerType) => setSelectedPlayer(p);

  const handleStart = () => {
    if (!selectedPlayer) return;
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
    initGame();
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    setGameState('MENU');
    setSelectedPlayer(null);
    setScore(0);
  };

  const handleTalkToNPC = () => {
    const g = gameRef.current;
    if (!g || !g.nearestNPCForButton) return;
    const npc = g.nearestNPCForButton;
    g.dialogActive = true;
    g.currentNPC = npc;
    g.dialogStepLocal = 0;
    setDialogText(npc.dialog);
    setDialogName(npc.name);
    setDialogStep(0);
    setNearbyNPC(null);
    setGameState('DIALOG');
    sound.dialog();
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
      g.dialogActive = false;
      g.currentNPC = null;
      setGameState('PLAYING');
    }
  };

  // ==========================================
  // Джойстик
  // ==========================================
  const joystickRef = useRef<HTMLDivElement>(null);

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gameRef.current || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    gameRef.current.joystickActive = true;
    gameRef.current.joystickCenterX = rect.left + rect.width / 2;
    gameRef.current.joystickCenterY = rect.top + rect.height / 2;
    updateJoystick(e);
  };

  const updateJoystick = (e: React.TouchEvent | React.MouseEvent) => {
    if (!gameRef.current || !gameRef.current.joystickActive) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - gameRef.current.joystickCenterX;
    const dy = clientY - gameRef.current.joystickCenterY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 15) {
      gameRef.current.keys = { up: false, down: false, left: false, right: false };
      return;
    }

    const angle = Math.atan2(dy, dx);
    const keys = { up: false, down: false, left: false, right: false };
    if (angle > -Math.PI*0.75 && angle < -Math.PI*0.25) keys.up = true;
    if (angle > Math.PI*0.25 && angle < Math.PI*0.75) keys.down = true;
    if (angle > Math.PI*0.75 || angle < -Math.PI*0.75) keys.left = true;
    if (angle > -Math.PI*0.25 && angle < Math.PI*0.25) keys.right = true;
    gameRef.current.keys = keys;
  };

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!gameRef.current) return;
    gameRef.current.joystickActive = false;
    gameRef.current.keys = { up: false, down: false, left: false, right: false };
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
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-1 drop-shadow-lg">Найди друг друга</h1>
            <p className="text-base md:text-lg text-pink-200 mb-6">❤️ Городское приключение ❤️</p>
            <h2 className="text-lg md:text-xl text-yellow-200 mb-4 font-semibold">За кого играем?</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-4">
              <button onClick={() => handleSelectPlayer('sasha')}
                className={`w-40 h-48 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${selectedPlayer==='sasha'?'bg-blue-500 scale-110 shadow-xl shadow-blue-500/50 ring-4 ring-blue-300':'bg-blue-500/50 hover:bg-blue-500/70'}`}>
                <div className="w-16 h-20 relative mb-2">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-700" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#FFDAB9]" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-4 rounded-t-full bg-[#4A3728]" />
                </div>
                <span className="text-white text-lg font-bold">Саша</span>
                <span className="text-blue-100 text-xs mt-1">ищет Аню</span>
              </button>
              <button onClick={() => handleSelectPlayer('anya')}
                className={`w-40 h-48 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${selectedPlayer==='anya'?'bg-pink-500 scale-110 shadow-xl shadow-pink-500/50 ring-4 ring-pink-300':'bg-pink-500/50 hover:bg-pink-500/70'}`}>
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
                Найди {selectedPlayer==='sasha'?'Аню 💕':'Сашу 💕'} в городе!
              </p>
            )}
            <div className="bg-white/10 rounded-xl p-3 mb-4 text-left text-sm text-gray-200">
              <p className="font-bold text-yellow-200 mb-1">Как играть:</p>
              <p>🕹 Джойстик / WASD — движение</p>
              <p>🔑 Собери 3 ключа, чтобы открыть путь</p>
              <p>💬 Подходи к жителям — они дадут подсказки</p>
              <p>🐱 Кот Рыжик и 🐕 Пёс Персик ждут тебя!</p>
              <p>🐕 Остерегайся злых собак и призраков!</p>
            </div>
            <button onClick={handleStart} disabled={!selectedPlayer}
              className={`px-8 py-3 rounded-full text-lg font-bold transition-all ${selectedPlayer?'bg-green-500 hover:bg-green-400 text-white shadow-lg hover:scale-105 active:scale-95':'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
              🎮 Начать приключение
            </button>
          </div>
        </div>
      )}

      {/* ДИАЛОГ */}
      {gameState === 'DIALOG' && (
        <div className="absolute inset-0 flex items-end justify-center z-20 p-4 pointer-events-none">
          <div className="bg-gray-900/95 border-2 border-yellow-400 rounded-2xl p-4 max-w-md w-full mb-8 pointer-events-auto">
            <p className="text-yellow-300 font-bold text-sm mb-1">{dialogName}</p>
            <p className="text-white text-base mb-3">{dialogText[dialogStep]}</p>
            <div className="flex justify-end gap-2">
              {dialogStep < dialogText.length - 1 ? (
                <button
                  onClick={handleDialogNext}
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleDialogNext(); }}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm active:scale-95 transition-all">
                  Далее ▶
                </button>
              ) : (
                <button
                  onClick={handleDialogNext}
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleDialogNext(); }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white font-bold rounded-lg text-sm active:scale-95 transition-all">
                  Закрыть ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ПОБЕДА */}
      {gameState === 'WIN' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-pink-900/95 to-red-950/95 z-10">
          <div className="text-center px-4">
            <div className="text-6xl mb-4 animate-bounce">💕</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {selectedPlayer==='sasha'?'Саша нашёл Аню!':'Аня нашла Сашу!'}
            </h1>
            <p className="text-xl text-pink-200 mb-6">Они будут вместе навсегда ❤️</p>
            <div className="bg-white/10 rounded-xl p-4 mb-6 inline-block">
              <p className="text-yellow-200 text-lg">🪙 Монет: {score}</p>
            </div>
            <br/>
            <button onClick={handleRestart}
              className="px-8 py-3 rounded-full text-lg font-bold bg-green-500 hover:bg-green-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
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
            <br/>
            <button onClick={handleRestart}
              className="px-8 py-3 rounded-full text-lg font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
              🔄 Заново
            </button>
          </div>
        </div>
      )}

      {/* Кнопка разговора */}
      {gameState === 'PLAYING' && nearbyNPC && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <button
            onClick={handleTalkToNPC}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleTalkToNPC(); }}
            className="px-5 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full text-base shadow-lg shadow-yellow-500/30 active:scale-95 transition-all animate-pulse border-2 border-yellow-300">
            💬 Поговорить
          </button>
        </div>
      )}

      {/* Джойстик */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
          <div ref={joystickRef}
            className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center relative touch-none"
            onTouchStart={handleJoystickStart}
            onTouchMove={(e) => { e.preventDefault(); updateJoystick(e); }}
            onTouchEnd={handleJoystickEnd}
            onMouseDown={handleJoystickStart}
            onMouseMove={(e) => { if (gameRef.current?.joystickActive) updateJoystick(e); }}
            onMouseUp={handleJoystickEnd}
            onMouseLeave={() => { if (gameRef.current?.joystickActive) { gameRef.current.joystickActive = false; gameRef.current.keys = {up:false,down:false,left:false,right:false}; }}}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/30 border-2 border-white/40" />
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
