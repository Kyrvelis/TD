export type Point = { x: number; y: number };

export type Difficulty = "Easy" | "Medium" | "Hard";

export type MapDef = {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  bgColor: string;
  pathColor: string;
  pathOutline: string;
  decorations: Decoration[];
  waypoints: Point[];
};

export type Decoration =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; opacity?: number }
  | { kind: "circle"; x: number; y: number; r: number; color: string; opacity?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number; dash?: number[]; opacity?: number };

export const MAPS: MapDef[] = [
  {
    id: "plains",
    name: "Open Plains",
    difficulty: "Easy",
    description: "Wide open grassland with a single winding dirt road. Plenty of space to build.",
    bgColor: "#1a1d1a",
    pathColor: "#3a3a38",
    pathOutline: "#0d0d0c",
    waypoints: [
      { x: 0, y: 120 },
      { x: 240, y: 120 },
      { x: 240, y: 320 },
      { x: 560, y: 320 },
      { x: 560, y: 180 },
      { x: 800, y: 180 },
    ],
    decorations: [
      { kind: "circle", x: 80, y: 380, r: 30, color: "#252825", opacity: 0.6 },
      { kind: "circle", x: 680, y: 80, r: 22, color: "#252825", opacity: 0.5 },
      { kind: "circle", x: 420, y: 60, r: 18, color: "#252825", opacity: 0.5 },
      { kind: "circle", x: 130, y: 240, r: 16, color: "#202220", opacity: 0.5 },
      { kind: "circle", x: 700, y: 410, r: 26, color: "#252825", opacity: 0.5 },
    ],
  },
  {
    id: "highway",
    name: "Interstate",
    difficulty: "Medium",
    description: "A multi-lane highway with painted lane lines and overpass turns. Medium chokes.",
    bgColor: "#141414",
    pathColor: "#2a2a2a",
    pathOutline: "#050505",
    waypoints: [
      { x: 0, y: 90 },
      { x: 180, y: 90 },
      { x: 180, y: 250 },
      { x: 380, y: 250 },
      { x: 380, y: 90 },
      { x: 600, y: 90 },
      { x: 600, y: 400 },
      { x: 800, y: 400 },
    ],
    decorations: [
      // overpass shadows / road markings already drawn via path; add concrete blocks
      { kind: "rect", x: 40, y: 200, w: 50, h: 30, color: "#1c1c1c" },
      { kind: "rect", x: 460, y: 180, w: 40, h: 50, color: "#1c1c1c" },
      { kind: "rect", x: 700, y: 200, w: 50, h: 30, color: "#1c1c1c" },
      { kind: "line", x1: 0, y1: 460, x2: 800, y2: 460, color: "#222", width: 2 },
      { kind: "line", x1: 0, y1: 30, x2: 800, y2: 30, color: "#222", width: 2 },
    ],
  },
  {
    id: "city",
    name: "Downtown",
    difficulty: "Hard",
    description: "Tight urban grid with narrow streets, multiple sharp turns, and limited build sites.",
    bgColor: "#0e0e10",
    pathColor: "#1f1f22",
    pathOutline: "#000",
    waypoints: [
      { x: 0, y: 250 },
      { x: 100, y: 250 },
      { x: 100, y: 80 },
      { x: 260, y: 80 },
      { x: 260, y: 220 },
      { x: 380, y: 220 },
      { x: 380, y: 380 },
      { x: 200, y: 380 },
      { x: 200, y: 440 },
      { x: 540, y: 440 },
      { x: 540, y: 280 },
      { x: 660, y: 280 },
      { x: 660, y: 120 },
      { x: 800, y: 120 },
    ],
    decorations: [
      // building blocks
      { kind: "rect", x: 20, y: 20, w: 60, h: 50, color: "#1d1d22" },
      { kind: "rect", x: 20, y: 300, w: 60, h: 130, color: "#1d1d22" },
      { kind: "rect", x: 130, y: 130, w: 110, h: 70, color: "#1d1d22" },
      { kind: "rect", x: 290, y: 20, w: 100, h: 40, color: "#1d1d22" },
      { kind: "rect", x: 410, y: 60, w: 130, h: 130, color: "#1d1d22" },
      { kind: "rect", x: 580, y: 20, w: 70, h: 80, color: "#1d1d22" },
      { kind: "rect", x: 700, y: 20, w: 80, h: 80, color: "#1d1d22" },
      { kind: "rect", x: 410, y: 240, w: 110, h: 170, color: "#1d1d22" },
      { kind: "rect", x: 580, y: 320, w: 60, h: 100, color: "#1d1d22" },
      { kind: "rect", x: 690, y: 200, w: 90, h: 60, color: "#1d1d22" },
      { kind: "rect", x: 230, y: 250, w: 130, h: 100, color: "#1d1d22" },
      { kind: "rect", x: 100, y: 400, w: 70, h: 40, color: "#1d1d22" },
      // window highlights
      { kind: "rect", x: 35, y: 35, w: 4, h: 4, color: "#dc2626", opacity: 0.5 },
      { kind: "rect", x: 60, y: 35, w: 4, h: 4, color: "#fff", opacity: 0.4 },
      { kind: "rect", x: 730, y: 40, w: 4, h: 4, color: "#dc2626", opacity: 0.5 },
      { kind: "rect", x: 460, y: 100, w: 4, h: 4, color: "#fff", opacity: 0.4 },
      { kind: "rect", x: 460, y: 140, w: 4, h: 4, color: "#dc2626", opacity: 0.5 },
      { kind: "rect", x: 320, y: 30, w: 4, h: 4, color: "#fff", opacity: 0.4 },
      { kind: "rect", x: 440, y: 280, w: 4, h: 4, color: "#dc2626", opacity: 0.5 },
      { kind: "rect", x: 470, y: 320, w: 4, h: 4, color: "#fff", opacity: 0.3 },
    ],
  },
];

