import { useEffect, useRef, useState, useCallback } from 'react';

// ==========================================
// Типы и константы
// ==========================================
type GameState = 'MENU' | 'PLAYING' | 'WIN' | 'GAME_OVER';
type PlayerType = 'sasha' | 'anya';

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  type: 'coin' | 'heart' | 'star';
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  minX: number;
  maxX: number;
  alive: boolean;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: number; // 1 = right, -1 = left
  lives: number;
  invincible: number; // таймер неуязвимости
  superJump: number; // таймер супер-прыжка
  frame: number; // анимация
}

// Константы физики
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const SUPER_JUMP_FORCE = -18;
const MOVE_SPEED = 4;
const FRICTION = 0.85;
const LEVEL_WIDTH = 4000;
const GROUND_Y_OFFSET = 100; // отступ от низа canvas

// ==========================================
// Генерация уровня
// ==========================================
function generateLevel(): { platforms: Platform[]; coins: Coin[]; enemies: Enemy[]; goalX: number } {
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];

  // Земля (пол)
  platforms.push({ x: 0, y: 0, width: LEVEL_WIDTH, height: 40 }); // будет позиционирован относительно canvas bottom

  // Платформы по уровню
  const platformDefs = [
    // Стартовая зона
    { x: 200, y: -120, w: 150 },
    { x: 420, y: -200, w: 120 },
    { x: 600, y: -150, w: 180 },
    // Средняя зона
    { x: 900, y: -180, w: 140 },
    { x: 1100, y: -250, w: 100 },
    { x: 1300, y: -160, w: 200 },
    { x: 1550, y: -220, w: 130 },
    { x: 1750, y: -140, w: 160 },
    // Дальняя зона
    { x: 2000, y: -200, w: 150 },
    { x: 2250, y: -270, w: 120 },
    { x: 2450, y: -180, w: 180 },
    { x: 2700, y: -230, w: 140 },
    { x: 2900, y: -150, w: 200 },
    // Финальная зона
    { x: 3200, y: -190, w: 160 },
    { x: 3450, y: -250, w: 130 },
    { x: 3650, y: -130, w: 250 },
  ];

  for (const p of platformDefs) {
    platforms.push({ x: p.x, y: p.y, width: p.w, height: 20 });
  }

  // Монеты
  const coinPositions = [
    { x: 250, y: -160, type: 'coin' as const },
    { x: 470, y: -240, type: 'coin' as const },
    { x: 650, y: -190, type: 'coin' as const },
    { x: 950, y: -220, type: 'coin' as const },
    { x: 1150, y: -290, type: 'heart' as const },
    { x: 1350, y: -200, type: 'coin' as const },
    { x: 1600, y: -260, type: 'coin' as const },
    { x: 1800, y: -180, type: 'star' as const },
    { x: 2050, y: -240, type: 'coin' as const },
    { x: 2300, y: -310, type: 'coin' as const },
    { x: 2500, y: -220, type: 'heart' as const },
    { x: 2750, y: -270, type: 'coin' as const },
    { x: 2950, y: -190, type: 'coin' as const },
    { x: 3250, y: -230, type: 'coin' as const },
    { x: 3500, y: -290, type: 'star' as const },
    { x: 3700, y: -170, type: 'coin' as const },
  ];

  for (const c of coinPositions) {
    coins.push({ x: c.x, y: c.y, collected: false, type: c.type });
  }

  // Враги
  const enemyDefs = [
    { x: 500, y: -40, minX: 400, maxX: 700 },
    { x: 1200, y: -40, minX: 1100, maxX: 1500 },
    { x: 1900, y: -40, minX: 1750, maxX: 2100 },
    { x: 2600, y: -40, minX: 2450, maxX: 2800 },
    { x: 3100, y: -40, minX: 2900, maxX: 3300 },
    { x: 3600, y: -40, minX: 3450, maxX: 3800 },
  ];

  for (const e of enemyDefs) {
    enemies.push({
      x: e.x,
      y: e.y,
      width: 35,
      height: 35,
      vx: 1.5,
      minX: e.minX,
      maxX: e.maxX,
      alive: true,
    });
  }

  return { platforms, coins, enemies, goalX: LEVEL_WIDTH - 150 };
}

