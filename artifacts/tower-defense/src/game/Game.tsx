import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Coins, Trophy, Play, FastForward, Pause, Home, Crown, Skull } from "lucide-react";
import {
  MAPS, TOWERS, ENEMIES, generateWave,
  type MapDef, type Point, type TowerKind, type EnemyKind, type WaveSpawn,
} from "./data";

const W = 800, H = 500;
const CELL = 40;

type Enemy = {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  pos: Point;
  segIdx: number;
  segT: number; // distance traveled in this segment
  speedMul: number;
  slowUntil: number;
  reward: number;
  damage: number;
  alive: boolean;
};

type Tower = {
  id: number;
  kind: TowerKind;
  pos: Point;
  level: number; // 1..3
  cooldown: number;
  totalKills: number;
};

type Projectile = {
  id: number;
  from: Point;
  pos: Point;
  target: Enemy | null;
  targetPos: Point;
  speed: number;
  damage: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  color: string;
  alive: boolean;
};

type Zap = {
  points: Point[];
  ttl: number;
};

type Floater = {
  text: string;
  pos: Point;
  ttl: number;
  color: string;
};

type Props = {
  map: MapDef;
  onExit: () => void;
};

function dist(a: Point, b: Point) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(wp: Point[]) {
  let total = 0;
  for (let i = 1; i < wp.length; i++) total += dist(wp[i - 1], wp[i]);
  return total;
}

function getPositionOnPath(wp: Point[], traveled: number): { pos: Point; segIdx: number; segT: number; done: boolean } {
  let remaining = traveled;
  for (let i = 0; i < wp.length - 1; i++) {
    const a = wp[i], b = wp[i + 1];
    const len = dist(a, b);
    if (remaining <= len) {
      const t = remaining / len;
      return { pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, segIdx: i, segT: remaining, done: false };
    }
    remaining -= len;
  }
  const last = wp[wp.length - 1];
  return { pos: { ...last }, segIdx: wp.length - 2, segT: 0, done: true };
}

// distance from point to segment
function distToSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}

function isOnPath(p: Point, wp: Point[], pad: number): boolean {
  for (let i = 0; i < wp.length - 1; i++) {
    if (distToSeg(p, wp[i], wp[i + 1]) < pad) return true;
  }
  return false;
}

const upgradeCost = (kind: TowerKind, level: number) =>
  Math.round(TOWERS[kind].cost * (level === 1 ? 0.8 : 1.5));

const sellValue = (kind: TowerKind, level: number) => {
  let total = TOWERS[kind].cost;
  for (let l = 1; l < level; l++) total += upgradeCost(kind, l);
  return Math.round(total * 0.65);
};

const towerStats = (t: Tower) => {
  const def = TOWERS[t.kind];
  const lvlMul = 1 + (t.level - 1) * 0.6;
  return {
    damage: def.damage * lvlMul,
    range: def.range * (1 + (t.level - 1) * 0.15),
    fireRate: def.fireRate * (1 + (t.level - 1) * 0.25),
  };
};

