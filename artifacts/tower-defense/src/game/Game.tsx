import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Coins, Trophy, Play, FastForward, Pause, Home, Crown, Skull, Eye, Shield, Zap as ZapIcon, ChevronRight } from "lucide-react";
import {
  MAPS, TOWERS, ENEMIES, generateWave, effectiveStats, upgradeCostFor, totalSpent, DAMAGE_LABELS,
  type MapDef, type Point, type TowerKind, type EnemyKind, type WaveSpawn, type DamageType, type TowerDef,
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
};

type Tower = {
  id: number;
  kind: TowerKind;
  pos: Point;
  pathIdx: number | null;
  tier: number;
  cooldown: number;
  underbarrelCooldown: number;
  burstQueue: number; // remaining bullets in burst
  burstTimer: number;
  burstTarget: Enemy | null;
  aimAngle: number;
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
  color: string;
  size: number;
  hiddenDetect: boolean;
  alive: boolean;
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
  kind: "muzzle" | "smoke" | "explosion" | "spark" | "ring";
};

type Props = { map: MapDef; onExit: () => void };

function dist(a: Point, b: Point) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function pathLength(wp: Point[]) { let t = 0; for (let i = 1; i < wp.length; i++) t += dist(wp[i - 1], wp[i]); return t; }

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
  if (def.resistances && def.resistances[type] !== undefined) return dmg * (def.resistances[type] as number);
  if (def.armored) {
    if (type === "physical") return dmg * 0.25;
    if (type === "energy") return dmg * 0.4;
  }
  return dmg;
}