// ==========================================
// Звуковые эффекты через Web Audio API
// ==========================================
class SoundManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playJump() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* ignore */ }
  }

  playCoin() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* ignore */ }
  }

  playWin() {
    try {
      const ctx = this.getCtx();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch (e) { /* ignore */ }
  }

  playHurt() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* ignore */ }
  }

  playEnemyDeath() {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* ignore */ }
  }
}

const soundManager = new SoundManager();

// ==========================================
// Основной компонент игры
// ==========================================
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerType | null>(null);
  const [score, setScore] = useState(0);
  const [enemiesKilled, setEnemiesKilled] = useState(0);

  // Игровые данные в ref для игрового цикла
  const gameDataRef = useRef<{
    player: Player;
    platforms: Platform[];
    coins: Coin[];
    enemies: Enemy[];
    goalX: number;
    cameraX: number;
    keys: { left: boolean; right: boolean; jump: boolean };
    score: number;
    enemiesKilled: number;
    animFrame: number;
    canvasWidth: number;
    canvasHeight: number;
    groundY: number;
  } | null>(null);

  const animFrameRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('MENU');
  const selectedPlayerRef = useRef<PlayerType | null>(null);

  // Синхронизация ref со state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { selectedPlayerRef.current = selectedPlayer; }, [selectedPlayer]);

  // ==========================================
  // Инициализация игры
  // ==========================================
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const groundY = h - GROUND_Y_OFFSET;

    const level = generateLevel();

    // Позиционируем платформы относительно groundY
    const platforms = level.platforms.map((p, i) => {
      if (i === 0) {
        // Земля
        return { x: p.x, y: groundY, width: p.width, height: p.height };
      }
      return { x: p.x, y: groundY + p.y, width: p.width, height: p.height };
    });

    const coins = level.coins.map(c => ({
      ...c,
      y: groundY + c.y,
    }));

    const enemies = level.enemies.map(e => ({
      ...e,
      y: groundY + e.y - e.height,
    }));

    gameDataRef.current = {
      player: {
        x: 50,
        y: groundY - 50,
        width: 40,
        height: 50,
        vx: 0,
        vy: 0,
        onGround: false,
        facing: 1,
        lives: 3,
        invincible: 0,
        superJump: 0,
        frame: 0,
      },
      platforms,
      coins,
      enemies,
      goalX: level.goalX,
      cameraX: 0,
      keys: { left: false, right: false, jump: false },
      score: 0,
      enemiesKilled: 0,
      animFrame: 0,
      canvasWidth: w,
      canvasHeight: h,
      groundY,
    };
  }, []);

  // ==========================================
  // Игровой цикл
  // ==========================================
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const data = gameDataRef.current;

    if (!canvas || !ctx || !data) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gameStateRef.current !== 'PLAYING') {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const { player, platforms, coins, enemies } = data;
    const w = data.canvasWidth;
    const h = data.canvasHeight;

    // Обновление анимации
    data.animFrame++;
    player.frame = Math.floor(data.animFrame / 10) % 4;

    // --- ФИЗИКА ИГРОКА ---
    // Горизонтальное движение
    if (data.keys.left) {
      player.vx = -MOVE_SPEED;
      player.facing = -1;
    } else if (data.keys.right) {
      player.vx = MOVE_SPEED;
      player.facing = 1;
    } else {
      player.vx *= FRICTION;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    // Прыжок
    if (data.keys.jump && player.onGround) {
      const jumpForce = player.superJump > 0 ? SUPER_JUMP_FORCE : JUMP_FORCE;
      player.vy = jumpForce;
      player.onGround = false;
      soundManager.playJump();
    }

    // Гравитация
    player.vy += GRAVITY;
    player.y += player.vy;
    player.x += player.vx;

    // Ограничение по X
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;

    // Коллизия с платформами
    player.onGround = false;
    for (const plat of platforms) {
      if (
        player.x + player.width > plat.x &&
        player.x < plat.x + plat.width &&
        player.y + player.height > plat.y &&
        player.y + player.height < plat.y + plat.height + 15 &&
        player.vy >= 0
      ) {
        player.y = plat.y - player.height;
        player.vy = 0;
        player.onGround = true;
      }
    }

    // Падение за карту
    if (player.y > h + 100) {
      player.lives--;
      soundManager.playHurt();
      if (player.lives <= 0) {
        setGameState('GAME_OVER');
        setScore(data.score);
        setEnemiesKilled(data.enemiesKilled);
      } else {
        player.x = 50;
        player.y = data.groundY - 50;
        player.vx = 0;
        player.vy = 0;
        player.invincible = 120;
      }
    }

    // Неуязвимость
    if (player.invincible > 0) player.invincible--;
    if (player.superJump > 0) player.superJump--;

    // --- КАМЕРА ---
    const targetCameraX = player.x - w / 3;
    data.cameraX += (targetCameraX - data.cameraX) * 0.1;
    if (data.cameraX < 0) data.cameraX = 0;
    if (data.cameraX > LEVEL_WIDTH - w) data.cameraX = LEVEL_WIDTH - w;

    // --- МОНЕТЫ ---
    for (const coin of coins) {
      if (coin.collected) continue;
      const dx = (player.x + player.width / 2) - coin.x;
      const dy = (player.y + player.height / 2) - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        coin.collected = true;
        soundManager.playCoin();
        if (coin.type === 'coin') {
          data.score += 10;
        } else if (coin.type === 'heart') {
          if (player.lives < 5) player.lives++;
          data.score += 5;
        } else if (coin.type === 'star') {
          player.superJump = 300; // 5 секунд
          data.score += 20;
        }
      }
    }

    // --- ВРАГИ ---
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      // Движение врага
      enemy.x += enemy.vx;
      if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
        enemy.vx *= -1;
      }

      // Коллизия с игроком
      if (
        player.x + player.width > enemy.x &&
        player.x < enemy.x + enemy.width &&
        player.y + player.height > enemy.y &&
        player.y < enemy.y + enemy.height
      ) {
        // Прыжок на голову
        if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2 + 10) {
          enemy.alive = false;
          player.vy = JUMP_FORCE * 0.7;
          data.enemiesKilled++;
          data.score += 25;
          soundManager.playEnemyDeath();
        } else if (player.invincible <= 0) {
          // Получение урона
          player.lives--;
          player.invincible = 90;
          player.vx = player.facing * -5;
          player.vy = -8;
          soundManager.playHurt();
          if (player.lives <= 0) {
            setGameState('GAME_OVER');
            setScore(data.score);
            setEnemiesKilled(data.enemiesKilled);
          }
        }
      }
    }

    // --- ЦЕЛЬ ---
    if (player.x + player.width > data.goalX && player.x < data.goalX + 60) {
      setGameState('WIN');
      setScore(data.score);
      setEnemiesKilled(data.enemiesKilled);
      soundManager.playWin();
    }

    // ==========================================
    // РЕНДЕРИНГ
    // ==========================================
    const camX = data.cameraX;

    // Фон - небо
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.7, '#B0E0E6');
    skyGrad.addColorStop(1, '#90EE90');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Облака (параллакс)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const cloudOffset = camX * 0.3;
    for (let i = 0; i < 8; i++) {
      const cx = (i * 500 + 100) - cloudOffset;
      const cy = 40 + (i % 3) * 30;
      if (cx > -100 && cx < w + 100) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 50, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 30, cy + 5, 35, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - 25, cy + 5, 30, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Земля
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, data.groundY, w, h - data.groundY);
    ctx.fillStyle = '#5d9e4f';
    ctx.fillRect(0, data.groundY, w, 5);

    // Платформы
    for (const plat of platforms) {
      const px = plat.x - camX;
      if (px + plat.width < 0 || px > w) continue;

      if (plat.width > 1000) {
        // Земля
        continue; // уже нарисована
      }

      // Платформа
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(px, plat.y, plat.width, plat.height);
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(px, plat.y, plat.width, 5);
      // Трава на платформе
      ctx.fillStyle = '#228B22';
      ctx.fillRect(px, plat.y - 3, plat.width, 5);
    }

    // Монеты
    for (const coin of coins) {
      if (coin.collected) continue;
      const cx = coin.x - camX;
      if (cx < -30 || cx > w + 30) continue;

      const bobY = Math.sin(data.animFrame * 0.05 + coin.x) * 3;
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      if (coin.type === 'coin') {
        ctx.fillText('🪙', cx, coin.y + bobY);
      } else if (coin.type === 'heart') {
        ctx.fillText('❤️', cx, coin.y + bobY);
      } else if (coin.type === 'star') {
        ctx.fillText('⭐', cx, coin.y + bobY);
      }
    }

    // Враги
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.x - camX;
      if (ex < -50 || ex > w + 50) continue;

      ctx.font = '30px serif';
      ctx.textAlign = 'center';
      const wobble = Math.sin(data.animFrame * 0.1) * 2;
      ctx.fillText('👾', ex + enemy.width / 2, enemy.y + enemy.height + wobble);
    }

    // Цель (партнёр)
    const goalScreenX = data.goalX - camX;
    if (goalScreenX > -80 && goalScreenX < w + 80) {
      const goalBob = Math.sin(data.animFrame * 0.03) * 5;
      ctx.font = '50px serif';
      ctx.textAlign = 'center';
      const goalEmoji = selectedPlayerRef.current === 'sasha' ? '👩' : '🧔';
      ctx.fillText(goalEmoji, goalScreenX + 30, data.groundY - 10 + goalBob);

      // Сердечки вокруг цели
      ctx.font = '20px serif';
      const heartAngle = data.animFrame * 0.02;
      for (let i = 0; i < 3; i++) {
        const angle = heartAngle + (i * Math.PI * 2) / 3;
        const hx = goalScreenX + 30 + Math.cos(angle) * 40;
        const hy = data.groundY - 40 + Math.sin(angle) * 20;
        ctx.fillText('💕', hx, hy);
      }
    }

    // Игрок
    const playerScreenX = player.x - camX;
    if (player.invincible <= 0 || Math.floor(player.invincible / 5) % 2 === 0) {
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      const playerEmoji = selectedPlayerRef.current === 'sasha' ? '🧔' : '👩';

      // Покачивание при ходьбе
      const walkBob = Math.abs(player.vx) > 0.5 ? Math.sin(data.animFrame * 0.2) * 3 : 0;

      ctx.save();
      if (player.facing === -1) {
        ctx.translate(playerScreenX + player.width / 2, player.y + player.height + walkBob);
        ctx.scale(-1, 1);
        ctx.fillText(playerEmoji, 0, 0);
      } else {
        ctx.fillText(playerEmoji, playerScreenX + player.width / 2, player.y + player.height + walkBob);
      }
      ctx.restore();

      // Эффект супер-прыжка
      if (player.superJump > 0) {
        ctx.font = '16px serif';
        ctx.fillText('✨', playerScreenX + player.width / 2, player.y - 10);
      }
    }

    // --- UI ---
    // Жизни
    ctx.font = '24px serif';
    ctx.textAlign = 'left';
    let livesText = '';
    for (let i = 0; i < player.lives; i++) livesText += '❤️';
    ctx.fillText(livesText, 10, 30);

    // Счёт
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(`🪙 ${data.score}`, w - 10, 28);
    ctx.fillText(`🪙 ${data.score}`, w - 10, 28);

    // Индикатор супер-прыжка
    if (player.superJump > 0) {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`⭐ Супер-прыжок! ${Math.ceil(player.superJump / 60)}с`, 10, 55);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ==========================================
  // Ресайз canvas
  // ==========================================
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gameDataRef.current) {
      const oldGroundY = gameDataRef.current.groundY;
      const newGroundY = canvas.height - GROUND_Y_OFFSET;
      const deltaY = newGroundY - oldGroundY;
      gameDataRef.current.canvasWidth = canvas.width;
      gameDataRef.current.canvasHeight = canvas.height;
      gameDataRef.current.groundY = newGroundY;

      // Пересчитываем позиции платформ
      gameDataRef.current.platforms = gameDataRef.current.platforms.map((p, i) => {
        if (i === 0) {
          return { ...p, y: newGroundY };
        }
        return { ...p, y: p.y + deltaY };
      });

      // Пересчитываем монеты
      gameDataRef.current.coins = gameDataRef.current.coins.map(c => ({
        ...c,
        y: c.y + deltaY,
      }));

      // Пересчитываем врагов
      gameDataRef.current.enemies = gameDataRef.current.enemies.map(e => ({
        ...e,
        y: e.y + deltaY,
      }));

      // Пересчитываем игрока
      gameDataRef.current.player.y += deltaY;
    }
  }, []);

  // ==========================================
  // Обработчики управления
  // ==========================================
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameDataRef.current) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') gameDataRef.current.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') gameDataRef.current.keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') gameDataRef.current.keys.jump = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!gameDataRef.current) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') gameDataRef.current.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') gameDataRef.current.keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') gameDataRef.current.keys.jump = false;
  }, []);

  // ==========================================
  // Эффекты
  // ==========================================
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Запрет скролла на мобильных
    const preventTouch = (e: TouchEvent) => {
      if (gameStateRef.current === 'PLAYING') {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });

    // Запуск игрового цикла
    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('touchmove', preventTouch);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [resizeCanvas, handleKeyDown, handleKeyUp, gameLoop]);

  // ==========================================
  // Обработчики UI
  // ==========================================
  const handleSelectPlayer = (player: PlayerType) => {
    setSelectedPlayer(player);
  };

  const handleStartGame = () => {
    if (!selectedPlayer) return;
    resizeCanvas();
    initGame();
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    setGameState('MENU');
    setSelectedPlayer(null);
    setScore(0);
    setEnemiesKilled(0);
  };

  // ==========================================
  // Тач-управление
  // ==========================================
  const handleTouchStart = (direction: 'left' | 'right' | 'jump') => {
    if (!gameDataRef.current) return;
    if (direction === 'left') gameDataRef.current.keys.left = true;
    if (direction === 'right') gameDataRef.current.keys.right = true;
    if (direction === 'jump') gameDataRef.current.keys.jump = true;
  };

  const handleTouchEnd = (direction: 'left' | 'right' | 'jump') => {
    if (!gameDataRef.current) return;
    if (direction === 'left') gameDataRef.current.keys.left = false;
    if (direction === 'right') gameDataRef.current.keys.right = false;
    if (direction === 'jump') gameDataRef.current.keys.jump = false;
  };

  // ==========================================
  // РЕНДЕР
  // ==========================================
  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {/* Canvas (всегда отрисовывается) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* МЕНЮ - Выбор персонажа */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/90 to-indigo-900/90 z-10">
          <div className="text-center px-4">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              Найди друг друга
            </h1>
            <p className="text-lg md:text-xl text-pink-200 mb-8">❤️ Приключение для двоих ❤️</p>

            <h2 className="text-xl md:text-2xl text-yellow-200 mb-6 font-semibold">
              За кого играем?
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
              {/* Саша */}
              <button
                onClick={() => handleSelectPlayer('sasha')}
                className={`w-44 h-52 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  selectedPlayer === 'sasha'
                    ? 'bg-blue-500 scale-110 shadow-xl shadow-blue-500/50 ring-4 ring-blue-300'
                    : 'bg-blue-500/60 hover:bg-blue-500/80 scale-100'
                }`}
              >
                <span className="text-6xl mb-2">🧔</span>
                <span className="text-white text-xl font-bold">Саша</span>
                <span className="text-blue-100 text-sm mt-1">ищет Аню</span>
              </button>

              {/* Аня */}
              <button
                onClick={() => handleSelectPlayer('anya')}
                className={`w-44 h-52 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  selectedPlayer === 'anya'
                    ? 'bg-pink-500 scale-110 shadow-xl shadow-pink-500/50 ring-4 ring-pink-300'
                    : 'bg-pink-500/60 hover:bg-pink-500/80 scale-100'
                }`}
              >
                <span className="text-6xl mb-2">👩</span>
                <span className="text-white text-xl font-bold">Аня</span>
                <span className="text-pink-100 text-sm mt-1">ищет Сашу</span>
              </button>
            </div>

            {/* Подсказка */}
            {selectedPlayer && (
              <p className="text-yellow-100 text-lg mb-4 animate-pulse">
                Найди {selectedPlayer === 'sasha' ? 'Аню 👩' : 'Сашу 🧔'} в конце уровня!
              </p>
            )}

            {/* Кнопка старта */}
            <button
              onClick={handleStartGame}
              disabled={!selectedPlayer}
              className={`px-8 py-4 rounded-full text-xl font-bold transition-all duration-200 ${
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

      {/* ПОБЕДА */}
      {gameState === 'WIN' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-pink-900/90 to-red-900/90 z-10">
          <div className="text-center px-4">
            <div className="text-6xl mb-4 animate-bounce">💕</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {selectedPlayer === 'sasha'
                ? 'Саша нашёл Аню!'
                : 'Аня нашла Сашу!'}
            </h1>
            <p className="text-xl md:text-2xl text-pink-200 mb-6">
              Они будут вместе навсегда ❤️
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-6 inline-block">
              <p className="text-yellow-200 text-lg">🪙 Монет собрано: {score}</p>
              <p className="text-red-200 text-lg">👾 Врагов побеждено: {enemiesKilled}</p>
            </div>

            <br />
            <button
              onClick={handleRestart}
              className="px-8 py-4 rounded-full text-xl font-bold bg-green-500 hover:bg-green-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🔄 Играть снова
            </button>
          </div>
        </div>
      )}

      {/* ПРОИГРЫШ */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/90 to-black/90 z-10">
          <div className="text-center px-4">
            <div className="text-6xl mb-4">😢</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Не сдавайся!
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Попробуй ещё раз 💪
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-6 inline-block">
              <p className="text-yellow-200 text-lg">🪙 Монет: {score}</p>
              <p className="text-red-200 text-lg">👾 Врагов: {enemiesKilled}</p>
            </div>

            <br />
            <button
              onClick={handleRestart}
              className="px-8 py-4 rounded-full text-xl font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              🔄 Заново
            </button>
          </div>
        </div>
      )}

      {/* Мобильное управление (только во время игры) */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex justify-between items-end p-4 pb-8">
            {/* Левая часть - движение */}
            <div className="flex gap-3 pointer-events-auto">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouchStart('left'); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('left'); }}
                onMouseDown={() => handleTouchStart('left')}
                onMouseUp={() => handleTouchEnd('left')}
                onMouseLeave={() => handleTouchEnd('left')}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl text-white active:bg-white/40 transition-colors"
              >
                ←
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouchStart('right'); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('right'); }}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                onMouseLeave={() => handleTouchEnd('right')}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-3xl text-white active:bg-white/40 transition-colors"
              >
                →
              </button>
            </div>

            {/* Правая часть - прыжок */}
            <div className="pointer-events-auto">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouchStart('jump'); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('jump'); }}
                onMouseDown={() => handleTouchStart('jump')}
                onMouseUp={() => handleTouchEnd('jump')}
                onMouseLeave={() => handleTouchEnd('jump')}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-500/30 backdrop-blur-sm border-2 border-green-400/50 flex items-center justify-center text-3xl text-white active:bg-green-500/50 transition-colors"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