export default function Game({ map, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live game refs (mutable, don't trigger re-renders)
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const zapsRef = useRef<Zap[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const idCounter = useRef(1);
  const mouseRef = useRef<Point>({ x: -100, y: -100 });
  const placementErrorRef = useRef<{ pos: Point; ttl: number } | null>(null);

  // React state (HUD)
  const [lives, setLives] = useState(100);
  const [money, setMoney] = useState(1000);
  const [level, setLevel] = useState(1);
  const [waveActive, setWaveActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [selectedKind, setSelectedKind] = useState<TowerKind | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<null | "win" | "lose">(null);
  const [waveAnnounce, setWaveAnnounce] = useState<string | null>(null);

  // Wave runtime
  const waveRef = useRef<{
    spawns: WaveSpawn[];
    hpMul: number;
    spawned: number[]; // count per spawn group
    timers: number[]; // time accumulators per group
    active: boolean;
  } | null>(null);

  const livesRef = useRef(lives);
  const moneyRef = useRef(money);
  const levelRef = useRef(level);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const waveActiveRef = useRef(waveActive);
  const selectedTowerIdRef = useRef<number | null>(null);
  const gameOverRef = useRef<null | "win" | "lose">(null);

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { moneyRef.current = money; }, [money]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { waveActiveRef.current = waveActive; }, [waveActive]);
  useEffect(() => { selectedTowerIdRef.current = selectedTowerId; }, [selectedTowerId]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const totalPathLen = useRef(pathLength(map.waypoints)).current;

  const startWave = useCallback(() => {
    if (waveActiveRef.current || gameOverRef.current) return;
    const lvl = levelRef.current;
    const wave = generateWave(lvl);
    waveRef.current = {
      spawns: wave.spawns,
      hpMul: wave.hpMul,
      spawned: wave.spawns.map(() => 0),
      timers: wave.spawns.map(() => 0),
      active: true,
    };
    setWaveActive(true);
    const tag = wave.isBoss ? `BOSS WAVE ${lvl}` : wave.isMiniBoss ? `MINI-BOSS WAVE ${lvl}` : `WAVE ${lvl}`;
    setWaveAnnounce(tag);
    setTimeout(() => setWaveAnnounce(null), 1800);
  }, []);

  const tryPlaceTower = useCallback((kind: TowerKind, p: Point) => {
    if (gameOverRef.current) return;
    const def = TOWERS[kind];
    if (moneyRef.current < def.cost) {
      placementErrorRef.current = { pos: p, ttl: 1.0 };
      return;
    }
    if (isOnPath(p, map.waypoints, 24)) {
      placementErrorRef.current = { pos: p, ttl: 1.0 };
      return;
    }
    for (const t of towersRef.current) {
      if (dist(t.pos, p) < 28) {
        placementErrorRef.current = { pos: p, ttl: 1.0 };
        return;
      }
    }
    if (p.x < 16 || p.x > W - 16 || p.y < 16 || p.y > H - 16) {
      placementErrorRef.current = { pos: p, ttl: 1.0 };
      return;
    }
    towersRef.current.push({
      id: idCounter.current++,
      kind,
      pos: { ...p },
      level: 1,
      cooldown: 0,
      totalKills: 0,
    });
    setMoney(m => m - def.cost);
    moneyRef.current -= def.cost;
  }, [map.waypoints]);

  const upgradeTower = useCallback((id: number) => {
    const t = towersRef.current.find(t => t.id === id);
    if (!t || t.level >= 3) return;
    const cost = upgradeCost(t.kind, t.level);
    if (moneyRef.current < cost) return;
    moneyRef.current -= cost;
    setMoney(m => m - cost);
    t.level += 1;
  }, []);

  const sellTower = useCallback((id: number) => {
    const idx = towersRef.current.findIndex(t => t.id === id);
    if (idx < 0) return;
    const t = towersRef.current[idx];
    const value = sellValue(t.kind, t.level);
    moneyRef.current += value;
    setMoney(m => m + value);
    towersRef.current.splice(idx, 1);
    setSelectedTowerId(null);
  }, []);

  // ===== Game loop =====
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * H,
      };
    };
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };

      // tower click first
      for (const t of towersRef.current) {
        if (dist(t.pos, p) < 18) {
          setSelectedTowerId(t.id);
          setSelectedKind(null);
          return;
        }
      }
      if (selectedKind) {
        tryPlaceTower(selectedKind, p);
      } else {
        setSelectedTowerId(null);
      }
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", () => { mouseRef.current = { x: -100, y: -100 }; });

    const tick = () => {
      const now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      const sim = pausedRef.current || gameOverRef.current ? 0 : dt * speedRef.current;

      step(sim);
      render(ctx);
      raf = requestAnimationFrame(tick);
    };

    const step = (dt: number) => {
      if (dt <= 0) return;

      // spawn enemies
      const wave = waveRef.current;
      if (wave && wave.active) {
        let allDone = true;
        for (let i = 0; i < wave.spawns.length; i++) {
          const s = wave.spawns[i];
          wave.timers[i] += dt;
          if (wave.spawned[i] < s.count) {
            allDone = false;
            const sinceStart = wave.timers[i] - s.delay;
            if (sinceStart >= 0) {
              const wantSpawned = Math.min(s.count, Math.floor(sinceStart / s.interval) + 1);
              while (wave.spawned[i] < wantSpawned) {
                spawnEnemy(s.kind, wave.hpMul);
                wave.spawned[i] += 1;
              }
            }
          }
        }
        if (allDone && enemiesRef.current.length === 0) {
          // wave complete
          wave.active = false;
          waveActiveRef.current = false;
          setWaveActive(false);
          // bonus money
          const bonus = 80 + levelRef.current * 12;
          moneyRef.current += bonus;
          setMoney(m => m + bonus);
          floatersRef.current.push({ text: `+${bonus} bonus`, pos: { x: W / 2, y: 50 }, ttl: 1.6, color: "#7be59a" });
          if (levelRef.current >= 30) {
            setGameOver("win");
            gameOverRef.current = "win";
          } else {
            const next = levelRef.current + 1;
            levelRef.current = next;
            setLevel(next);
          }
        }
      }

      // move enemies
      const arrivedEnemies: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];
        const slow = now() < e.slowUntil ? e.speedMul : 1;
        const v = def.speed * slow;
        const newTraveled = traveledOf(e) + v * dt;
        const r = getPositionOnPath(map.waypoints, newTraveled);
        e.pos = r.pos;
        e.segIdx = r.segIdx;
        e.segT = r.segT;
        if (r.done) {
          e.alive = false;
          arrivedEnemies.push(e);
        }
      }
      if (arrivedEnemies.length > 0) {
        let totalDmg = 0;
        for (const e of arrivedEnemies) totalDmg += e.damage;
        const newLives = Math.max(0, livesRef.current - totalDmg);
        livesRef.current = newLives;
        setLives(newLives);
        floatersRef.current.push({ text: `-${totalDmg} ♥`, pos: { x: W - 40, y: 60 }, ttl: 1.2, color: "#ff7070" });
        if (newLives <= 0) {
          setGameOver("lose");
          gameOverRef.current = "lose";
        }
      }

      // tower fire
      for (const t of towersRef.current) {
        const stats = towerStats(t);
        t.cooldown -= dt;
        if (t.cooldown > 0) continue;

        const target = pickTarget(t.pos, stats.range, t.kind);
        if (!target) continue;
        t.cooldown = 1 / stats.fireRate;

        const def = TOWERS[t.kind];
        if (t.kind === "tesla") {
          // chain lightning
          const hits: Enemy[] = [target];
          const visited = new Set<number>([target.id]);
          let last_ = target;
          const chainCount = (def.chainCount ?? 3) + (t.level - 1);
          for (let c = 0; c < chainCount - 1; c++) {
            const next = pickNearest(last_.pos, 90, visited);
            if (!next) break;
            hits.push(next);
            visited.add(next.id);
            last_ = next;
          }
          const points: Point[] = [t.pos, ...hits.map(h => h.pos)];
          zapsRef.current.push({ points, ttl: 0.18 });
          for (let i = 0; i < hits.length; i++) {
            const dmg = stats.damage * Math.pow(0.75, i);
            damageEnemy(hits[i], dmg);
          }
        } else {
          projectilesRef.current.push({
            id: idCounter.current++,
            from: { ...t.pos },
            pos: { ...t.pos },
            target,
            targetPos: { ...target.pos },
            speed: def.projectileSpeed,
            damage: stats.damage,
            splashRadius: def.splashRadius,
            slowFactor: def.slowFactor,
            slowDuration: def.slowDuration,
            color: def.projectileColor,
            alive: true,
          });
        }
      }

      // projectiles
      for (const p of projectilesRef.current) {
        if (!p.alive) continue;
        const aim = p.target && p.target.alive ? p.target.pos : p.targetPos;
        p.targetPos = { ...aim };
        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;
        const d = Math.hypot(dx, dy);
        const step = p.speed * dt;
        if (d <= step) {
          // impact
          p.pos = { ...aim };
          if (p.splashRadius) {
            for (const e of enemiesRef.current) {
              if (!e.alive) continue;
              if (dist(e.pos, p.pos) <= p.splashRadius) damageEnemy(e, p.damage);
            }
          } else if (p.target && p.target.alive) {
            damageEnemy(p.target, p.damage, p.slowFactor, p.slowDuration);
          } else {
            // fallback splash 0
          }
          p.alive = false;
        } else {
          p.pos.x += (dx / d) * step;
          p.pos.y += (dy / d) * step;
        }
      }

      // cleanup
      enemiesRef.current = enemiesRef.current.filter(e => e.alive);
      projectilesRef.current = projectilesRef.current.filter(p => p.alive);
      for (const z of zapsRef.current) z.ttl -= dt;
      zapsRef.current = zapsRef.current.filter(z => z.ttl > 0);
      for (const f of floatersRef.current) { f.ttl -= dt; f.pos.y -= 18 * dt; }
      floatersRef.current = floatersRef.current.filter(f => f.ttl > 0);
      if (placementErrorRef.current) {
        placementErrorRef.current.ttl -= dt;
        if (placementErrorRef.current.ttl <= 0) placementErrorRef.current = null;
      }
    };

    const now = () => performance.now() / 1000;

    const traveledOf = (e: Enemy) => {
      let t = 0;
      for (let i = 0; i < e.segIdx; i++) t += dist(map.waypoints[i], map.waypoints[i + 1]);
      return t + e.segT;
    };

    const spawnEnemy = (kind: EnemyKind, hpMul: number) => {
      const def = ENEMIES[kind];
      const start = map.waypoints[0];
      enemiesRef.current.push({
        id: idCounter.current++,
        kind,
        hp: def.baseHp * hpMul,
        maxHp: def.baseHp * hpMul,
        pos: { ...start },
        segIdx: 0,
        segT: 0,
        speedMul: 1,
        slowUntil: 0,
        reward: Math.round(def.reward * Math.pow(1.05, levelRef.current - 1)),
        damage: def.damage,
        alive: true,
      });
    };

    const damageEnemy = (e: Enemy, dmg: number, slowFactor?: number, slowDuration?: number) => {
      if (!e.alive) return;
      e.hp -= dmg;
      if (slowFactor && slowDuration) {
        e.speedMul = Math.min(e.speedMul, slowFactor);
        e.slowUntil = Math.max(e.slowUntil, now() + slowDuration);
      } else if (e.slowUntil < now()) {
        e.speedMul = 1;
      }
      if (e.hp <= 0) {
        e.alive = false;
        moneyRef.current += e.reward;
        setMoney(m => m + e.reward);
        floatersRef.current.push({ text: `+${e.reward}`, pos: { ...e.pos }, ttl: 0.8, color: "#ffe070" });
      }
    };

    const pickTarget = (pos: Point, range: number, _kind: TowerKind): Enemy | null => {
      // strategy: enemy furthest along path within range
      let best: Enemy | null = null;
      let bestProgress = -1;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (dist(e.pos, pos) > range) continue;
        let prog = 0;
        for (let i = 0; i < e.segIdx; i++) prog += dist(map.waypoints[i], map.waypoints[i + 1]);
        prog += e.segT;
        if (prog > bestProgress) { bestProgress = prog; best = e; }
      }
      return best;
    };

    const pickNearest = (pos: Point, range: number, exclude: Set<number>): Enemy | null => {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of enemiesRef.current) {
        if (!e.alive || exclude.has(e.id)) continue;
        const d = dist(e.pos, pos);
        if (d < range && d < bestD) { bestD = d; best = e; }
      }
      return best;
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      // background
      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // path
      const wp = map.waypoints;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 44;
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.strokeStyle = map.pathColor;
      ctx.lineWidth = 36;
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      // dashed center
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // start/end markers
      ctx.fillStyle = "#7be59a";
      ctx.beginPath(); ctx.arc(wp[0].x, wp[0].y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff5050";
      ctx.beginPath(); ctx.arc(wp[wp.length - 1].x, wp[wp.length - 1].y, 12, 0, Math.PI * 2); ctx.fill();

      // selected tower range
      if (selectedTowerIdRef.current != null) {
        const t = towersRef.current.find(t => t.id === selectedTowerIdRef.current);
        if (t) {
          const s = towerStats(t);
          ctx.fillStyle = "rgba(120,200,255,0.10)";
          ctx.strokeStyle = "rgba(120,200,255,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, s.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }

      // ghost placement
      if (selectedKind) {
        const m = mouseRef.current;
        if (m.x > 0 && m.x < W) {
          const def = TOWERS[selectedKind];
          const onPath = isOnPath(m, map.waypoints, 24);
          let overlap = false;
          for (const t of towersRef.current) if (dist(t.pos, m) < 28) overlap = true;
          const ok = !onPath && !overlap && moneyRef.current >= def.cost;
          ctx.fillStyle = ok ? "rgba(120,255,150,0.15)" : "rgba(255,80,80,0.15)";
          ctx.strokeStyle = ok ? "rgba(120,255,150,0.6)" : "rgba(255,80,80,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(m.x, m.y, def.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          drawTower(ctx, { id: -1, kind: selectedKind, pos: m, level: 1, cooldown: 0, totalKills: 0 }, 0.6);
        }
      }

      // towers
      for (const t of towersRef.current) drawTower(ctx, t, 1);

      // enemies
      for (const e of enemiesRef.current) drawEnemy(ctx, e);

      // projectiles
      for (const p of projectilesRef.current) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.splashRadius ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // zaps
      for (const z of zapsRef.current) {
        ctx.strokeStyle = `rgba(255,243,122,${Math.min(1, z.ttl * 6)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(z.points[0].x, z.points[0].y);
        for (let i = 1; i < z.points.length; i++) {
          const a = z.points[i - 1], b = z.points[i];
          const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 14;
          const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 14;
          ctx.lineTo(mx, my);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }

      // placement error pulse
      if (placementErrorRef.current) {
        const pe = placementErrorRef.current;
        ctx.strokeStyle = `rgba(255,80,80,${pe.ttl})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pe.pos.x, pe.pos.y, 24 * (1.4 - pe.ttl), 0, Math.PI * 2); ctx.stroke();
      }

      // floaters
      for (const f of floatersRef.current) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.min(1, f.ttl / 1.0);
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.pos.x, f.pos.y);
        ctx.globalAlpha = 1;
      }

      // wave announce
      if (waveAnnounce) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, H / 2 - 40, W, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(waveAnnounce, W / 2, H / 2 + 12);
      }
    };

    const drawTower = (ctx: CanvasRenderingContext2D, t: Tower, alpha: number) => {
      const def = TOWERS[t.kind];
      ctx.globalAlpha = alpha;
      // base
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.fill();
      // top
      ctx.fillStyle = def.accent;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 7, 0, Math.PI * 2); ctx.fill();
      // level pips
      for (let i = 0; i < t.level; i++) {
        ctx.fillStyle = "#ffe070";
        ctx.beginPath();
        ctx.arc(t.pos.x - 8 + i * 8, t.pos.y + 22, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      const def = ENEMIES[e.kind];
      const slowed = now() < e.slowUntil;
      // body
      ctx.fillStyle = def.ringColor;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius, 0, Math.PI * 2); ctx.fill();
      if (slowed) {
        ctx.strokeStyle = "#9adfff";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 4, 0, Math.PI * 2); ctx.stroke();
      }
      // health bar
      const w = def.radius * 2 + 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w, 4);
      ctx.fillStyle = pct > 0.5 ? "#7be59a" : pct > 0.25 ? "#ffd070" : "#ff6060";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w * pct, 4);
      if (e.kind === "boss" || e.kind === "miniboss") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(def.name.toUpperCase(), e.pos.x, e.pos.y - def.radius - 14);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [map, selectedKind, tryPlaceTower, totalPathLen, waveAnnounce]);

  const selectedTower = selectedTowerId != null
    ? towersRef.current.find(t => t.id === selectedTowerId)
    : null;

  const restart = () => {
    enemiesRef.current = [];
    towersRef.current = [];
    projectilesRef.current = [];
    zapsRef.current = [];
    floatersRef.current = [];
    waveRef.current = null;
    setLives(100); livesRef.current = 100;
    setMoney(1000); moneyRef.current = 1000;
    setLevel(1); levelRef.current = 1;
    setWaveActive(false); waveActiveRef.current = false;
    setSelectedKind(null);
    setSelectedTowerId(null);
    setGameOver(null); gameOverRef.current = null;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <Home className="w-4 h-4 mr-1" /> Menu
          </Button>
          <span className="text-sm text-muted-foreground">{map.name}</span>
        </div>
        <div className="flex items-center gap-5">
          <Stat icon={<Heart className="w-4 h-4 text-red-400" />} value={lives} label="Lives" />
          <Stat icon={<Coins className="w-4 h-4 text-yellow-300" />} value={money} label="Gold" />
          <Stat icon={<Trophy className="w-4 h-4 text-sky-300" />} value={`${level} / 30`} label="Level" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={waveActive ? "secondary" : "default"}
            size="sm"
            onClick={startWave}
            disabled={waveActive || !!gameOver}
          >
            <Play className="w-4 h-4 mr-1" />
            {waveActive ? "Wave In Progress" : `Start Wave ${level}`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)}>
            <Pause className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 3 : 1))}>
            <FastForward className="w-4 h-4 mr-1" /> {speed}x
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-3 bg-background relative">
          <div className="relative" style={{ aspectRatio: `${W} / ${H}`, width: "100%", maxWidth: "100%", maxHeight: "100%" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-full rounded-md shadow-2xl border border-border cursor-crosshair"
              style={{ imageRendering: "auto" }}
            />
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-md">
                <div className="bg-card border border-border p-6 rounded-lg text-center max-w-sm">
                  {gameOver === "win" ? (
                    <>
                      <Crown className="w-12 h-12 mx-auto text-yellow-300 mb-2" />
                      <h2 className="text-2xl font-bold mb-1">Victory</h2>
                      <p className="text-muted-foreground mb-4">You survived all 30 waves on {map.name}.</p>
                    </>
                  ) : (
                    <>
                      <Skull className="w-12 h-12 mx-auto text-red-400 mb-2" />
                      <h2 className="text-2xl font-bold mb-1">Defeated</h2>
                      <p className="text-muted-foreground mb-4">The horde broke through on wave {level}.</p>
                    </>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button onClick={restart}>Play Again</Button>
                    <Button variant="outline" onClick={onExit}>Main Menu</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Build Tower</div>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(TOWERS) as TowerKind[]).map(k => {
                const def = TOWERS[k];
                const canAfford = money >= def.cost;
                const selected = selectedKind === k;
                return (
                  <button
                    key={k}
                    onClick={() => { setSelectedKind(selected ? null : k); setSelectedTowerId(null); }}
                    disabled={!canAfford}
                    className={`text-left p-2 rounded-md border transition-colors ${
                      selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    } ${!canAfford ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full" style={{ background: def.color, boxShadow: `0 0 0 2px ${def.accent}` }} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{def.name}</div>
                        <div className="text-[11px] text-muted-foreground leading-tight">{def.description}</div>
                      </div>
                      <div className="flex items-center text-xs text-yellow-300 font-mono">
                        <Coins className="w-3 h-3 mr-0.5" />{def.cost}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTower && (
            <div className="p-3 border-b border-border">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Selected Tower</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full" style={{ background: TOWERS[selectedTower.kind].color }} />
                <div>
                  <div className="text-sm font-semibold">{TOWERS[selectedTower.kind].name} · Lv {selectedTower.level}</div>
                  <div className="text-[11px] text-muted-foreground">
                    DMG {Math.round(towerStats(selectedTower).damage)} · RNG {Math.round(towerStats(selectedTower).range)} · {towerStats(selectedTower).fireRate.toFixed(1)}/s
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={selectedTower.level >= 3 || money < upgradeCost(selectedTower.kind, selectedTower.level)}
                  onClick={() => upgradeTower(selectedTower.id)}
                >
                  {selectedTower.level >= 3 ? "Maxed" : `Upgrade ${upgradeCost(selectedTower.kind, selectedTower.level)}g`}
                </Button>
                <Button size="sm" variant="outline" onClick={() => sellTower(selectedTower.id)}>
                  Sell {sellValue(selectedTower.kind, selectedTower.level)}g
                </Button>
              </div>
            </div>
          )}

          <div className="p-3 flex-1 overflow-y-auto">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Wave {level} Threats</div>
            <div className="space-y-1.5 text-xs">
              {(level % 10 === 0) && (
                <div className="flex items-center gap-2 text-red-300">
                  <Skull className="w-3.5 h-3.5" /> Boss Wave — extreme danger
                </div>
              )}
              {(level % 5 === 0 && level % 10 !== 0) && (
                <div className="flex items-center gap-2 text-orange-300">
                  <Skull className="w-3.5 h-3.5" /> Mini-Boss incoming
                </div>
              )}
              {(Object.keys(ENEMIES) as EnemyKind[])
                .filter(k => {
                  if (k === "boss") return level % 10 === 0;
                  if (k === "miniboss") return level % 5 === 0 && level % 10 !== 0;
                  if (k === "swarm") return level >= 7 && level % 5 !== 0;
                  if (k === "tank") return level >= 4;
                  if (k === "swift") return level >= 2;
                  return level % 5 !== 0 || k === "grunt";
                })
                .map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: ENEMIES[k].color }} />
                    <span className="text-muted-foreground">{ENEMIES[k].name}</span>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
              Click a tower button, then click the map to place it. Click a placed tower to upgrade or sell. Difficulty climbs every wave; enemies are 18% tougher each level.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="leading-tight">
        <div className="text-base font-bold font-mono">{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground -mt-0.5">{label}</div>
      </div>
    </div>
  );
}
