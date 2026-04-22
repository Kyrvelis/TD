export type Point = { x: number; y: number };

export type MapDef = {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  pathColor: string;
  waypoints: Point[];
};

export const MAPS: MapDef[] = [
  {
    id: "meadow",
    name: "Verdant Meadow",
    description: "A gentle winding path through open fields. Great for newcomers.",
    bgColor: "#1f3a23",
    pathColor: "#8b6f3a",
    waypoints: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 300 },
      { x: 500, y: 300 },
      { x: 500, y: 150 },
      { x: 800, y: 150 },
    ],
  },
  {
    id: "canyon",
    name: "Crimson Canyon",
    description: "A serpentine route with multiple turns and tight choke points.",
    bgColor: "#3a1f1f",
    pathColor: "#a05a3a",
    waypoints: [
      { x: 0, y: 80 },
      { x: 150, y: 80 },
      { x: 150, y: 250 },
      { x: 350, y: 250 },
      { x: 350, y: 80 },
      { x: 550, y: 80 },
      { x: 550, y: 380 },
      { x: 800, y: 380 },
    ],
  },
  {
    id: "frost",
    name: "Frostbite Pass",
    description: "A long, sweeping path with broad open zones for heavy artillery.",
    bgColor: "#1f2e3a",
    pathColor: "#7a8aa0",
    waypoints: [
      { x: 0, y: 250 },
      { x: 120, y: 250 },
      { x: 120, y: 100 },
      { x: 320, y: 100 },
      { x: 320, y: 400 },
      { x: 520, y: 400 },
      { x: 520, y: 200 },
      { x: 700, y: 200 },
      { x: 700, y: 350 },
      { x: 800, y: 350 },
    ],
  },
];

export type TowerKind = "archer" | "cannon" | "frost" | "sniper" | "tesla";

export type TowerDef = {
  kind: TowerKind;
  name: string;
  description: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  color: string;
  accent: string;
  projectileColor: string;
  projectileSpeed: number;
  splashRadius?: number;
  slowFactor?: number; // 0-1
  slowDuration?: number; // seconds
  chainCount?: number; // tesla
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: "archer",
    name: "Archer",
    description: "Fast, single-target arrows. Cheap and reliable.",
    cost: 100,
    range: 130,
    damage: 14,
    fireRate: 2.0,
    color: "#3aa55a",
    accent: "#7be59a",
    projectileColor: "#e0f0c0",
    projectileSpeed: 520,
  },
  cannon: {
    kind: "cannon",
    name: "Cannon",
    description: "Slow shells that explode for splash damage.",
    cost: 220,
    range: 140,
    damage: 35,
    fireRate: 0.7,
    color: "#a0653a",
    accent: "#e0a070",
    projectileColor: "#2a2a2a",
    projectileSpeed: 320,
    splashRadius: 55,
  },
  frost: {
    kind: "frost",
    name: "Frost",
    description: "Slows enemies on hit. Low damage, strong utility.",
    cost: 180,
    range: 120,
    damage: 6,
    fireRate: 1.4,
    color: "#3a8aa5",
    accent: "#9adfff",
    projectileColor: "#bff0ff",
    projectileSpeed: 480,
    slowFactor: 0.45,
    slowDuration: 1.6,
  },
  sniper: {
    kind: "sniper",
    name: "Sniper",
    description: "Massive range and damage but slow to fire.",
    cost: 320,
    range: 280,
    damage: 90,
    fireRate: 0.45,
    color: "#7a3aa5",
    accent: "#c89af0",
    projectileColor: "#ffeb70",
    projectileSpeed: 900,
  },
  tesla: {
    kind: "tesla",
    name: "Tesla",
    description: "Chains lightning between nearby enemies.",
    cost: 280,
    range: 110,
    damage: 22,
    fireRate: 1.1,
    color: "#a59a3a",
    accent: "#fff37a",
    projectileColor: "#fff37a",
    projectileSpeed: 0,
    chainCount: 3,
  },
};

export type EnemyKind = "grunt" | "swift" | "tank" | "swarm" | "miniboss" | "boss";

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  baseHp: number;
  speed: number;
  reward: number;
  damage: number; // lives lost
  radius: number;
  color: string;
  ringColor: string;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt: { kind: "grunt", name: "Grunt", baseHp: 40, speed: 55, reward: 8, damage: 1, radius: 11, color: "#c64a3a", ringColor: "#5a1a1a" },
  swift: { kind: "swift", name: "Swift", baseHp: 25, speed: 105, reward: 10, damage: 1, radius: 9, color: "#e0c050", ringColor: "#5a4a10" },
  tank:  { kind: "tank",  name: "Tank",  baseHp: 160, speed: 32, reward: 18, damage: 2, radius: 15, color: "#7a7a8a", ringColor: "#2a2a3a" },
  swarm: { kind: "swarm", name: "Swarm", baseHp: 18, speed: 80, reward: 4, damage: 1, radius: 7, color: "#b85ac0", ringColor: "#3a103a" },
  miniboss: { kind: "miniboss", name: "Mini-Boss", baseHp: 900, speed: 38, reward: 120, damage: 5, radius: 20, color: "#d04040", ringColor: "#3a0a0a" },
  boss: { kind: "boss", name: "Boss", baseHp: 3500, speed: 30, reward: 400, damage: 12, radius: 28, color: "#ff3030", ringColor: "#1a0000" },
};

// ===== Wave generation =====
export type WaveSpawn = { kind: EnemyKind; count: number; interval: number; delay: number };

export function generateWave(level: number): { spawns: WaveSpawn[]; hpMul: number; isMiniBoss: boolean; isBoss: boolean } {
  const isBoss = level % 10 === 0;
  const isMiniBoss = !isBoss && level % 5 === 0;
  const hpMul = Math.pow(1.18, level - 1);

  if (isBoss) {
    return {
      spawns: [
        { kind: "swarm", count: 12 + Math.floor(level / 2), interval: 0.35, delay: 0 },
        { kind: "tank", count: 4 + Math.floor(level / 5), interval: 1.2, delay: 6 },
        { kind: "boss", count: 1, interval: 1, delay: 12 },
      ],
      hpMul, isMiniBoss, isBoss,
    };
  }
  if (isMiniBoss) {
    return {
      spawns: [
        { kind: "grunt", count: 8 + level, interval: 0.5, delay: 0 },
        { kind: "swift", count: 6, interval: 0.4, delay: 4 },
        { kind: "miniboss", count: 1, interval: 1, delay: 9 },
      ],
      hpMul, isMiniBoss, isBoss,
    };
  }

  const spawns: WaveSpawn[] = [];
  let delay = 0;
  const gruntCount = 6 + Math.floor(level * 1.5);
  spawns.push({ kind: "grunt", count: gruntCount, interval: Math.max(0.35, 0.9 - level * 0.02), delay });
  delay += gruntCount * 0.7 + 1;

  if (level >= 2) {
    const swiftCount = 3 + Math.floor(level * 0.8);
    spawns.push({ kind: "swift", count: swiftCount, interval: 0.45, delay });
    delay += swiftCount * 0.5 + 1;
  }
  if (level >= 4) {
    spawns.push({ kind: "tank", count: 1 + Math.floor(level / 4), interval: 1.4, delay });
    delay += 3;
  }
  if (level >= 7) {
    spawns.push({ kind: "swarm", count: 8 + level, interval: 0.25, delay });
  }
  return { spawns, hpMul, isMiniBoss, isBoss };
}
