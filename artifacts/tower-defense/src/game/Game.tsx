import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Coins, Trophy, Play, FastForward, Pause, Home, Crown, Skull, Eye, Shield, Zap as ZapIcon, ChevronRight, Radar, Wrench, DollarSign, Flame, Bomb } from "lucide-react";
import {
  MAPS, TOWERS, TOWER_ORDER, ENEMIES, generateWave, effectiveStats, upgradeCostFor, totalSpent, DAMAGE_LABELS,
  type MapDef, type Point, type TowerKind, type EnemyKind, type WaveSpawn, type DamageType, type TowerStats, type Appearance,
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
  segT: number;
  speedMul: number;
  slowUntil: number;
  reward: number;
  damage: number;
  alive: boolean;
  summonTimer: number;
  burnTimer: number;
  burnDps: number;
  burnUntil: number;
  phaseTimer: number;
  invuln: boolean;
  cloakedUntil: number;
  empTimer: number;
  healTimer: number;
};

type Tower = {
  id: number;
  kind: TowerKind;
  pos: Point;
  pathIdx: number | null;
  tier: number;
  cooldown: number;
  underbarrelCooldown: number;
  burstQueue: number;
  burstTimer: number;
  burstTarget: Enemy | null;
  aimAngle: number;
  incomeTimer: number;
  mineTimer: number;
  drones: Drone[];
  stunUntil: number;
};

type Drone = {
  angle: number;
  cooldown: number;
  target: Enemy | null;
};

type Mine = {
  pos: Point;
  damage: number;
  splash: number;
  slowFactor?: number;
  slowDuration?: number;
  ttl: number;
};

type Projectile = {
  id: number;
  pos: Point;
  vel: Point;
  target: Enemy | null;
  targetPos: Point;
  speed: number;
  damage: number;
  damageType: DamageType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  color: string;
  size: number;
  hiddenDetect: boolean;
  alive: boolean;
  arc?: { startY: number; targetY: number; t: number; total: number; startX: number; targetX: number; arcHeight: number };
};

type Beam = {
  from: Point;
  to: Point;
  color: string;
  width: number;
  ttl: number;
};

type Zap = { points: Point[]; ttl: number };
type Floater = { text: string; pos: Point; ttl: number; color: string };

type Particle = {
  pos: Point;
  vel: Point;
  ttl: number;
  maxTtl: number;
  size: number;
  color: string;
  kind: "muzzle" | "smoke" | "explosion" | "spark" | "ring" | "fire";
};

type Props = { map: MapDef; onExit: () => void };

function dist(a: Point, b: Point) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

function getPositionOnPath(wp: Point[], traveled: number) {
  let r = traveled;
  for (let i = 0; i < wp.length - 1; i++) {
    const a = wp[i], b = wp[i + 1];
    const len = dist(a, b);
    if (r <= len) {
      const t = r / len;
      return { pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, segIdx: i, segT: r, done: false };
    }
    r -= len;
  }
  const last = wp[wp.length - 1];
  return { pos: { ...last }, segIdx: wp.length - 2, segT: 0, done: true };
}

function distToSeg(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
}
function isOnPath(p: Point, wp: Point[], pad: number): boolean {
  for (let i = 0; i < wp.length - 1; i++) if (distToSeg(p, wp[i], wp[i + 1]) < pad) return true;
  return false;
}

function applyResistance(dmg: number, type: DamageType, e: Enemy): number {
  const def = ENEMIES[e.kind];
  if (def.immunities && def.immunities.includes(type)) return 0;
  if (def.resistances && def.resistances[type] !== undefined) return dmg * (def.resistances[type] as number);
  if (def.armored) {
    if (type === "physical") return dmg * 0.25;
    if (type === "energy") return dmg * 0.4;
    if (type === "fire") return dmg * 0.4;
  }
  return dmg;
}