// ===== Damage =====
export type DamageType = "physical" | "piercing" | "explosion" | "energy";

// ===== Towers & Upgrade Paths =====
export type TowerKind = "rifleman" | "howitzer" | "frost" | "sniper" | "tesla";

export type TowerStats = {
  damage: number;
  range: number;
  fireRate: number; // shots/sec
  damageType: DamageType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  chainCount?: number;
  hiddenDetect?: boolean;
  burstCount?: number; // bullets per burst
  burstInterval?: number; // delay between burst bullets
  underbarrel?: { interval: number; damage: number; splashRadius: number };
  projectileSpeed: number;
  projectileColor: string;
  // visual
  bodyColor: string;
  accentColor: string;
  barrelColor: string;
  barrelLength: number;
  barrelWidth: number;
};

export type PathTier = {
  name: string;
  description: string;
  cost: number;
  stats: Partial<TowerStats>;
};

export type UpgradePath = {
  name: string;
  tagline: string;
  tiers: [PathTier, PathTier, PathTier];
};

export type TowerDef = {
  kind: TowerKind;
  name: string;
  description: string;
  cost: number;
  base: TowerStats;
  paths: [UpgradePath, UpgradePath, UpgradePath];
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  rifleman: {
    kind: "rifleman",
    name: "Rifleman",
    description: "Standard infantry. Reliable single-target physical damage.",
    cost: 150,
    base: {
      damage: 14, range: 130, fireRate: 1.6, damageType: "physical",
      projectileSpeed: 720, projectileColor: "#fff",
      bodyColor: "#2a2a2a", accentColor: "#f5f5f5", barrelColor: "#1a1a1a",
      barrelLength: 16, barrelWidth: 3,
    },
    paths: [
      {
        name: "Green Beret",
        tagline: "Full-auto specialist with night optics.",
        tiers: [
          { name: "Improved Sights", cost: 130, description: "+25% range, gains hidden detection.",
            stats: { range: 162, hiddenDetect: true } },
          { name: "Full Auto", cost: 220, description: "Heavy fire rate, lighter rounds.",
            stats: { range: 162, hiddenDetect: true, fireRate: 4.5, damage: 11, accentColor: "#dc2626" } },
          { name: "Green Beret Squad", cost: 380, description: "Squad-fire suppression.",
            stats: { range: 200, hiddenDetect: true, fireRate: 6.5, damage: 16, accentColor: "#ef4444", barrelLength: 18 } },
        ],
      },
      {
        name: "Grenadier",
        tagline: "Burst fire with an underbarrel grenade launcher.",
        tiers: [
          { name: "Burst Fire", cost: 160, description: "Three-round bursts.",
            stats: { burstCount: 3, burstInterval: 0.07, fireRate: 1.0, damage: 13, accentColor: "#dc2626" } },
          { name: "GP-25", cost: 280, description: "Underbarrel grenade every 3.5s for splash.",
            stats: { burstCount: 3, burstInterval: 0.07, fireRate: 1.0, damage: 14,
              underbarrel: { interval: 3.5, damage: 60, splashRadius: 55 }, accentColor: "#dc2626" } },
          { name: "HE Specialist", cost: 460, description: "Faster grenade, larger blast.",
            stats: { burstCount: 4, burstInterval: 0.06, fireRate: 1.0, damage: 18,
              underbarrel: { interval: 1.8, damage: 110, splashRadius: 75 }, accentColor: "#ef4444",
              barrelLength: 20, barrelWidth: 4 } },
        ],
      },
      {
        name: "Designated Marksman",
        tagline: "Semi-auto piercing rounds with optics.",
        tiers: [
          { name: "AP Rounds", cost: 180, description: "Armor-piercing ammunition.",
            stats: { damage: 26, damageType: "piercing", projectileColor: "#dc2626" } },
          { name: "Marksman", cost: 320, description: "Heavier rounds, hidden detection, +40% range.",
            stats: { damage: 50, damageType: "piercing", range: 182, hiddenDetect: true,
              projectileColor: "#dc2626", barrelLength: 20 } },
          { name: "Battle Rifle", cost: 520, description: "Long-barrel battle rifle.",
            stats: { damage: 95, damageType: "piercing", range: 220, hiddenDetect: true, fireRate: 1.4,
              projectileColor: "#dc2626", barrelLength: 24, barrelWidth: 4, accentColor: "#ef4444" } },
        ],
      },
    ],
  },

  howitzer: {
    kind: "howitzer",
    name: "Howitzer",
    description: "Heavy artillery. Long range, devastating splash, slow reload.",
    cost: 750,
    base: {
      damage: 70, range: 220, fireRate: 0.4, damageType: "explosion", splashRadius: 60,
      projectileSpeed: 380, projectileColor: "#1a1a1a",
      bodyColor: "#3a3a3a", accentColor: "#f5f5f5", barrelColor: "#1a1a1a",
      barrelLength: 24, barrelWidth: 6,
    },
    paths: [
      {
        name: "Heavy Bombardment",
        tagline: "Bigger shells, bigger boom.",
        tiers: [
          { name: "HE Shells", cost: 500, description: "+60% damage.",
            stats: { damage: 112, splashRadius: 65 } },
          { name: "Wide Spread", cost: 800, description: "Massive blast radius.",
            stats: { damage: 140, splashRadius: 100, barrelWidth: 7 } },
          { name: "Heavy Artillery", cost: 1400, description: "Crushing strike, enormous AoE.",
            stats: { damage: 280, splashRadius: 140, range: 260, barrelWidth: 9, barrelLength: 28,
              accentColor: "#ef4444" } },
        ],
      },
      {
        name: "Cluster Munitions",
        tagline: "Submunitions explode in a wider area.",
        tiers: [
          { name: "Submunitions", cost: 600, description: "Splits into 3 sub-blasts.",
            stats: { damage: 60, splashRadius: 55, fireRate: 0.5, accentColor: "#dc2626" } },
          { name: "Cluster", cost: 900, description: "Five-warhead spread.",
            stats: { damage: 80, splashRadius: 65, fireRate: 0.55, accentColor: "#dc2626", barrelWidth: 7 } },
          { name: "MOAB", cost: 1500, description: "Mother of all blasts.",
            stats: { damage: 220, splashRadius: 160, fireRate: 0.35,
              accentColor: "#ef4444", barrelLength: 28, barrelWidth: 9 } },
        ],
      },
      {
        name: "Rapid Battery",
        tagline: "Faster reload at the cost of raw power.",
        tiers: [
          { name: "Auto Loader", cost: 400, description: "+75% fire rate.",
            stats: { fireRate: 0.7, damage: 60 } },
          { name: "Twin Cannon", cost: 700, description: "Double-barreled.",
            stats: { fireRate: 1.2, damage: 55, splashRadius: 50, barrelWidth: 8 } },
          { name: "Quad Battery", cost: 1100, description: "Four-barrel rapid bombardment.",
            stats: { fireRate: 2.4, damage: 60, splashRadius: 50, range: 240,
              accentColor: "#ef4444", barrelWidth: 9, barrelLength: 26 } },
        ],
      },
    ],
  },

  frost: {
    kind: "frost",
    name: "Cryo Tower",
    description: "Slows enemies with cryogenic rounds. Low damage, strong control.",
    cost: 220,
    base: {
      damage: 8, range: 130, fireRate: 1.4, damageType: "physical",
      slowFactor: 0.5, slowDuration: 1.6,
      projectileSpeed: 520, projectileColor: "#bff0ff",
      bodyColor: "#2a3438", accentColor: "#9adfff", barrelColor: "#1a2024",
      barrelLength: 16, barrelWidth: 4,
    },
    paths: [
      {
        name: "Deep Freeze",
        tagline: "Longer, harsher slows.",
        tiers: [
          { name: "Cryo Coolant", cost: 160, description: "Stronger slow effect.",
            stats: { slowFactor: 0.35, slowDuration: 2.0, damage: 10 } },
          { name: "Cryo Beam", cost: 280, description: "Sustained beam, very high fire rate.",
            stats: { slowFactor: 0.30, slowDuration: 2.2, damage: 14, fireRate: 3.0, accentColor: "#dc2626" } },
          { name: "Absolute Zero", cost: 460, description: "Briefly freezes targets in place.",
            stats: { slowFactor: 0.05, slowDuration: 0.8, damage: 18, fireRate: 2.5,
              accentColor: "#ef4444", barrelLength: 20 } },
        ],
      },
      {
        name: "Frost Burst",
        tagline: "Splash slow that hits the whole column.",
        tiers: [
          { name: "AoE Frost", cost: 220, description: "Slow splashes around the target.",
            stats: { splashRadius: 50, damage: 10 } },
          { name: "Wide Burst", cost: 360, description: "Bigger blast, more damage.",
            stats: { splashRadius: 80, damage: 16, slowFactor: 0.4 } },
          { name: "Blizzard Burst", cost: 560, description: "Huge area, severe slow.",
            stats: { splashRadius: 130, damage: 24, slowFactor: 0.3, slowDuration: 2.4,
              accentColor: "#ef4444", barrelWidth: 6 } },
        ],
      },
      {
        name: "Cryo Lance",
        tagline: "Long-range piercing cold rounds.",
        tiers: [
          { name: "Long Barrel", cost: 200, description: "+50% range.",
            stats: { range: 195, damage: 14, barrelLength: 22 } },
          { name: "Heavy Slug", cost: 340, description: "Frozen slug pierces armor.",
            stats: { range: 220, damage: 36, damageType: "piercing", barrelLength: 24 } },
          { name: "Glacier Round", cost: 540, description: "Solid ice penetrator.",
            stats: { range: 260, damage: 90, damageType: "piercing", fireRate: 1.0,
              accentColor: "#ef4444", barrelLength: 26, barrelWidth: 5 } },
        ],
      },
    ],
  },

  sniper: {
    kind: "sniper",
    name: "Sniper",
    description: "Long-range single-target precision. High damage, slow rate.",
    cost: 380,
    base: {
      damage: 95, range: 300, fireRate: 0.45, damageType: "physical",
      projectileSpeed: 1100, projectileColor: "#ffeb70",
      bodyColor: "#2a2a2a", accentColor: "#f5f5f5", barrelColor: "#0e0e0e",
      barrelLength: 24, barrelWidth: 3,
    },
    paths: [
      {
        name: "Anti-Material",
        tagline: "Massive piercing rounds.",
        tiers: [
          { name: ".50 BMG", cost: 350, description: "Armor-piercing rounds.",
            stats: { damage: 180, damageType: "piercing", projectileColor: "#dc2626" } },
          { name: "Anti-Material Rifle", cost: 600, description: "Heavier caliber.",
            stats: { damage: 320, damageType: "piercing", projectileColor: "#dc2626", barrelLength: 28, barrelWidth: 4 } },
          { name: "Railgun", cost: 1100, description: "Magnetic accelerator. Devastating.",
            stats: { damage: 700, damageType: "piercing", range: 400, projectileColor: "#ef4444",
              projectileSpeed: 1800, barrelLength: 32, barrelWidth: 5, accentColor: "#dc2626" } },
        ],
      },
      {
        name: "Spotter Team",
        tagline: "Optics, overwatch, and hidden detection.",
        tiers: [
          { name: "Optics", cost: 220, description: "+30% range, hidden detection.",
            stats: { range: 390, hiddenDetect: true } },
          { name: "Overwatch", cost: 380, description: "Better optics, faster sighting.",
            stats: { range: 420, hiddenDetect: true, fireRate: 0.7, damage: 130 } },
          { name: "Marksman Team", cost: 700, description: "Spotter doubles fire rate.",
            stats: { range: 460, hiddenDetect: true, fireRate: 1.4, damage: 160,
              accentColor: "#ef4444", barrelLength: 28 } },
        ],
      },
      {
        name: "Suppressive Fire",
        tagline: "Trades damage per shot for sustained DPS.",
        tiers: [
          { name: "Lighter Round", cost: 280, description: "Faster, lighter shots.",
            stats: { fireRate: 1.1, damage: 65 } },
          { name: "Auto-Loader", cost: 460, description: "Self-loading mechanism.",
            stats: { fireRate: 2.0, damage: 85, accentColor: "#dc2626" } },
          { name: "Marksman Squad", cost: 760, description: "Three rifles, one trigger.",
            stats: { fireRate: 3.2, damage: 130, accentColor: "#ef4444",
              barrelLength: 26, barrelWidth: 4 } },
        ],
      },
    ],
  },

  tesla: {
    kind: "tesla",
    name: "Tesla Coil",
    description: "Energy weapon that arcs lightning between enemies.",
    cost: 320,
    base: {
      damage: 24, range: 120, fireRate: 1.1, damageType: "energy",
      chainCount: 3,
      projectileSpeed: 0, projectileColor: "#fff37a",
      bodyColor: "#2a2a32", accentColor: "#fff37a", barrelColor: "#1a1a22",
      barrelLength: 14, barrelWidth: 5,
    },
    paths: [
      {
        name: "High Voltage",
        tagline: "More raw energy damage per arc.",
        tiers: [
          { name: "Overcharge", cost: 280, description: "Stronger arcs.",
            stats: { damage: 50, fireRate: 1.2 } },
          { name: "Plasma Coil", cost: 460, description: "Heavy plasma damage.",
            stats: { damage: 100, fireRate: 1.4, accentColor: "#dc2626" } },
          { name: "Lightning God", cost: 800, description: "Devastating arcs.",
            stats: { damage: 240, fireRate: 1.6, chainCount: 5, accentColor: "#ef4444" } },
        ],
      },
      {
        name: "Wide Net",
        tagline: "Hits more enemies with each pulse.",
        tiers: [
          { name: "Extra Conductor", cost: 240, description: "+2 chain.",
            stats: { chainCount: 5 } },
          { name: "Mass Conductor", cost: 400, description: "+5 chain, longer range.",
            stats: { chainCount: 8, range: 150, damage: 30, accentColor: "#dc2626" } },
          { name: "EMP Pulse", cost: 700, description: "Pulses every target in range.",
            stats: { chainCount: 14, range: 180, damage: 45,
              slowFactor: 0.5, slowDuration: 0.5, accentColor: "#ef4444" } },
        ],
      },
      {
        name: "Plasma Cannon",
        tagline: "Focused beam, single-target.",
        tiers: [
          { name: "Focused Beam", cost: 320, description: "Single target focus.",
            stats: { damage: 90, chainCount: 0, fireRate: 2.0, range: 180, accentColor: "#dc2626" } },
          { name: "Particle Beam", cost: 540, description: "Higher output.",
            stats: { damage: 180, chainCount: 0, fireRate: 3.0, range: 200, accentColor: "#dc2626",
              barrelLength: 18, barrelWidth: 6 } },
          { name: "Antimatter Lance", cost: 900, description: "Pierces all armor.",
            stats: { damage: 450, chainCount: 0, fireRate: 2.5, damageType: "piercing", range: 220,
              accentColor: "#ef4444", barrelLength: 20, barrelWidth: 7 } },
        ],
      },
    ],
  },
};