export default function Game({ map, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
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

  const waveRef = useRef<{
    spawns: WaveSpawn[]; hpMul: number; spawned: number[]; timers: number[]; active: boolean;
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

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { moneyRef.current = money; }, [money]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { waveActiveRef.current = waveActive; }, [waveActive]);
  useEffect(() => { selectedTowerIdRef.current = selectedTowerId; }, [selectedTowerId]);
  useEffect(() => { selectedKindRef.current = selectedKind; }, [selectedKind]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

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
    if (moneyRef.current < def.cost) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    if (isOnPath(p, map.waypoints, 24)) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    for (const t of towersRef.current) if (dist(t.pos, p) < 30) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    if (p.x < 18 || p.x > W - 18 || p.y < 18 || p.y > H - 18) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
    towersRef.current.push({
      id: idCounter.current++, kind, pos: { ...p }, pathIdx: null, tier: 0,
      cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
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
    const onLeave = () => { mouseRef.current = { x: -100, y: -100 }; };
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
      // find segIdx for atPos
      let segIdx = 0, segT = 0;
      if (atPos) {
        // find nearest segment
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
      });
    };

    const damageEnemy = (e: Enemy, dmg: number, type: DamageType, slowFactor?: number, slowDuration?: number) => {
      if (!e.alive) return;
      const eff = applyResistance(dmg, type, e);
      e.hp -= eff;
      if (slowFactor && slowDuration) {
        e.speedMul = Math.min(e.speedMul, slowFactor);
        e.slowUntil = Math.max(e.slowUntil, nowSec() + slowDuration);
      }
      if (e.hp <= 0) {
        e.alive = false;
        moneyRef.current += e.reward;
        setMoney(m => m + e.reward);
        floatersRef.current.push({ text: `+${e.reward}`, pos: { ...e.pos }, ttl: 0.8, color: "#dc2626" });
        // death particles
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

    const enemyVisible = (e: Enemy, hiddenDetect: boolean) => {
      const def = ENEMIES[e.kind];
      if (def.hidden && !hiddenDetect) return false;
      return true;
    };

    const pickTarget = (pos: Point, range: number, hiddenDetect: boolean): Enemy | null => {
      let best: Enemy | null = null;
      let bestProgress = -1;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (!enemyVisible(e, hiddenDetect)) continue;
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
        if (!enemyVisible(e, hiddenDetect)) continue;
        const d = dist(e.pos, pos);
        if (d < range && d < bestD) { bestD = d; best = e; }
      }
      return best;
    };

    const fireBullet = (t: Tower, target: Enemy, stats: ReturnType<typeof effectiveStats>) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      // muzzle flash
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
        speed: stats.projectileSpeed,
        damage: stats.damage,
        damageType: stats.damageType,
        slowFactor: stats.slowFactor,
        slowDuration: stats.slowDuration,
        color: stats.projectileColor,
        size: 2.5,
        hiddenDetect: !!stats.hiddenDetect,
        alive: true,
      });
    };

    const fireGrenade = (t: Tower, target: Enemy, ub: { interval: number; damage: number; splashRadius: number }) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      const bx = t.pos.x + Math.cos(ang) * 14;
      const by = t.pos.y + Math.sin(ang) * 14;
      // launch puff
      particlesRef.current.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.18, maxTtl: 0.18, size: 10, color: "#888", kind: "smoke",
      });
      projectilesRef.current.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: 360,
        damage: ub.damage,
        damageType: "explosion",
        splashRadius: ub.splashRadius,
        color: "#1a1a1a",
        size: 4,
        hiddenDetect: false,
        alive: true,
      });
    };

    const fireHowitzer = (t: Tower, target: Enemy, stats: ReturnType<typeof effectiveStats>) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      // big muzzle flash
      particlesRef.current.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.18, maxTtl: 0.18, size: 22, color: "#ffae40", kind: "muzzle",
      });
      // smoke cloud
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
        speed: stats.projectileSpeed,
        damage: stats.damage,
        damageType: stats.damageType,
        splashRadius: stats.splashRadius,
        color: stats.projectileColor,
        size: 5,
        hiddenDetect: !!stats.hiddenDetect,
        alive: true,
      });
    };

    const triggerExplosion = (pos: Point, radius: number, damage: number, type: DamageType) => {
      // visual
      particlesRef.current.push({
        pos: { ...pos }, vel: { x: 0, y: 0 },
        ttl: 0.5, maxTtl: 0.5, size: radius, color: "#ef4444", kind: "ring",
      });
      particlesRef.current.push({
        pos: { ...pos }, vel: { x: 0, y: 0 },
        ttl: 0.25, maxTtl: 0.25, size: radius * 0.7, color: "#fff5b0", kind: "explosion",
      });
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        particlesRef.current.push({
          pos: { ...pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
          ttl: 0.45, maxTtl: 0.45, size: 2 + Math.random() * 3,
          color: i < 6 ? "#ffae40" : "#888", kind: "smoke",
        });
      }
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        if (dist(e.pos, pos) <= radius) damageEnemy(e, damage, type);
      }
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

      // move enemies + summoner logic
      const arrivedEnemies: Enemy[] = [];
      const hpMulNow = waveRef.current?.hpMul ?? 1;
      for (const e of enemiesRef.current) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];
        const slow = nowSec() < e.slowUntil ? e.speedMul : 1;
        if (nowSec() >= e.slowUntil) e.speedMul = 1;
        const v = def.speed * slow;
        const newTraveled = traveledOf(e) + v * dt;
        const r = getPositionOnPath(map.waypoints, newTraveled);
        e.pos = r.pos; e.segIdx = r.segIdx; e.segT = r.segT;
        if (r.done) { e.alive = false; arrivedEnemies.push(e); }

        if (def.summon && e.alive) {
          e.summonTimer += dt;
          if (e.summonTimer >= def.summon.interval) {
            e.summonTimer = 0;
            for (let s = 0; s < def.summon.perSpawn; s++) {
              spawnEnemy(def.summon.kind, hpMulNow * 0.6, e.pos);
            }
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

      // tower fire
      for (const t of towersRef.current) {
        const def = TOWERS[t.kind];
        const stats = effectiveStats(def, t.pathIdx, t.tier);
        t.cooldown -= dt;
        if (t.underbarrelCooldown > 0) t.underbarrelCooldown -= dt;
        if (t.burstQueue > 0) t.burstTimer -= dt;

        // aim toward closest visible
        const visTarget = pickTarget(t.pos, stats.range, !!stats.hiddenDetect);
        if (visTarget) {
          t.aimAngle = Math.atan2(visTarget.pos.y - t.pos.y, visTarget.pos.x - t.pos.x);
        }

        // burst follow-up shots
        if (t.burstQueue > 0 && t.burstTimer <= 0 && t.burstTarget && t.burstTarget.alive) {
          fireBullet(t, t.burstTarget, stats);
          t.burstQueue -= 1;
          t.burstTimer = stats.burstInterval ?? 0.07;
        } else if (t.burstQueue > 0 && (!t.burstTarget || !t.burstTarget.alive)) {
          // retarget
          if (visTarget) { t.burstTarget = visTarget; t.burstTimer = 0.05; }
          else t.burstQueue = 0;
        }

        // underbarrel grenade fires when target available
        if (stats.underbarrel && t.underbarrelCooldown <= 0 && visTarget) {
          fireGrenade(t, visTarget, stats.underbarrel);
          t.underbarrelCooldown = stats.underbarrel.interval;
        }

        if (t.cooldown > 0) continue;
        if (!visTarget) continue;

        t.cooldown = 1 / stats.fireRate;
        if (t.kind === "tesla" && (stats.chainCount ?? 0) > 0) {
          // chain lightning
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
            const dmg = stats.damage * Math.pow(0.85, i);
            damageEnemy(hits[i], dmg, stats.damageType, stats.slowFactor, stats.slowDuration);
          }
        } else if (t.kind === "tesla") {
          // focused beam: single target
          fireBullet(t, visTarget, { ...stats, projectileColor: stats.projectileColor });
        } else if (t.kind === "howitzer") {
          fireHowitzer(t, visTarget, stats);
        } else {
          // normal / burst
          if (stats.burstCount && stats.burstCount > 1) {
            t.burstQueue = stats.burstCount - 1;
            t.burstTarget = visTarget;
            t.burstTimer = stats.burstInterval ?? 0.07;
            fireBullet(t, visTarget, stats);
          } else {
            fireBullet(t, visTarget, stats);
          }
        }
      }

      // projectiles
      for (const p of projectilesRef.current) {
        if (!p.alive) continue;
        const aim = p.target && p.target.alive ? p.target.pos : p.targetPos;
        p.targetPos = { ...aim };
        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;
        const d = Math.hypot(dx, dy);
        const stepLen = p.speed * dt;
        if (d <= stepLen) {
          p.pos = { ...aim };
          if (p.splashRadius) {
            triggerExplosion(p.pos, p.splashRadius, p.damage, p.damageType);
          } else if (p.target && p.target.alive) {
            damageEnemy(p.target, p.damage, p.damageType, p.slowFactor, p.slowDuration);
            // tiny impact spark
            for (let i = 0; i < 3; i++) {
              const ang = Math.random() * Math.PI * 2;
              const sp = 30 + Math.random() * 50;
              particlesRef.current.push({
                pos: { ...p.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
                ttl: 0.18, maxTtl: 0.18, size: 1.5, color: p.color, kind: "spark",
              });
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
      for (const z of zapsRef.current) z.ttl -= dt;
      zapsRef.current = zapsRef.current.filter(z => z.ttl > 0);
      for (const f of floatersRef.current) { f.ttl -= dt; f.pos.y -= 18 * dt; }
      floatersRef.current = floatersRef.current.filter(f => f.ttl > 0);
      particlesRef.current = particlesRef.current.filter(p => p.ttl > 0);
      if (placementErrorRef.current) {
        placementErrorRef.current.ttl -= dt;
        if (placementErrorRef.current.ttl <= 0) placementErrorRef.current = null;
      }
    };

    // ===== Render =====
    const drawTower = (ctx: CanvasRenderingContext2D, t: Tower, alpha: number) => {
      const def = TOWERS[t.kind];
      const stats = effectiveStats(def, t.pathIdx, t.tier);
      ctx.globalAlpha = alpha;
      // base shadow
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(t.pos.x + 1, t.pos.y + 2, 18, 0, Math.PI * 2); ctx.fill();
      // platform
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = stats.bodyColor;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
      // accent ring
      ctx.strokeStyle = stats.accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();

      // barrel(s) — rotated
      ctx.save();
      ctx.translate(t.pos.x, t.pos.y);
      ctx.rotate(t.aimAngle);
      const barrels = (t.kind === "howitzer" && t.pathIdx === 2 && t.tier >= 2) ? (t.tier >= 3 ? 4 : 2) : 1;
      for (let b = 0; b < barrels; b++) {
        const off = barrels === 1 ? 0 : (b - (barrels - 1) / 2) * 4;
        ctx.fillStyle = stats.barrelColor;
        ctx.fillRect(0, off - stats.barrelWidth / 2, stats.barrelLength, stats.barrelWidth);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(stats.barrelLength - 2, off - stats.barrelWidth / 2 - 1, 3, stats.barrelWidth + 2);
      }
      // tower-specific gear
      if (t.kind === "tesla") {
        ctx.fillStyle = stats.accentColor;
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (stats.underbarrel) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(2, 4, 14, 4);
      }
      ctx.restore();

      // hidden detect indicator
      if (stats.hiddenDetect) {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(t.pos.x + 11, t.pos.y - 11, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // tier pips
      for (let i = 0; i < t.tier; i++) {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(t.pos.x - 9 + i * 7, t.pos.y + 22, 5, 3);
      }
      ctx.globalAlpha = 1;
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      const def = ENEMIES[e.kind];
      const slowed = nowSec() < e.slowUntil;
      ctx.save();
      if (def.hidden) ctx.globalAlpha = 0.55;
      // outline
      ctx.fillStyle = def.outline;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius + 2, def.shape ?? "circle");
      ctx.fill();
      // body
      ctx.fillStyle = def.color;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius, def.shape ?? "circle");
      ctx.fill();
      // armor plate
      if (def.armored) {
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1.5;
        drawShape(ctx, e.pos.x, e.pos.y, def.radius - 3, def.shape ?? "circle");
        ctx.stroke();
      }
      // skull marker for bosses
      if (def.shape === "skull") {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (slowed) {
        ctx.strokeStyle = "#9adfff";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 4, 0, Math.PI * 2); ctx.stroke();
      }

      // health bar
      const w = def.radius * 2 + 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w, 4);
      ctx.fillStyle = pct > 0.5 ? "#f5f5f5" : pct > 0.25 ? "#dc2626" : "#ef4444";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w * pct, 4);

      if (e.kind === "boss" || e.kind === "miniboss") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(def.name.toUpperCase(), e.pos.x, e.pos.y - def.radius - 14);
      }
    };

    const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shape: string) => {
      ctx.beginPath();
      if (shape === "diamond") {
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      } else if (shape === "square") {
        ctx.rect(x - r, y - r, r * 2, r * 2);
      } else if (shape === "hex") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      // bg
      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, W, H);
      // decorations behind path
      for (const d of map.decorations) {
        ctx.globalAlpha = d.opacity ?? 1;
        if (d.kind === "rect") {
          ctx.fillStyle = d.color; ctx.fillRect(d.x, d.y, d.w, d.h);
          // building edge highlights
          ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
          ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1);
        } else if (d.kind === "circle") {
          ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        } else if (d.kind === "line") {
          ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
          if (d.dash) ctx.setLineDash(d.dash); else ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
      }
      // grid (faint)
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const wp = map.waypoints;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = map.pathOutline;
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
      ctx.strokeStyle = map.id === "highway" ? "rgba(255,220,80,0.65)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = map.id === "highway" ? 3 : 2;
      ctx.setLineDash(map.id === "highway" ? [18, 14] : [6, 8]);
      ctx.beginPath();
      ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // start/end
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath(); ctx.arc(wp[0].x, wp[0].y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.arc(wp[wp.length - 1].x, wp[wp.length - 1].y, 12, 0, Math.PI * 2); ctx.fill();

      // selected tower range
      if (selectedTowerIdRef.current != null) {
        const t = towersRef.current.find(t => t.id === selectedTowerIdRef.current);
        if (t) {
          const def = TOWERS[t.kind];
          const s = effectiveStats(def, t.pathIdx, t.tier);
          ctx.fillStyle = "rgba(220,38,38,0.10)";
          ctx.strokeStyle = "rgba(220,38,38,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, s.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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
          ctx.fillStyle = ok ? "rgba(220,38,38,0.10)" : "rgba(255,80,80,0.15)";
          ctx.strokeStyle = ok ? "rgba(220,38,38,0.6)" : "rgba(255,80,80,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(m.x, m.y, def.base.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          drawTower(ctx, {
            id: -1, kind: sk, pos: m, pathIdx: null, tier: 0,
            cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
          }, 0.65);
        }
      }

      for (const t of towersRef.current) drawTower(ctx, t, 1);
      for (const e of enemiesRef.current) drawEnemy(ctx, e);

      // projectiles
      for (const p of projectilesRef.current) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2); ctx.fill();
        if (p.size >= 4) {
          ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1; ctx.stroke();
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
        }
      }
      ctx.globalAlpha = 1;

      // placement error pulse
      if (placementErrorRef.current) {
        const pe = placementErrorRef.current;
        ctx.strokeStyle = `rgba(255,80,80,${pe.ttl})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pe.pos.x, pe.pos.y, 24 * (1.4 - pe.ttl), 0, Math.PI * 2); ctx.stroke();
      }

      for (const f of floatersRef.current) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.min(1, f.ttl / 1.0);
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.pos.x, f.pos.y);
        ctx.globalAlpha = 1;
      }

      if (waveAnnounce) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, H / 2 - 40, W, 80);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px Inter, sans-serif";
        ctx.textAlign = "center";
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

  const restart = () => {
    enemiesRef.current = []; towersRef.current = []; projectilesRef.current = [];
    zapsRef.current = []; floatersRef.current = []; particlesRef.current = [];
    waveRef.current = null;
    setLives(100); livesRef.current = 100;
    setMoney(1000); moneyRef.current = 1000;
    setLevel(1); levelRef.current = 1;
    setWaveActive(false); waveActiveRef.current = false;
    setSelectedKind(null); setSelectedTowerId(null);
    setGameOver(null); gameOverRef.current = null;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit} className="rounded-sm">
            <Home className="w-4 h-4 mr-1" /> Menu
          </Button>
          <span className="text-sm text-muted-foreground tracking-wide">{map.name}</span>
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
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)} className="rounded-sm">
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

        {/* Sidebar */}
        <div className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Build Tower</div>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(TOWERS) as TowerKind[]).map(k => {
                const def = TOWERS[k];
                const canAfford = money >= def.cost;
                const selected = selectedKind === k;
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
                      <div className="w-7 h-7 rounded-sm flex-shrink-0" style={{ background: def.base.bodyColor, boxShadow: `inset 0 0 0 1.5px ${def.base.accentColor}` }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-semibold">{def.name}</div>
                          <DamageBadge type={def.base.damageType} />
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
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Wave {level} Threats</div>
              <div className="space-y-1.5 text-xs">
                {(level % 10 === 0) && (
                  <div className="flex items-center gap-2 text-primary"><Skull className="w-3.5 h-3.5" /> Boss Wave — extreme</div>
                )}
                {(level % 5 === 0 && level % 10 !== 0) && (
                  <div className="flex items-center gap-2 text-amber-400"><Skull className="w-3.5 h-3.5" /> Mini-Boss incoming</div>
                )}
                {(Object.keys(ENEMIES) as EnemyKind[])
                  .filter(k => {
                    if (k === "boss") return level % 10 === 0;
                    if (k === "miniboss") return level % 5 === 0 && level % 10 !== 0;
                    if (k === "swarm") return level >= 7 && level % 5 !== 0;
                    if (k === "tank") return level >= 4;
                    if (k === "swift") return level >= 2;
                    if (k === "stealth") return level >= 6;
                    if (k === "armored") return level >= 8;
                    if (k === "summoner") return level >= 12;
                    return level % 5 !== 0 || k === "grunt";
                  })
                  .map(k => {
                    const ed = ENEMIES[k];
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <div className="w-3 h-3" style={{ background: ed.color, borderRadius: ed.shape === "diamond" ? 0 : 999, transform: ed.shape === "diamond" ? "rotate(45deg)" : undefined }} />
                        <span className="text-muted-foreground flex-1">{ed.name}</span>
                        {ed.hidden && <Eye className="w-3 h-3 text-amber-400" />}
                        {ed.armored && <Shield className="w-3 h-3 text-zinc-300" />}
                        {ed.summon && <ZapIcon className="w-3 h-3 text-primary" />}
                      </div>
                    );
                  })}
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
                Click a tower to build, then click the map. Click a placed tower to upgrade along one of three paths or sell. Hidden enemies require optics. Armored enemies resist physical and energy damage.
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
          <div className="w-9 h-9 rounded-sm flex-shrink-0" style={{ background: stats.bodyColor, boxShadow: `inset 0 0 0 2px ${stats.accentColor}` }} />
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
          <StatBlock label="DMG" value={Math.round(stats.damage)} />
          <StatBlock label="RNG" value={Math.round(stats.range)} />
          <StatBlock label="RPS" value={stats.fireRate.toFixed(1)} />
        </div>
        {(stats.splashRadius || stats.slowFactor || stats.chainCount || stats.underbarrel || stats.burstCount) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {stats.splashRadius ? <Tag>AoE {stats.splashRadius}</Tag> : null}
            {stats.slowFactor ? <Tag>Slow {Math.round((1 - stats.slowFactor) * 100)}%</Tag> : null}
            {stats.chainCount ? <Tag>Chain {stats.chainCount}</Tag> : null}
            {stats.burstCount ? <Tag>Burst {stats.burstCount}</Tag> : null}
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
                    <div
                      key={i}
                      className={`w-2 h-3 rounded-sm ${isPath && tower.tier > i ? "bg-primary" : "bg-muted"}`}
                    />
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