export default function Game({ map, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const minesRef = useRef<Mine[]>([]);
  const beamsRef = useRef<Beam[]>([]);
  const zapsRef = useRef<Zap[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const idCounter = useRef(1);
  const mouseRef = useRef<Point>({ x: -100, y: -100 });
  const placementErrorRef = useRef<{ pos: Point; ttl: number } | null>(null);

  const [lives, setLives] = useState(100);
  const [money, setMoney] = useState(1000);
  const [level, setLevel] = useState(1);
  const [waveActive, setWaveActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [selectedKind, setSelectedKind] = useState<TowerKind | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const [gameOver, setGameOver] = useState<null | "win" | "lose">(null);
  const [waveAnnounce, setWaveAnnounce] = useState<string | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<number | null>(null);

  const waveRef = useRef<{
    spawns: WaveSpawn[]; hpMul: number; spawned: number[]; timers: number[]; active: boolean; bossKind?: EnemyKind;
  } | null>(null);

  const livesRef = useRef(lives);
  const moneyRef = useRef(money);
  const levelRef = useRef(level);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const waveActiveRef = useRef(waveActive);
  const selectedTowerIdRef = useRef<number | null>(null);
  const selectedKindRef = useRef<TowerKind | null>(null);
  const gameOverRef = useRef<null | "win" | "lose">(null);
  const hoveredEnemyIdRef = useRef<number | null>(null);

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { moneyRef.current = money; }, [money]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { waveActiveRef.current = waveActive; }, [waveActive]);
  useEffect(() => { selectedTowerIdRef.current = selectedTowerId; }, [selectedTowerId]);
  useEffect(() => { selectedKindRef.current = selectedKind; }, [selectedKind]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { hoveredEnemyIdRef.current = hoveredEnemyId; }, [hoveredEnemyId]);

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
      bossKind: wave.bossKind,
    };
    setWaveActive(true);
    const tag = wave.isBoss ? `BOSS WAVE ${lvl}` : wave.isMiniBoss ? `MINI-BOSS WAVE ${lvl}` : `WAVE ${lvl}`;
    setWaveAnnounce(tag);
    setTimeout(() => setWaveAnnounce(null), 1800);
  }, []);

  const tryPlaceTower = useCallback((kind: TowerKind, p: Point) => {
    if (gameOverRef.current) return;
    const def = TOWERS[kind];
    if (moneyRef.current < def.cost) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    if (isOnPath(p, map.waypoints, 24)) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    for (const t of towersRef.current) if (dist(t.pos, p) < 30) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    if (p.x < 18 || p.x > W - 18 || p.y < 18 || p.y > H - 18) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    const drones: Drone[] = [];
    const baseDrones = def.base.droneCount ?? 0;
    for (let i = 0; i < baseDrones; i++) drones.push({ angle: (i / baseDrones) * Math.PI * 2, cooldown: 0, target: null });
    towersRef.current.push({
      id: idCounter.current++, kind, pos: { ...p }, pathIdx: null, tier: 0,
      cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
      incomeTimer: 0, mineTimer: 0, drones, stunUntil: 0,
    });
    setMoney(m => m - def.cost);
    moneyRef.current -= def.cost;
  }, [map.waypoints]);

  const upgradeTower = useCallback((id: number, pathIdx: number) => {
    const t = towersRef.current.find(t => t.id === id);
    if (!t) return;
    if (t.pathIdx !== null && t.pathIdx !== pathIdx) return;
    const def = TOWERS[t.kind];
    const cost = upgradeCostFor(def, pathIdx, t.tier);
    if (cost === null) return;
    if (moneyRef.current < cost) return;
    moneyRef.current -= cost;
    setMoney(m => m - cost);
    if (t.pathIdx === null) t.pathIdx = pathIdx;
    t.tier += 1;
    // adjust drone count
    const newStats = effectiveStats(def, t.pathIdx, t.tier);
    const want = newStats.droneCount ?? 0;
    while (t.drones.length < want) t.drones.push({ angle: (t.drones.length / Math.max(1, want)) * Math.PI * 2, cooldown: 0, target: null });
    while (t.drones.length > want) t.drones.pop();
    forceTick(x => x + 1);
  }, []);

  const sellTower = useCallback((id: number) => {
    const idx = towersRef.current.findIndex(t => t.id === id);
    if (idx < 0) return;
    const t = towersRef.current[idx];
    const def = TOWERS[t.kind];
    const value = Math.round(totalSpent(def, t.pathIdx, t.tier) * 0.65);
    moneyRef.current += value;
    setMoney(m => m + value);
    towersRef.current.splice(idx, 1);
    setSelectedTowerId(null);
  }, []);

  // ===== Keybinds =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;
      if (e.key === "Escape") {
        setSelectedKind(null);
        setSelectedTowerId(null);
        return;
      }
      if (e.key === " " && !waveActiveRef.current) {
        e.preventDefault();
        startWave();
        return;
      }
      if (e.key.toLowerCase() === "p") {
        setPaused(p => !p);
        return;
      }
      const numKey = parseInt(e.key, 10);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        const idx = numKey - 1;
        if (idx < TOWER_ORDER.length) {
          const k = TOWER_ORDER[idx];
          setSelectedKind(prev => prev === k ? null : k);
          setSelectedTowerId(null);
        }
      }
      if (e.key === "0") {
        const idx = 9;
        if (idx < TOWER_ORDER.length) {
          const k = TOWER_ORDER[idx];
          setSelectedKind(prev => prev === k ? null : k);
          setSelectedTowerId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startWave]);

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
      // hover detection
      let found: number | null = null;
      for (const en of enemiesRef.current) {
        if (!en.alive) continue;
        const def = ENEMIES[en.kind];
        if (def.hidden && !cloakKnown(en)) continue;
        if (dist(en.pos, mouseRef.current) <= def.radius + 4) {
          found = en.id; break;
        }
      }
      if (found !== hoveredEnemyIdRef.current) setHoveredEnemyId(found);
    };
    const cloakKnown = (en: Enemy) => {
      // visible if any tower with hiddenDetect within range or globally
      const def = ENEMIES[en.kind];
      if (!def.hidden) return true;
      for (const t of towersRef.current) {
        const ts = effectiveStats(TOWERS[t.kind], t.pathIdx, t.tier);
        if (ts.hiddenDetect) {
          if ((ts.intelLevel ?? 0) >= 3) return true;
          if (dist(t.pos, en.pos) <= ts.range) return true;
        }
      }
      return false;
    };
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
      for (const t of towersRef.current) {
        if (dist(t.pos, p) < 18) {
          setSelectedTowerId(t.id);
          setSelectedKind(null);
          return;
        }
      }
      const k = selectedKindRef.current;
      if (k) tryPlaceTower(k, p);
      else setSelectedTowerId(null);
    };
    const onLeave = () => { mouseRef.current = { x: -100, y: -100 }; setHoveredEnemyId(null); };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mouseleave", onLeave);

    const nowSec = () => performance.now() / 1000;

    const traveledOf = (e: Enemy) => {
      let t = 0;
      for (let i = 0; i < e.segIdx; i++) t += dist(map.waypoints[i], map.waypoints[i + 1]);
      return t + e.segT;
    };

    const spawnEnemy = (kind: EnemyKind, hpMul: number, atPos?: Point) => {
      const def = ENEMIES[kind];
      const start = atPos ?? map.waypoints[0];
      let segIdx = 0, segT = 0;
      if (atPos) {
        let bestD = Infinity;
        for (let i = 0; i < map.waypoints.length - 1; i++) {
          const d = distToSeg(atPos, map.waypoints[i], map.waypoints[i + 1]);
          if (d < bestD) { bestD = d; segIdx = i; }
        }
        const a = map.waypoints[segIdx], b = map.waypoints[segIdx + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const l2 = dx * dx + dy * dy;
        let t = l2 ? ((atPos.x - a.x) * dx + (atPos.y - a.y) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        segT = Math.sqrt(l2) * t;
      }
      enemiesRef.current.push({
        id: idCounter.current++, kind,
        hp: def.baseHp * hpMul, maxHp: def.baseHp * hpMul,
        pos: { ...start }, segIdx, segT,
        speedMul: 1, slowUntil: 0,
        reward: Math.round(def.reward * Math.pow(1.04, levelRef.current - 1)),
        damage: def.damage, alive: true, summonTimer: 0,
        burnTimer: 0, burnDps: 0, burnUntil: 0,
        phaseTimer: 0, invuln: false,
        cloakedUntil: 0, empTimer: 0, healTimer: 0,
      });
    };

    // returns aegis multiplier for damage taken
    const aegisMul = (target: Enemy): number => {
      let mul = 1;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];
        if (def.aegisAura && dist(e.pos, target.pos) <= def.aegisAura.range) {
          mul = Math.min(mul, def.aegisAura.resist);
        }
      }
      return mul;
    };

    const damageEnemy = (e: Enemy, dmg: number, type: DamageType, slowFactor?: number, slowDuration?: number, burnDps?: number, burnDuration?: number) => {
      if (!e.alive) return;
      if (e.invuln) {
        floatersRef.current.push({ text: "IMMUNE", pos: { ...e.pos }, ttl: 0.6, color: "#aa44ff" });
        return;
      }
      let eff = applyResistance(dmg, type, e);
      eff *= aegisMul(e);
      e.hp -= eff;
      if (slowFactor && slowDuration) {
        e.speedMul = Math.min(e.speedMul, slowFactor);
        e.slowUntil = Math.max(e.slowUntil, nowSec() + slowDuration);
      }
      if (burnDps && burnDuration) {
        e.burnDps = Math.max(e.burnDps, burnDps);
        e.burnUntil = Math.max(e.burnUntil, nowSec() + burnDuration);
      }
      if (e.hp <= 0) {
        e.alive = false;
        moneyRef.current += e.reward;
        setMoney(m => m + e.reward);
        floatersRef.current.push({ text: `+${e.reward}`, pos: { ...e.pos }, ttl: 0.8, color: "#dc2626" });
        // necro
        const def = ENEMIES[e.kind];
        if (def.necroOnDeath) {
          for (let i = 0; i < def.necroOnDeath.count; i++) spawnEnemy(def.necroOnDeath.kind, hpMulNow() * 0.5, e.pos);
        }
        for (let i = 0; i < 6; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 30 + Math.random() * 60;
          particlesRef.current.push({
            pos: { ...e.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
            ttl: 0.4, maxTtl: 0.4, size: 2 + Math.random() * 2,
            color: ENEMIES[e.kind].color, kind: "smoke",
          });
        }
      }
    };

    const hpMulNow = () => waveRef.current?.hpMul ?? 1;

    const enemyVisibleToTower = (e: Enemy, hiddenDetect: boolean, towerPos: Point) => {
      const def = ENEMIES[e.kind];
      if (def.hidden && !hiddenDetect) return false;
      // cloak aura: nearby cloakers/wraith hide allies
      if (!hiddenDetect) {
        for (const c of enemiesRef.current) {
          if (!c.alive || c === e) continue;
          const cdef = ENEMIES[c.kind];
          if (cdef.cloakAura && dist(c.pos, e.pos) <= cdef.cloakAura.range) return false;
        }
      }
      void towerPos;
      return true;
    };

    const pickTarget = (pos: Point, range: number, hiddenDetect: boolean): Enemy | null => {
      let best: Enemy | null = null;
      let bestProgress = -1;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (!enemyVisibleToTower(e, hiddenDetect, pos)) continue;
        if (dist(e.pos, pos) > range) continue;
        let prog = 0;
        for (let i = 0; i < e.segIdx; i++) prog += dist(map.waypoints[i], map.waypoints[i + 1]);
        prog += e.segT;
        if (prog > bestProgress) { bestProgress = prog; best = e; }
      }
      return best;
    };

    const pickNearest = (pos: Point, range: number, exclude: Set<number>, hiddenDetect: boolean): Enemy | null => {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of enemiesRef.current) {
        if (!e.alive || exclude.has(e.id)) continue;
        if (!enemyVisibleToTower(e, hiddenDetect, pos)) continue;
        const d = dist(e.pos, pos);
        if (d < range && d < bestD) { bestD = d; best = e; }
      }
      return best;
    };

    // returns buff multipliers from nearby engineer/recon towers
    const buffsFor = (t: Tower): { fireRate: number; damage: number } => {
      let fr = 1, dm = 1;
      for (const o of towersRef.current) {
        if (o.id === t.id) continue;
        const os = effectiveStats(TOWERS[o.kind], o.pathIdx, o.tier);
        if (os.buffAura && dist(o.pos, t.pos) <= os.buffAura.range) {
          if (os.buffAura.fireRateMul) fr *= os.buffAura.fireRateMul;
          if (os.buffAura.damageMul) dm *= os.buffAura.damageMul;
        }
      }
      return { fireRate: fr, damage: dm };
    };

    const fireBullet = (t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      particlesRef.current.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.08, maxTtl: 0.08, size: 8, color: "#fff37a", kind: "muzzle",
      });
      for (let i = 0; i < 3; i++) {
        const sa = ang + (Math.random() - 0.5) * 0.6;
        const sp = 80 + Math.random() * 120;
        particlesRef.current.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.2, maxTtl: 0.2, size: 1.5, color: "#ffd070", kind: "spark",
        });
      }
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, slowFactor: stats.slowFactor, slowDuration: stats.slowDuration,
        burnDps: stats.burnDps, burnDuration: stats.burnDuration,
        color: stats.projectileColor, size: 2.5, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireFlame = (t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      // flame jet visuals
      for (let i = 0; i < 6; i++) {
        const sa = ang + (Math.random() - 0.5) * 0.5;
        const sp = 200 + Math.random() * 200;
        particlesRef.current.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.3, maxTtl: 0.3, size: 4 + Math.random() * 3,
          color: i % 2 ? "#ff8a3d" : "#ffae40", kind: "fire",
        });
      }
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        burnDps: stats.burnDps, burnDuration: stats.burnDuration,
        color: stats.projectileColor, size: 3, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireGrenade = (t: Tower, target: Enemy, ub: { interval: number; damage: number; splashRadius: number }, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      const bx = t.pos.x + Math.cos(ang) * 14;
      const by = t.pos.y + Math.sin(ang) * 14;
      particlesRef.current.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.18, maxTtl: 0.18, size: 10, color: "#888", kind: "smoke",
      });
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: 360, damage: ub.damage * dmgMul,
        damageType: "explosion", splashRadius: ub.splashRadius,
        color: "#1a1a1a", size: 4, hiddenDetect: false, alive: true,
      });
    };

    const fireHowitzer = (t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      particlesRef.current.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.18, maxTtl: 0.18, size: 22, color: "#ffae40", kind: "muzzle",
      });
      for (let i = 0; i < 8; i++) {
        const sa = ang + (Math.random() - 0.5) * 1.2;
        const sp = 30 + Math.random() * 80;
        particlesRef.current.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.6, maxTtl: 0.6, size: 6 + Math.random() * 4, color: "#666", kind: "smoke",
        });
      }
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        color: stats.projectileColor, size: 5, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireMortar = (t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      // arc shot — projectile follows parabolic arc; aim straight up visually
      t.aimAngle = -Math.PI / 2;
      particlesRef.current.push({
        pos: { ...t.pos }, vel: { x: 0, y: 0 },
        ttl: 0.2, maxTtl: 0.2, size: 14, color: "#ffae40", kind: "muzzle",
      });
      const total = dist(t.pos, target.pos) / stats.projectileSpeed + 0.4;
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { ...t.pos }, vel: { x: 0, y: 0 },
        target: null, targetPos: { ...target.pos },
        speed: 0, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        color: stats.projectileColor, size: 4, hiddenDetect: false, alive: true,
        arc: { startX: t.pos.x, startY: t.pos.y, targetX: target.pos.x, targetY: target.pos.y, t: 0, total, arcHeight: 100 + dist(t.pos, target.pos) * 0.4 },
      });
    };

    const fireRailgun = (t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const farX = t.pos.x + Math.cos(ang) * Math.max(stats.range, 1000);
      const farY = t.pos.y + Math.sin(ang) * Math.max(stats.range, 1000);
      // collect enemies near the line
      const hits: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (!enemyVisibleToTower(e, !!stats.hiddenDetect, t.pos)) continue;
        if (dist(e.pos, t.pos) > stats.range + 50) continue;
        if (distToSeg(e.pos, t.pos, { x: farX, y: farY }) <= ENEMIES[e.kind].radius + 6) hits.push(e);
      }
      hits.sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos));
      const n = stats.pierceTargets ?? 1;
      const actualHits = hits.slice(0, n);
      const finalPoint = actualHits.length > 0
        ? actualHits[actualHits.length - 1].pos
        : { x: t.pos.x + Math.cos(ang) * stats.range, y: t.pos.y + Math.sin(ang) * stats.range };
      beamsRef.current.push({ from: { ...t.pos }, to: { ...finalPoint }, color: stats.projectileColor, width: 4, ttl: 0.18 });
      // muzzle flash
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      particlesRef.current.push({ pos: { x: bx, y: by }, vel: { x: 0, y: 0 }, ttl: 0.15, maxTtl: 0.15, size: 16, color: stats.projectileColor, kind: "muzzle" });
      for (const h of actualHits) damageEnemy(h, stats.damage * dmgMul, stats.damageType);
    };

    const triggerExplosion = (pos: Point, radius: number, damage: number, type: DamageType, slowFactor?: number, slowDuration?: number) => {
      particlesRef.current.push({ pos: { ...pos }, vel: { x: 0, y: 0 }, ttl: 0.5, maxTtl: 0.5, size: radius, color: "#ef4444", kind: "ring" });
      particlesRef.current.push({ pos: { ...pos }, vel: { x: 0, y: 0 }, ttl: 0.25, maxTtl: 0.25, size: radius * 0.7, color: "#fff5b0", kind: "explosion" });
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        particlesRef.current.push({ pos: { ...pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp }, ttl: 0.45, maxTtl: 0.45, size: 2 + Math.random() * 3, color: i < 6 ? "#ffae40" : "#888", kind: "smoke" });
      }
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (dist(e.pos, pos) <= radius) damageEnemy(e, damage, type, slowFactor, slowDuration);
      }
    };

    const layMine = (t: Tower, stats: TowerStats, dmgMul: number) => {
      // place mine somewhere on path within range
      const wp = map.waypoints;
      const candidates: Point[] = [];
      for (let i = 0; i < wp.length - 1; i++) {
        const a = wp[i], b = wp[i + 1];
        const len = dist(a, b);
        const step = 25;
        for (let s = 0; s <= len; s += step) {
          const tt = s / len;
          const p = { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt };
          if (dist(p, t.pos) <= stats.range) candidates.push(p);
        }
      }
      if (candidates.length === 0) return;
      // avoid clustering
      const filtered = candidates.filter(p => !minesRef.current.some(m => dist(m.pos, p) < 18));
      const pool = filtered.length > 0 ? filtered : candidates;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      minesRef.current.push({
        pos: pick, damage: (stats.mineDamage ?? 50) * dmgMul, splash: stats.mineSplash ?? 40,
        slowFactor: stats.slowFactor, slowDuration: stats.slowDuration, ttl: 999,
      });
    };

    const fireDrone = (t: Tower, drone: Drone, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const dronePos = { x: t.pos.x + Math.cos(drone.angle) * 32, y: t.pos.y + Math.sin(drone.angle) * 32 };
      particlesRef.current.push({ pos: { ...dronePos }, vel: { x: 0, y: 0 }, ttl: 0.08, maxTtl: 0.08, size: 5, color: "#fff37a", kind: "muzzle" });
      const isExplosive = stats.damageType === "explosion";
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { ...dronePos }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed,
        damage: (stats.droneDamage ?? stats.damage) * dmgMul,
        damageType: stats.damageType,
        splashRadius: isExplosive ? stats.splashRadius : undefined,
        color: stats.projectileColor, size: isExplosive ? 4 : 2.2,
        hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const step = (dt: number) => {
      if (dt <= 0) return;

      // spawn enemies from wave
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
          wave.active = false;
          waveActiveRef.current = false;
          setWaveActive(false);
          const bonus = 90 + levelRef.current * 14;
          moneyRef.current += bonus;
          setMoney(m => m + bonus);
          floatersRef.current.push({ text: `+${bonus} bonus`, pos: { x: W / 2, y: 50 }, ttl: 1.6, color: "#dc2626" });
          if (levelRef.current >= 30) {
            setGameOver("win"); gameOverRef.current = "win";
          } else {
            const next = levelRef.current + 1;
            levelRef.current = next; setLevel(next);
          }
        }
      }

      const now = nowSec();

      // move enemies + per-enemy ticks
      const arrivedEnemies: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];

        // burn DoT
        if (e.burnUntil > now && e.burnDps > 0) {
          e.burnTimer += dt;
          if (e.burnTimer >= 0.25) {
            e.burnTimer = 0;
            damageEnemy(e, e.burnDps * 0.25, "fire");
          }
        }
        // regen
        if (def.regen) e.hp = Math.min(e.maxHp, e.hp + def.regen * dt);
        // healer aura
        if (def.healAura) {
          e.healTimer += dt;
          if (e.healTimer >= 0.5) {
            e.healTimer = 0;
            for (const o of enemiesRef.current) {
              if (!o.alive || o.id === e.id) continue;
              if (dist(o.pos, e.pos) <= def.healAura.range) {
                o.hp = Math.min(o.maxHp, o.hp + def.healAura.perSec * 0.5);
              }
            }
          }
        }
        // phaser invuln cycle
        if (def.phaseInterval) {
          e.phaseTimer += dt;
          if (e.phaseTimer >= def.phaseInterval) {
            e.phaseTimer = 0;
            e.invuln = !e.invuln;
          }
        }
        // berserker speed boost
        let bonusSpeed = 1;
        if (def.berserkBelow && e.hp / e.maxHp <= def.berserkBelow) bonusSpeed = 2;
        // EMP attack on towers
        if (def.empAttack) {
          e.empTimer += dt;
          if (e.empTimer >= def.empAttack.interval) {
            e.empTimer = 0;
            // find nearest towers
            const inRange = towersRef.current
              .map(t => ({ t, d: dist(t.pos, e.pos) }))
              .filter(x => x.d <= def.empAttack!.range)
              .sort((a, b) => a.d - b.d)
              .slice(0, def.empAttack!.targets);
            for (const x of inRange) {
              x.t.stunUntil = Math.max(x.t.stunUntil, now + def.empAttack!.duration);
              floatersRef.current.push({ text: "EMP", pos: { ...x.t.pos }, ttl: 1.0, color: "#fff37a" });
              // visual zap
              zapsRef.current.push({ points: [e.pos, x.t.pos], ttl: 0.25 });
            }
          }
        }

        const slow = now < e.slowUntil ? e.speedMul : 1;
        if (now >= e.slowUntil) e.speedMul = 1;
        const v = def.speed * slow * bonusSpeed;
        const newTraveled = traveledOf(e) + v * dt;
        const r = getPositionOnPath(map.waypoints, newTraveled);
        e.pos = r.pos; e.segIdx = r.segIdx; e.segT = r.segT;
        if (r.done) { e.alive = false; arrivedEnemies.push(e); }

        if (def.summon && e.alive) {
          e.summonTimer += dt;
          if (e.summonTimer >= def.summon.interval) {
            e.summonTimer = 0;
            for (let s = 0; s < def.summon.perSpawn; s++) {
              spawnEnemy(def.summon.kind, hpMulNow() * 0.6, e.pos);
            }
          }
        }
        // mines: check trigger
        for (const m of minesRef.current) {
          if (m.ttl <= 0) continue;
          if (dist(e.pos, m.pos) <= ENEMIES[e.kind].radius + 6) {
            m.ttl = 0;
            triggerExplosion(m.pos, m.splash, m.damage, "explosion", m.slowFactor, m.slowDuration);
          }
        }
      }
      if (arrivedEnemies.length > 0) {
        let totalDmg = 0;
        for (const e of arrivedEnemies) totalDmg += e.damage;
        const newLives = Math.max(0, livesRef.current - totalDmg);
        livesRef.current = newLives;
        setLives(newLives);
        floatersRef.current.push({ text: `-${totalDmg} HP`, pos: { x: W - 60, y: 60 }, ttl: 1.2, color: "#dc2626" });
        if (newLives <= 0) { setGameOver("lose"); gameOverRef.current = "lose"; }
      }

      // tower fire & passive
      for (const t of towersRef.current) {
        const def = TOWERS[t.kind];
        const stats = effectiveStats(def, t.pathIdx, t.tier);
        const stunned = t.stunUntil > now;
        const buffs = buffsFor(t);
        const fireRate = stats.fireRate * buffs.fireRate;
        const dmgMul = buffs.damage;

        // bank income (only during active wave)
        if (stats.income && waveActiveRef.current) {
          t.incomeTimer += dt;
          if (t.incomeTimer >= stats.income.interval) {
            t.incomeTimer = 0;
            // black market scales with level (Smuggler/Cartel/Syndicate paths)
            let amt = stats.income.perTick;
            if (t.pathIdx === 2) {
              const lvl = levelRef.current;
              const scale = t.tier === 1 ? 2 : t.tier === 2 ? 4 : t.tier === 3 ? 8 : 0;
              amt += lvl * scale;
            }
            moneyRef.current += amt;
            setMoney(m => m + amt);
            floatersRef.current.push({ text: `+${amt}`, pos: { x: t.pos.x, y: t.pos.y - 18 }, ttl: 0.9, color: "#fff37a" });
            // coin spark
            for (let i = 0; i < 4; i++) {
              const ang = -Math.PI / 2 + (Math.random() - 0.5);
              const sp = 60 + Math.random() * 40;
              particlesRef.current.push({ pos: { ...t.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp }, ttl: 0.5, maxTtl: 0.5, size: 3, color: "#fff37a", kind: "spark" });
            }
          }
        }

        // mine layer
        if (stats.mineDamage && stats.mineCooldown !== undefined && waveActiveRef.current) {
          t.mineTimer += dt;
          if (t.mineTimer >= stats.mineCooldown) {
            t.mineTimer = 0;
            layMine(t, stats, dmgMul);
          }
        }

        // drones
        if (t.drones.length > 0) {
          for (const d of t.drones) {
            d.angle += dt * 1.4;
            d.cooldown -= dt;
            const dronePos = { x: t.pos.x + Math.cos(d.angle) * 32, y: t.pos.y + Math.sin(d.angle) * 32 };
            if (!d.target || !d.target.alive) d.target = pickNearest(dronePos, stats.range, new Set(), !!stats.hiddenDetect);
            if (d.target && d.cooldown <= 0 && !stunned) {
              d.cooldown = 1 / fireRate;
              fireDrone(t, d, d.target, stats, dmgMul);
            }
          }
        }

        if (stunned) continue;

        t.cooldown -= dt;
        if (t.underbarrelCooldown > 0) t.underbarrelCooldown -= dt;
        if (t.burstQueue > 0) t.burstTimer -= dt;

        const visTarget = pickTarget(t.pos, stats.range, !!stats.hiddenDetect);
        if (visTarget) t.aimAngle = Math.atan2(visTarget.pos.y - t.pos.y, visTarget.pos.x - t.pos.x);

        if (t.burstQueue > 0 && t.burstTimer <= 0 && t.burstTarget && t.burstTarget.alive) {
          fireBullet(t, t.burstTarget, stats, dmgMul);
          t.burstQueue -= 1;
          t.burstTimer = stats.burstInterval ?? 0.07;
        } else if (t.burstQueue > 0 && (!t.burstTarget || !t.burstTarget.alive)) {
          if (visTarget) { t.burstTarget = visTarget; t.burstTimer = 0.05; }
          else t.burstQueue = 0;
        }

        if (stats.underbarrel && t.underbarrelCooldown <= 0 && visTarget) {
          fireGrenade(t, visTarget, stats.underbarrel, dmgMul);
          t.underbarrelCooldown = stats.underbarrel.interval;
        }

        if (t.cooldown > 0) continue;
        if (!visTarget) continue;
        if (fireRate <= 0) continue;
        t.cooldown = 1 / fireRate;

        if (t.kind === "tesla" && (stats.chainCount ?? 0) > 0) {
          const hits: Enemy[] = [visTarget];
          const visited = new Set<number>([visTarget.id]);
          let last_ = visTarget;
          const chainCount = stats.chainCount ?? 3;
          for (let c = 0; c < chainCount - 1; c++) {
            const next = pickNearest(last_.pos, 90, visited, !!stats.hiddenDetect);
            if (!next) break;
            hits.push(next); visited.add(next.id); last_ = next;
          }
          const points: Point[] = [t.pos, ...hits.map(h => h.pos)];
          zapsRef.current.push({ points, ttl: 0.18 });
          for (let i = 0; i < hits.length; i++) {
            const dmg = stats.damage * dmgMul * Math.pow(0.85, i);
            damageEnemy(hits[i], dmg, stats.damageType, stats.slowFactor, stats.slowDuration);
          }
        } else if (t.kind === "tesla") {
          fireBullet(t, visTarget, stats, dmgMul);
        } else if (t.kind === "howitzer") {
          fireHowitzer(t, visTarget, stats, dmgMul);
        } else if (t.kind === "mortar") {
          fireMortar(t, visTarget, stats, dmgMul);
        } else if (t.kind === "railgun") {
          fireRailgun(t, visTarget, stats, dmgMul);
        } else if (t.kind === "flame") {
          fireFlame(t, visTarget, stats, dmgMul);
        } else if (t.kind === "drone" || t.kind === "bank" || t.kind === "recon" || t.kind === "minelayer" || t.kind === "engineer") {
          // these have no direct main attack (handled by drones/passive)
        } else {
          if (stats.burstCount && stats.burstCount > 1) {
            t.burstQueue = stats.burstCount - 1;
            t.burstTarget = visTarget;
            t.burstTimer = stats.burstInterval ?? 0.07;
            fireBullet(t, visTarget, stats, dmgMul);
          } else {
            fireBullet(t, visTarget, stats, dmgMul);
          }
        }
      }

      // projectiles
      for (const p of projectilesRef.current) {
        if (!p.alive) continue;
        if (p.arc) {
          p.arc.t += dt;
          const tt = Math.min(1, p.arc.t / p.arc.total);
          p.pos.x = p.arc.startX + (p.arc.targetX - p.arc.startX) * tt;
          // parabola: y = lerp(start, target, tt) - 4*h*tt*(1-tt)
          p.pos.y = p.arc.startY + (p.arc.targetY - p.arc.startY) * tt - 4 * p.arc.arcHeight * tt * (1 - tt);
          if (tt >= 1) {
            if (p.splashRadius) triggerExplosion({ x: p.arc.targetX, y: p.arc.targetY }, p.splashRadius, p.damage, p.damageType);
            p.alive = false;
          }
          continue;
        }
        const aim = p.target && p.target.alive ? p.target.pos : p.targetPos;
        p.targetPos = { ...aim };
        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;
        const d = Math.hypot(dx, dy);
        const stepLen = p.speed * dt;
        if (d <= stepLen) {
          p.pos = { ...aim };
          if (p.splashRadius) {
            triggerExplosion(p.pos, p.splashRadius, p.damage, p.damageType, p.slowFactor, p.slowDuration);
          } else if (p.target && p.target.alive) {
            damageEnemy(p.target, p.damage, p.damageType, p.slowFactor, p.slowDuration, p.burnDps, p.burnDuration);
            for (let i = 0; i < 3; i++) {
              const ang = Math.random() * Math.PI * 2;
              const sp = 30 + Math.random() * 50;
              particlesRef.current.push({ pos: { ...p.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp }, ttl: 0.18, maxTtl: 0.18, size: 1.5, color: p.color, kind: "spark" });
            }
          }
          p.alive = false;
        } else {
          p.pos.x += (dx / d) * stepLen;
          p.pos.y += (dy / d) * stepLen;
        }
      }

      // particles
      for (const p of particlesRef.current) {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.vel.x *= Math.pow(0.4, dt);
        p.vel.y *= Math.pow(0.4, dt);
        p.ttl -= dt;
      }

      // cleanup
      enemiesRef.current = enemiesRef.current.filter(e => e.alive);
      projectilesRef.current = projectilesRef.current.filter(p => p.alive);
      minesRef.current = minesRef.current.filter(m => m.ttl > 0);
      for (const z of zapsRef.current) z.ttl -= dt;
      zapsRef.current = zapsRef.current.filter(z => z.ttl > 0);
      for (const b of beamsRef.current) b.ttl -= dt;
      beamsRef.current = beamsRef.current.filter(b => b.ttl > 0);
      for (const f of floatersRef.current) { f.ttl -= dt; f.pos.y -= 18 * dt; }
      floatersRef.current = floatersRef.current.filter(f => f.ttl > 0);
      particlesRef.current = particlesRef.current.filter(p => p.ttl > 0);
      if (placementErrorRef.current) {
        placementErrorRef.current.ttl -= dt;
        if (placementErrorRef.current.ttl <= 0) placementErrorRef.current = null;
      }
    };

    // ===== Render helpers =====
    const drawAppearance = (ctx: CanvasRenderingContext2D, t: Tower, stats: TowerStats) => {
      const app = stats.appearance ?? [];
      // helmet (small dome on top of body)
      if (app.includes("helmet")) {
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y - 7, 8, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // beret (slanted disk)
      if (app.includes("beret")) {
        ctx.fillStyle = "#22c55e";
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y - 9);
        ctx.rotate(-0.3);
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(-5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // satellite dish (large circular dish)
      if (app.includes("satellite_dish")) {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(-0.3);
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(-1, -1, 2, 6);
        ctx.restore();
      }
      // antenna(s)
      if (app.includes("antenna")) {
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(t.pos.x - 6, t.pos.y - 12); ctx.lineTo(t.pos.x - 6, t.pos.y - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.pos.x + 6, t.pos.y - 12); ctx.lineTo(t.pos.x + 6, t.pos.y - 24); ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(t.pos.x - 6, t.pos.y - 22, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(t.pos.x + 6, t.pos.y - 24, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // scope on barrel (rotated)
      if (app.includes("scope") || app.includes("extra_optic")) {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(t.aimAngle);
        ctx.fillStyle = "#111";
        ctx.fillRect(stats.barrelLength * 0.4, -6, 5, 4);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(stats.barrelLength * 0.4, -6, 5, 1);
        if (app.includes("extra_optic")) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(stats.barrelLength * 0.4 + 6, -7, 4, 5);
        }
        ctx.restore();
      }
      // bipod
      if (app.includes("bipod")) {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(t.aimAngle);
        ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(stats.barrelLength * 0.7, 0); ctx.lineTo(stats.barrelLength * 0.7 + 4, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(stats.barrelLength * 0.7, 0); ctx.lineTo(stats.barrelLength * 0.7 + 4, -6); ctx.stroke();
        ctx.restore();
      }
      // muzzle brake
      if (app.includes("muzzle_brake")) {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(t.aimAngle);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(stats.barrelLength - 1, -stats.barrelWidth / 2 - 2, 4, stats.barrelWidth + 4);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(stats.barrelLength + 1, -1, 2, 2);
        ctx.restore();
      }
      // shield plate around base
      if (app.includes("shield_plate")) {
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 17, -Math.PI * 0.7, -Math.PI * 0.3); ctx.stroke();
      }
      // heavy cap (chunk on top)
      if (app.includes("heavy_cap")) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(t.pos.x - 8, t.pos.y - 14, 16, 5);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(t.pos.x - 8, t.pos.y - 14, 16, 1);
      }
      // spikes
      if (app.includes("spikes")) {
        ctx.fillStyle = stats.accentColor;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(t.pos.x + Math.cos(a) * 14, t.pos.y + Math.sin(a) * 14);
          ctx.lineTo(t.pos.x + Math.cos(a) * 19, t.pos.y + Math.sin(a) * 19);
          ctx.lineTo(t.pos.x + Math.cos(a + 0.2) * 14, t.pos.y + Math.sin(a + 0.2) * 14);
          ctx.closePath();
          ctx.fill();
        }
      }
      // energy core (glowing center)
      if (app.includes("energy_core")) {
        const pulse = 0.6 + Math.sin(performance.now() / 200) * 0.4;
        ctx.fillStyle = stats.accentColor;
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const drawTower = (ctx: CanvasRenderingContext2D, t: Tower, alpha: number) => {
      const def = TOWERS[t.kind];
      const stats = effectiveStats(def, t.pathIdx, t.tier);
      ctx.globalAlpha = alpha;
      // shadow
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(t.pos.x + 1, t.pos.y + 2, 18, 0, Math.PI * 2); ctx.fill();

      // base by tower kind
      ctx.fillStyle = "#0a0a0a";
      if (t.kind === "bank") {
        // vault square
        ctx.fillRect(t.pos.x - 16, t.pos.y - 16, 32, 32);
        ctx.fillStyle = stats.bodyColor;
        ctx.fillRect(t.pos.x - 14, t.pos.y - 14, 28, 28);
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 2;
        ctx.strokeRect(t.pos.x - 14, t.pos.y - 14, 28, 28);
        // vault wheel
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(t.pos.x + Math.cos(a) * 5, t.pos.y + Math.sin(a) * 5);
          ctx.lineTo(t.pos.x + Math.cos(a) * 9, t.pos.y + Math.sin(a) * 9);
          ctx.stroke();
        }
        // $ symbol
        ctx.fillStyle = stats.accentColor;
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("$", t.pos.x, t.pos.y - 14);
      } else if (t.kind === "drone") {
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
        // landing pad H
        ctx.fillStyle = stats.accentColor;
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("H", t.pos.x, t.pos.y + 4);
      } else if (t.kind === "engineer") {
        // hex base
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) ctx.moveTo(t.pos.x + Math.cos(a) * 18, t.pos.y + Math.sin(a) * 18);
          else ctx.lineTo(t.pos.x + Math.cos(a) * 18, t.pos.y + Math.sin(a) * 18);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) ctx.moveTo(t.pos.x + Math.cos(a) * 15, t.pos.y + Math.sin(a) * 15);
          else ctx.lineTo(t.pos.x + Math.cos(a) * 15, t.pos.y + Math.sin(a) * 15);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
        // wrench
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(t.pos.x - 1, t.pos.y - 6, 2, 10);
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y - 6, 3, 0, Math.PI * 2); ctx.fill();
      } else if (t.kind === "minelayer") {
        // boxy with warning markers
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(t.pos.x - 16, t.pos.y - 14, 32, 28);
        ctx.fillStyle = stats.bodyColor;
        ctx.fillRect(t.pos.x - 14, t.pos.y - 12, 28, 24);
        // diagonal warning stripes
        ctx.fillStyle = stats.accentColor;
        for (let i = -14; i < 14; i += 6) {
          ctx.fillRect(t.pos.x + i, t.pos.y - 12, 3, 24);
        }
      } else if (t.kind === "recon") {
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
      } else if (t.kind === "mortar") {
        // pit base
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 12, 0, Math.PI * 2); ctx.fill();
        // tube pointed up
        ctx.fillStyle = stats.barrelColor;
        ctx.fillRect(t.pos.x - stats.barrelWidth / 2, t.pos.y - stats.barrelLength, stats.barrelWidth, stats.barrelLength + 2);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(t.pos.x - stats.barrelWidth / 2 - 1, t.pos.y - stats.barrelLength - 1, stats.barrelWidth + 2, 2);
      } else if (t.kind === "railgun") {
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
      } else if (t.kind === "flame") {
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
        // fuel tank on back
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(t.aimAngle + Math.PI);
        ctx.fillStyle = "#3a2a22";
        ctx.fillRect(8, -5, 10, 10);
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1;
        ctx.strokeRect(8, -5, 10, 10);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.bodyColor;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
      }

      // barrels for combat towers
      if (stats.barrelLength > 0 && t.kind !== "mortar" && t.kind !== "bank" && t.kind !== "drone" && t.kind !== "recon" && t.kind !== "engineer" && t.kind !== "minelayer") {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y);
        ctx.rotate(t.aimAngle);
        const barrels = (
          (t.kind === "howitzer" && t.pathIdx === 2 && t.tier >= 2) ? (t.tier >= 3 ? 4 : 2) :
          (t.kind === "frost" && t.pathIdx === 1 && t.tier >= 1) ? 2 :
          (t.kind === "rifleman" && t.pathIdx === 0 && t.tier >= 3) ? 2 :
          1
        );
        for (let b = 0; b < barrels; b++) {
          const off = barrels === 1 ? 0 : (b - (barrels - 1) / 2) * 4;
          ctx.fillStyle = stats.barrelColor;
          ctx.fillRect(0, off - stats.barrelWidth / 2, stats.barrelLength, stats.barrelWidth);
          ctx.fillStyle = stats.accentColor;
          ctx.fillRect(stats.barrelLength - 2, off - stats.barrelWidth / 2 - 1, 3, stats.barrelWidth + 2);
        }
        if (t.kind === "tesla") {
          ctx.fillStyle = stats.accentColor;
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (stats.underbarrel) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(2, 4, 14, 4);
          ctx.fillStyle = "#dc2626";
          ctx.beginPath(); ctx.arc(14, 6, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // appearance overlays (helmet/beret/scope/etc.)
      drawAppearance(ctx, t, stats);

      // hidden detect badge
      if (stats.hiddenDetect) {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(t.pos.x + 12, t.pos.y - 12, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
      }
      // tier pips
      for (let i = 0; i < t.tier; i++) {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(t.pos.x - 9 + i * 7, t.pos.y + 22, 5, 3);
      }
      // stunned indicator
      if (t.stunUntil > performance.now() / 1000) {
        ctx.strokeStyle = "#fff37a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fff37a";
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("STUNNED", t.pos.x, t.pos.y - 26);
      }

      // drones orbit
      for (const d of t.drones) {
        const dx = t.pos.x + Math.cos(d.angle) * 32;
        const dy = t.pos.y + Math.sin(d.angle) * 32;
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.accentColor;
        ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
        // drone wings
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(dx - 4, dy); ctx.lineTo(dx + 4, dy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx, dy - 4); ctx.lineTo(dx, dy + 4); ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shape: string) => {
      ctx.beginPath();
      if (shape === "diamond") { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
      else if (shape === "square") { ctx.rect(x - r, y - r, r * 2, r * 2); }
      else if (shape === "triangle") { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.9, y + r * 0.7); ctx.lineTo(x - r * 0.9, y + r * 0.7); ctx.closePath(); }
      else if (shape === "octagon") {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      else if (shape === "hex" || shape === "skull") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else { ctx.arc(x, y, r, 0, Math.PI * 2); }
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      const def = ENEMIES[e.kind];
      const slowed = nowSec() < e.slowUntil;
      ctx.save();
      const visible = (() => {
        if (!def.hidden) return true;
        for (const t of towersRef.current) {
          const ts = effectiveStats(TOWERS[t.kind], t.pathIdx, t.tier);
          if (ts.hiddenDetect) {
            if ((ts.intelLevel ?? 0) >= 3) return true;
            if (dist(t.pos, e.pos) <= ts.range) return true;
          }
        }
        return false;
      })();
      if (def.hidden && !visible) ctx.globalAlpha = 0.18;
      else if (def.hidden) ctx.globalAlpha = 0.55;
      if (e.invuln) ctx.globalAlpha = 0.35;

      ctx.fillStyle = def.outline;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius + 2, def.shape ?? "circle");
      ctx.fill();
      ctx.fillStyle = def.color;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius, def.shape ?? "circle");
      ctx.fill();
      if (def.armored) {
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5;
        drawShape(ctx, e.pos.x, e.pos.y, def.radius - 3, def.shape ?? "circle");
        ctx.stroke();
      }
      // shielded marker
      if (e.kind === "shielded") {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 3, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); ctx.stroke();
      }
      // healer cross
      if (e.kind === "healer") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.pos.x - 4, e.pos.y - 1, 8, 2);
        ctx.fillRect(e.pos.x - 1, e.pos.y - 4, 2, 8);
      }
      // regen plus glow
      if (def.regen) {
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 3, 0, Math.PI * 2); ctx.stroke();
      }
      // berserker spikes
      if (e.kind === "berserker") {
        ctx.fillStyle = "#ff5050";
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(e.pos.x + Math.cos(a) * def.radius, e.pos.y + Math.sin(a) * def.radius);
          ctx.lineTo(e.pos.x + Math.cos(a) * (def.radius + 5), e.pos.y + Math.sin(a) * (def.radius + 5));
          ctx.lineTo(e.pos.x + Math.cos(a + 0.3) * def.radius, e.pos.y + Math.sin(a + 0.3) * def.radius);
          ctx.closePath(); ctx.fill();
        }
      }
      // EMP drone arc
      if (e.kind === "empdrone" || e.kind === "bossemp") {
        ctx.strokeStyle = "#fff37a"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
          const r = def.radius + 4 + Math.sin(performance.now() / 100 + a * 4) * 2;
          if (a === 0) ctx.moveTo(e.pos.x + Math.cos(a) * r, e.pos.y + Math.sin(a) * r);
          else ctx.lineTo(e.pos.x + Math.cos(a) * r, e.pos.y + Math.sin(a) * r);
        }
        ctx.stroke();
      }
      // aegis aura ring
      if (def.aegisAura) {
        const pulse = 0.3 + Math.sin(performance.now() / 300) * 0.15;
        ctx.strokeStyle = `rgba(154,223,255,${pulse})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.aegisAura.range, 0, Math.PI * 2); ctx.stroke();
      }
      // healer aura ring
      if (def.healAura) {
        ctx.strokeStyle = "rgba(34,197,94,0.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.healAura.range, 0, Math.PI * 2); ctx.stroke();
      }
      // cloak aura ring
      if (def.cloakAura) {
        ctx.strokeStyle = "rgba(80,80,80,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.cloakAura.range, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      // boss skull marker
      if (def.shape === "skull") {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // burn flicker
      if (e.burnUntil > nowSec()) {
        for (let i = 0; i < 2; i++) {
          ctx.fillStyle = i ? "#ff8a3d" : "#ffae40";
          const fx = e.pos.x + (Math.random() - 0.5) * def.radius;
          const fy = e.pos.y - def.radius + (Math.random() - 0.5) * 4;
          ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      if (slowed) {
        ctx.strokeStyle = "#9adfff"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 4, 0, Math.PI * 2); ctx.stroke();
      }

      // health bar
      const w = def.radius * 2 + 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w, 4);
      ctx.fillStyle = pct > 0.5 ? "#f5f5f5" : pct > 0.25 ? "#dc2626" : "#ef4444";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w * pct, 4);

      if (def.shape === "skull" || e.kind === "juggernaut") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(def.name.toUpperCase(), e.pos.x, e.pos.y - def.radius - 14);
      }

      // hover highlight
      if (hoveredEnemyIdRef.current === e.id) {
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, W, H);
      for (const d of map.decorations) {
        ctx.globalAlpha = d.opacity ?? 1;
        if (d.kind === "rect") {
          ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, d.w, d.h);
          if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = 1; ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1); }
          else { ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1); }
        } else if (d.kind === "circle") {
          ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        } else if (d.kind === "line") {
          ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
          if (d.dash) ctx.setLineDash(d.dash); else ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          ctx.setLineDash([]);
        } else if (d.kind === "text") {
          ctx.fillStyle = d.color; ctx.font = `bold ${d.size}px Inter, sans-serif`; ctx.textAlign = "left";
          ctx.fillText(d.text, d.x, d.y);
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = "rgba(255,255,255,0.025)"; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const wp = map.waypoints;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = map.pathOutline; ctx.lineWidth = 44;
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.strokeStyle = map.pathColor; ctx.lineWidth = 36;
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      const stripe = map.centerStripe ?? { color: "rgba(255,255,255,0.18)", dash: [6, 8] as [number, number], width: 2 };
      ctx.strokeStyle = stripe.color; ctx.lineWidth = stripe.width;
      ctx.setLineDash(stripe.dash);
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath(); ctx.arc(wp[0].x, wp[0].y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.arc(wp[wp.length - 1].x, wp[wp.length - 1].y, 12, 0, Math.PI * 2); ctx.fill();

      // mines
      for (const m of minesRef.current) {
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 2, 0, Math.PI * 2); ctx.fill();
        // pulse
        const pulse = (Math.sin(performance.now() / 250) + 1) / 2;
        ctx.strokeStyle = `rgba(220,38,38,${0.3 + pulse * 0.4})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 7, 0, Math.PI * 2); ctx.stroke();
      }

      // selected tower range
      if (selectedTowerIdRef.current != null) {
        const t = towersRef.current.find(t => t.id === selectedTowerIdRef.current);
        if (t) {
          const def = TOWERS[t.kind];
          const s = effectiveStats(def, t.pathIdx, t.tier);
          const showRange = (s.range ?? 0) > 0 && (s.fireRate > 0 || s.droneCount || s.mineDamage || s.buffAura || s.hiddenDetect);
          if (showRange) {
            ctx.fillStyle = s.buffAura ? "rgba(154,223,255,0.10)" : "rgba(220,38,38,0.10)";
            ctx.strokeStyle = s.buffAura ? "rgba(154,223,255,0.7)" : "rgba(220,38,38,0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, s.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
      }

      // ghost placement
      const sk = selectedKindRef.current;
      if (sk) {
        const m = mouseRef.current;
        if (m.x > 0 && m.x < W) {
          const def = TOWERS[sk];
          const onPath = isOnPath(m, map.waypoints, 24);
          let overlap = false;
          for (const t of towersRef.current) if (dist(t.pos, m) < 30) overlap = true;
          const ok = !onPath && !overlap && moneyRef.current >= def.cost;
          if ((def.base.range ?? 0) > 0) {
            ctx.fillStyle = ok ? "rgba(220,38,38,0.10)" : "rgba(255,80,80,0.15)";
            ctx.strokeStyle = ok ? "rgba(220,38,38,0.6)" : "rgba(255,80,80,0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(m.x, m.y, def.base.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          drawTower(ctx, {
            id: -1, kind: sk, pos: m, pathIdx: null, tier: 0,
            cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
            incomeTimer: 0, mineTimer: 0, drones: [], stunUntil: 0,
          }, 0.65);
        }
      }

      for (const t of towersRef.current) drawTower(ctx, t, 1);
      for (const e of enemiesRef.current) drawEnemy(ctx, e);

      // beams (railgun)
      for (const b of beamsRef.current) {
        const a = Math.min(1, b.ttl * 6);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = b.width;
        ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(b.to.x, b.to.y); ctx.stroke();
        ctx.lineWidth = b.width * 2;
        ctx.globalAlpha = a * 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // projectiles
      for (const p of projectilesRef.current) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2); ctx.fill();
        if (p.size >= 4) {
          ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1; ctx.stroke();
        }
        if (p.arc) {
          // shadow on ground
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.beginPath(); ctx.ellipse(p.arc.startX + (p.arc.targetX - p.arc.startX) * (p.arc.t / p.arc.total), p.arc.startY + (p.arc.targetY - p.arc.startY) * (p.arc.t / p.arc.total), 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
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

      // particles
      for (const p of particlesRef.current) {
        const lifeRatio = p.ttl / p.maxTtl;
        ctx.globalAlpha = Math.max(0, lifeRatio);
        if (p.kind === "muzzle") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * lifeRatio, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "smoke") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1 + (1 - lifeRatio)), 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "explosion") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1.2 - lifeRatio * 0.4), 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "ring") {
          ctx.strokeStyle = p.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1 - lifeRatio * 0.6), 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === "spark") {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
        } else if (p.kind === "fire") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (0.5 + lifeRatio * 0.7), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (placementErrorRef.current) {
        const pe = placementErrorRef.current;
        ctx.strokeStyle = `rgba(255,80,80,${pe.ttl})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pe.pos.x, pe.pos.y, 24 * (1.4 - pe.ttl), 0, Math.PI * 2); ctx.stroke();
      }

      for (const f of floatersRef.current) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.min(1, f.ttl / 1.0);
        ctx.font = "bold 13px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(f.text, f.pos.x, f.pos.y);
        ctx.globalAlpha = 1;
      }

      if (waveAnnounce) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H / 2 - 40, W, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(waveAnnounce, W / 2, H / 2 + 12);
      }
    };

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

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [map, tryPlaceTower, waveAnnounce]);

  const selectedTower = selectedTowerId != null ? towersRef.current.find(t => t.id === selectedTowerId) : null;
  const hoveredEnemy = hoveredEnemyId != null ? enemiesRef.current.find(e => e.id === hoveredEnemyId) : null;

  // intel level from any recon tower
  const intelLevel: number = (() => {
    let best = 0;
    for (const t of towersRef.current) {
      const s = effectiveStats(TOWERS[t.kind], t.pathIdx, t.tier);
      if ((s.intelLevel ?? 0) > best) best = s.intelLevel ?? 0;
    }
    return best;
  })();

  const restart = () => {
    enemiesRef.current = []; towersRef.current = []; projectilesRef.current = [];
    minesRef.current = []; beamsRef.current = [];
    zapsRef.current = []; floatersRef.current = []; particlesRef.current = [];
    waveRef.current = null;
    setLives(100); livesRef.current = 100;
    setMoney(1000); moneyRef.current = 1000;
    setLevel(1); levelRef.current = 1;
    setWaveActive(false); waveActiveRef.current = false;
    setSelectedKind(null); setSelectedTowerId(null);
    setGameOver(null); gameOverRef.current = null;
  };

  const playerName = (typeof window !== "undefined" && localStorage.getItem("bulwark.name")) || "Commander";

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="rounded-sm">
            <Home className="w-4 h-4 mr-1" /> Menu
          </Button>
          <span className="text-sm text-muted-foreground tracking-wide">{map.name}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-foreground font-mono">{playerName}</span>
        </div>
        <div className="flex items-center gap-5">
          <Stat icon={<Heart className="w-4 h-4 text-primary" />} value={lives} label="Lives" />
          <Stat icon={<Coins className="w-4 h-4 text-foreground" />} value={money} label="Funds" />
          <Stat icon={<Trophy className="w-4 h-4 text-primary" />} value={`${level} / 30`} label="Wave" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant={waveActive ? "secondary" : "default"} size="sm" onClick={startWave} disabled={waveActive || !!gameOver} className="rounded-sm">
            <Play className="w-4 h-4 mr-1" />
            {waveActive ? "Wave Active" : `Deploy Wave ${level}`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)} className="rounded-sm" title="P">
            <Pause className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 3 : 1))} className="rounded-sm">
            <FastForward className="w-4 h-4 mr-1" /> {speed}x
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-3 bg-background relative">
          <div className="relative" style={{ aspectRatio: `${W} / ${H}`, width: "100%", maxWidth: "100%", maxHeight: "100%" }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-full rounded-sm shadow-2xl border border-border cursor-crosshair"
            />
            {/* Hover tooltip */}
            {hoveredEnemy && (
              <EnemyTooltip enemy={hoveredEnemy} />
            )}
            {/* Hint bar */}
            <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 px-2 py-1 rounded-sm font-mono">
              [1-9] tower · [Esc] cancel · [Space] wave · [P] pause
            </div>
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-sm">
                <div className="bg-card border border-border p-6 rounded-sm text-center max-w-sm">
                  {gameOver === "win" ? (
                    <>
                      <Crown className="w-12 h-12 mx-auto text-primary mb-2" />
                      <h2 className="text-2xl font-bold mb-1">VICTORY</h2>
                      <p className="text-muted-foreground mb-4">All 30 waves repelled on {map.name}.</p>
                    </>
                  ) : (
                    <>
                      <Skull className="w-12 h-12 mx-auto text-primary mb-2" />
                      <h2 className="text-2xl font-bold mb-1">DEFEATED</h2>
                      <p className="text-muted-foreground mb-4">The line broke on wave {level}.</p>
                    </>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button onClick={restart} className="rounded-sm">Retry</Button>
                    <Button variant="outline" onClick={onExit} className="rounded-sm">Main Menu</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border max-h-[55%] overflow-y-auto">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Build Tower</div>
            <div className="grid grid-cols-1 gap-1.5">
              {TOWER_ORDER.map((k, idx) => {
                const def = TOWERS[k];
                const canAfford = money >= def.cost;
                const selected = selectedKind === k;
                const keyHint = idx < 9 ? (idx + 1).toString() : idx === 9 ? "0" : "";
                return (
                  <button
                    key={k}
                    onClick={() => { setSelectedKind(selected ? null : k); setSelectedTowerId(null); }}
                    disabled={!canAfford}
                    className={`text-left p-2 rounded-sm border transition-colors ${
                      selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    } ${!canAfford ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <TowerIcon kind={k} stats={def.base} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-semibold">{def.name}</div>
                          <DamageBadge type={def.base.damageType} />
                          {keyHint && <span className="text-[9px] font-mono bg-muted px-1 rounded-sm text-muted-foreground">{keyHint}</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-tight truncate">{def.description}</div>
                      </div>
                      <div className="flex items-center text-xs text-foreground font-mono">
                        <Coins className="w-3 h-3 mr-0.5 text-muted-foreground" />{def.cost}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedTower ? (
            <TowerPanel
              tower={selectedTower}
              money={money}
              onUpgrade={(p) => upgradeTower(selectedTower.id, p)}
              onSell={() => sellTower(selectedTower.id)}
            />
          ) : (
            <div className="p-3 flex-1 overflow-y-auto">
              <ThreatPanel level={level} intelLevel={intelLevel} />
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
                Hover any visible enemy to inspect its stats. Press <span className="font-mono bg-muted px-1 rounded-sm">Esc</span> to cancel placement, <span className="font-mono bg-muted px-1 rounded-sm">Space</span> to deploy the next wave.
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Damage Types</div>
                <div className="space-y-1 text-[11px]">
                  {(Object.keys(DAMAGE_LABELS) as DamageType[]).map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: DAMAGE_LABELS[d].color }} />
                      <span className="text-muted-foreground">{DAMAGE_LABELS[d].label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EnemyTooltip({ enemy }: { enemy: Enemy }) {
  const def = ENEMIES[enemy.kind];
  return (
    <div
      className="absolute pointer-events-none bg-card/95 border border-primary rounded-sm p-2 text-xs shadow-2xl z-10 min-w-[200px]"
      style={{ left: `${(enemy.pos.x / W) * 100}%`, top: `${(enemy.pos.y / H) * 100}%`, transform: "translate(20px, -50%)" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-3 h-3" style={{ background: def.color, borderRadius: def.shape === "diamond" ? 0 : 2, transform: def.shape === "diamond" ? "rotate(45deg)" : undefined }} />
        <div className="font-bold">{def.name}</div>
        {def.hidden && <Eye className="w-3 h-3 text-amber-400" />}
        {def.armored && <Shield className="w-3 h-3 text-zinc-300" />}
      </div>
      <div className="text-[10px] text-muted-foreground mb-1.5 leading-snug">{def.description}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <div><span className="text-muted-foreground">HP</span> <span className="font-mono">{Math.ceil(enemy.hp)}/{Math.ceil(enemy.maxHp)}</span></div>
        <div><span className="text-muted-foreground">SPD</span> <span className="font-mono">{def.speed}</span></div>
        <div><span className="text-muted-foreground">DMG</span> <span className="font-mono">{def.damage}</span></div>
        <div><span className="text-muted-foreground">$</span> <span className="font-mono">{enemy.reward}</span></div>
      </div>
      {def.resistances && Object.keys(def.resistances).length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Resistances</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(def.resistances).map(([k, v]) => (
              <span key={k} className="text-[9px] px-1 rounded-sm" style={{ color: DAMAGE_LABELS[k as DamageType].color, background: "rgba(255,255,255,0.05)" }}>
                {k} {Math.round((1 - (v as number)) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
      {def.immunities && def.immunities.length > 0 && (
        <div className="mt-1">
          <div className="text-[9px] uppercase tracking-wider text-primary mb-0.5">Immunities</div>
          <div className="flex flex-wrap gap-1">
            {def.immunities.map(k => (
              <span key={k} className="text-[9px] px-1 rounded-sm font-bold" style={{ color: DAMAGE_LABELS[k].color, background: "rgba(220,38,38,0.15)" }}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
      {(def.summon || def.healAura || def.regen || def.empAttack || def.aegisAura || def.cloakAura || def.berserkBelow || def.phaseInterval || def.necroOnDeath) && (
        <div className="mt-1.5 pt-1.5 border-t border-border space-y-0.5 text-[9px]">
          {def.summon && <div className="text-amber-400">Summons {ENEMIES[def.summon.kind].name} every {def.summon.interval}s</div>}
          {def.healAura && <div className="text-emerald-400">Heals nearby {def.healAura.perSec}/s</div>}
          {def.regen && <div className="text-emerald-400">Regenerates {def.regen} hp/s</div>}
          {def.empAttack && <div className="text-yellow-400">Stuns {def.empAttack.targets} towers for {def.empAttack.duration}s every {def.empAttack.interval}s</div>}
          {def.aegisAura && <div className="text-cyan-400">Aegis aura {def.aegisAura.range}u: nearby take {Math.round(def.aegisAura.resist * 100)}% damage</div>}
          {def.cloakAura && <div className="text-zinc-400">Cloaks allies within {def.cloakAura.range}u</div>}
          {def.berserkBelow && <div className="text-red-400">2× speed below {Math.round(def.berserkBelow * 100)}% HP</div>}
          {def.phaseInterval && <div className="text-purple-400">Phases invulnerable every {def.phaseInterval}s</div>}
          {def.necroOnDeath && <div className="text-purple-400">Spawns {def.necroOnDeath.count} {ENEMIES[def.necroOnDeath.kind].name} on death</div>}
        </div>
      )}
    </div>
  );
}

function ThreatPanel({ level, intelLevel }: { level: number; intelLevel: number }) {
  const wave = generateWave(level);
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
        <span>Wave {level} Threats</span>
        {intelLevel > 0 && <span className="text-[9px] text-cyan-400 normal-case tracking-normal flex items-center gap-1"><Radar className="w-3 h-3" />Intel L{intelLevel}</span>}
      </div>
      {(level % 10 === 0) && <div className="flex items-center gap-2 text-primary text-xs mb-1"><Skull className="w-3.5 h-3.5" /> {wave.bossKind ? ENEMIES[wave.bossKind].name : "Boss"}</div>}
      {(level % 5 === 0 && level % 10 !== 0) && <div className="flex items-center gap-2 text-amber-400 text-xs mb-1"><Skull className="w-3.5 h-3.5" /> Mini-Boss</div>}
      <div className="space-y-1 text-xs">
        {wave.spawns.map((s, i) => {
          const ed = ENEMIES[s.kind];
          let countText: string = "?";
          if (intelLevel >= 2) countText = `×${s.count}`;
          else if (intelLevel === 1) {
            const lo = Math.max(1, Math.floor(s.count * 0.7));
            const hi = Math.ceil(s.count * 1.3);
            countText = `×${lo}-${hi}`;
          } else countText = "?";
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ background: ed.color, borderRadius: ed.shape === "diamond" ? 0 : 999, transform: ed.shape === "diamond" ? "rotate(45deg)" : undefined }} />
              <span className="text-muted-foreground flex-1">{ed.name}</span>
              {ed.hidden && <Eye className="w-3 h-3 text-amber-400" />}
              {ed.armored && <Shield className="w-3 h-3 text-zinc-300" />}
              {ed.summon && <ZapIcon className="w-3 h-3 text-primary" />}
              <span className="font-mono text-[10px] text-foreground">{countText}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TowerPanel({ tower, money, onUpgrade, onSell }: { tower: Tower; money: number; onUpgrade: (p: number) => void; onSell: () => void }) {
  const def = TOWERS[tower.kind];
  const stats = effectiveStats(def, tower.pathIdx, tower.tier);
  const sellAmt = Math.round(totalSpent(def, tower.pathIdx, tower.tier) * 0.65);
  const currentName = tower.pathIdx !== null && tower.tier > 0
    ? def.paths[tower.pathIdx].tiers[tower.tier - 1].name
    : def.name;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <TowerIcon kind={tower.kind} stats={stats} />
          <div className="flex-1">
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {currentName}
              {stats.hiddenDetect && <Eye className="w-3 h-3 text-amber-400" />}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{def.name} · Tier {tower.tier}</div>
          </div>
          <DamageBadge type={stats.damageType} />
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px] mb-2">
          {stats.fireRate > 0 ? (
            <>
              <StatBlock label="DMG" value={Math.round(stats.damage)} />
              <StatBlock label="RNG" value={Math.round(stats.range)} />
              <StatBlock label="RPS" value={stats.fireRate.toFixed(1)} />
            </>
          ) : stats.income ? (
            <>
              <StatBlock label="$/TICK" value={stats.income.perTick} />
              <StatBlock label="EVERY" value={`${stats.income.interval}s`} />
              <StatBlock label="$/MIN" value={Math.round((stats.income.perTick / stats.income.interval) * 60)} />
            </>
          ) : stats.mineDamage ? (
            <>
              <StatBlock label="MINE DMG" value={Math.round(stats.mineDamage)} />
              <StatBlock label="RNG" value={Math.round(stats.range)} />
              <StatBlock label="EVERY" value={`${stats.mineCooldown ?? 4}s`} />
            </>
          ) : stats.buffAura ? (
            <>
              <StatBlock label="RNG" value={Math.round(stats.buffAura.range)} />
              <StatBlock label="RPS×" value={(stats.buffAura.fireRateMul ?? 1).toFixed(2)} />
              <StatBlock label="DMG×" value={(stats.buffAura.damageMul ?? 1).toFixed(2)} />
            </>
          ) : (
            <>
              <StatBlock label="RNG" value={Math.round(stats.range)} />
              <StatBlock label="INTEL" value={`L${stats.intelLevel ?? 0}`} />
              <StatBlock label="DRONES" value={stats.droneCount ?? 0} />
            </>
          )}
        </div>
        {(stats.splashRadius || stats.slowFactor || stats.chainCount || stats.underbarrel || stats.burstCount || stats.burnDps || stats.pierceTargets) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {stats.splashRadius ? <Tag>AoE {stats.splashRadius}</Tag> : null}
            {stats.slowFactor ? <Tag>Slow {Math.round((1 - stats.slowFactor) * 100)}%</Tag> : null}
            {stats.chainCount ? <Tag>Chain {stats.chainCount}</Tag> : null}
            {stats.burstCount ? <Tag>Burst {stats.burstCount}</Tag> : null}
            {stats.burnDps ? <Tag>Burn {stats.burnDps}/s</Tag> : null}
            {stats.pierceTargets ? <Tag>Pierce ×{stats.pierceTargets > 50 ? "∞" : stats.pierceTargets}</Tag> : null}
            {stats.underbarrel ? <Tag>GP-25</Tag> : null}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={onSell} className="w-full rounded-sm">
          Sell · {sellAmt}g
        </Button>
      </div>

      <div className="p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Upgrade Paths</div>
        {def.paths.map((path, pIdx) => {
          const locked = tower.pathIdx !== null && tower.pathIdx !== pIdx;
          const isPath = tower.pathIdx === pIdx;
          const nextCost = upgradeCostFor(def, pIdx, tower.tier);
          const canBuy = nextCost !== null && money >= nextCost && (tower.pathIdx === null || tower.pathIdx === pIdx);
          return (
            <div
              key={pIdx}
              className={`mb-2 p-2 rounded-sm border ${
                isPath ? "border-primary bg-primary/5" : locked ? "border-border opacity-50" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold">{path.name}</div>
                  <div className="text-[10px] text-muted-foreground">{path.tagline}</div>
                </div>
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-3 rounded-sm ${isPath && tower.tier > i ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </div>
              {nextCost !== null && !locked ? (
                <Button
                  size="sm"
                  variant={isPath ? "default" : "outline"}
                  className="w-full mt-1 rounded-sm h-8"
                  onClick={() => onUpgrade(pIdx)}
                  disabled={!canBuy}
                >
                  <ChevronRight className="w-3 h-3 mr-0.5" />
                  <span className="text-[11px] flex-1 text-left truncate">{path.tiers[tower.tier].name}</span>
                  <span className="text-[11px] font-mono">{nextCost}g</span>
                </Button>
              ) : nextCost === null && isPath ? (
                <div className="text-[10px] text-center text-muted-foreground mt-1 py-1">Path Maxed</div>
              ) : locked ? (
                <div className="text-[10px] text-center text-muted-foreground mt-1 py-1">Path Locked</div>
              ) : null}
              {isPath && tower.tier > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  {path.tiers[tower.tier - 1].description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TowerIcon({ kind, stats }: { kind: TowerKind; stats: TowerStats }) {
  const Icon =
    kind === "bank" ? DollarSign :
    kind === "recon" ? Radar :
    kind === "engineer" ? Wrench :
    kind === "flame" ? Flame :
    kind === "mortar" ? Bomb :
    kind === "minelayer" ? Bomb :
    null;
  return (
    <div className="w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center" style={{ background: stats.bodyColor, boxShadow: `inset 0 0 0 1.5px ${stats.accentColor}` }}>
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: stats.accentColor }} />}
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

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/40 rounded-sm px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-bold font-mono">{value}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[9px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded-sm">{children}</span>;
}

function DamageBadge({ type }: { type: DamageType }) {
  const d = DAMAGE_LABELS[type];
  return (
    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm font-semibold" style={{ color: d.color, background: "rgba(255,255,255,0.05)", border: `1px solid ${d.color}40` }}>
      {d.label}
    </span>
  );
}