export function effectiveStats(def: TowerDef, pathIdx: number | null, tier: number): TowerStats {
  if (pathIdx === null || tier === 0) return def.base;
  const path = def.paths[pathIdx];
  let stats: TowerStats = { ...def.base };
  for (let i = 0; i < tier && i < path.tiers.length; i++) {
    stats = { ...stats, ...path.tiers[i].stats };
  }
  return stats;
}

export function upgradeCostFor(def: TowerDef, pathIdx: number, tier: number): number | null {
  const path = def.paths[pathIdx];
  if (tier >= path.tiers.length) return null;
  return path.tiers[tier].cost;
}

export function totalSpent(def: TowerDef, pathIdx: number | null, tier: number): number {
  let total = def.cost;
  if (pathIdx !== null) {
    for (let i = 0; i < tier; i++) total += def.paths[pathIdx].tiers[i].cost;
  }
  return total;
}

// ===== Enemies =====
export type EnemyKind = "grunt" | "swift" | "tank" | "swarm" | "stealth" | "armored" | "summoner" | "miniboss" | "boss";

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  baseHp: number;
  speed: number;
  reward: number;
  damage: number;
  radius: number;
  color: string;
  outline: string;
  hidden?: boolean;
  armored?: boolean; // takes 0.25x physical/energy
  resistances?: Partial<Record<DamageType, number>>;
  summon?: { kind: EnemyKind; interval: number; perSpawn: number };
  shape?: "circle" | "diamond" | "square" | "hex" | "skull";
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt:    { kind: "grunt",    name: "Grunt",    baseHp: 45,  speed: 55,  reward: 8,  damage: 1, radius: 11, color: "#cfcfcf", outline: "#1a1a1a", shape: "circle" },
  swift:    { kind: "swift",    name: "Swift",    baseHp: 28,  speed: 110, reward: 10, damage: 1, radius: 9,  color: "#f5f5f5", outline: "#1a1a1a", shape: "diamond" },
  tank:     { kind: "tank",     name: "Tank",     baseHp: 180, speed: 32,  reward: 18, damage: 2, radius: 15, color: "#7a7a7a", outline: "#0a0a0a", shape: "square" },
  swarm:    { kind: "swarm",    name: "Swarm",    baseHp: 18,  speed: 80,  reward: 4,  damage: 1, radius: 7,  color: "#a0a0a0", outline: "#1a1a1a", shape: "circle" },
  stealth:  { kind: "stealth",  name: "Stealth",  baseHp: 60,  speed: 95,  reward: 16, damage: 1, radius: 10, color: "#444",    outline: "#000",    hidden: true, shape: "diamond" },
  armored:  { kind: "armored",  name: "Armored",  baseHp: 220, speed: 42,  reward: 22, damage: 2, radius: 14, color: "#5a5a5a", outline: "#000",    armored: true,
              resistances: { physical: 0.20, energy: 0.30, piercing: 1.0, explosion: 1.0 }, shape: "hex" },
  summoner: { kind: "summoner", name: "Summoner", baseHp: 280, speed: 36,  reward: 35, damage: 2, radius: 14, color: "#dc2626", outline: "#3a0a0a",
              summon: { kind: "swarm", interval: 3.0, perSpawn: 2 }, shape: "hex" },
  miniboss: { kind: "miniboss", name: "Mini-Boss",baseHp: 1100,speed: 38,  reward: 140,damage: 5, radius: 22, color: "#ef4444", outline: "#1a0000", shape: "skull" },
  boss:     { kind: "boss",     name: "Boss",     baseHp: 4500,speed: 30,  reward: 500,damage: 12,radius: 30, color: "#ff2020", outline: "#1a0000",
              summon: { kind: "armored", interval: 6.0, perSpawn: 1 }, shape: "skull" },
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
        { kind: "swarm", count: 14 + Math.floor(level / 2), interval: 0.32, delay: 0 },
        { kind: "armored", count: 4 + Math.floor(level / 5), interval: 1.2, delay: 6 },
        { kind: "summoner", count: 2, interval: 3, delay: 10 },
        { kind: "boss", count: 1, interval: 1, delay: 14 },
      ],
      hpMul, isMiniBoss, isBoss,
    };
  }
  if (isMiniBoss) {
    return {
      spawns: [
        { kind: "grunt", count: 8 + level, interval: 0.5, delay: 0 },
        { kind: "swift", count: 6, interval: 0.4, delay: 4 },
        { kind: "stealth", count: level >= 10 ? 4 : 0, interval: 0.7, delay: 7 },
        { kind: "miniboss", count: 1, interval: 1, delay: 10 },
      ],
      hpMul, isMiniBoss, isBoss,
    };
  }

  const spawns: WaveSpawn[] = [];
  let delay = 0;
  const gruntCount = 6 + Math.floor(level * 1.5);
  spawns.push({ kind: "grunt", count: gruntCount, interval: Math.max(0.32, 0.9 - level * 0.02), delay });
  delay += gruntCount * 0.6 + 1;

  if (level >= 2) {
    const swiftCount = 3 + Math.floor(level * 0.8);
    spawns.push({ kind: "swift", count: swiftCount, interval: 0.4, delay });
    delay += swiftCount * 0.45 + 1;
  }
  if (level >= 4) {
    spawns.push({ kind: "tank", count: 1 + Math.floor(level / 4), interval: 1.4, delay });
    delay += 3;
  }
  if (level >= 6) {
    spawns.push({ kind: "stealth", count: 2 + Math.floor((level - 6) / 2), interval: 0.6, delay });
    delay += 2;
  }
  if (level >= 8) {
    spawns.push({ kind: "armored", count: 1 + Math.floor((level - 8) / 3), interval: 1.2, delay });
    delay += 2;
  }
  if (level >= 12) {
    spawns.push({ kind: "summoner", count: 1 + Math.floor((level - 12) / 5), interval: 2.5, delay });
    delay += 2;
  }
  if (level >= 7) {
    spawns.push({ kind: "swarm", count: 8 + level, interval: 0.25, delay });
  }
  return { spawns, hpMul, isMiniBoss, isBoss };
}

export const DAMAGE_LABELS: Record<DamageType, { label: string; color: string }> = {
  physical: { label: "Physical", color: "#f5f5f5" },
  piercing: { label: "Piercing", color: "#dc2626" },
  explosion: { label: "Explosion", color: "#ef4444" },
  energy: { label: "Energy", color: "#fff37a" },
};
