import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Heart, Coins, Trophy, Play, FastForward, Pause, Home, Crown, Skull, Eye, Shield, ChevronRight,
  Radar, Wrench, DollarSign, Flame, Bomb, Crosshair, Snowflake, Target, Zap, Plane, AlertTriangle,
  Repeat, EyeOff, HelpCircle, Users, Send, Truck, ShieldPlus,
} from "lucide-react";
import {
  TOWERS, TOWER_ORDER, ENEMIES, UNITS, generateWave, effectiveStats, upgradeCostFor, totalSpent, DAMAGE_LABELS,
  type MapDef, type Point, type TowerKind, type EnemyKind, type UnitKind, type WaveSpawn, type DamageType, type TowerStats, type NoBuildZone,
} from "./data";
import type { MultiplayerMode, AIDifficulty } from "@/screens/MultiplayerLobby";
import type { LobbyClient, ServerMsg, Slot as LobbySlot } from "@/lib/lobbyClient";
import type { LaneSnap } from "./netSnapshot";

const W = 800, H = 500;
const STARTING_LIVES = 100;
const STARTING_MONEY = 700;

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

type Drone = { angle: number; cooldown: number; target: Enemy | null };

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
  spawnTimer: number;
  drones: Drone[];
  stunUntil: number;
  placedBySlot: number;
};

// Friendly unit walking the path in REVERSE (from base toward enemy spawn),
// shooting enemies and exploding/colliding on contact.
type AlliedUnit = {
  id: number;
  kind: UnitKind;
  hp: number;
  maxHp: number;
  pos: Point;
  traveled: number;        // distance walked from end-of-path back toward spawn
  cooldown: number;
  alive: boolean;
  senderSlot: number;
};

type QueuedUnit = { kind: UnitKind; senderSlot: number };

type Mine = { pos: Point; damage: number; splash: number; slowFactor?: number; slowDuration?: number; ttl: number };

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

type Beam = { from: Point; to: Point; color: string; width: number; ttl: number };
type Zap = { points: Point[]; ttl: number };
type Floater = { text: string; pos: Point; ttl: number; color: string };
type Particle = {
  pos: Point;
  vel: Point;
  ttl: number;
  maxTtl: number;
  size: number;
  color: string;
  kind: "muzzle" | "smoke" | "explosion" | "spark" | "ring" | "fire" | "dust" | "ember";
  blend?: boolean;
};

type LaneAI = { slot: number; difficulty: AIDifficulty; planCd: number; upgradeCd: number; preferredKinds: TowerKind[] };

type Lane = {
  idx: number;
  slot: number;            // primary slot id (lowest controller for shared lanes)
  isPlayer: boolean;       // true if local player is a controller of this lane
  remote: boolean;         // online: lane is owned by another client; we receive snapshots for it
  team: 0 | 1;             // 0 = player team, 1 = opponent team
  name: string;
  alive: boolean;
  ai: LaneAI | null;       // legacy: first AI controller (kept for compat)
  ais: LaneAI[];           // all AI controllers of this lane
  controllers: number[];   // slot ids that can issue commands for this lane
  wallets: Record<number, number>; // per-controller money
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  mines: Mine[];
  beams: Beam[];
  zaps: Zap[];
  floaters: Floater[];
  particles: Particle[];
  alliedUnits: AlliedUnit[];
  unitQueue: QueuedUnit[];   // released into THIS lane at next wave start (sent by opposing team's commanders)
  wave: { spawns: WaveSpawn[]; hpMul: number; spawned: number[]; timers: number[]; active: boolean; bossKind?: EnemyKind } | null;
  lives: number;
  money: number;             // mirror of wallets[displaySlot] for legacy reads
  waveActive: boolean;
};

export type GameMode = "solo" | MultiplayerMode;

export type OnlineCtx = {
  client: LobbyClient;
  mySlot: number;
  isHost: boolean;
  lobbyMode: "1v1" | "2v2";
  slots: LobbySlot[];
};

type Props = {
  map: MapDef;
  mode: GameMode;
  difficulty?: AIDifficulty;
  online?: OnlineCtx;
  onExit: () => void;
};

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

function inNoBuildZone(p: Point, zones: NoBuildZone[]): boolean {
  for (const z of zones) {
    if (z.kind === "rect") {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return true;
    } else if (dist(p, z) <= z.r) return true;
  }
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

const BOSS_KINDS = new Set<EnemyKind>(["miniboss", "boss", "bossbrute", "bossemp", "bossaegis", "bossnecro", "bosscloaker", "bossfinal"]);
const MAJOR_BOSS_KINDS = new Set<EnemyKind>(["boss", "bossemp", "bossaegis", "bossnecro", "bosscloaker", "bossfinal"]);

// Boss damage scaling: minibosses ~40+wave, bosses ~60+wave, final ~90+wave
function scaledBossDamage(kind: EnemyKind, baseDamage: number, level: number): number {
  if (!BOSS_KINDS.has(kind)) return baseDamage;
  const isMajor = MAJOR_BOSS_KINDS.has(kind);
  const scale = Math.floor((level - 1) / 5);
  if (kind === "bossfinal") return baseDamage + scale * 8;
  return baseDamage + scale * (isMajor ? 6 : 4);
}

// Deterministic visibility hash for opponent towers based on intel level
function towerRevealed(towerId: number, intelLevel: number): boolean {
  if (intelLevel >= 3) return true;
  if (intelLevel <= 0) return false;
  const h = (towerId * 2654435761) >>> 0;
  const pct = (h % 100) / 100;
  return pct < (intelLevel === 1 ? 0.3 : 0.6);
}

function lighten(hex: string, amt: number): string {
  const c = parseHex(hex);
  return rgb(Math.min(255, c.r + amt), Math.min(255, c.g + amt), Math.min(255, c.b + amt));
}
function darken(hex: string, amt: number): string {
  const c = parseHex(hex);
  return rgb(Math.max(0, c.r - amt), Math.max(0, c.g - amt), Math.max(0, c.b - amt));
}
function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function rgb(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

// AI tower preferences, weighted picks per difficulty
const AI_KIT: Record<AIDifficulty, TowerKind[]> = {
  rookie:  ["rifleman", "rifleman", "rifleman", "frost", "sniper", "bank", "howitzer"],
  veteran: ["rifleman", "frost", "sniper", "howitzer", "tesla", "drone", "bank", "engineer", "recon", "minelayer"],
  elite:   ["rifleman", "frost", "sniper", "howitzer", "tesla", "drone", "bank", "engineer", "recon", "minelayer", "mortar", "railgun", "flame"],
};

const SUPPORT_KIT: TowerKind[] = ["bank", "bank", "engineer", "recon", "frost", "drone"];

function aiThinkInterval(d: AIDifficulty): number {
  if (d === "rookie") return 4.5;
  if (d === "veteran") return 2.8;
  return 1.6;
}

type ControllerSpec = { slot: number; ai: AIDifficulty | null; isSupport?: boolean };

function makeLaneV2(opts: {
  idx: number; team: 0 | 1; name: string;
  controllers: ControllerSpec[];
  isPlayer: boolean;     // true if local player is one of the controllers
  remote: boolean;       // true if this lane is owned/simulated by another client
}): Lane {
  const { idx, team, name, controllers, isPlayer, remote } = opts;
  const ais: LaneAI[] = controllers
    .filter(c => c.ai !== null)
    .map(c => ({
      slot: c.slot,
      difficulty: c.ai!,
      planCd: 1.5 + Math.random() * 1.0,
      upgradeCd: 6 + Math.random() * 3,
      preferredKinds: c.isSupport ? SUPPORT_KIT : AI_KIT[c.ai!],
    }));
  const wallets: Record<number, number> = {};
  for (const c of controllers) wallets[c.slot] = STARTING_MONEY;
  const slot = controllers.length > 0 ? Math.min(...controllers.map(c => c.slot)) : idx;
  return {
    idx, slot, isPlayer, remote, team, name, alive: true,
    ai: ais[0] ?? null, ais,
    controllers: controllers.map(c => c.slot),
    wallets,
    enemies: [], towers: [], projectiles: [], mines: [], beams: [], zaps: [], floaters: [], particles: [],
    alliedUnits: [], unitQueue: [],
    wave: null,
    lives: STARTING_LIVES,
    money: STARTING_MONEY,
    waveActive: false,
  };
}

// ===== Wallet helpers =====
// `lane.money` is a derived display alias. After any wallet mutation, we
// re-sync it to the local player's wallet (or first controller for spectated lanes).
function displaySlotOf(lane: Lane, mySlot: number | null): number {
  if (mySlot !== null && lane.controllers.includes(mySlot)) return mySlot;
  return lane.controllers[0] ?? lane.slot;
}
function syncLaneMoney(lane: Lane, mySlot: number | null) {
  const ds = displaySlotOf(lane, mySlot);
  lane.money = lane.wallets[ds] ?? 0;
}
function walletOf(lane: Lane, slot: number): number {
  return lane.wallets[slot] ?? 0;
}
function spendMoney(lane: Lane, slot: number, amt: number, mySlot: number | null) {
  lane.wallets[slot] = (lane.wallets[slot] ?? 0) - amt;
  syncLaneMoney(lane, mySlot);
}
function addMoneyToSlot(lane: Lane, slot: number, amt: number, mySlot: number | null) {
  lane.wallets[slot] = (lane.wallets[slot] ?? 0) + amt;
  syncLaneMoney(lane, mySlot);
}

function makeLanes(mode: GameMode, difficulty: AIDifficulty, playerName: string): Lane[] {
  if (mode === "solo") {
    return [makeLaneV2({ idx: 0, team: 0, name: playerName, isPlayer: true, remote: false,
      controllers: [{ slot: 0, ai: null }] })];
  }
  if (mode === "1v1") {
    return [
      makeLaneV2({ idx: 0, team: 0, name: playerName, isPlayer: true, remote: false,
        controllers: [{ slot: 0, ai: null }] }),
      makeLaneV2({ idx: 1, team: 1, name: "AI Adversary", isPlayer: false, remote: false,
        controllers: [{ slot: 1, ai: difficulty }] }),
    ];
  }
  // 2v2: ONE lane per team, two controllers each (shared lives, separate wallets).
  return [
    makeLaneV2({ idx: 0, team: 0, name: `${playerName} & Ally`, isPlayer: true, remote: false,
      controllers: [{ slot: 0, ai: null }, { slot: 1, ai: "veteran", isSupport: true }] }),
    makeLaneV2({ idx: 1, team: 1, name: "Adversary Team", isPlayer: false, remote: false,
      controllers: [{ slot: 2, ai: difficulty }, { slot: 3, ai: difficulty }] }),
  ];
}

// Build lanes from an online lobby slot list.
// 1v1: each player owns their own lane (legacy behavior preserved).
// 2v2: HOST owns BOTH team lanes; non-host clients render snapshots from host.
//      Both teammates of a lane appear as `controllers`; the local player's
//      lane is placed at array index 0 so playerLane()=lanesRef.current[0].
function makeLanesOnline(slots: LobbySlot[], mySlot: number, isHost: boolean, playerName: string, lobbyMode: MultiplayerMode): Lane[] {
  const me = slots.find((s) => s.index === mySlot);
  const myTeam: 0 | 1 = me?.team ?? 0;

  if (lobbyMode === "1v1") {
    // Legacy: 1 lane per slot.
    const lanes: Lane[] = [];
    if (me) {
      lanes.push(makeLaneV2({ idx: 0, team: myTeam, name: playerName,
        isPlayer: true, remote: false,
        controllers: [{ slot: me.index, ai: null }] }));
    }
    for (const s of slots) {
      if (s.index === mySlot) continue;
      const arrIdx = lanes.length;
      if (s.kind === "player") {
        lanes.push(makeLaneV2({ idx: arrIdx, team: s.team, name: s.playerName ?? "Commander",
          isPlayer: false, remote: true,
          controllers: [{ slot: s.index, ai: null }] }));
      } else if (s.kind === "ai") {
        const diff = s.aiDifficulty ?? "veteran";
        const aiForSim = isHost ? diff : null;
        const remote = !isHost;
        const isSupport = s.team === myTeam;
        lanes.push(makeLaneV2({ idx: arrIdx, team: s.team, name: `AI ${diff}`,
          isPlayer: false, remote,
          controllers: [{ slot: s.index, ai: aiForSim, isSupport }] }));
      } else {
        const lane = makeLaneV2({ idx: arrIdx, team: s.team, name: "—",
          isPlayer: false, remote: true, controllers: [{ slot: s.index, ai: null }] });
        lane.alive = false;
        lanes.push(lane);
      }
    }
    return lanes;
  }

  // 2v2: ONE lane per team. HOST simulates both lanes.
  const teamSlots = (t: 0 | 1) => slots.filter(s => s.team === t).sort((a, b) => a.index - b.index);
  const buildTeamLane = (idx: number, team: 0 | 1, isPlayerTeam: boolean): Lane => {
    const ts = teamSlots(team);
    const ctrls: ControllerSpec[] = ts.map(s => {
      if (s.kind === "ai") {
        const diff = s.aiDifficulty ?? "veteran";
        const aiForSim = isHost ? diff : null;
        return { slot: s.index, ai: aiForSim, isSupport: false };
      }
      return { slot: s.index, ai: null };
    });
    const remote = !isHost;
    const namePieces = ts.map(s =>
      s.kind === "player" ? (s.index === mySlot ? playerName : (s.playerName ?? `P${s.index}`))
      : s.kind === "ai" ? `AI ${s.aiDifficulty ?? "vet"}` : "—");
    const name = isPlayerTeam ? `${namePieces.join(" & ")}` : `${namePieces.join(" & ")}`;
    return makeLaneV2({ idx, team, name, isPlayer: isPlayerTeam, remote, controllers: ctrls });
  };

  return [
    buildTeamLane(0, myTeam, true),
    buildTeamLane(1, (myTeam === 0 ? 1 : 0) as 0 | 1, false),
  ];
}

export default function Game({ map, mode, difficulty = "veteran", online, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idCounter = useRef(1);
  const mouseRef = useRef<Point>({ x: -100, y: -100 });
  const placementErrorRef = useRef<{ pos: Point; ttl: number } | null>(null);

  const playerName = (typeof window !== "undefined" && localStorage.getItem("bulwark.name")) || "Commander";

  const onlineRef = useRef(online ?? null);
  useEffect(() => { onlineRef.current = online ?? null; }, [online]);

  const lanesRef = useRef<Lane[]>(
    online
      ? makeLanesOnline(online.slots, online.mySlot, online.isHost, playerName, online.lobbyMode)
      : makeLanes(mode, difficulty, playerName)
  );

  const [, forceTick] = useState(0);

  const [level, setLevel] = useState(1);
  const [waveActive, setWaveActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [autoWave, setAutoWave] = useState(false);
  const [selectedKind, setSelectedKind] = useState<TowerKind | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<null | "win" | "lose">(null);
  const [waveAnnounce, setWaveAnnounce] = useState<string | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<number | null>(null);
  const [viewedLaneIdx, setViewedLaneIdx] = useState(0);

  const levelRef = useRef(level);
  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const autoWaveRef = useRef(autoWave);
  const waveActiveRef = useRef(waveActive);
  const selectedTowerIdRef = useRef<number | null>(null);
  const selectedKindRef = useRef<TowerKind | null>(null);
  const gameOverRef = useRef<null | "win" | "lose">(null);
  const hoveredEnemyIdRef = useRef<number | null>(null);
  const viewedLaneIdxRef = useRef(viewedLaneIdx);
  const autoWaveTimerRef = useRef(0);

  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { autoWaveRef.current = autoWave; }, [autoWave]);
  useEffect(() => { waveActiveRef.current = waveActive; }, [waveActive]);
  useEffect(() => { selectedTowerIdRef.current = selectedTowerId; }, [selectedTowerId]);
  useEffect(() => { selectedKindRef.current = selectedKind; }, [selectedKind]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { hoveredEnemyIdRef.current = hoveredEnemyId; }, [hoveredEnemyId]);
  useEffect(() => { viewedLaneIdxRef.current = viewedLaneIdx; }, [viewedLaneIdx]);

  const playerLane = () => lanesRef.current[0];
  const viewedLane = () => lanesRef.current[viewedLaneIdxRef.current] ?? lanesRef.current[0];
  // Local player's network slot (offline = 0, online = lobby slot index).
  const mySlot: number = online ? online.mySlot : 0;
  // Index of the OPPOSING team's lane (where command-tower units are sent).
  const opposingLaneIdx = (): number => {
    const my = playerLane();
    const opp = lanesRef.current.find(l => l.team !== my.team);
    return opp ? opp.idx : -1;
  };

  const playerIntelLevel = (): number => {
    let best = 0;
    for (const t of playerLane().towers) {
      const s = effectiveStats(TOWERS[t.kind], t.pathIdx, t.tier);
      if ((s.intelLevel ?? 0) > best) best = s.intelLevel ?? 0;
    }
    return best;
  };

  type WaveSpec = ReturnType<typeof generateWave>;

  // Apply a wave specification locally — used both for local sim and to apply
  // host-broadcast specs in online mode.
  const applyWaveSpec = useCallback((lvl: number, wave: WaveSpec) => {
    if (gameOverRef.current) return;
    for (const lane of lanesRef.current) {
      if (!lane.alive) continue;
      lane.wave = {
        spawns: wave.spawns, hpMul: wave.hpMul,
        spawned: wave.spawns.map(() => 0),
        timers: wave.spawns.map(() => 0),
        active: true, bossKind: wave.bossKind,
      };
      lane.waveActive = true;
      // Release queued allied units (sent by opposing team's commanders) into this lane.
      // They spawn at the END of the path and travel REVERSE toward enemy spawn.
      if (lane.unitQueue.length > 0 && (!onlineRef.current || !lane.remote)) {
        const wpEnd = map.waypoints[map.waypoints.length - 1];
        let stagger = 0;
        for (const q of lane.unitQueue) {
          const def = UNITS[q.kind];
          lane.alliedUnits.push({
            id: idCounter.current++, kind: q.kind, hp: def.hp, maxHp: def.hp,
            pos: { x: wpEnd.x - stagger, y: wpEnd.y },
            traveled: stagger, senderSlot: q.senderSlot,
            cooldown: 0, alive: true,
          });
          stagger += 18;
        }
        lane.unitQueue = [];
      }
    }
    setWaveActive(true);
    waveActiveRef.current = true;
    autoWaveTimerRef.current = 0;
    const tag = wave.isBoss ? `BOSS WAVE ${lvl}` : wave.isMiniBoss ? `MINI-BOSS WAVE ${lvl}` : `WAVE ${lvl}`;
    setWaveAnnounce(tag);
    setTimeout(() => setWaveAnnounce(null), 1800);
  }, [map.waypoints]);

  const startWave = useCallback(() => {
    if (waveActiveRef.current || gameOverRef.current) return;
    const oc = onlineRef.current;
    // Online: only host may initiate wave starts; others wait for server.
    if (oc && !oc.isHost) return;
    const lvl = levelRef.current;
    const wave = generateWave(lvl);
    if (oc) {
      // Server relay excludes the sender — apply locally for the host AND
      // broadcast to others.
      oc.client.send({ t: "waveStart", level: lvl, spec: wave });
    }
    applyWaveSpec(lvl, wave);
  }, [applyWaveSpec]);

  // Place a tower on `lane` charged to `slot`'s wallet.
  const tryPlaceTower = useCallback((kind: TowerKind, p: Point, lane: Lane, slot: number): boolean => {
    if (gameOverRef.current) return false;
    if (!lane.alive) return false;
    const def = TOWERS[kind];
    if (walletOf(lane, slot) < def.cost) return false;
    if (isOnPath(p, map.waypoints, 24)) return false;
    if (inNoBuildZone(p, map.noBuildZones)) return false;
    for (const t of lane.towers) if (dist(t.pos, p) < 30) return false;
    if (p.x < 18 || p.x > W - 18 || p.y < 18 || p.y > H - 18) return false;
    const drones: Drone[] = [];
    const baseDrones = def.base.droneCount ?? 0;
    for (let i = 0; i < baseDrones; i++) drones.push({ angle: (i / baseDrones) * Math.PI * 2, cooldown: 0, target: null });
    lane.towers.push({
      id: idCounter.current++, kind, pos: { ...p }, pathIdx: null, tier: 0,
      cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
      incomeTimer: 0, mineTimer: 0, spawnTimer: 0, drones, stunUntil: 0, placedBySlot: slot,
    });
    spendMoney(lane, slot, def.cost, mySlot);
    return true;
  }, [map.waypoints, map.noBuildZones, mySlot]);

  const tryPlaceTowerByPlayer = useCallback((kind: TowerKind, p: Point) => {
    const lane = playerLane();
    const oc = onlineRef.current;
    // Online + non-host 2v2: send placement request to host instead of applying locally.
    if (oc && oc.lobbyMode === "2v2" && !oc.isHost) {
      const def = TOWERS[kind];
      if (walletOf(lane, mySlot) < def.cost) { placementErrorRef.current = { pos: p, ttl: 1.0 }; return; }
      try { oc.client.send({ t: "place", slot: mySlot, kind, x: p.x, y: p.y }); } catch { /* noop */ }
      return;
    }
    const ok = tryPlaceTower(kind, p, lane, mySlot);
    if (!ok) placementErrorRef.current = { pos: p, ttl: 1.0 };
    forceTick(x => x + 1);
  }, [tryPlaceTower, mySlot]);

  // Apply an upgrade to a tower in `lane` charged to `slot`.
  const tryUpgradeTowerOn = useCallback((lane: Lane, id: number, pathIdx: number, slot: number): boolean => {
    const t = lane.towers.find(tt => tt.id === id);
    if (!t) return false;
    if (t.pathIdx !== null && t.pathIdx !== pathIdx) return false;
    const def = TOWERS[t.kind];
    const cost = upgradeCostFor(def, pathIdx, t.tier);
    if (cost === null) return false;
    if (walletOf(lane, slot) < cost) return false;
    spendMoney(lane, slot, cost, mySlot);
    if (t.pathIdx === null) t.pathIdx = pathIdx;
    t.tier += 1;
    const newStats = effectiveStats(def, t.pathIdx, t.tier);
    const want = newStats.droneCount ?? 0;
    while (t.drones.length < want) t.drones.push({ angle: (t.drones.length / Math.max(1, want)) * Math.PI * 2, cooldown: 0, target: null });
    while (t.drones.length > want) t.drones.pop();
    return true;
  }, [mySlot]);

  const upgradeTower = useCallback((id: number, pathIdx: number) => {
    const lane = playerLane();
    const oc = onlineRef.current;
    if (oc && oc.lobbyMode === "2v2" && !oc.isHost) {
      try { oc.client.send({ t: "upgrade", slot: mySlot, towerId: id, pathIdx }); } catch { /* noop */ }
      return;
    }
    tryUpgradeTowerOn(lane, id, pathIdx, mySlot);
    forceTick(x => x + 1);
  }, [tryUpgradeTowerOn, mySlot]);

  const sellTowerOn = useCallback((lane: Lane, id: number, slot: number): boolean => {
    const idx = lane.towers.findIndex(t => t.id === id);
    if (idx < 0) return false;
    const t = lane.towers[idx];
    const def = TOWERS[t.kind];
    const value = Math.round(totalSpent(def, t.pathIdx, t.tier) * 0.65);
    addMoneyToSlot(lane, slot, value, mySlot);
    lane.towers.splice(idx, 1);
    return true;
  }, [mySlot]);

  const sellTower = useCallback((id: number) => {
    const lane = playerLane();
    const oc = onlineRef.current;
    if (oc && oc.lobbyMode === "2v2" && !oc.isHost) {
      try { oc.client.send({ t: "sell", slot: mySlot, towerId: id }); } catch { /* noop */ }
      return;
    }
    sellTowerOn(lane, id, mySlot);
    setSelectedTowerId(null);
    forceTick(x => x + 1);
  }, [sellTowerOn, mySlot]);

  // ===== Command Tower: queue a unit purchase to be sent to OPPOSING lane next wave =====
  const tryBuyUnitOn = useCallback((lane: Lane, towerId: number, kind: UnitKind, cost: number, slot: number): boolean => {
    if (!lane.alive) return false;
    const t = lane.towers.find(tt => tt.id === towerId);
    if (!t || t.kind !== "command") return false;
    if (walletOf(lane, slot) < cost) return false;
    const oppIdx = (() => {
      const opp = lanesRef.current.find(l => l.team !== lane.team);
      return opp ? opp.idx : -1;
    })();
    if (oppIdx < 0) return false;
    spendMoney(lane, slot, cost, mySlot);
    lanesRef.current[oppIdx].unitQueue.push({ kind, senderSlot: slot });
    lane.floaters.push({ text: `+${UNITS[kind].name} queued`, pos: { x: t.pos.x, y: t.pos.y - 22 }, ttl: 1.2, color: "#fff37a" });
    return true;
  }, [mySlot]);

  // Refs for host-side authoritative input handlers (used by the online relay).
  const tryPlaceTowerRef = useRef(tryPlaceTower);
  const tryUpgradeTowerOnRef = useRef(tryUpgradeTowerOn);
  const sellTowerOnRef = useRef(sellTowerOn);
  const tryBuyUnitOnRef = useRef(tryBuyUnitOn);
  useEffect(() => { tryPlaceTowerRef.current = tryPlaceTower; }, [tryPlaceTower]);
  useEffect(() => { tryUpgradeTowerOnRef.current = tryUpgradeTowerOn; }, [tryUpgradeTowerOn]);
  useEffect(() => { sellTowerOnRef.current = sellTowerOn; }, [sellTowerOn]);
  useEffect(() => { tryBuyUnitOnRef.current = tryBuyUnitOn; }, [tryBuyUnitOn]);

  const buyCommandUnit = useCallback((towerId: number, kind: UnitKind, cost: number) => {
    const lane = playerLane();
    const oc = onlineRef.current;
    if (oc && oc.lobbyMode === "2v2" && !oc.isHost) {
      try { oc.client.send({ t: "buyUnit", slot: mySlot, towerId, kind, cost }); } catch { /* noop */ }
      return;
    }
    tryBuyUnitOn(lane, towerId, kind, cost, mySlot);
    forceTick(x => x + 1);
  }, [tryBuyUnitOn, mySlot]);

  // ===== Keybinds =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;
      if (e.key === "Escape") { setSelectedKind(null); setSelectedTowerId(null); return; }
      if (e.key === " " && !waveActiveRef.current) { e.preventDefault(); startWave(); return; }
      if (e.key.toLowerCase() === "p") { setPaused(p => !p); return; }
      if (e.key.toLowerCase() === "v" && lanesRef.current.length > 1) {
        setViewedLaneIdx(i => (i + 1) % lanesRef.current.length);
        setSelectedTowerId(null);
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

  // ===== Online networking =====
  useEffect(() => {
    if (!online) return;
    const client = online.client;

    const findLaneBySlot = (slot: number) => lanesRef.current.find((l) => l.slot === slot);

    const off = client.on((msg: ServerMsg) => {
      if (msg.t === "waveStart") {
        const lvl = (msg as { level?: number }).level ?? levelRef.current;
        const spec = (msg as { spec?: ReturnType<typeof generateWave> }).spec;
        if (spec) {
          if (lvl !== levelRef.current) { levelRef.current = lvl; setLevel(lvl); }
          applyWaveSpec(lvl, spec);
        }
        return;
      }
      if (msg.t === "levelUp") {
        const next = (msg as { level?: number }).level;
        if (typeof next === "number") { levelRef.current = next; setLevel(next); }
        return;
      }
      // ===== Host-only authoritative inputs (2v2): apply teammate's place/upgrade/sell/buyUnit. =====
      if (online.isHost && online.lobbyMode === "2v2") {
        if (msg.t === "place") {
          const slot = (msg as { slot?: number }).slot;
          const kind = (msg as { kind?: TowerKind }).kind;
          const x = (msg as { x?: number }).x;
          const y = (msg as { y?: number }).y;
          if (typeof slot !== "number" || !kind || typeof x !== "number" || typeof y !== "number") return;
          const lane = lanesRef.current.find(l => l.controllers.includes(slot));
          if (!lane) return;
          tryPlaceTowerRef.current(kind, { x, y }, lane, slot);
          return;
        }
        if (msg.t === "upgrade") {
          const slot = (msg as { slot?: number }).slot;
          const towerId = (msg as { towerId?: number }).towerId;
          const pathIdx = (msg as { pathIdx?: number }).pathIdx;
          if (typeof slot !== "number" || typeof towerId !== "number" || typeof pathIdx !== "number") return;
          const lane = lanesRef.current.find(l => l.controllers.includes(slot));
          if (!lane) return;
          tryUpgradeTowerOnRef.current(lane, towerId, pathIdx, slot);
          return;
        }
        if (msg.t === "sell") {
          const slot = (msg as { slot?: number }).slot;
          const towerId = (msg as { towerId?: number }).towerId;
          if (typeof slot !== "number" || typeof towerId !== "number") return;
          const lane = lanesRef.current.find(l => l.controllers.includes(slot));
          if (!lane) return;
          sellTowerOnRef.current(lane, towerId, slot);
          return;
        }
        if (msg.t === "buyUnit") {
          const slot = (msg as { slot?: number }).slot;
          const towerId = (msg as { towerId?: number }).towerId;
          const kind = (msg as { kind?: UnitKind }).kind;
          const cost = (msg as { cost?: number }).cost;
          if (typeof slot !== "number" || typeof towerId !== "number" || !kind || typeof cost !== "number") return;
          const lane = lanesRef.current.find(l => l.controllers.includes(slot));
          if (!lane) return;
          tryBuyUnitOnRef.current(lane, towerId, kind, cost, slot);
          return;
        }
      }
      if (msg.t === "eliminated") {
        const slot = (msg as { slot?: number }).slot;
        if (typeof slot !== "number") return;
        const lane = findLaneBySlot(slot);
        if (lane) { lane.alive = false; lane.lives = 0; }
        return;
      }
      // (Legacy "kill" handler removed: with shared 2v2 wallets the host is sole authoritative
      // simulator and broadcasts wallet state via the snapshot.)
      if (msg.t === "eliminatedLegacyDoNotUse__") {
        const slot = (msg as { slot?: number }).slot;
        if (typeof slot !== "number") return;
        const lane = findLaneBySlot(slot);
        if (lane) { lane.alive = false; lane.lives = 0; }
        return;
      }
      if (msg.t === "snap") {
        const slot = (msg as { slot?: number }).slot;
        const data = (msg as { data?: LaneSnap }).data;
        if (typeof slot !== "number" || !data) return;
        const lane = findLaneBySlot(slot);
        if (!lane || !lane.remote) return;
        // Replace lane visible state with snapshot.
        lane.alive = data.alive;
        lane.lives = data.lives;
        lane.controllers = data.controllers ?? lane.controllers;
        lane.wallets = { ...(data.wallets ?? {}) } as Record<number, number>;
        lane.money = walletOf(lane, mySlot); // legacy alias for HUD
        lane.waveActive = data.waveActive;
        lane.unitQueue = (data.unitQueue ?? []).map((q) => ({ kind: q.kind, senderSlot: q.senderSlot }));
        lane.alliedUnits = (data.alliedUnits ?? []).map((a) => ({
          id: a.id, kind: a.kind, hp: a.hp, maxHp: a.maxHp,
          pos: { x: a.x, y: a.y }, traveled: a.traveled, senderSlot: a.senderSlot,
          cooldown: 0, alive: true,
        }));
        lane.enemies = data.enemies.map((e) => ({
          id: e.id, kind: e.kind, hp: e.hp, maxHp: e.maxHp,
          pos: { x: e.x, y: e.y }, segIdx: e.segIdx, segT: e.segT,
          speedMul: 1, slowUntil: e.slowUntil, reward: 0, damage: 0,
          alive: true, summonTimer: 0, burnTimer: 0, burnDps: 0, burnUntil: e.burnUntil,
          phaseTimer: 0, invuln: e.invuln, cloakedUntil: e.cloakedUntil, empTimer: 0, healTimer: 0,
        }));
        lane.towers = data.towers.map((t) => ({
          id: t.id, kind: t.kind, pos: { x: t.x, y: t.y }, pathIdx: t.pathIdx, tier: t.tier,
          cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null,
          aimAngle: t.aimAngle, incomeTimer: 0, mineTimer: 0, spawnTimer: 0,
          drones: t.drones.map((d) => ({ angle: d.angle, cooldown: 0, target: null })),
          stunUntil: t.stunUntil, placedBySlot: t.placedBySlot ?? lane.slot,
        }));
        lane.projectiles = data.projectiles.map((p) => ({
          id: p.id, pos: { x: p.x, y: p.y }, vel: { x: 0, y: 0 },
          target: null, targetPos: { x: p.tx, y: p.ty },
          speed: 0, damage: 0, damageType: p.damageType,
          color: p.color, size: p.size, hiddenDetect: false, alive: true,
        }));
        lane.beams = data.beams.map((b) => ({
          from: { x: b.x1, y: b.y1 }, to: { x: b.x2, y: b.y2 },
          color: b.color, width: b.width, ttl: b.ttl,
        }));
        lane.zaps = data.zaps.map((z) => ({ points: z.points.map((q) => ({ x: q.x, y: q.y })), ttl: z.ttl }));
        lane.floaters = data.floaters.map((f) => ({ text: f.text, pos: { x: f.x, y: f.y }, ttl: f.ttl, color: f.color }));
        lane.mines = data.mines.map((m) => ({ pos: { x: m.x, y: m.y }, damage: 0, splash: m.splash, ttl: m.ttl }));
        return;
      }
      if (msg.t === "ended") {
        const winnerTeam = (msg as { winnerTeam?: 0 | 1 }).winnerTeam;
        const myTeam = lanesRef.current[0]?.team ?? 0;
        if (winnerTeam === myTeam) { setGameOver("win"); gameOverRef.current = "win"; }
        else { setGameOver("lose"); gameOverRef.current = "lose"; }
        return;
      }
    });

    // Build a snapshot of one lane.
    const buildSnap = (lane: Lane): LaneSnap => ({
      slot: lane.slot,
      alive: lane.alive,
      lives: lane.lives,
      money: lane.money,
      waveActive: lane.waveActive,
      controllers: [...lane.controllers],
      wallets: { ...lane.wallets },
      unitQueue: lane.unitQueue.map((q) => ({ kind: q.kind, senderSlot: q.senderSlot })),
      alliedUnits: lane.alliedUnits.filter((a) => a.alive).map((a) => ({
        id: a.id, kind: a.kind, hp: a.hp, maxHp: a.maxHp,
        x: a.pos.x, y: a.pos.y, traveled: a.traveled, senderSlot: a.senderSlot,
      })),
      enemies: lane.enemies.filter((e) => e.alive).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, maxHp: e.maxHp,
        x: e.pos.x, y: e.pos.y, segIdx: e.segIdx, segT: e.segT,
        slowUntil: e.slowUntil, burnUntil: e.burnUntil,
        invuln: e.invuln, cloakedUntil: e.cloakedUntil,
      })),
      towers: lane.towers.map((t) => ({
        id: t.id, kind: t.kind, x: t.pos.x, y: t.pos.y,
        pathIdx: t.pathIdx, tier: t.tier, aimAngle: t.aimAngle, stunUntil: t.stunUntil,
        drones: t.drones.map((d) => ({ angle: d.angle })),
        placedBySlot: t.placedBySlot,
      })),
      projectiles: lane.projectiles.filter((p) => p.alive).map((p) => ({
        id: p.id, x: p.pos.x, y: p.pos.y, tx: p.targetPos.x, ty: p.targetPos.y,
        damageType: p.damageType, color: p.color, size: p.size,
      })),
      beams: lane.beams.map((b) => ({
        x1: b.from.x, y1: b.from.y, x2: b.to.x, y2: b.to.y,
        color: b.color, width: b.width, ttl: b.ttl,
      })),
      zaps: lane.zaps.map((z) => ({ points: z.points.map((q) => ({ x: q.x, y: q.y })), ttl: z.ttl })),
      floaters: lane.floaters.map((f) => ({ text: f.text, x: f.pos.x, y: f.pos.y, ttl: f.ttl, color: f.color })),
      mines: lane.mines.map((m) => ({ x: m.pos.x, y: m.pos.y, splash: m.splash, ttl: m.ttl })),
    });

    let lastEliminatedFor: Set<number> = new Set();
    const tickInterval = window.setInterval(() => {
      // Send a snapshot for every lane WE own (local + AI for host).
      for (const lane of lanesRef.current) {
        if (lane.remote) continue;
        try { client.send({ t: "snap", slot: lane.slot, data: buildSnap(lane) }); } catch { /* noop */ }
        // Detect elimination for owned lanes.
        if (lane.lives <= 0 && lane.alive) {
          lane.alive = false;
          if (!lastEliminatedFor.has(lane.slot)) {
            lastEliminatedFor.add(lane.slot);
            try { client.send({ t: "eliminated", slot: lane.slot }); } catch { /* noop */ }
          }
        }
      }
    }, 125);

    return () => { off(); window.clearInterval(tickInterval); };
  }, [online, applyWaveSpec]);

  // ===== DPR / canvas sizing =====
  useEffect(() => {
    const canvas = canvasRef.current!;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetW = Math.max(1, Math.floor(rect.width * dpr));
      const targetH = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ===== Game loop =====
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let raf = 0;
    let last = performance.now();

    const cloakKnown = (lane: Lane, en: Enemy) => {
      const def = ENEMIES[en.kind];
      if (!def.hidden) return true;
      for (const t of lane.towers) {
        const ts = effectiveStats(TOWERS[t.kind], t.pathIdx, t.tier);
        if (ts.hiddenDetect) {
          if ((ts.intelLevel ?? 0) >= 3) return true;
          if (dist(t.pos, en.pos) <= ts.range) return true;
        }
      }
      return false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * H,
      };
      const lane = viewedLane();
      let found: number | null = null;
      for (const en of lane.enemies) {
        if (!en.alive) continue;
        const def = ENEMIES[en.kind];
        if (def.hidden && !cloakKnown(lane, en)) continue;
        if (dist(en.pos, mouseRef.current) <= def.radius + 4) { found = en.id; break; }
      }
      if (found !== hoveredEnemyIdRef.current) setHoveredEnemyId(found);
    };
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
      const isOwn = viewedLaneIdxRef.current === 0;
      if (!isOwn) return; // can't interact with opponent lanes
      const lane = playerLane();
      for (const t of lane.towers) {
        if (dist(t.pos, p) < 18) {
          setSelectedTowerId(t.id); setSelectedKind(null); return;
        }
      }
      const k = selectedKindRef.current;
      if (k) tryPlaceTowerByPlayer(k, p);
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

    const spawnEnemy = (lane: Lane, kind: EnemyKind, hpMul: number, atPos?: Point) => {
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
      const lvl = levelRef.current;
      lane.enemies.push({
        id: idCounter.current++, kind,
        hp: def.baseHp * hpMul, maxHp: def.baseHp * hpMul,
        pos: { ...start }, segIdx, segT,
        speedMul: 1, slowUntil: 0,
        reward: Math.round(def.reward * Math.pow(1.04, lvl - 1)),
        damage: scaledBossDamage(kind, def.damage, lvl),
        alive: true, summonTimer: 0,
        burnTimer: 0, burnDps: 0, burnUntil: 0,
        phaseTimer: 0, invuln: false,
        cloakedUntil: 0, empTimer: 0, healTimer: 0,
      });
    };

    // Anti-EMP aegis: any aegis tower within its aura range protects targets at `pos`.
    const isAegisProtected = (lane: Lane, pos: Point): boolean => {
      for (const t of lane.towers) {
        if (t.kind !== "aegis") continue;
        const stats = effectiveStats(TOWERS.aegis, t.pathIdx, t.tier);
        const r = stats.antiEmpAura?.range ?? 0;
        if (r > 0 && dist(t.pos, pos) <= r) return true;
      }
      return false;
    };

    const aegisMul = (lane: Lane, target: Enemy): number => {
      let mul = 1;
      for (const e of lane.enemies) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];
        if (def.aegisAura && dist(e.pos, target.pos) <= def.aegisAura.range) mul = Math.min(mul, def.aegisAura.resist);
      }
      return mul;
    };

    // Split kill rewards evenly across the lane's controllers (50/50 in 2v2).
    const grantMoney = (lane: Lane, amt: number, src: Point | null) => {
      const ctrls = lane.controllers.length > 0 ? lane.controllers : [lane.slot];
      const share = ctrls.length > 1 ? Math.round(amt / ctrls.length) : amt;
      for (const s of ctrls) addMoneyToSlot(lane, s, share, mySlot);
      if (src) lane.floaters.push({ text: `+${amt}`, pos: { ...src }, ttl: 0.8, color: "#dc2626" });
    };

    const damageEnemy = (lane: Lane, e: Enemy, dmg: number, type: DamageType, slowFactor?: number, slowDuration?: number, burnDps?: number, burnDuration?: number) => {
      if (!e.alive) return;
      if (e.invuln) {
        lane.floaters.push({ text: "IMMUNE", pos: { ...e.pos }, ttl: 0.6, color: "#aa44ff" });
        return;
      }
      let eff = applyResistance(dmg, type, e);
      eff *= aegisMul(lane, e);
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
        grantMoney(lane, e.reward, e.pos);
        const def = ENEMIES[e.kind];
        if (def.necroOnDeath) {
          for (let i = 0; i < def.necroOnDeath.count; i++) spawnEnemy(lane, def.necroOnDeath.kind, hpMulOf(lane) * 0.5, e.pos);
        }
        for (let i = 0; i < 8; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 30 + Math.random() * 80;
          lane.particles.push({
            pos: { ...e.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
            ttl: 0.5, maxTtl: 0.5, size: 2 + Math.random() * 2,
            color: ENEMIES[e.kind].color, kind: "smoke",
          });
        }
      }
    };

    const hpMulOf = (lane: Lane) => lane.wave?.hpMul ?? 1;

    const enemyVisibleToTower = (lane: Lane, e: Enemy, hiddenDetect: boolean, _towerPos: Point) => {
      const def = ENEMIES[e.kind];
      if (def.hidden && !hiddenDetect) return false;
      if (!hiddenDetect) {
        for (const c of lane.enemies) {
          if (!c.alive || c === e) continue;
          const cdef = ENEMIES[c.kind];
          if (cdef.cloakAura && dist(c.pos, e.pos) <= cdef.cloakAura.range) return false;
        }
      }
      return true;
    };

    const pickTarget = (lane: Lane, pos: Point, range: number, hiddenDetect: boolean): Enemy | null => {
      let best: Enemy | null = null;
      let bestProgress = -1;
      for (const e of lane.enemies) {
        if (!e.alive) continue;
        if (!enemyVisibleToTower(lane, e, hiddenDetect, pos)) continue;
        if (dist(e.pos, pos) > range) continue;
        let prog = 0;
        for (let i = 0; i < e.segIdx; i++) prog += dist(map.waypoints[i], map.waypoints[i + 1]);
        prog += e.segT;
        if (prog > bestProgress) { bestProgress = prog; best = e; }
      }
      return best;
    };

    const pickNearest = (lane: Lane, pos: Point, range: number, exclude: Set<number>, hiddenDetect: boolean): Enemy | null => {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of lane.enemies) {
        if (!e.alive || exclude.has(e.id)) continue;
        if (!enemyVisibleToTower(lane, e, hiddenDetect, pos)) continue;
        const d = dist(e.pos, pos);
        if (d < range && d < bestD) { bestD = d; best = e; }
      }
      return best;
    };

    const buffsFor = (lane: Lane, t: Tower): { fireRate: number; damage: number } => {
      let fr = 1, dm = 1;
      for (const o of lane.towers) {
        if (o.id === t.id) continue;
        const os = effectiveStats(TOWERS[o.kind], o.pathIdx, o.tier);
        if (os.buffAura && dist(o.pos, t.pos) <= os.buffAura.range) {
          if (os.buffAura.fireRateMul) fr *= os.buffAura.fireRateMul;
          if (os.buffAura.damageMul) dm *= os.buffAura.damageMul;
        }
      }
      return { fireRate: fr, damage: dm };
    };

    const fireBullet = (lane: Lane, t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      lane.particles.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.1, maxTtl: 0.1, size: 9, color: "#fff5b0", kind: "muzzle", blend: true,
      });
      for (let i = 0; i < 4; i++) {
        const sa = ang + (Math.random() - 0.5) * 0.7;
        const sp = 100 + Math.random() * 140;
        lane.particles.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.25, maxTtl: 0.25, size: 1.5, color: "#ffd070", kind: "spark", blend: true,
        });
      }
      lane.particles.push({
        pos: { x: bx, y: by }, vel: { x: Math.cos(ang) * 20, y: Math.sin(ang) * 20 - 10 },
        ttl: 0.5, maxTtl: 0.5, size: 4, color: "rgba(180,180,180,0.6)", kind: "smoke",
      });
      lane.projectiles.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, slowFactor: stats.slowFactor, slowDuration: stats.slowDuration,
        burnDps: stats.burnDps, burnDuration: stats.burnDuration,
        color: stats.projectileColor, size: 2.5, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireFlame = (lane: Lane, t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      for (let i = 0; i < 7; i++) {
        const sa = ang + (Math.random() - 0.5) * 0.55;
        const sp = 200 + Math.random() * 220;
        lane.particles.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.4, maxTtl: 0.4, size: 4 + Math.random() * 3,
          color: i % 3 === 0 ? "#ff6020" : i % 3 === 1 ? "#ff8a3d" : "#ffae40",
          kind: "fire", blend: true,
        });
      }
      lane.projectiles.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        burnDps: stats.burnDps, burnDuration: stats.burnDuration,
        color: stats.projectileColor, size: 3, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireGrenade = (lane: Lane, t: Tower, target: Enemy, ub: { interval: number; damage: number; splashRadius: number }, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      const bx = t.pos.x + Math.cos(ang) * 14;
      const by = t.pos.y + Math.sin(ang) * 14;
      lane.particles.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.2, maxTtl: 0.2, size: 12, color: "rgba(140,140,140,0.7)", kind: "smoke",
      });
      lane.projectiles.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: 360, damage: ub.damage * dmgMul,
        damageType: "explosion", splashRadius: ub.splashRadius,
        color: "#1a1a1a", size: 4, hiddenDetect: false, alive: true,
      });
    };

    const fireHowitzer = (lane: Lane, t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      lane.particles.push({
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        ttl: 0.22, maxTtl: 0.22, size: 24, color: "#ffae40", kind: "muzzle", blend: true,
      });
      for (let i = 0; i < 10; i++) {
        const sa = ang + (Math.random() - 0.5) * 1.2;
        const sp = 30 + Math.random() * 100;
        lane.particles.push({
          pos: { x: bx, y: by }, vel: { x: Math.cos(sa) * sp, y: Math.sin(sa) * sp },
          ttl: 0.7, maxTtl: 0.7, size: 6 + Math.random() * 4, color: "rgba(120,120,120,0.7)", kind: "smoke",
        });
      }
      lane.projectiles.push({
        id: idCounter.current++,
        pos: { x: bx, y: by }, vel: { x: 0, y: 0 },
        target, targetPos: { ...target.pos },
        speed: stats.projectileSpeed, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        color: stats.projectileColor, size: 5, hiddenDetect: !!stats.hiddenDetect, alive: true,
      });
    };

    const fireMortar = (lane: Lane, t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      t.aimAngle = -Math.PI / 2;
      lane.particles.push({
        pos: { ...t.pos }, vel: { x: 0, y: 0 },
        ttl: 0.25, maxTtl: 0.25, size: 16, color: "#ffae40", kind: "muzzle", blend: true,
      });
      const total = dist(t.pos, target.pos) / stats.projectileSpeed + 0.4;
      lane.projectiles.push({
        id: idCounter.current++,
        pos: { ...t.pos }, vel: { x: 0, y: 0 },
        target: null, targetPos: { ...target.pos },
        speed: 0, damage: stats.damage * dmgMul,
        damageType: stats.damageType, splashRadius: stats.splashRadius,
        color: stats.projectileColor, size: 4, hiddenDetect: false, alive: true,
        arc: { startX: t.pos.x, startY: t.pos.y, targetX: target.pos.x, targetY: target.pos.y, t: 0, total, arcHeight: 100 + dist(t.pos, target.pos) * 0.4 },
      });
    };

    const fireRailgun = (lane: Lane, t: Tower, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const ang = Math.atan2(target.pos.y - t.pos.y, target.pos.x - t.pos.x);
      t.aimAngle = ang;
      const farX = t.pos.x + Math.cos(ang) * Math.max(stats.range, 1000);
      const farY = t.pos.y + Math.sin(ang) * Math.max(stats.range, 1000);
      const hits: Enemy[] = [];
      for (const e of lane.enemies) {
        if (!e.alive) continue;
        if (!enemyVisibleToTower(lane, e, !!stats.hiddenDetect, t.pos)) continue;
        if (dist(e.pos, t.pos) > stats.range + 50) continue;
        if (distToSeg(e.pos, t.pos, { x: farX, y: farY }) <= ENEMIES[e.kind].radius + 6) hits.push(e);
      }
      hits.sort((a, b) => dist(a.pos, t.pos) - dist(b.pos, t.pos));
      const n = stats.pierceTargets ?? 1;
      const actualHits = hits.slice(0, n);
      const finalPoint = actualHits.length > 0
        ? actualHits[actualHits.length - 1].pos
        : { x: t.pos.x + Math.cos(ang) * stats.range, y: t.pos.y + Math.sin(ang) * stats.range };
      lane.beams.push({ from: { ...t.pos }, to: { ...finalPoint }, color: stats.projectileColor, width: 4, ttl: 0.18 });
      const bx = t.pos.x + Math.cos(ang) * stats.barrelLength;
      const by = t.pos.y + Math.sin(ang) * stats.barrelLength;
      lane.particles.push({ pos: { x: bx, y: by }, vel: { x: 0, y: 0 }, ttl: 0.2, maxTtl: 0.2, size: 18, color: stats.projectileColor, kind: "muzzle", blend: true });
      for (const h of actualHits) damageEnemy(lane, h, stats.damage * dmgMul, stats.damageType);
    };

    const triggerExplosion = (lane: Lane, pos: Point, radius: number, damage: number, type: DamageType, slowFactor?: number, slowDuration?: number) => {
      lane.particles.push({ pos: { ...pos }, vel: { x: 0, y: 0 }, ttl: 0.55, maxTtl: 0.55, size: radius, color: "#ef4444", kind: "ring", blend: true });
      lane.particles.push({ pos: { ...pos }, vel: { x: 0, y: 0 }, ttl: 0.3, maxTtl: 0.3, size: radius * 0.75, color: "#fff5b0", kind: "explosion", blend: true });
      for (let i = 0; i < 18; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 240;
        lane.particles.push({
          pos: { ...pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
          ttl: 0.5, maxTtl: 0.5, size: 2 + Math.random() * 3,
          color: i < 8 ? "#ffae40" : "rgba(110,110,110,0.7)",
          kind: i < 8 ? "ember" : "smoke", blend: i < 8,
        });
      }
      for (const e of lane.enemies) {
        if (!e.alive) continue;
        if (dist(e.pos, pos) <= radius) damageEnemy(lane, e, damage, type, slowFactor, slowDuration);
      }
    };

    const layMine = (lane: Lane, t: Tower, stats: TowerStats, dmgMul: number) => {
      const wp = map.waypoints;
      const candidates: Point[] = [];
      for (let i = 0; i < wp.length - 1; i++) {
        const a = wp[i], b = wp[i + 1];
        const len = dist(a, b);
        const stepLen = 25;
        for (let s = 0; s <= len; s += stepLen) {
          const tt = s / len;
          const p = { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt };
          if (dist(p, t.pos) <= stats.range) candidates.push(p);
        }
      }
      if (candidates.length === 0) return;
      const filtered = candidates.filter(p => !lane.mines.some(m => dist(m.pos, p) < 18));
      const pool = filtered.length > 0 ? filtered : candidates;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      lane.mines.push({
        pos: pick, damage: (stats.mineDamage ?? 50) * dmgMul, splash: stats.mineSplash ?? 40,
        slowFactor: stats.slowFactor, slowDuration: stats.slowDuration, ttl: 999,
      });
    };

    const fireDrone = (lane: Lane, t: Tower, drone: Drone, target: Enemy, stats: TowerStats, dmgMul: number) => {
      const dronePos = { x: t.pos.x + Math.cos(drone.angle) * 32, y: t.pos.y + Math.sin(drone.angle) * 32 };
      lane.particles.push({ pos: { ...dronePos }, vel: { x: 0, y: 0 }, ttl: 0.1, maxTtl: 0.1, size: 6, color: "#fff37a", kind: "muzzle", blend: true });
      const isExplosive = stats.damageType === "explosion";
      lane.projectiles.push({
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

    // ==================================================
    // AI brain: places towers, upgrades existing ones
    // ==================================================
    const aiPickPlacement = (lane: Lane, kind: TowerKind): Point | null => {
      const def = TOWERS[kind];
      // Sample candidate spots near path
      let best: { p: Point; score: number } | null = null;
      const wp = map.waypoints;
      for (let attempt = 0; attempt < 60; attempt++) {
        // pick a random point along path then offset perpendicular
        const segIdx = Math.floor(Math.random() * (wp.length - 1));
        const a = wp[segIdx], b = wp[segIdx + 1];
        const tt = Math.random();
        const px = a.x + (b.x - a.x) * tt;
        const py = a.y + (b.y - a.y) * tt;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const off = (Math.random() < 0.5 ? -1 : 1) * (38 + Math.random() * 60);
        const p = { x: px + nx * off, y: py + ny * off };
        if (p.x < 30 || p.x > W - 30 || p.y < 30 || p.y > H - 30) continue;
        if (isOnPath(p, wp, 24)) continue;
        if (inNoBuildZone(p, map.noBuildZones)) continue;
        let overlap = false;
        for (const t of lane.towers) if (dist(t.pos, p) < 34) { overlap = true; break; }
        if (overlap) continue;
        // Score: closer to path is better for combat, but bank/recon prefer back
        const distToPath = Math.abs(off);
        let score = 100 - distToPath;
        if (kind === "bank" || kind === "recon") score = distToPath; // back placement
        if (kind === "mortar") score += 20; // mortar can be far
        score += Math.random() * 20;
        if (!best || score > best.score) best = { p, score };
      }
      return best ? best.p : null;
    };

    const aiTick = (lane: Lane, dt: number) => {
      if (lane.remote) return;
      if (!lane.alive) return;
      // Each AI controller spends from its OWN wallet (no shared 2v2 pool).
      for (const ai of lane.ais) {
        ai.planCd -= dt;
        ai.upgradeCd -= dt;
        const wallet = walletOf(lane, ai.slot);

        // Try to place a tower
        if (ai.planCd <= 0) {
          ai.planCd = aiThinkInterval(ai.difficulty) * (0.7 + Math.random() * 0.6);
          // Skip multiplayer-only kinds when not in a multiplayer game.
          const isMP = !!onlineRef.current;
          const affordable = ai.preferredKinds.filter(k => {
            if (TOWERS[k].multiplayerOnly && !isMP) return false;
            return wallet >= TOWERS[k].cost;
          });
          if (affordable.length > 0) {
            let kind: TowerKind;
            if (wallet >= 1500 && Math.random() < 0.4) {
              const expensive = affordable.filter(k => TOWERS[k].cost >= 400);
              kind = (expensive.length > 0 ? expensive : affordable)[Math.floor(Math.random() * (expensive.length > 0 ? expensive.length : affordable.length))];
            } else {
              kind = affordable[Math.floor(Math.random() * affordable.length)];
            }
            const spot = aiPickPlacement(lane, kind);
            if (spot) tryPlaceTower(kind, spot, lane, ai.slot);
          }
        }
        // Try to upgrade one of the towers this AI controller placed (or unowned ones)
        if (ai.upgradeCd <= 0 && lane.towers.length > 0) {
          ai.upgradeCd = aiThinkInterval(ai.difficulty) * 1.8 * (0.8 + Math.random() * 0.5);
          const w = walletOf(lane, ai.slot);
          const candidates = lane.towers
            .filter(t => t.placedBySlot === ai.slot || lane.controllers.length === 1)
            .map(t => {
              const def = TOWERS[t.kind];
              if (t.tier >= 3) return null;
              const pathIdx = t.pathIdx ?? (Math.random() < 0.5 ? 0 : 1);
              const cost = upgradeCostFor(def, pathIdx, t.tier);
              if (cost === null || w < cost) return null;
              return { t, pathIdx, cost };
            })
            .filter((x): x is { t: Tower; pathIdx: number; cost: number } => x !== null);
          if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            tryUpgradeTowerOn(lane, pick.t.id, pick.pathIdx, ai.slot);
          }
        }
      }
    };

    // ==================================================
    // Per-lane simulation step
    // ==================================================
    const stepLane = (lane: Lane, dt: number, now: number) => {
      if (!lane.alive) return;
      // For remote lanes, skip authoritative simulation entirely. We just decay
      // visual remnants from the last received snapshot.
      if (lane.remote) {
        for (const f of lane.floaters) { f.ttl -= dt; f.pos.y -= 18 * dt; }
        lane.floaters = lane.floaters.filter((f) => f.ttl > 0);
        for (const z of lane.zaps) z.ttl -= dt;
        lane.zaps = lane.zaps.filter((z) => z.ttl > 0);
        for (const b of lane.beams) b.ttl -= dt;
        lane.beams = lane.beams.filter((b) => b.ttl > 0);
        // No movement on enemies/projectiles — snapshot updates them.
        return;
      }

      const wave = lane.wave;
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
                spawnEnemy(lane, s.kind, wave.hpMul);
                wave.spawned[i] += 1;
              }
            }
          }
        }
        if (allDone && lane.enemies.length === 0) {
          wave.active = false;
          lane.waveActive = false;
        }
      }

      const arrivedEnemies: Enemy[] = [];
      for (const e of lane.enemies) {
        if (!e.alive) continue;
        const def = ENEMIES[e.kind];

        if (e.burnUntil > now && e.burnDps > 0) {
          e.burnTimer += dt;
          if (e.burnTimer >= 0.25) {
            e.burnTimer = 0;
            damageEnemy(lane, e, e.burnDps * 0.25, "fire");
          }
        }
        if (def.regen) e.hp = Math.min(e.maxHp, e.hp + def.regen * dt);
        if (def.healAura) {
          e.healTimer += dt;
          if (e.healTimer >= 0.5) {
            e.healTimer = 0;
            for (const o of lane.enemies) {
              if (!o.alive || o.id === e.id) continue;
              if (dist(o.pos, e.pos) <= def.healAura.range) o.hp = Math.min(o.maxHp, o.hp + def.healAura.perSec * 0.5);
            }
          }
        }
        if (def.phaseInterval) {
          e.phaseTimer += dt;
          if (e.phaseTimer >= def.phaseInterval) { e.phaseTimer = 0; e.invuln = !e.invuln; }
        }
        let bonusSpeed = 1;
        if (def.berserkBelow && e.hp / e.maxHp <= def.berserkBelow) bonusSpeed = 2;
        if (def.empAttack) {
          e.empTimer += dt;
          if (e.empTimer >= def.empAttack.interval) {
            e.empTimer = 0;
            const inRange = lane.towers
              .map(t => ({ t, d: dist(t.pos, e.pos) }))
              .filter(x => x.d <= def.empAttack!.range)
              .sort((a, b) => a.d - b.d)
              .slice(0, def.empAttack!.targets);
            for (const x of inRange) {
              if (isAegisProtected(lane, x.t.pos)) {
                x.t.stunUntil = 0; // aegis also clears existing stuns
                lane.floaters.push({ text: "AEGIS", pos: { ...x.t.pos }, ttl: 0.8, color: "#7ad7ff" });
                continue;
              }
              x.t.stunUntil = Math.max(x.t.stunUntil, now + def.empAttack!.duration);
              lane.floaters.push({ text: "EMP", pos: { ...x.t.pos }, ttl: 1.0, color: "#fff37a" });
              lane.zaps.push({ points: [e.pos, x.t.pos], ttl: 0.3 });
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
            for (let s = 0; s < def.summon.perSpawn; s++) spawnEnemy(lane, def.summon.kind, hpMulOf(lane) * 0.6, e.pos);
          }
        }
        for (const m of lane.mines) {
          if (m.ttl <= 0) continue;
          if (dist(e.pos, m.pos) <= ENEMIES[e.kind].radius + 6) {
            m.ttl = 0;
            triggerExplosion(lane, m.pos, m.splash, m.damage, "explosion", m.slowFactor, m.slowDuration);
          }
        }
      }
      if (arrivedEnemies.length > 0) {
        let totalDmg = 0;
        for (const e of arrivedEnemies) totalDmg += e.damage;
        lane.lives = Math.max(0, lane.lives - totalDmg);
        lane.floaters.push({ text: `-${totalDmg} HP`, pos: { x: W - 60, y: 60 }, ttl: 1.2, color: "#dc2626" });
        if (lane.lives <= 0 && lane.alive) {
          lane.alive = false;
          lane.floaters.push({ text: "ELIMINATED", pos: { x: W / 2, y: H / 2 }, ttl: 2.5, color: "#ef4444" });
        }
      }

      // ===== Allied units (sent from opposing team's commanders, or from own depot) =====
      // Travel REVERSE along the path from waypoints[end] toward waypoints[0],
      // shoot at nearest enemy in range, deal collision damage equal to remaining HP.
      const wpForUnits = map.waypoints;
      const totalLen = (() => { let s = 0; for (let i = 0; i < wpForUnits.length - 1; i++) s += dist(wpForUnits[i], wpForUnits[i + 1]); return s; })();
      for (const a of lane.alliedUnits) {
        if (!a.alive) continue;
        const udef = UNITS[a.kind];

        // Move along the path in reverse: position = traveled-from-end.
        const newTraveled = a.traveled + udef.speed * dt;
        const r = getPositionOnPath(wpForUnits, Math.max(0, totalLen - newTraveled));
        a.pos = r.pos;
        a.traveled = newTraveled;

        // Despawn if it ran the full path without dying.
        if (newTraveled >= totalLen) { a.alive = false; continue; }

        // Shoot the nearest enemy in range.
        a.cooldown -= dt;
        if (a.cooldown <= 0 && udef.fireRate > 0) {
          let best: Enemy | null = null; let bestD = Infinity;
          for (const e of lane.enemies) {
            if (!e.alive) continue;
            const ed = ENEMIES[e.kind];
            if (ed.hidden && !cloakKnown(lane, e)) continue;
            const d2 = dist(a.pos, e.pos);
            if (d2 <= udef.range && d2 < bestD) { best = e; bestD = d2; }
          }
          if (best) {
            a.cooldown = 1 / udef.fireRate;
            damageEnemy(lane, best, udef.damage, "physical");
            lane.beams.push({ from: { ...a.pos }, to: { ...best.pos }, color: udef.accentColor, width: 1.4, ttl: 0.08 });
            // EMP-on-hit (top-tier EMP infantry): also stun the nearest defending tower.
            if (udef.empOnHit) {
              let nearTower: Tower | null = null; let nd = Infinity;
              for (const t of lane.towers) {
                const d2 = dist(a.pos, t.pos);
                if (d2 < nd && d2 <= udef.range) { nearTower = t; nd = d2; }
              }
              if (nearTower && !isAegisProtected(lane, nearTower.pos)) {
                nearTower.stunUntil = Math.max(nearTower.stunUntil, now + udef.empOnHit.duration);
                lane.zaps.push({ points: [a.pos, nearTower.pos], ttl: 0.25 });
              }
            }
          }
        }

        // Collision: on contact, deal remaining HP to enemy and lose hp = enemy hp.
        for (const e of lane.enemies) {
          if (!e.alive) continue;
          const ed = ENEMIES[e.kind];
          if (dist(a.pos, e.pos) <= ed.radius + udef.radius) {
            const aHp = a.hp, eHp = e.hp;
            damageEnemy(lane, e, aHp, "physical");
            a.hp -= eHp;
            if (a.hp <= 0) {
              a.alive = false;
              if (udef.explodeOnDeath) {
                triggerExplosion(lane, a.pos, udef.explodeOnDeath.radius, udef.explodeOnDeath.damage, "explosion");
              }
              break;
            }
          }
        }
      }
      lane.alliedUnits = lane.alliedUnits.filter(a => a.alive);

      for (const t of lane.towers) {
        const def = TOWERS[t.kind];
        const stats = effectiveStats(def, t.pathIdx, t.tier);
        const stunned = t.stunUntil > now;
        const buffs = buffsFor(lane, t);
        const fireRate = stats.fireRate * buffs.fireRate;
        const dmgMul = buffs.damage;

        if (stats.income && lane.waveActive) {
          t.incomeTimer += dt;
          if (t.incomeTimer >= stats.income.interval) {
            t.incomeTimer = 0;
            let amt = stats.income.perTick;
            if (t.pathIdx === 1) {
              const lvl = levelRef.current;
              const scale = t.tier === 1 ? 2 : t.tier === 2 ? 4 : t.tier === 3 ? 8 : 0;
              amt += lvl * scale;
            }
            grantMoney(lane, amt, { x: t.pos.x, y: t.pos.y - 18 });
            for (let i = 0; i < 5; i++) {
              const ang = -Math.PI / 2 + (Math.random() - 0.5);
              const sp = 60 + Math.random() * 40;
              lane.particles.push({ pos: { ...t.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp }, ttl: 0.5, maxTtl: 0.5, size: 3, color: "#fff37a", kind: "spark", blend: true });
            }
          }
        }

        if (stats.mineDamage && stats.mineCooldown !== undefined && lane.waveActive) {
          t.mineTimer += dt;
          if (t.mineTimer >= stats.mineCooldown) {
            t.mineTimer = 0;
            layMine(lane, t, stats, dmgMul);
          }
        }

        // Vehicle Depot — spawn allied units onto OWN lane (travels REVERSE toward enemy spawn).
        if (stats.depotSpawn && lane.waveActive && !stunned) {
          t.spawnTimer += dt;
          if (t.spawnTimer >= stats.depotSpawn.interval) {
            t.spawnTimer = 0;
            const wpEnd = map.waypoints[map.waypoints.length - 1];
            const udef = UNITS[stats.depotSpawn.kind];
            lane.alliedUnits.push({
              id: idCounter.current++, kind: stats.depotSpawn.kind, hp: udef.hp, maxHp: udef.hp,
              pos: { x: wpEnd.x, y: wpEnd.y },
              traveled: 0, senderSlot: t.placedBySlot,
              cooldown: 0, alive: true,
            });
            lane.floaters.push({ text: `+${udef.name}`, pos: { x: t.pos.x, y: t.pos.y - 18 }, ttl: 0.8, color: "#7ad7ff" });
          }
        }

        if (t.drones.length > 0) {
          for (const d of t.drones) {
            d.angle += dt * 1.4;
            d.cooldown -= dt;
            const dronePos = { x: t.pos.x + Math.cos(d.angle) * 32, y: t.pos.y + Math.sin(d.angle) * 32 };
            if (!d.target || !d.target.alive) d.target = pickNearest(lane, dronePos, stats.range, new Set(), !!stats.hiddenDetect);
            if (d.target && d.cooldown <= 0 && !stunned) {
              d.cooldown = 1 / fireRate;
              fireDrone(lane, t, d, d.target, stats, dmgMul);
            }
          }
        }

        if (stunned) continue;

        t.cooldown -= dt;
        if (t.underbarrelCooldown > 0) t.underbarrelCooldown -= dt;
        if (t.burstQueue > 0) t.burstTimer -= dt;

        const visTarget = pickTarget(lane, t.pos, stats.range, !!stats.hiddenDetect);
        if (visTarget) t.aimAngle = Math.atan2(visTarget.pos.y - t.pos.y, visTarget.pos.x - t.pos.x);

        if (t.burstQueue > 0 && t.burstTimer <= 0 && t.burstTarget && t.burstTarget.alive) {
          fireBullet(lane, t, t.burstTarget, stats, dmgMul);
          t.burstQueue -= 1;
          t.burstTimer = stats.burstInterval ?? 0.07;
        } else if (t.burstQueue > 0 && (!t.burstTarget || !t.burstTarget.alive)) {
          if (visTarget) { t.burstTarget = visTarget; t.burstTimer = 0.05; }
          else t.burstQueue = 0;
        }

        if (stats.underbarrel && t.underbarrelCooldown <= 0 && visTarget) {
          fireGrenade(lane, t, visTarget, stats.underbarrel, dmgMul);
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
            const next = pickNearest(lane, last_.pos, 90, visited, !!stats.hiddenDetect);
            if (!next) break;
            hits.push(next); visited.add(next.id); last_ = next;
          }
          const points: Point[] = [t.pos, ...hits.map(h => h.pos)];
          lane.zaps.push({ points, ttl: 0.2 });
          for (let i = 0; i < hits.length; i++) {
            const dmg = stats.damage * dmgMul * Math.pow(0.85, i);
            damageEnemy(lane, hits[i], dmg, stats.damageType, stats.slowFactor, stats.slowDuration);
          }
        } else if (t.kind === "tesla") {
          fireBullet(lane, t, visTarget, stats, dmgMul);
        } else if (t.kind === "howitzer") {
          fireHowitzer(lane, t, visTarget, stats, dmgMul);
        } else if (t.kind === "mortar") {
          fireMortar(lane, t, visTarget, stats, dmgMul);
        } else if (t.kind === "railgun") {
          fireRailgun(lane, t, visTarget, stats, dmgMul);
        } else if (t.kind === "flame") {
          fireFlame(lane, t, visTarget, stats, dmgMul);
        } else if (
          t.kind === "drone" || t.kind === "bank" || t.kind === "recon" ||
          t.kind === "minelayer" || t.kind === "engineer" ||
          t.kind === "command" || t.kind === "depot" || t.kind === "aegis"
        ) {
          // no direct attack
        } else {
          if (stats.burstCount && stats.burstCount > 1) {
            t.burstQueue = stats.burstCount - 1;
            t.burstTarget = visTarget;
            t.burstTimer = stats.burstInterval ?? 0.07;
            fireBullet(lane, t, visTarget, stats, dmgMul);
          } else {
            fireBullet(lane, t, visTarget, stats, dmgMul);
          }
        }
      }

      for (const p of lane.projectiles) {
        if (!p.alive) continue;
        if (p.arc) {
          p.arc.t += dt;
          const tt = Math.min(1, p.arc.t / p.arc.total);
          p.pos.x = p.arc.startX + (p.arc.targetX - p.arc.startX) * tt;
          p.pos.y = p.arc.startY + (p.arc.targetY - p.arc.startY) * tt - 4 * p.arc.arcHeight * tt * (1 - tt);
          if (tt >= 1) {
            if (p.splashRadius) triggerExplosion(lane, { x: p.arc.targetX, y: p.arc.targetY }, p.splashRadius, p.damage, p.damageType);
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
          if (p.splashRadius) triggerExplosion(lane, p.pos, p.splashRadius, p.damage, p.damageType, p.slowFactor, p.slowDuration);
          else if (p.target && p.target.alive) {
            damageEnemy(lane, p.target, p.damage, p.damageType, p.slowFactor, p.slowDuration, p.burnDps, p.burnDuration);
            for (let i = 0; i < 4; i++) {
              const ang = Math.random() * Math.PI * 2;
              const sp = 30 + Math.random() * 60;
              lane.particles.push({ pos: { ...p.pos }, vel: { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp }, ttl: 0.2, maxTtl: 0.2, size: 1.5, color: p.color, kind: "spark", blend: true });
            }
          }
          p.alive = false;
        } else {
          p.pos.x += (dx / d) * stepLen;
          p.pos.y += (dy / d) * stepLen;
        }
      }

      for (const p of lane.particles) {
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.vel.x *= Math.pow(0.4, dt);
        p.vel.y *= Math.pow(0.4, dt);
        p.ttl -= dt;
      }

      lane.enemies = lane.enemies.filter(e => e.alive);
      lane.projectiles = lane.projectiles.filter(p => p.alive);
      lane.mines = lane.mines.filter(m => m.ttl > 0);
      for (const z of lane.zaps) z.ttl -= dt;
      lane.zaps = lane.zaps.filter(z => z.ttl > 0);
      for (const b of lane.beams) b.ttl -= dt;
      lane.beams = lane.beams.filter(b => b.ttl > 0);
      for (const f of lane.floaters) { f.ttl -= dt; f.pos.y -= 18 * dt; }
      lane.floaters = lane.floaters.filter(f => f.ttl > 0);
      lane.particles = lane.particles.filter(p => p.ttl > 0);

      // AI brain
      aiTick(lane, dt);
    };

    const step = (dt: number) => {
      if (dt <= 0) return;
      const now = nowSec();

      for (const lane of lanesRef.current) stepLane(lane, dt, now);

      // Check global wave end (when all live lanes finish)
      const liveLanes = lanesRef.current.filter(l => l.alive);
      const oc = onlineRef.current;
      if (waveActiveRef.current && liveLanes.every(l => !l.waveActive)) {
        waveActiveRef.current = false;
        setWaveActive(false);
        const bonus = 90 + levelRef.current * 14;
        // Only credit lanes we own — remote lanes get bonuses from their owner.
        for (const l of liveLanes) {
          if (oc && l.remote) continue;
          // Each controller of the lane gets the full bonus (their own wallet).
          for (const s of l.controllers) addMoneyToSlot(l, s, bonus, mySlot);
          l.floaters.push({ text: `+${bonus} bonus`, pos: { x: W / 2, y: 50 }, ttl: 1.6, color: "#dc2626" });
        }
        if (levelRef.current >= 30) {
          if (mode === "solo") { setGameOver("win"); gameOverRef.current = "win"; }
        } else {
          // In online, only host advances level and broadcasts.
          if (!oc || oc.isHost) {
            const next = levelRef.current + 1;
            levelRef.current = next; setLevel(next);
            if (oc) oc.client.send({ t: "levelUp", level: next });
          }
          // Non-host clients wait for "levelUp" message to update level.
        }
      }

      // Check game over conditions
      if (!gameOverRef.current) {
        if (mode === "solo") {
          if (!lanesRef.current[0].alive) { setGameOver("lose"); gameOverRef.current = "lose"; }
        } else {
          // Team-based: a team is out if all its lanes are dead.
          const myTeam = lanesRef.current[0]?.team ?? 0;
          const ourTeam = lanesRef.current.filter(l => l.team === myTeam);
          const otherTeam = lanesRef.current.filter(l => l.team !== myTeam);
          const ourOut = ourTeam.every(l => !l.alive);
          const otherOut = otherTeam.every(l => !l.alive);
          if (ourOut && !otherOut) { setGameOver("lose"); gameOverRef.current = "lose"; }
          else if (otherOut && !ourOut) { setGameOver("win"); gameOverRef.current = "win"; }
          else if (otherOut && ourOut) { setGameOver("lose"); gameOverRef.current = "lose"; }
        }
      }

      // Auto wave: only host (or offline) advances on autoWave.
      const canAutoStart = !oc || oc.isHost;
      if (autoWaveRef.current && !waveActiveRef.current && !gameOverRef.current && canAutoStart) {
        autoWaveTimerRef.current += dt;
        if (autoWaveTimerRef.current >= 4) startWave();
      } else {
        autoWaveTimerRef.current = 0;
      }

      if (placementErrorRef.current) {
        placementErrorRef.current.ttl -= dt;
        if (placementErrorRef.current.ttl <= 0) placementErrorRef.current = null;
      }
    };

    // ===== Render helpers =====
    const drawNoBuildZones = (ctx: CanvasRenderingContext2D) => {
      for (const z of map.noBuildZones) {
        if (z.tone === "building" || z.tone === undefined) continue;
        ctx.save();
        ctx.globalAlpha = 0;
        if (z.kind === "rect") {
          ctx.beginPath(); ctx.rect(z.x, z.y, z.w, z.h);
        } else {
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        }
        ctx.restore();
      }
    };

    const drawDecorations = (ctx: CanvasRenderingContext2D, decs: typeof map.decorations) => {
      for (const d of decs) {
        ctx.globalAlpha = (d as { opacity?: number }).opacity ?? 1;
        if (d.kind === "rect") {
          if ((d as { radius?: number }).radius) {
            const r = (d as { radius?: number }).radius!;
            ctx.fillStyle = d.color;
            ctx.beginPath();
            const rx = Math.min(r, d.w / 2), ry = Math.min(r, d.h / 2);
            ctx.moveTo(d.x + rx, d.y);
            ctx.lineTo(d.x + d.w - rx, d.y); ctx.quadraticCurveTo(d.x + d.w, d.y, d.x + d.w, d.y + ry);
            ctx.lineTo(d.x + d.w, d.y + d.h - ry); ctx.quadraticCurveTo(d.x + d.w, d.y + d.h, d.x + d.w - rx, d.y + d.h);
            ctx.lineTo(d.x + rx, d.y + d.h); ctx.quadraticCurveTo(d.x, d.y + d.h, d.x, d.y + d.h - ry);
            ctx.lineTo(d.x, d.y + ry); ctx.quadraticCurveTo(d.x, d.y, d.x + rx, d.y);
            ctx.closePath(); ctx.fill();
          } else {
            ctx.fillStyle = d.color;
            ctx.fillRect(d.x, d.y, d.w, d.h);
          }
          if (d.stroke) {
            ctx.strokeStyle = d.stroke; ctx.lineWidth = d.strokeWidth ?? 1;
            ctx.strokeRect(d.x + 0.5, d.y + 0.5, d.w - 1, d.h - 1);
          }
        } else if (d.kind === "circle") {
          ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
          if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = 1; ctx.stroke(); }
        } else if (d.kind === "line") {
          ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
          ctx.lineCap = d.cap === "round" ? "round" : "butt";
          if (d.dash) ctx.setLineDash(d.dash); else ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          ctx.setLineDash([]); ctx.lineCap = "butt";
        } else if (d.kind === "text") {
          ctx.fillStyle = d.color;
          ctx.font = `${d.weight ?? 700} ${d.size}px Inter, sans-serif`;
          ctx.textAlign = d.align ?? "left";
          ctx.fillText(d.text, d.x, d.y);
          ctx.textAlign = "left";
        } else if (d.kind === "polyline") {
          ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
          if (d.dash) ctx.setLineDash(d.dash);
          ctx.beginPath();
          for (let i = 0; i < d.points.length; i++) {
            if (i === 0) ctx.moveTo(d.points[i].x, d.points[i].y);
            else ctx.lineTo(d.points[i].x, d.points[i].y);
          }
          ctx.stroke(); ctx.setLineDash([]);
        } else if (d.kind === "windowGrid") {
          const cw = d.w / d.cols;
          const rh = d.h / d.rows;
          for (let r = 0; r < d.rows; r++) {
            for (let c = 0; c < d.cols; c++) {
              const lit = ((c * 7 + r * 11 + d.x + d.y) % 5) >= 2;
              if (!lit) continue;
              ctx.fillStyle = d.color;
              ctx.globalAlpha = (d.opacity ?? 0.85) * (0.4 + ((c + r) % 3) * 0.2);
              ctx.fillRect(d.x + c * cw + 1, d.y + r * rh + 1, Math.max(1, cw - 2), Math.max(1, rh - 2));
            }
          }
          ctx.globalAlpha = 1;
        } else if (d.kind === "bridge") {
          const ang = Math.atan2(d.to.y - d.from.y, d.to.x - d.from.x);
          const nx = -Math.sin(ang), ny = Math.cos(ang);
          const halfW = d.width / 2;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.beginPath();
          ctx.moveTo(d.from.x + nx * (halfW + 4) + Math.cos(ang) * 2, d.from.y + ny * (halfW + 4) + Math.sin(ang) * 2);
          ctx.lineTo(d.to.x + nx * (halfW + 4) + Math.cos(ang) * 2, d.to.y + ny * (halfW + 4) + Math.sin(ang) * 2);
          ctx.lineTo(d.to.x - nx * (halfW + 4) + Math.cos(ang) * 2, d.to.y - ny * (halfW + 4) + Math.sin(ang) * 2);
          ctx.lineTo(d.from.x - nx * (halfW + 4) + Math.cos(ang) * 2, d.from.y - ny * (halfW + 4) + Math.sin(ang) * 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = d.deckColor;
          ctx.beginPath();
          ctx.moveTo(d.from.x + nx * halfW, d.from.y + ny * halfW);
          ctx.lineTo(d.to.x + nx * halfW, d.to.y + ny * halfW);
          ctx.lineTo(d.to.x - nx * halfW, d.to.y - ny * halfW);
          ctx.lineTo(d.from.x - nx * halfW, d.from.y - ny * halfW);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = d.railColor; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(d.from.x + nx * halfW, d.from.y + ny * halfW);
          ctx.lineTo(d.to.x + nx * halfW, d.to.y + ny * halfW);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(d.from.x - nx * halfW, d.from.y - ny * halfW);
          ctx.lineTo(d.to.x - nx * halfW, d.to.y - ny * halfW);
          ctx.stroke();
          ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1;
          const supports = 4;
          for (let i = 0; i < supports; i++) {
            const tt = (i + 1) / (supports + 1);
            const cx = d.from.x + (d.to.x - d.from.x) * tt;
            const cy = d.from.y + (d.to.y - d.from.y) * tt;
            ctx.beginPath();
            ctx.moveTo(cx + nx * halfW, cy + ny * halfW);
            ctx.lineTo(cx - nx * halfW, cy - ny * halfW);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawAppearance = (ctx: CanvasRenderingContext2D, t: Tower, stats: TowerStats) => {
      const app = stats.appearance ?? [];
      if (app.includes("helmet")) {
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y - 7, 8, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (app.includes("beret")) {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y - 9); ctx.rotate(-0.3);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(-5, -1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      if (app.includes("satellite_dish")) {
        ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.rotate(-0.3);
        const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, 11);
        grad.addColorStop(0, "#3a3a3a"); grad.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = stats.accentColor; ctx.fillRect(-1, -1, 2, 6);
        ctx.restore();
      }
      if (app.includes("antenna")) {
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(t.pos.x - 6, t.pos.y - 12); ctx.lineTo(t.pos.x - 6, t.pos.y - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t.pos.x + 6, t.pos.y - 12); ctx.lineTo(t.pos.x + 6, t.pos.y - 24); ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(t.pos.x - 6, t.pos.y - 22, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(t.pos.x + 6, t.pos.y - 24, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      if (app.includes("scope") || app.includes("extra_optic")) {
        ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.rotate(t.aimAngle);
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(stats.barrelLength * 0.4, -6, 5, 4);
        ctx.fillStyle = stats.accentColor; ctx.fillRect(stats.barrelLength * 0.4, -6, 5, 1);
        if (app.includes("extra_optic")) { ctx.fillStyle = "#1a1a1a"; ctx.fillRect(stats.barrelLength * 0.4 + 6, -7, 4, 5); }
        ctx.restore();
      }
      if (app.includes("bipod")) {
        ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.rotate(t.aimAngle);
        ctx.strokeStyle = "#0a0a0a"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(stats.barrelLength * 0.7, 0); ctx.lineTo(stats.barrelLength * 0.7 + 4, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(stats.barrelLength * 0.7, 0); ctx.lineTo(stats.barrelLength * 0.7 + 4, -6); ctx.stroke();
        ctx.restore();
      }
      if (app.includes("muzzle_brake")) {
        ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.rotate(t.aimAngle);
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(stats.barrelLength - 1, -stats.barrelWidth / 2 - 2, 4, stats.barrelWidth + 4);
        ctx.fillStyle = stats.accentColor; ctx.fillRect(stats.barrelLength + 1, -1, 2, 2);
        ctx.restore();
      }
      if (app.includes("shield_plate")) {
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 17, -Math.PI * 0.7, -Math.PI * 0.3); ctx.stroke();
      }
      if (app.includes("heavy_cap")) {
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(t.pos.x - 8, t.pos.y - 14, 16, 5);
        ctx.fillStyle = stats.accentColor; ctx.fillRect(t.pos.x - 8, t.pos.y - 14, 16, 1);
      }
      if (app.includes("spikes")) {
        ctx.fillStyle = stats.accentColor;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(t.pos.x + Math.cos(a) * 14, t.pos.y + Math.sin(a) * 14);
          ctx.lineTo(t.pos.x + Math.cos(a) * 19, t.pos.y + Math.sin(a) * 19);
          ctx.lineTo(t.pos.x + Math.cos(a + 0.2) * 14, t.pos.y + Math.sin(a + 0.2) * 14);
          ctx.closePath(); ctx.fill();
        }
      }
      if (app.includes("energy_core")) {
        const pulse = 0.6 + Math.sin(performance.now() / 200) * 0.4;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = stats.accentColor;
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    };

    const drawTowerBase = (ctx: CanvasRenderingContext2D, t: Tower, stats: TowerStats) => {
      const grad0 = ctx.createRadialGradient(t.pos.x, t.pos.y + 4, 4, t.pos.x, t.pos.y + 4, 22);
      grad0.addColorStop(0, "rgba(0,0,0,0.5)");
      grad0.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad0;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y + 4, 22, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#3a3528";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(t.pos.x + Math.cos(a) * 16, t.pos.y + Math.sin(a) * 16, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 17, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createRadialGradient(t.pos.x - 5, t.pos.y - 5, 1, t.pos.x, t.pos.y, 15);
      bg.addColorStop(0, lighten(stats.bodyColor, 25));
      bg.addColorStop(0.5, stats.bodyColor);
      bg.addColorStop(1, darken(stats.bodyColor, 25));
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, -Math.PI * 0.85, -Math.PI * 0.25); ctx.stroke();
    };

    const drawTower = (ctx: CanvasRenderingContext2D, t: Tower, alpha: number) => {
      const def = TOWERS[t.kind];
      const stats = effectiveStats(def, t.pathIdx, t.tier);
      ctx.globalAlpha = alpha;

      if (t.kind === "bank") {
        const grad0 = ctx.createRadialGradient(t.pos.x, t.pos.y + 4, 4, t.pos.x, t.pos.y + 4, 22);
        grad0.addColorStop(0, "rgba(0,0,0,0.5)"); grad0.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad0; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y + 4, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(t.pos.x - 16, t.pos.y - 16, 32, 32);
        const bg = ctx.createLinearGradient(t.pos.x - 14, t.pos.y - 14, t.pos.x + 14, t.pos.y + 14);
        bg.addColorStop(0, lighten(stats.bodyColor, 20)); bg.addColorStop(1, darken(stats.bodyColor, 20));
        ctx.fillStyle = bg; ctx.fillRect(t.pos.x - 14, t.pos.y - 14, 28, 28);
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 2;
        ctx.strokeRect(t.pos.x - 14, t.pos.y - 14, 28, 28);
        ctx.fillStyle = "#1a1a1a"; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(t.pos.x + Math.cos(a) * 5, t.pos.y + Math.sin(a) * 5);
          ctx.lineTo(t.pos.x + Math.cos(a) * 9, t.pos.y + Math.sin(a) * 9);
          ctx.stroke();
        }
        ctx.fillStyle = stats.accentColor;
        ctx.font = "bold 12px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("$", t.pos.x, t.pos.y - 14);
      } else if (t.kind === "drone") {
        drawTowerBase(ctx, t, stats);
        ctx.fillStyle = stats.accentColor;
        ctx.font = "bold 10px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("H", t.pos.x, t.pos.y + 4);
      } else if (t.kind === "engineer") {
        const grad0 = ctx.createRadialGradient(t.pos.x, t.pos.y + 4, 4, t.pos.x, t.pos.y + 4, 22);
        grad0.addColorStop(0, "rgba(0,0,0,0.5)"); grad0.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad0; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y + 4, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) ctx.moveTo(t.pos.x + Math.cos(a) * 18, t.pos.y + Math.sin(a) * 18);
          else ctx.lineTo(t.pos.x + Math.cos(a) * 18, t.pos.y + Math.sin(a) * 18);
        }
        ctx.closePath(); ctx.fill();
        const bg = ctx.createRadialGradient(t.pos.x - 4, t.pos.y - 4, 1, t.pos.x, t.pos.y, 15);
        bg.addColorStop(0, lighten(stats.bodyColor, 20)); bg.addColorStop(1, darken(stats.bodyColor, 25));
        ctx.fillStyle = bg;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) ctx.moveTo(t.pos.x + Math.cos(a) * 15, t.pos.y + Math.sin(a) * 15);
          else ctx.lineTo(t.pos.x + Math.cos(a) * 15, t.pos.y + Math.sin(a) * 15);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(t.pos.x - 1, t.pos.y - 6, 2, 10);
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y - 6, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0a0a"; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y - 6, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (t.kind === "minelayer") {
        const grad0 = ctx.createRadialGradient(t.pos.x, t.pos.y + 4, 4, t.pos.x, t.pos.y + 4, 22);
        grad0.addColorStop(0, "rgba(0,0,0,0.5)"); grad0.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad0; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y + 4, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(t.pos.x - 16, t.pos.y - 14, 32, 28);
        const bg = ctx.createLinearGradient(t.pos.x, t.pos.y - 12, t.pos.x, t.pos.y + 12);
        bg.addColorStop(0, lighten(stats.bodyColor, 15)); bg.addColorStop(1, darken(stats.bodyColor, 25));
        ctx.fillStyle = bg; ctx.fillRect(t.pos.x - 14, t.pos.y - 12, 28, 24);
        ctx.fillStyle = stats.accentColor;
        for (let i = -14; i < 14; i += 6) ctx.fillRect(t.pos.x + i, t.pos.y - 12, 3, 24);
      } else if (t.kind === "mortar") {
        const grad0 = ctx.createRadialGradient(t.pos.x, t.pos.y + 4, 4, t.pos.x, t.pos.y + 4, 22);
        grad0.addColorStop(0, "rgba(0,0,0,0.5)"); grad0.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad0; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y + 4, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 17, 0, Math.PI * 2); ctx.fill();
        const bg = ctx.createRadialGradient(t.pos.x - 4, t.pos.y - 4, 1, t.pos.x, t.pos.y, 12);
        bg.addColorStop(0, lighten(stats.bodyColor, 20)); bg.addColorStop(1, darken(stats.bodyColor, 25));
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stats.barrelColor;
        ctx.fillRect(t.pos.x - stats.barrelWidth / 2, t.pos.y - stats.barrelLength, stats.barrelWidth, stats.barrelLength + 2);
        ctx.fillStyle = stats.accentColor;
        ctx.fillRect(t.pos.x - stats.barrelWidth / 2 - 1, t.pos.y - stats.barrelLength - 1, stats.barrelWidth + 2, 2);
      } else if (t.kind === "flame") {
        drawTowerBase(ctx, t, stats);
        ctx.save(); ctx.translate(t.pos.x, t.pos.y); ctx.rotate(t.aimAngle + Math.PI);
        ctx.fillStyle = "#3a2a22"; ctx.fillRect(8, -5, 10, 10);
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 1; ctx.strokeRect(8, -5, 10, 10);
        ctx.fillStyle = "#dc2626"; ctx.fillRect(8, -1, 10, 2);
        ctx.restore();
      } else {
        drawTowerBase(ctx, t, stats);
      }

      if (stats.barrelLength > 0 && t.kind !== "mortar" && t.kind !== "bank" && t.kind !== "drone" && t.kind !== "recon" && t.kind !== "engineer" && t.kind !== "minelayer") {
        ctx.save();
        ctx.translate(t.pos.x, t.pos.y); ctx.rotate(t.aimAngle);
        const barrels = (
          (t.kind === "howitzer" && t.pathIdx === 1 && t.tier >= 2) ? (t.tier >= 3 ? 4 : 2) :
          (t.kind === "rifleman" && t.pathIdx === 0 && t.tier >= 3) ? 2 :
          1
        );
        for (let b = 0; b < barrels; b++) {
          const off = barrels === 1 ? 0 : (b - (barrels - 1) / 2) * 4;
          const bg = ctx.createLinearGradient(0, off - stats.barrelWidth / 2, 0, off + stats.barrelWidth / 2);
          bg.addColorStop(0, lighten(stats.barrelColor, 20));
          bg.addColorStop(0.5, stats.barrelColor);
          bg.addColorStop(1, darken(stats.barrelColor, 25));
          ctx.fillStyle = bg;
          ctx.fillRect(0, off - stats.barrelWidth / 2, stats.barrelLength, stats.barrelWidth);
          ctx.fillStyle = stats.accentColor;
          ctx.fillRect(stats.barrelLength - 2, off - stats.barrelWidth / 2 - 1, 3, stats.barrelWidth + 2);
        }
        if (t.kind === "tesla") {
          ctx.fillStyle = stats.accentColor;
          ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (stats.underbarrel) {
          ctx.fillStyle = "#1a1a1a"; ctx.fillRect(2, 4, 14, 4);
          ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(14, 6, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      drawAppearance(ctx, t, stats);

      if (stats.hiddenDetect) {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(t.pos.x + 12, t.pos.y - 12, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
      }
      for (let i = 0; i < t.tier; i++) {
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(t.pos.x - 9 + i * 7, t.pos.y + 22, 5, 3);
      }
      if (t.stunUntil > performance.now() / 1000) {
        ctx.strokeStyle = "#fff37a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#fff37a"; ctx.font = "bold 9px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText("STUNNED", t.pos.x, t.pos.y - 26);
      }

      for (const d of t.drones) {
        const dx = t.pos.x + Math.cos(d.angle) * 32;
        const dy = t.pos.y + Math.sin(d.angle) * 32;
        const dg = ctx.createRadialGradient(dx - 1, dy - 1, 0, dx, dy, 5);
        dg.addColorStop(0, lighten(stats.accentColor, 30));
        dg.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = stats.accentColor; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
        const rotorAngle = (performance.now() / 30) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(dx + Math.cos(rotorAngle) * 6, dy + Math.sin(rotorAngle) * 6);
        ctx.lineTo(dx - Math.cos(rotorAngle) * 6, dy - Math.sin(rotorAngle) * 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dx + Math.cos(rotorAngle + Math.PI / 2) * 6, dy + Math.sin(rotorAngle + Math.PI / 2) * 6);
        ctx.lineTo(dx - Math.cos(rotorAngle + Math.PI / 2) * 6, dy - Math.sin(rotorAngle + Math.PI / 2) * 6);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    // Draw an opponent tower as a hidden / obscured marker
    const drawHiddenTower = (ctx: CanvasRenderingContext2D, t: Tower) => {
      ctx.save();
      // dim base
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(220,38,38,0.55)"; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 14px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("?", t.pos.x, t.pos.y);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
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

    const drawEnemy = (ctx: CanvasRenderingContext2D, lane: Lane, e: Enemy) => {
      const def = ENEMIES[e.kind];
      const slowed = nowSec() < e.slowUntil;
      ctx.save();
      const visible = (() => {
        if (!def.hidden) return true;
        for (const t of lane.towers) {
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

      const shg = ctx.createRadialGradient(e.pos.x, e.pos.y + def.radius * 0.6, 1, e.pos.x, e.pos.y + def.radius * 0.6, def.radius + 4);
      shg.addColorStop(0, "rgba(0,0,0,0.4)"); shg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shg;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y + def.radius * 0.6, def.radius + 4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = def.outline;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius + 2, def.shape ?? "circle");
      ctx.fill();
      const bg = ctx.createRadialGradient(e.pos.x - def.radius * 0.4, e.pos.y - def.radius * 0.4, 1, e.pos.x, e.pos.y, def.radius);
      bg.addColorStop(0, lighten(def.color, 30));
      bg.addColorStop(0.6, def.color);
      bg.addColorStop(1, darken(def.color, 25));
      ctx.fillStyle = bg;
      drawShape(ctx, e.pos.x, e.pos.y, def.radius, def.shape ?? "circle");
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius - 1, -Math.PI * 0.85, -Math.PI * 0.25); ctx.stroke();

      if (def.armored) {
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5;
        drawShape(ctx, e.pos.x, e.pos.y, def.radius - 3, def.shape ?? "circle");
        ctx.stroke();
      }
      if (e.kind === "shielded") {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 3, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); ctx.stroke();
      }
      if (e.kind === "healer") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(e.pos.x - 4, e.pos.y - 1, 8, 2);
        ctx.fillRect(e.pos.x - 1, e.pos.y - 4, 2, 8);
      }
      if (def.regen) {
        ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 3, 0, Math.PI * 2); ctx.stroke();
      }
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
      if (def.aegisAura) {
        const pulse = 0.3 + Math.sin(performance.now() / 300) * 0.15;
        ctx.strokeStyle = `rgba(154,223,255,${pulse})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.aegisAura.range, 0, Math.PI * 2); ctx.stroke();
      }
      if (def.healAura) {
        ctx.strokeStyle = "rgba(34,197,94,0.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.healAura.range, 0, Math.PI * 2); ctx.stroke();
      }
      if (def.cloakAura) {
        ctx.strokeStyle = "rgba(80,80,80,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.cloakAura.range, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (def.shape === "skull") {
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(e.pos.x - 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.pos.x + 4, e.pos.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      if (e.burnUntil > nowSec()) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i % 2 ? "#ff8a3d" : "#ffae40";
          const fx = e.pos.x + (Math.random() - 0.5) * def.radius;
          const fy = e.pos.y - def.radius + (Math.random() - 0.5) * 4;
          ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();

      if (slowed) {
        ctx.strokeStyle = "#9adfff"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 4, 0, Math.PI * 2); ctx.stroke();
      }

      const w = def.radius * 2 + 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w, 4);
      ctx.fillStyle = pct > 0.5 ? "#f5f5f5" : pct > 0.25 ? "#dc2626" : "#ef4444";
      ctx.fillRect(e.pos.x - w / 2, e.pos.y - def.radius - 9, w * pct, 4);

      if (def.shape === "skull" || e.kind === "juggernaut") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(def.name.toUpperCase(), e.pos.x, e.pos.y - def.radius - 14);
      }

      if (hoveredEnemyIdRef.current === e.id) {
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, def.radius + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      ctx.imageSmoothingEnabled = true;

      const lane = viewedLane();
      const isOwn = lane.idx === 0;
      const intelL = playerIntelLevel();

      ctx.fillStyle = map.bgColor;
      ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 600);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      drawDecorations(ctx, map.decorations);
      drawNoBuildZones(ctx);

      const wp = map.waypoints;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = map.pathOutline; ctx.lineWidth = map.pathOutlineWidth ?? 44;
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.strokeStyle = map.pathColor; ctx.lineWidth = map.pathWidth ?? 36;
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke();
      ctx.strokeStyle = map.pathStripeColor ?? "rgba(255,255,255,0.18)"; ctx.lineWidth = map.pathStripeWidth ?? 2;
      ctx.setLineDash(map.pathStripeDash ?? [8, 10]);
      ctx.beginPath(); ctx.moveTo(wp[0].x, wp[0].y);
      for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
      ctx.stroke(); ctx.setLineDash([]);

      if (map.topDecorations) drawDecorations(ctx, map.topDecorations);

      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(wp[0].x, wp[0].y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8e8ec";
      ctx.beginPath(); ctx.arc(wp[0].x, wp[0].y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath(); ctx.arc(wp[wp.length - 1].x, wp[wp.length - 1].y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.arc(wp[wp.length - 1].x, wp[wp.length - 1].y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("IN", wp[0].x, wp[0].y + 3);
      ctx.fillText("OUT", wp[wp.length - 1].x, wp[wp.length - 1].y + 3);

      // mines (only own lane shows mines; opponents get hidden marker)
      if (isOwn) {
        for (const m of lane.mines) {
          ctx.fillStyle = "#1a1a1a";
          ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#dc2626";
          ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 2, 0, Math.PI * 2); ctx.fill();
          const pulse = (Math.sin(performance.now() / 250) + 1) / 2;
          ctx.strokeStyle = `rgba(220,38,38,${0.3 + pulse * 0.4})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 7, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // selected tower range (own only)
      if (isOwn && selectedTowerIdRef.current != null) {
        const t = lane.towers.find(t => t.id === selectedTowerIdRef.current);
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

      // ghost placement (own only)
      if (isOwn) {
        const sk = selectedKindRef.current;
        if (sk) {
          const m = mouseRef.current;
          if (m.x > 0 && m.x < W) {
            const def = TOWERS[sk];
            const onPath = isOnPath(m, map.waypoints, 24);
            const inZone = inNoBuildZone(m, map.noBuildZones);
            let overlap = false;
            for (const t of lane.towers) if (dist(t.pos, m) < 30) overlap = true;
            const ok = !onPath && !inZone && !overlap && lane.money >= def.cost;
            if ((def.base.range ?? 0) > 0) {
              ctx.fillStyle = ok ? "rgba(220,38,38,0.10)" : "rgba(255,80,80,0.15)";
              ctx.strokeStyle = ok ? "rgba(220,38,38,0.6)" : "rgba(255,80,80,0.6)";
              ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(m.x, m.y, def.base.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            drawTower(ctx, {
              id: -1, kind: sk, pos: m, pathIdx: null, tier: 0,
              cooldown: 0, underbarrelCooldown: 0, burstQueue: 0, burstTimer: 0, burstTarget: null, aimAngle: 0,
              incomeTimer: 0, mineTimer: 0, spawnTimer: 0, drones: [], stunUntil: 0, placedBySlot: mySlot,
            }, ok ? 0.7 : 0.45);
          }
        }
      }

      // Towers (intel-gated for opponents, allies fully visible)
      const isAlly = lane.team === playerLane().team;
      for (const t of lane.towers) {
        if (isOwn || isAlly || towerRevealed(t.id, intelL)) {
          drawTower(ctx, t, 1);
        } else {
          drawHiddenTower(ctx, t);
        }
      }
      for (const e of lane.enemies) drawEnemy(ctx, lane, e);

      for (const b of lane.beams) {
        const a = Math.min(1, b.ttl * 6);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = b.color; ctx.globalAlpha = a; ctx.lineWidth = b.width;
        ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(b.to.x, b.to.y); ctx.stroke();
        ctx.lineWidth = b.width * 2.5; ctx.globalAlpha = a * 0.3;
        ctx.stroke(); ctx.restore();
      }

      for (const p of lane.projectiles) {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2); ctx.fill();
        if (p.arc) {
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.beginPath(); ctx.arc(p.arc.targetX, p.arc.targetY, 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Allied units (sent by command towers, or spawned by depot)
      for (const a of lane.alliedUnits) {
        if (!a.alive) continue;
        const ud = UNITS[a.kind];
        // Stealth ghost: render translucent unless detected by hidden-detect tower nearby (simple heuristic).
        let alpha = 1;
        if (ud.stealth) alpha = 0.45;
        ctx.save();
        ctx.globalAlpha = alpha;
        // Body
        ctx.fillStyle = ud.bodyColor;
        ctx.strokeStyle = ud.accentColor;
        ctx.lineWidth = 1.5;
        if (ud.shape === "triangle") {
          ctx.beginPath();
          ctx.moveTo(a.pos.x, a.pos.y - ud.radius);
          ctx.lineTo(a.pos.x + ud.radius, a.pos.y + ud.radius);
          ctx.lineTo(a.pos.x - ud.radius, a.pos.y + ud.radius);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        } else if (ud.shape === "square") {
          ctx.fillRect(a.pos.x - ud.radius, a.pos.y - ud.radius, ud.radius * 2, ud.radius * 2);
          ctx.strokeRect(a.pos.x - ud.radius, a.pos.y - ud.radius, ud.radius * 2, ud.radius * 2);
        } else {
          ctx.beginPath();
          ctx.arc(a.pos.x, a.pos.y, ud.radius, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
        // Direction tick (chevron showing movement direction)
        ctx.fillStyle = ud.accentColor;
        ctx.beginPath();
        ctx.arc(a.pos.x, a.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // HP bar (only if damaged)
        if (a.hp < ud.hp) {
          const w = ud.radius * 2.2;
          const x = a.pos.x - w / 2;
          const y = a.pos.y - ud.radius - 6;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(x - 1, y - 1, w + 2, 4);
          ctx.fillStyle = a.hp / ud.hp > 0.5 ? "#34d399" : a.hp / ud.hp > 0.25 ? "#fbbf24" : "#ef4444";
          ctx.fillRect(x, y, Math.max(0, w * (a.hp / ud.hp)), 2);
        }
      }

      for (const z of lane.zaps) {
        const a = Math.min(1, z.ttl * 5);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `rgba(154,223,255,${a})`; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < z.points.length - 1; i++) {
          const a2 = z.points[i], b = z.points[i + 1];
          ctx.moveTo(a2.x, a2.y);
          const mx = (a2.x + b.x) / 2 + (Math.random() - 0.5) * 14;
          const my = (a2.y + b.y) / 2 + (Math.random() - 0.5) * 14;
          ctx.lineTo(mx, my); ctx.lineTo(b.x, b.y);
        }
        ctx.stroke(); ctx.restore();
      }

      ctx.save();
      for (const p of lane.particles) {
        const lifeRatio = p.ttl / p.maxTtl;
        ctx.globalAlpha = Math.max(0, lifeRatio);
        ctx.globalCompositeOperation = p.blend ? "lighter" : "source-over";
        if (p.kind === "muzzle") {
          const grad = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, p.size * lifeRatio);
          grad.addColorStop(0, p.color); grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * lifeRatio, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "smoke") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1 + (1 - lifeRatio)), 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "explosion") {
          const grad = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, p.size);
          grad.addColorStop(0, "#fffae0"); grad.addColorStop(0.5, p.color); grad.addColorStop(1, "rgba(255,80,40,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1.2 - lifeRatio * 0.4), 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "ring") {
          ctx.strokeStyle = p.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (1 - lifeRatio * 0.6), 0, Math.PI * 2); ctx.stroke();
        } else if (p.kind === "spark" || p.kind === "ember") {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
        } else if (p.kind === "fire") {
          const grad = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, p.size * (0.7 + lifeRatio * 0.6));
          grad.addColorStop(0, p.color); grad.addColorStop(1, "rgba(255,80,30,0)");
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * (0.5 + lifeRatio * 0.7), 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === "dust") {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      if (isOwn && placementErrorRef.current) {
        const pe = placementErrorRef.current;
        ctx.strokeStyle = `rgba(255,80,80,${pe.ttl})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pe.pos.x, pe.pos.y, 24 * (1.4 - pe.ttl), 0, Math.PI * 2); ctx.stroke();
      }

      for (const f of lane.floaters) {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.min(1, f.ttl / 1.0);
        ctx.font = "bold 13px Inter, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(f.text, f.pos.x, f.pos.y);
        ctx.globalAlpha = 1;
      }

      // Spectator banner when viewing opponent
      if (!isOwn) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, 32);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px Inter, sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`SPECTATING ${lane.name.toUpperCase()}`, 14, 21);
        ctx.fillStyle = "#dc2626";
        ctx.textAlign = "right";
        ctx.font = "bold 11px Inter, sans-serif";
        const reveal = isAlly ? "FULL VIEW (ALLY)" : intelL >= 3 ? "INTEL L3 · FULL REVEAL"
          : intelL === 2 ? "INTEL L2 · 60% REVEAL · $ VISIBLE"
          : intelL === 1 ? "INTEL L1 · 30% REVEAL"
          : "NO INTEL · TOWERS HIDDEN";
        ctx.fillText(reveal, W - 14, 21);
        ctx.textAlign = "left";

        if (!lane.alive) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#dc2626";
          ctx.font = "bold 36px Inter, sans-serif"; ctx.textAlign = "center";
          ctx.fillText("ELIMINATED", W / 2, H / 2);
        }
      }

      if (waveAnnounce) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
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
  }, [map, mode, tryPlaceTower, waveAnnounce, startWave]);

  const lane = lanesRef.current[viewedLaneIdx] ?? lanesRef.current[0];
  const isOwn = lane.idx === 0;
  const isAlly = lane.team === 0 && !lane.isPlayer;
  const intelL = playerIntelLevel();
  const selectedTower = isOwn && selectedTowerId != null ? lanesRef.current[0].towers.find(t => t.id === selectedTowerId) ?? null : null;
  const hoveredEnemy = hoveredEnemyId != null ? lane.enemies.find(e => e.id === hoveredEnemyId) ?? null : null;

  const restart = () => {
    const oc = onlineRef.current;
    lanesRef.current = oc
      ? makeLanesOnline(oc.slots, oc.mySlot, oc.isHost, playerName, oc.lobbyMode)
      : makeLanes(mode, difficulty, playerName);
    setLevel(1); levelRef.current = 1;
    setWaveActive(false); waveActiveRef.current = false;
    setSelectedKind(null); setSelectedTowerId(null);
    setGameOver(null); gameOverRef.current = null;
    setViewedLaneIdx(0);
  };

  // What money/lives to display per lane (gated for opponents by intel)
  const moneyOf = (l: Lane): string => {
    if (l.team === playerLane().team) return l.money.toString();
    if (intelL >= 2) return l.money.toString();
    return "???";
  };

  // Spectating an opponent → swap controls panel for an Intel report
  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-gradient-to-b from-card to-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onExit} className="rounded-sm">
            <Home className="w-4 h-4 mr-1" /> Menu
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground tracking-wide">{map.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground font-mono text-xs px-1.5 py-0.5 bg-muted rounded-sm">
              {mode === "solo" ? "SOLO" : mode === "1v1" ? "1v1" : "2v2"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Stat icon={<Heart className="w-4 h-4 text-primary" />} value={lanesRef.current[0].lives} label="Lives" />
          <Stat icon={<Coins className="w-4 h-4 text-foreground" />} value={walletOf(lanesRef.current[0], mySlot)} label="Funds" />
          <Stat icon={<Trophy className="w-4 h-4 text-primary" />} value={`${level} / 30`} label="Wave" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setAutoWave(a => !a)}
            className={`rounded-sm ${autoWave ? "border-primary text-primary" : ""}`}
            title="Auto-deploy next wave when current ends"
          >
            <Repeat className="w-4 h-4 mr-1" /> Auto {autoWave ? "ON" : "OFF"}
          </Button>
          {(!online || online.isHost) ? (
            <Button variant={waveActive ? "secondary" : "default"} size="sm" onClick={startWave} disabled={waveActive || !!gameOver} className="rounded-sm">
              <Play className="w-4 h-4 mr-1" />
              {waveActive ? "Wave Active" : `Deploy Wave ${level}`}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled className="rounded-sm">
              <Play className="w-4 h-4 mr-1" />
              {waveActive ? "Wave Active" : `Wave ${level} — host deploys`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)} className="rounded-sm" title="P">
            <Pause className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 3 : 1))} className="rounded-sm">
            <FastForward className="w-4 h-4 mr-1" /> {speed}x
          </Button>
        </div>
      </div>

      {/* Lane tabs (multiplayer only) */}
      {mode !== "solo" && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-card/40 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-2 flex items-center gap-1">
            <Eye className="w-3 h-3" /> View Lane
          </span>
          {lanesRef.current.map((l) => {
            const me = l.idx === 0;
            const ally = l.team === 0;
            const active = l.idx === viewedLaneIdx;
            return (
              <button
                key={l.idx}
                onClick={() => { setViewedLaneIdx(l.idx); setSelectedTowerId(null); }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-[11px] border transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : ally
                    ? "border-border hover:border-emerald-700 hover:bg-muted/40"
                    : "border-border hover:border-red-700 hover:bg-muted/40"
                } ${!l.alive ? "opacity-50" : ""}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${ally ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="font-bold">{l.name}</span>
                <span className="font-mono text-muted-foreground">
                  <Heart className="w-2.5 h-2.5 inline mr-0.5" />{l.lives}
                </span>
                <span className="font-mono text-muted-foreground">
                  <Coins className="w-2.5 h-2.5 inline mr-0.5" />{moneyOf(l)}
                </span>
                {!l.alive && <Skull className="w-3 h-3 text-red-400" />}
                {me && <span className="text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1 rounded-sm">YOU</span>}
                {ally && !me && <span className="text-[9px] uppercase tracking-wider bg-emerald-700 text-white px-1 rounded-sm">ALLY</span>}
                {!ally && <span className="text-[9px] uppercase tracking-wider bg-red-900 text-white px-1 rounded-sm">FOE</span>}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <Radar className="w-3 h-3" />
            Recon Intel: <span className={`font-mono font-bold ${intelL >= 2 ? "text-cyan-400" : intelL === 1 ? "text-amber-400" : "text-muted-foreground"}`}>L{intelL}</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-3 bg-background relative">
          <div className="relative" style={{ aspectRatio: `${W} / ${H}`, width: "100%", maxWidth: "100%", maxHeight: "100%" }}>
            <canvas
              ref={canvasRef}
              className={`w-full h-full rounded-sm shadow-2xl border border-border ${isOwn ? "cursor-crosshair" : "cursor-not-allowed"}`}
              style={{ imageRendering: "auto" }}
            />
            {hoveredEnemy && <EnemyTooltip enemy={hoveredEnemy} />}
            <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-1 rounded-sm font-mono border border-border/50">
              [1-9] tower · [Esc] cancel · [Space] wave · [P] pause{mode !== "solo" ? " · [V] view" : ""}
            </div>
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-sm">
                <div className="bg-card border border-border p-6 rounded-sm text-center max-w-sm shadow-2xl">
                  {gameOver === "win" ? (
                    <><Crown className="w-12 h-12 mx-auto text-primary mb-2" />
                      <h2 className="text-2xl font-bold mb-1">VICTORY</h2>
                      <p className="text-muted-foreground mb-4">
                        {mode === "solo" ? `All 30 waves repelled on ${map.name}.` : "Your team outlasted the enemy commanders."}
                      </p></>
                  ) : (
                    <><Skull className="w-12 h-12 mx-auto text-primary mb-2" />
                      <h2 className="text-2xl font-bold mb-1">DEFEATED</h2>
                      <p className="text-muted-foreground mb-4">
                        {mode === "solo" ? `The line broke on wave ${level}.` : "Your team was eliminated."}
                      </p></>
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
          {isOwn ? (
            <>
              <div className="px-3 pt-3 pb-2 border-b border-border">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Build Tower</span>
                  <span className="text-[9px] text-muted-foreground/60 normal-case tracking-wide">click to select · click map to place</span>
                </div>
              </div>
              <div className="px-2 py-2 max-h-[55%] overflow-y-auto">
                <div className="grid grid-cols-1 gap-1">
                  {TOWER_ORDER.filter(k => k !== "command" || mode !== "solo").map((k, idx) => {
                    const def = TOWERS[k];
                    const canAfford = walletOf(lanesRef.current[0], mySlot) >= def.cost;
                    const selected = selectedKind === k;
                    const keyHint = idx < 9 ? (idx + 1).toString() : idx === 9 ? "0" : "";
                    return (
                      <button
                        key={k}
                        onClick={() => { setSelectedKind(selected ? null : k); setSelectedTowerId(null); }}
                        disabled={!canAfford}
                        className={`text-left px-2 py-1.5 rounded-sm border transition-all ${
                          selected ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(220,38,38,0.3)]" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                        } ${!canAfford ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <TowerKindIcon kind={k} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="text-xs font-bold tracking-tight">{def.name}</div>
                              <DamageBadge type={def.base.damageType} />
                              {keyHint && <span className="ml-auto text-[9px] font-mono bg-muted px-1 rounded-sm text-muted-foreground">{keyHint}</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-tight truncate">{def.description}</div>
                          </div>
                          <div className="flex items-center text-[11px] text-foreground font-mono font-bold">
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
                  money={walletOf(lanesRef.current[0], mySlot)}
                  onUpgrade={(p) => upgradeTower(selectedTower.id, p)}
                  onSell={() => sellTower(selectedTower.id)}
                  onBuyUnit={(kind, cost) => buyCommandUnit(selectedTower.id, kind, cost)}
                />
              ) : (
                <div className="p-3 flex-1 overflow-y-auto border-t border-border">
                  <ThreatPanel
                    level={level}
                    intelLevel={intelL}
                    lane={lane}
                    slotLabels={online ? Object.fromEntries(online.slots.map(s => [s.index, s.kind === "player" ? (s.playerName ?? `P${s.index}`) : `AI ${s.index}`])) : undefined}
                  />
                  <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
                    Hover any visible enemy to inspect stats. Auto-wave deploys the next wave 4s after the current ends.
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Damage Types</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {(Object.keys(DAMAGE_LABELS) as DamageType[]).map(d => (
                        <div key={d} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: DAMAGE_LABELS[d].color }} />
                          <span className="text-muted-foreground">{DAMAGE_LABELS[d].label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <SpectatorPanel lane={lane} intelLevel={intelL} isAlly={isAlly} onReturn={() => { setViewedLaneIdx(0); setSelectedTowerId(null); }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helper components
// ============================================================

function TowerKindIcon({ kind }: { kind: TowerKind }) {
  const def = TOWERS[kind];
  const Icon =
    kind === "rifleman" ? Crosshair :
    kind === "frost" ? Snowflake :
    kind === "sniper" ? Target :
    kind === "tesla" ? Zap :
    kind === "flame" ? Flame :
    kind === "drone" ? Plane :
    kind === "howitzer" ? Bomb :
    kind === "mortar" ? Bomb :
    kind === "railgun" ? Zap :
    kind === "minelayer" ? AlertTriangle :
    kind === "engineer" ? Wrench :
    kind === "recon" ? Radar :
    kind === "bank" ? DollarSign :
    kind === "aegis" ? ShieldPlus :
    kind === "depot" ? Truck :
    kind === "command" ? Send :
    Crosshair;
  const stats = def.base;
  return (
    <div
      className="w-7 h-7 rounded-sm flex-shrink-0 flex items-center justify-center border"
      style={{ background: stats.bodyColor, borderColor: stats.accentColor }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: stats.accentColor }} />
    </div>
  );
}

function EnemyTooltip({ enemy }: { enemy: Enemy }) {
  const def = ENEMIES[enemy.kind];
  return (
    <div
      className="absolute pointer-events-none bg-card/95 backdrop-blur border border-primary rounded-sm p-2 text-xs shadow-2xl z-10 min-w-[210px]"
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
        <div><span className="text-muted-foreground">DMG</span> <span className="font-mono">{enemy.damage}</span></div>
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

function ThreatPanel({ level, intelLevel, lane, slotLabels }: { level: number; intelLevel: number; lane?: Lane; slotLabels?: Record<number, string> }) {
  const wave = generateWave(level);
  // Group queued incoming sent units by senderSlot (only meaningful in 2v2).
  const queueGroups = new Map<number, Map<UnitKind, number>>();
  if (lane) {
    for (const q of lane.unitQueue) {
      let m = queueGroups.get(q.senderSlot);
      if (!m) { m = new Map(); queueGroups.set(q.senderSlot, m); }
      m.set(q.kind, (m.get(q.kind) ?? 0) + 1);
    }
  }
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-2">
        <span>Wave {level} Threats</span>
        {intelLevel > 0 && <span className="text-[9px] text-cyan-400 normal-case tracking-normal flex items-center gap-1"><Radar className="w-3 h-3" />Intel L{intelLevel}</span>}
      </div>
      {(level % 10 === 0) && <div className="flex items-center gap-2 text-primary text-xs mb-1"><Skull className="w-3.5 h-3.5" /> {wave.bossKind ? ENEMIES[wave.bossKind].name : "Boss"}</div>}
      {(level % 5 === 0 && level % 10 !== 0) && <div className="flex items-center gap-2 text-amber-400 text-xs mb-1"><Skull className="w-3.5 h-3.5" /> Mini-Boss</div>}
      <div className="space-y-1 text-xs">
        {wave.spawns.map((s, i) => {
          const ed = ENEMIES[s.kind];
          let countText = "?";
          if (intelLevel >= 2) countText = `×${s.count}`;
          else if (intelLevel === 1) {
            const lo = Math.max(1, Math.floor(s.count * 0.7));
            const hi = Math.ceil(s.count * 1.3);
            countText = `×${lo}-${hi}`;
          }
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ background: ed.color, borderRadius: ed.shape === "diamond" ? 0 : 999, transform: ed.shape === "diamond" ? "rotate(45deg)" : undefined }} />
              <span className="text-muted-foreground flex-1">{ed.name}</span>
              {ed.hidden && <Eye className="w-3 h-3 text-amber-400" />}
              {ed.armored && <Shield className="w-3 h-3 text-zinc-300" />}
              <span className="font-mono text-[10px] text-foreground">{countText}</span>
            </div>
          );
        })}
      </div>
      {queueGroups.size > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Send className="w-3 h-3" /> Incoming Reinforcements
          </div>
          <div className="space-y-1 text-[11px]">
            {Array.from(queueGroups.entries()).map(([senderSlot, m]) => {
              const senderLabel = intelLevel >= 3 ? (slotLabels?.[senderSlot] ?? `Slot ${senderSlot}`) : "Unknown sender";
              return (
                <div key={senderSlot} className="border border-border rounded-sm px-1.5 py-1">
                  <div className="text-[10px] text-amber-400 font-bold mb-0.5">{senderLabel}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(m.entries()).map(([k, c]) => {
                      const ud = UNITS[k];
                      return (
                        <div key={k} className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: ud.bodyColor, border: `1px solid ${ud.accentColor}` }} />
                          <span className="text-foreground">{ud.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">×{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {intelLevel < 3 && (
            <div className="mt-1.5 text-[9px] text-muted-foreground italic">Upgrade Recon to L3 to identify the sender.</div>
          )}
        </div>
      )}
    </>
  );
}

function SpectatorPanel({ lane, intelLevel, isAlly, onReturn }: { lane: Lane; intelLevel: number; isAlly: boolean; onReturn: () => void }) {
  const visibleTowers = isAlly ? lane.towers : lane.towers.filter(t => towerRevealed(t.id, intelLevel));
  const knownCount = visibleTowers.length;
  const hiddenCount = lane.towers.length - knownCount;
  const allyTotalMoney = lane.controllers.reduce((s, c) => s + (lane.wallets[c] ?? 0), 0);
  const moneyShown = isAlly ? `${allyTotalMoney} (team)` : intelLevel >= 2 ? lane.money.toString() : "Locked (need Intel L2)";

  // Tower kind aggregates (revealed only)
  const counts = new Map<TowerKind, number>();
  for (const t of visibleTowers) counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${isAlly ? "bg-emerald-500" : "bg-red-500"}`} />
          <div className="text-sm font-bold">{lane.name}</div>
          <span className={`ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${isAlly ? "bg-emerald-700 text-white" : "bg-red-900 text-white"}`}>
            {isAlly ? "ALLY" : "OPPONENT"}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {isAlly ? "Full visibility on your teammate." : "Spy on this commander. Build a Recon HQ to see more."}
        </div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-2">
          {isAlly ? <Users className="w-3 h-3" /> : <Eye className="w-3 h-3" />} Status Report
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SpecStat label="Lives" value={lane.lives} icon={<Heart className="w-3 h-3 text-primary" />} />
          <SpecStat label="Funds" value={moneyShown} icon={<Coins className="w-3 h-3" />} mono />
          <SpecStat label="Towers" value={`${knownCount}${hiddenCount > 0 ? ` +${hiddenCount}?` : ""}`} icon={<Target className="w-3 h-3" />} />
          <SpecStat label="Status" value={lane.alive ? "Active" : "Eliminated"} icon={lane.alive ? <Crosshair className="w-3 h-3" /> : <Skull className="w-3 h-3 text-primary" />} />
        </div>
      </div>

      {!isAlly && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-2">
            <Radar className="w-3 h-3" /> Recon Intel · L{intelLevel}
          </div>
          <div className="space-y-1.5 text-[11px]">
            <IntelRow active={intelLevel >= 0} label="See tower placement" detail="Default: positions visible as ?" />
            <IntelRow active={intelLevel >= 1} label="Reveal ~30% of towers" detail="Recon HQ Tier 1" />
            <IntelRow active={intelLevel >= 2} label="Reveal ~60% + opponent funds" detail="Recon HQ Tier 2" />
            <IntelRow active={intelLevel >= 3} label="Reveal ALL towers" detail="Recon HQ Tier 3 (Signal Intel path)" />
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{isAlly ? "Tower Roster" : "Confirmed Tower Sightings"}</div>
        {counts.size === 0 ? (
          <div className="text-[11px] text-muted-foreground italic">
            {isAlly ? "No towers placed yet." : intelLevel === 0 ? "Build a Recon HQ to identify enemy towers." : "No towers identified yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {Array.from(counts.entries()).map(([k, n]) => (
              <div key={k} className="flex items-center gap-2 text-[11px]">
                <TowerKindIcon kind={k} />
                <div className="flex-1">
                  <div className="font-bold">{TOWERS[k].name}</div>
                  <div className="text-[9px] text-muted-foreground">{TOWERS[k].description}</div>
                </div>
                <div className="font-mono font-bold">×{n}</div>
              </div>
            ))}
          </div>
        )}
        {!isAlly && hiddenCount > 0 && (
          <div className="mt-2 text-[10px] text-muted-foreground italic flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> {hiddenCount} more tower{hiddenCount === 1 ? "" : "s"} hidden — upgrade Recon HQ.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={onReturn} className="w-full rounded-sm">
          <Home className="w-3.5 h-3.5 mr-1" /> Return to my lane
        </Button>
      </div>
    </div>
  );
}

function IntelRow({ active, label, detail }: { active: boolean; label: string; detail: string }) {
  return (
    <div className={`flex items-start gap-2 ${active ? "" : "opacity-40"}`}>
      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-primary" : "bg-muted-foreground"}`} />
      <div className="flex-1">
        <div className={`font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</div>
        <div className="text-[10px] text-muted-foreground">{detail}</div>
      </div>
      {active ? <span className="text-[9px] uppercase tracking-wider text-primary">Active</span> : <HelpCircle className="w-3 h-3 text-muted-foreground" />}
    </div>
  );
}

function SpecStat({ label, value, icon, mono }: { label: string; value: string | number; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-sm px-2 py-1.5 flex items-center gap-2">
      {icon}
      <div className="leading-tight">
        <div className={`text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground -mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function TowerPanel({ tower, money, onUpgrade, onSell, onBuyUnit }: { tower: Tower; money: number; onUpgrade: (p: number) => void; onSell: () => void; onBuyUnit?: (kind: UnitKind, cost: number) => void }) {
  const def = TOWERS[tower.kind];
  const stats = effectiveStats(def, tower.pathIdx, tower.tier);
  const sellAmt = Math.round(totalSpent(def, tower.pathIdx, tower.tier) * 0.65);
  const currentName = tower.pathIdx !== null && tower.tier > 0
    ? def.paths[tower.pathIdx].tiers[tower.tier - 1].name
    : def.name;

  return (
    <div className="flex-1 overflow-y-auto border-t border-border">
      <div className="p-3 border-b border-border bg-gradient-to-b from-muted/20 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <TowerKindIcon kind={tower.kind} />
          <div className="flex-1">
            <div className="text-sm font-bold flex items-center gap-1.5">
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

      {stats.commandUnits && onBuyUnit && (
        <div className="p-3 border-b border-border">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center gap-2">
            <Send className="w-3 h-3" /> Send to Enemy Lane
          </div>
          <div className="text-[10px] text-muted-foreground leading-snug mb-2">
            Purchases queue here; units deploy at next wave start into the opposing lane.
          </div>
          <div className="grid grid-cols-1 gap-1">
            {stats.commandUnits.map((cu) => {
              const ud = UNITS[cu.kind];
              const can = money >= cu.cost;
              return (
                <button
                  key={cu.kind}
                  onClick={() => onBuyUnit(cu.kind, cu.cost)}
                  disabled={!can}
                  className={`text-left px-2 py-1.5 rounded-sm border transition-all ${
                    can ? "border-border/60 hover:border-primary/50 hover:bg-muted/30" : "border-border opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-sm flex-shrink-0" style={{ background: ud.bodyColor, border: `1px solid ${ud.accentColor}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold tracking-tight">{cu.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight truncate">
                        HP {ud.hp} · DMG {ud.damage} · SPD {ud.speed}
                      </div>
                    </div>
                    <div className="flex items-center text-[11px] font-mono font-bold">
                      <Coins className="w-3 h-3 mr-0.5 text-muted-foreground" />{cu.cost}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Choose Upgrade Path</div>
        {def.paths.map((path, pIdx) => {
          const locked = tower.pathIdx !== null && tower.pathIdx !== pIdx;
          const isPath = tower.pathIdx === pIdx;
          const nextCost = upgradeCostFor(def, pIdx, tower.tier);
          const canBuy = nextCost !== null && money >= nextCost && (tower.pathIdx === null || tower.pathIdx === pIdx);
          return (
            <div
              key={pIdx}
              className={`mb-2 p-2 rounded-sm border ${
                isPath ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(220,38,38,0.2)]" : locked ? "border-border opacity-40" : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-bold">{path.name}</div>
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
