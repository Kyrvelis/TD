export type Point = { x: number; y: number };

export type Difficulty = "Easy" | "Medium" | "Hard" | "Brutal";

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
  centerStripe?: { color: string; dash: [number, number]; width: number };
};

export type Decoration =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; opacity?: number; stroke?: string }
  | { kind: "circle"; x: number; y: number; r: number; color: string; opacity?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number; dash?: number[]; opacity?: number }
  | { kind: "text"; x: number; y: number; text: string; color: string; size: number; opacity?: number };

export const MAPS: MapDef[] = [
  {
    id: "plains",
    name: "Open Plains",
    difficulty: "Easy",
    description: "Wide grassland with a single winding dirt road. Plenty of space.",
    bgColor: "#1a1d1a",
    pathColor: "#3a3a38",
    pathOutline: "#0d0d0c",
    waypoints: [
      { x: 0, y: 120 }, { x: 240, y: 120 }, { x: 240, y: 320 },
      { x: 560, y: 320 }, { x: 560, y: 180 }, { x: 800, y: 180 },
    ],
    decorations: [
      { kind: "circle", x: 80, y: 380, r: 30, color: "#252825", opacity: 0.6 },
      { kind: "circle", x: 680, y: 80, r: 22, color: "#252825", opacity: 0.5 },
      { kind: "circle", x: 420, y: 60, r: 18, color: "#252825", opacity: 0.5 },
      { kind: "circle", x: 130, y: 240, r: 16, color: "#202220", opacity: 0.5 },
      { kind: "circle", x: 700, y: 410, r: 26, color: "#252825", opacity: 0.5 },
      { kind: "circle", x: 380, y: 420, r: 14, color: "#202220", opacity: 0.4 },
    ],
  },
  {
    id: "highway",
    name: "Interstate",
    difficulty: "Medium",
    description: "Multi-lane highway with painted lane markers and overpass turns.",
    bgColor: "#141414",
    pathColor: "#2a2a2a",
    pathOutline: "#050505",
    centerStripe: { color: "rgba(255,220,80,0.7)", dash: [18, 14], width: 3 },
    waypoints: [
      { x: 0, y: 90 }, { x: 180, y: 90 }, { x: 180, y: 250 },
      { x: 380, y: 250 }, { x: 380, y: 90 }, { x: 600, y: 90 },
      { x: 600, y: 400 }, { x: 800, y: 400 },
    ],
    decorations: [
      { kind: "rect", x: 40, y: 200, w: 50, h: 30, color: "#1c1c1c" },
      { kind: "rect", x: 460, y: 180, w: 40, h: 50, color: "#1c1c1c" },
      { kind: "rect", x: 700, y: 200, w: 50, h: 30, color: "#1c1c1c" },
      { kind: "line", x1: 0, y1: 460, x2: 800, y2: 460, color: "#222", width: 2 },
      { kind: "line", x1: 0, y1: 30, x2: 800, y2: 30, color: "#222", width: 2 },
      { kind: "rect", x: 230, y: 320, w: 80, h: 8, color: "#dc2626", opacity: 0.6 },
      { kind: "text", x: 240, y: 330, text: "EXIT", color: "#fff", size: 8, opacity: 0.8 },
    ],
  },
  {
    id: "city",
    name: "Downtown",
    difficulty: "Hard",
    description: "Urban grid with narrow streets and limited build sites.",
    bgColor: "#0e0e10",
    pathColor: "#1f1f22",
    pathOutline: "#000",
    waypoints: [
      { x: 0, y: 250 }, { x: 100, y: 250 }, { x: 100, y: 80 }, { x: 260, y: 80 },
      { x: 260, y: 220 }, { x: 380, y: 220 }, { x: 380, y: 380 }, { x: 200, y: 380 },
      { x: 200, y: 440 }, { x: 540, y: 440 }, { x: 540, y: 280 }, { x: 660, y: 280 },
      { x: 660, y: 120 }, { x: 800, y: 120 },
    ],
    decorations: [
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
  // ===== NEW MAPS =====
  {
    id: "subway",
    name: "Metro Line",
    difficulty: "Hard",
    description: "Underground transit tunnels with sharp platform turns and emergency lighting.",
    bgColor: "#0a0a0c",
    pathColor: "#222226",
    pathOutline: "#000",
    waypoints: [
      { x: 0, y: 60 }, { x: 140, y: 60 }, { x: 140, y: 200 }, { x: 60, y: 200 },
      { x: 60, y: 360 }, { x: 320, y: 360 }, { x: 320, y: 240 }, { x: 480, y: 240 },
      { x: 480, y: 440 }, { x: 720, y: 440 }, { x: 720, y: 140 }, { x: 800, y: 140 },
    ],
    decorations: [
      // platforms
      { kind: "rect", x: 0, y: 30, w: 800, h: 6, color: "#3a3a3e" },
      { kind: "rect", x: 0, y: 470, w: 800, h: 30, color: "#16161a" },
      // tunnel walls
      { kind: "rect", x: 180, y: 80, w: 100, h: 100, color: "#16161a" },
      { kind: "rect", x: 180, y: 250, w: 320, h: 80, color: "#16161a" },
      { kind: "rect", x: 580, y: 80, w: 80, h: 320, color: "#16161a" },
      { kind: "rect", x: 380, y: 80, w: 60, h: 100, color: "#16161a" },
      // emergency lights
      { kind: "rect", x: 100, y: 30, w: 8, h: 4, color: "#dc2626", opacity: 0.9 },
      { kind: "rect", x: 260, y: 30, w: 8, h: 4, color: "#dc2626", opacity: 0.9 },
      { kind: "rect", x: 420, y: 30, w: 8, h: 4, color: "#fff37a", opacity: 0.7 },
      { kind: "rect", x: 580, y: 30, w: 8, h: 4, color: "#dc2626", opacity: 0.9 },
      { kind: "rect", x: 740, y: 30, w: 8, h: 4, color: "#fff37a", opacity: 0.7 },
      // signage
      { kind: "rect", x: 25, y: 12, w: 50, h: 14, color: "#dc2626" },
      { kind: "text", x: 33, y: 23, text: "METRO", color: "#fff", size: 9 },
      { kind: "text", x: 350, y: 25, text: "LINE 7", color: "#666", size: 10 },
      // rail segments along path
      { kind: "rect", x: 380, y: 120, w: 10, h: 30, color: "#dc2626", opacity: 0.4 },
    ],
  },
  {
    id: "port",
    name: "Industrial Port",
    difficulty: "Hard",
    description: "Shipping yard with stacked containers, cranes, and dockside hazards.",
    bgColor: "#101216",
    pathColor: "#27282c",
    pathOutline: "#000",
    waypoints: [
      { x: 0, y: 40 }, { x: 90, y: 40 }, { x: 90, y: 160 }, { x: 230, y: 160 },
      { x: 230, y: 60 }, { x: 360, y: 60 }, { x: 360, y: 200 }, { x: 460, y: 200 },
      { x: 460, y: 360 }, { x: 220, y: 360 }, { x: 220, y: 460 }, { x: 580, y: 460 },
      { x: 580, y: 300 }, { x: 700, y: 300 }, { x: 700, y: 100 }, { x: 800, y: 100 },
    ],
    decorations: [
      // water edge bottom
      { kind: "rect", x: 0, y: 480, w: 800, h: 20, color: "#0a1218" },
      // shipping containers
      { kind: "rect", x: 130, y: 220, w: 90, h: 24, color: "#dc2626", stroke: "#000" },
      { kind: "rect", x: 130, y: 244, w: 90, h: 24, color: "#3a3a3a", stroke: "#000" },
      { kind: "rect", x: 130, y: 268, w: 90, h: 24, color: "#dc2626", stroke: "#000" },
      { kind: "rect", x: 270, y: 280, w: 80, h: 22, color: "#3a3a3a", stroke: "#000" },
      { kind: "rect", x: 270, y: 302, w: 80, h: 22, color: "#dc2626", stroke: "#000" },
      { kind: "rect", x: 510, y: 220, w: 60, h: 20, color: "#3a3a3a", stroke: "#000" },
      { kind: "rect", x: 510, y: 240, w: 60, h: 20, color: "#dc2626", stroke: "#000" },
      { kind: "rect", x: 620, y: 380, w: 70, h: 22, color: "#3a3a3a", stroke: "#000" },
      { kind: "rect", x: 620, y: 402, w: 70, h: 22, color: "#dc2626", stroke: "#000" },
      // crane
      { kind: "line", x1: 30, y1: 320, x2: 30, y2: 460, color: "#444", width: 5 },
      { kind: "line", x1: 30, y1: 320, x2: 200, y2: 320, color: "#444", width: 4 },
      { kind: "line", x1: 110, y1: 320, x2: 110, y2: 360, color: "#dc2626", width: 2 },
      { kind: "line", x1: 760, y1: 220, x2: 760, y2: 480, color: "#444", width: 5 },
      { kind: "line", x1: 760, y1: 220, x2: 600, y2: 220, color: "#444", width: 4 },
      // dock markings
      { kind: "text", x: 8, y: 16, text: "DOCK 04", color: "#666", size: 10 },
      { kind: "rect", x: 730, y: 470, w: 30, h: 4, color: "#fff37a", opacity: 0.6 },
    ],
  },
  {
    id: "battlefield",
    name: "No Man's Land",
    difficulty: "Brutal",
    description: "Cratered battlefield with trenches, sandbags, and a serpentine front line.",
    bgColor: "#15130f",
    pathColor: "#3a3128",
    pathOutline: "#0a0805",
    waypoints: [
      { x: 0, y: 250 }, { x: 70, y: 250 }, { x: 70, y: 90 }, { x: 200, y: 90 },
      { x: 200, y: 200 }, { x: 320, y: 200 }, { x: 320, y: 60 }, { x: 440, y: 60 },
      { x: 440, y: 320 }, { x: 540, y: 320 }, { x: 540, y: 180 }, { x: 660, y: 180 },
      { x: 660, y: 420 }, { x: 320, y: 420 }, { x: 320, y: 460 }, { x: 720, y: 460 },
      { x: 720, y: 280 }, { x: 800, y: 280 },
    ],
    decorations: [
      // craters
      { kind: "circle", x: 150, y: 350, r: 28, color: "#1f1d18" },
      { kind: "circle", x: 150, y: 350, r: 18, color: "#0a0805" },
      { kind: "circle", x: 580, y: 90, r: 22, color: "#1f1d18" },
      { kind: "circle", x: 580, y: 90, r: 14, color: "#0a0805" },
      { kind: "circle", x: 380, y: 350, r: 18, color: "#1f1d18" },
      { kind: "circle", x: 750, y: 380, r: 15, color: "#1f1d18" },
      { kind: "circle", x: 270, y: 400, r: 12, color: "#1f1d18" },
      // sandbags as small rects
      { kind: "rect", x: 100, y: 30, w: 60, h: 8, color: "#5a4a30" },
      { kind: "rect", x: 110, y: 38, w: 60, h: 8, color: "#5a4a30" },
      { kind: "rect", x: 480, y: 380, w: 60, h: 8, color: "#5a4a30" },
      { kind: "rect", x: 490, y: 388, w: 60, h: 8, color: "#5a4a30" },
      { kind: "rect", x: 250, y: 30, w: 50, h: 8, color: "#5a4a30" },
      // wire / fences
      { kind: "line", x1: 0, y1: 480, x2: 800, y2: 480, color: "#5a3a20", width: 1, dash: [4, 6] },
      // burned tree
      { kind: "circle", x: 700, y: 60, r: 8, color: "#1a1410" },
      { kind: "line", x1: 700, y1: 60, x2: 700, y2: 30, color: "#1a1410", width: 3 },
      { kind: "line", x1: 700, y1: 50, x2: 720, y2: 35, color: "#1a1410", width: 2 },
      { kind: "line", x1: 700, y1: 50, x2: 685, y2: 30, color: "#1a1410", width: 2 },
    ],
  },
];

// ===== Damage =====
export type DamageType = "physical" | "piercing" | "explosion" | "energy" | "fire";

export const DAMAGE_LABELS: Record<DamageType, { label: string; color: string }> = {
  physical: { label: "Physical", color: "#f5f5f5" },
  piercing: { label: "Piercing", color: "#dc2626" },
  explosion: { label: "Explosion", color: "#ef4444" },
  energy: { label: "Energy", color: "#fff37a" },
  fire: { label: "Fire", color: "#ff8a3d" },
};

// ===== Towers & Upgrade Paths =====
export type TowerKind =
  | "rifleman" | "howitzer" | "frost" | "sniper" | "tesla"
  | "bank" | "recon" | "flame" | "mortar" | "railgun"
  | "engineer" | "minelayer" | "drone";

export type Appearance =
  | "beret" | "helmet" | "scope" | "antenna" | "second_barrel"
  | "shield_plate" | "extra_optic" | "muzzle_brake" | "bipod"
  | "satellite_dish" | "heavy_cap" | "spikes" | "energy_core";

export type TowerStats = {
  damage: number;
  range: number;
  fireRate: number;
  damageType: DamageType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  chainCount?: number;
  hiddenDetect?: boolean;
  burstCount?: number;
  burstInterval?: number;
  underbarrel?: { interval: number; damage: number; splashRadius: number };
  income?: { perTick: number; interval: number };
  intelLevel?: number; // 0 none, 1 approx, 2 exact, 3 + reveal aura wider
  buffAura?: { range: number; fireRateMul?: number; damageMul?: number };
  mineDamage?: number;
  mineSplash?: number;
  mineCooldown?: number;
  droneCount?: number;
  droneDamage?: number;
  arcShot?: boolean;
  pierceTargets?: number;
  projectileSpeed: number;
  projectileColor: string;
  bodyColor: string;
  accentColor: string;
  barrelColor: string;
  barrelLength: number;
  barrelWidth: number;
  appearance?: Appearance[];
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
    kind: "rifleman", name: "Rifleman",
    description: "Standard infantry. Reliable physical damage.",
    cost: 150,
    base: {
      damage: 14, range: 130, fireRate: 1.6, damageType: "physical",
      projectileSpeed: 720, projectileColor: "#fff",
      bodyColor: "#2a2a2a", accentColor: "#f5f5f5", barrelColor: "#1a1a1a",
      barrelLength: 16, barrelWidth: 3,
    },
    paths: [
      {
        name: "Green Beret", tagline: "Full-auto specialist with night optics.",
        tiers: [
          { name: "Improved Sights", cost: 130, description: "+25% range, hidden detection.",
            stats: { range: 162, hiddenDetect: true, appearance: ["scope"] } },
          { name: "Full Auto", cost: 220, description: "Heavy fire rate, lighter rounds.",
            stats: { range: 162, hiddenDetect: true, fireRate: 4.5, damage: 11,
              accentColor: "#dc2626", appearance: ["scope", "beret"] } },
          { name: "Green Beret Squad", cost: 380, description: "Squad-fire suppression.",
            stats: { range: 200, hiddenDetect: true, fireRate: 6.5, damage: 16,
              accentColor: "#22c55e", barrelLength: 18, appearance: ["scope", "beret", "second_barrel"] } },
        ],
      },
      {
        name: "Grenadier", tagline: "Burst fire with underbarrel grenade launcher.",
        tiers: [
          { name: "Burst Fire", cost: 160, description: "Three-round bursts.",
            stats: { burstCount: 3, burstInterval: 0.07, fireRate: 1.0, damage: 13,
              accentColor: "#dc2626", appearance: ["helmet"] } },
          { name: "GP-25", cost: 280, description: "Underbarrel grenade every 3.5s for splash.",
            stats: { burstCount: 3, burstInterval: 0.07, fireRate: 1.0, damage: 14,
              underbarrel: { interval: 3.5, damage: 60, splashRadius: 55 },
              accentColor: "#dc2626", appearance: ["helmet"] } },
          { name: "HE Specialist", cost: 460, description: "Faster grenade, larger blast.",
            stats: { burstCount: 4, burstInterval: 0.06, fireRate: 1.0, damage: 18,
              underbarrel: { interval: 1.8, damage: 110, splashRadius: 75 },
              accentColor: "#ef4444", barrelLength: 20, barrelWidth: 4,
              appearance: ["helmet", "muzzle_brake", "shield_plate"] } },
        ],
      },
      {
        name: "Designated Marksman", tagline: "Semi-auto piercing rounds.",
        tiers: [
          { name: "AP Rounds", cost: 180, description: "Armor-piercing ammunition.",
            stats: { damage: 26, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope"] } },
          { name: "Marksman", cost: 320, description: "Heavier rounds, hidden detection.",
            stats: { damage: 50, damageType: "piercing", range: 182, hiddenDetect: true,
              projectileColor: "#dc2626", barrelLength: 20, appearance: ["scope", "extra_optic"] } },
          { name: "Battle Rifle", cost: 520, description: "Long-barrel battle rifle.",
            stats: { damage: 95, damageType: "piercing", range: 220, hiddenDetect: true, fireRate: 1.4,
              projectileColor: "#dc2626", barrelLength: 24, barrelWidth: 4, accentColor: "#ef4444",
              appearance: ["scope", "extra_optic", "bipod", "muzzle_brake"] } },
        ],
      },
    ],
  },

  howitzer: {
    kind: "howitzer", name: "Howitzer",
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
        name: "Heavy Bombardment", tagline: "Bigger shells, bigger boom.",
        tiers: [
          { name: "HE Shells", cost: 500, description: "+60% damage.",
            stats: { damage: 112, splashRadius: 65, appearance: ["heavy_cap"] } },
          { name: "Wide Spread", cost: 800, description: "Massive blast radius.",
            stats: { damage: 140, splashRadius: 100, barrelWidth: 7, appearance: ["heavy_cap", "muzzle_brake"] } },
          { name: "Heavy Artillery", cost: 1400, description: "Crushing strike, enormous AoE.",
            stats: { damage: 280, splashRadius: 140, range: 260, barrelWidth: 9, barrelLength: 28,
              accentColor: "#ef4444", appearance: ["heavy_cap", "muzzle_brake", "shield_plate"] } },
        ],
      },
      {
        name: "Cluster Munitions", tagline: "Cluster sub-munitions for area saturation.",
        tiers: [
          { name: "Submunitions", cost: 600, description: "Higher fire rate, slightly less per shell.",
            stats: { damage: 60, splashRadius: 55, fireRate: 0.5, accentColor: "#dc2626",
              appearance: ["second_barrel"] } },
          { name: "Cluster", cost: 900, description: "Five-warhead spread.",
            stats: { damage: 80, splashRadius: 65, fireRate: 0.55, accentColor: "#dc2626",
              barrelWidth: 7, appearance: ["second_barrel", "heavy_cap"] } },
          { name: "MOAB", cost: 1500, description: "Mother of all blasts.",
            stats: { damage: 220, splashRadius: 160, fireRate: 0.35, accentColor: "#ef4444",
              barrelLength: 28, barrelWidth: 9, appearance: ["heavy_cap", "muzzle_brake", "shield_plate"] } },
        ],
      },
      {
        name: "Rapid Battery", tagline: "Faster reload at the cost of raw power.",
        tiers: [
          { name: "Auto Loader", cost: 400, description: "+75% fire rate.",
            stats: { fireRate: 0.7, damage: 60, appearance: ["antenna"] } },
          { name: "Twin Cannon", cost: 700, description: "Double-barreled.",
            stats: { fireRate: 1.2, damage: 55, splashRadius: 50, barrelWidth: 8,
              appearance: ["antenna", "second_barrel"] } },
          { name: "Quad Battery", cost: 1100, description: "Four-barrel rapid bombardment.",
            stats: { fireRate: 2.4, damage: 60, splashRadius: 50, range: 240,
              accentColor: "#ef4444", barrelWidth: 9, barrelLength: 26,
              appearance: ["antenna", "second_barrel", "muzzle_brake"] } },
        ],
      },
    ],
  },

  frost: {
    kind: "frost", name: "Cryo Tower",
    description: "Slows enemies with cryogenic rounds.",
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
        name: "Deep Freeze", tagline: "Longer, harsher slows.",
        tiers: [
          { name: "Cryo Coolant", cost: 160, description: "Stronger slow effect.",
            stats: { slowFactor: 0.35, slowDuration: 2.0, damage: 10, appearance: ["energy_core"] } },
          { name: "Cryo Beam", cost: 280, description: "Sustained beam, very high fire rate.",
            stats: { slowFactor: 0.30, slowDuration: 2.2, damage: 14, fireRate: 3.0,
              accentColor: "#dc2626", appearance: ["energy_core", "extra_optic"] } },
          { name: "Absolute Zero", cost: 460, description: "Briefly freezes targets in place.",
            stats: { slowFactor: 0.05, slowDuration: 0.8, damage: 18, fireRate: 2.5,
              accentColor: "#ef4444", barrelLength: 20,
              appearance: ["energy_core", "extra_optic", "spikes"] } },
        ],
      },
      {
        name: "Frost Burst", tagline: "Splash slow that hits the whole column.",
        tiers: [
          { name: "AoE Frost", cost: 220, description: "Slow splashes around the target.",
            stats: { splashRadius: 50, damage: 10, appearance: ["second_barrel"] } },
          { name: "Wide Burst", cost: 360, description: "Bigger blast, more damage.",
            stats: { splashRadius: 80, damage: 16, slowFactor: 0.4,
              appearance: ["second_barrel", "muzzle_brake"] } },
          { name: "Blizzard Burst", cost: 560, description: "Huge area, severe slow.",
            stats: { splashRadius: 130, damage: 24, slowFactor: 0.3, slowDuration: 2.4,
              accentColor: "#ef4444", barrelWidth: 6,
              appearance: ["second_barrel", "muzzle_brake", "heavy_cap"] } },
        ],
      },
      {
        name: "Cryo Lance", tagline: "Long-range piercing cold rounds.",
        tiers: [
          { name: "Long Barrel", cost: 200, description: "+50% range.",
            stats: { range: 195, damage: 14, barrelLength: 22, appearance: ["scope"] } },
          { name: "Heavy Slug", cost: 340, description: "Frozen slug pierces armor.",
            stats: { range: 220, damage: 36, damageType: "piercing", barrelLength: 24,
              appearance: ["scope", "bipod"] } },
          { name: "Glacier Round", cost: 540, description: "Solid ice penetrator.",
            stats: { range: 260, damage: 90, damageType: "piercing", fireRate: 1.0,
              accentColor: "#ef4444", barrelLength: 26, barrelWidth: 5,
              appearance: ["scope", "bipod", "muzzle_brake"] } },
        ],
      },
    ],
  },

  sniper: {
    kind: "sniper", name: "Sniper",
    description: "Long-range single-target precision.",
    cost: 380,
    base: {
      damage: 95, range: 300, fireRate: 0.45, damageType: "physical",
      projectileSpeed: 1100, projectileColor: "#ffeb70",
      bodyColor: "#2a2a2a", accentColor: "#f5f5f5", barrelColor: "#0e0e0e",
      barrelLength: 24, barrelWidth: 3,
    },
    paths: [
      {
        name: "Anti-Material", tagline: "Massive piercing rounds.",
        tiers: [
          { name: ".50 BMG", cost: 350, description: "Armor-piercing rounds.",
            stats: { damage: 180, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope", "bipod"] } },
          { name: "Anti-Material Rifle", cost: 600, description: "Heavier caliber.",
            stats: { damage: 320, damageType: "piercing", projectileColor: "#dc2626",
              barrelLength: 28, barrelWidth: 4,
              appearance: ["scope", "bipod", "muzzle_brake"] } },
          { name: "Railgun", cost: 1100, description: "Magnetic accelerator.",
            stats: { damage: 700, damageType: "piercing", range: 400, projectileColor: "#ef4444",
              projectileSpeed: 1800, barrelLength: 32, barrelWidth: 5, accentColor: "#dc2626",
              appearance: ["scope", "bipod", "muzzle_brake", "energy_core"] } },
        ],
      },
      {
        name: "Spotter Team", tagline: "Optics, overwatch, and hidden detection.",
        tiers: [
          { name: "Optics", cost: 220, description: "+30% range, hidden detection.",
            stats: { range: 390, hiddenDetect: true, appearance: ["scope", "extra_optic"] } },
          { name: "Overwatch", cost: 380, description: "Better optics, faster sighting.",
            stats: { range: 420, hiddenDetect: true, fireRate: 0.7, damage: 130,
              appearance: ["scope", "extra_optic", "antenna"] } },
          { name: "Marksman Team", cost: 700, description: "Spotter doubles fire rate. Beret unlocked.",
            stats: { range: 460, hiddenDetect: true, fireRate: 1.4, damage: 160,
              accentColor: "#ef4444", barrelLength: 28,
              appearance: ["scope", "extra_optic", "antenna", "beret"] } },
        ],
      },
      {
        name: "Suppressive Fire", tagline: "Trades damage per shot for sustained DPS.",
        tiers: [
          { name: "Lighter Round", cost: 280, description: "Faster, lighter shots.",
            stats: { fireRate: 1.1, damage: 65, appearance: ["helmet"] } },
          { name: "Auto-Loader", cost: 460, description: "Self-loading mechanism.",
            stats: { fireRate: 2.0, damage: 85, accentColor: "#dc2626",
              appearance: ["helmet", "second_barrel"] } },
          { name: "Marksman Squad", cost: 760, description: "Three rifles, one trigger.",
            stats: { fireRate: 3.2, damage: 130, accentColor: "#ef4444",
              barrelLength: 26, barrelWidth: 4,
              appearance: ["helmet", "second_barrel", "muzzle_brake"] } },
        ],
      },
    ],
  },

  tesla: {
    kind: "tesla", name: "Tesla Coil",
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
        name: "High Voltage", tagline: "More raw energy damage per arc.",
        tiers: [
          { name: "Overcharge", cost: 280, description: "Stronger arcs.",
            stats: { damage: 50, fireRate: 1.2, appearance: ["energy_core"] } },
          { name: "Plasma Coil", cost: 460, description: "Heavy plasma damage.",
            stats: { damage: 100, fireRate: 1.4, accentColor: "#dc2626",
              appearance: ["energy_core", "spikes"] } },
          { name: "Lightning God", cost: 800, description: "Devastating arcs.",
            stats: { damage: 240, fireRate: 1.6, chainCount: 5, accentColor: "#ef4444",
              appearance: ["energy_core", "spikes", "antenna"] } },
        ],
      },
      {
        name: "Wide Net", tagline: "Hits more enemies with each pulse.",
        tiers: [
          { name: "Extra Conductor", cost: 240, description: "+2 chain.",
            stats: { chainCount: 5, appearance: ["antenna"] } },
          { name: "Mass Conductor", cost: 400, description: "+5 chain, longer range.",
            stats: { chainCount: 8, range: 150, damage: 30, accentColor: "#dc2626",
              appearance: ["antenna", "second_barrel"] } },
          { name: "EMP Pulse", cost: 700, description: "Pulses every target in range.",
            stats: { chainCount: 14, range: 180, damage: 45,
              slowFactor: 0.5, slowDuration: 0.5, accentColor: "#ef4444",
              appearance: ["antenna", "second_barrel", "energy_core"] } },
        ],
      },
      {
        name: "Plasma Cannon", tagline: "Focused beam, single-target.",
        tiers: [
          { name: "Focused Beam", cost: 320, description: "Single target focus.",
            stats: { damage: 90, chainCount: 0, fireRate: 2.0, range: 180,
              accentColor: "#dc2626", appearance: ["energy_core"] } },
          { name: "Particle Beam", cost: 540, description: "Higher output.",
            stats: { damage: 180, chainCount: 0, fireRate: 3.0, range: 200,
              accentColor: "#dc2626", barrelLength: 18, barrelWidth: 6,
              appearance: ["energy_core", "muzzle_brake"] } },
          { name: "Antimatter Lance", cost: 900, description: "Pierces all armor.",
            stats: { damage: 450, chainCount: 0, fireRate: 2.5, damageType: "piercing", range: 220,
              accentColor: "#ef4444", barrelLength: 20, barrelWidth: 7,
              appearance: ["energy_core", "muzzle_brake", "spikes"] } },
        ],
      },
    ],
  },

  // ===== NEW TOWERS =====
  bank: {
    kind: "bank", name: "Supply Depot",
    description: "Generates passive income during waves. Does not attack.",
    cost: 400,
    base: {
      damage: 0, range: 0, fireRate: 0, damageType: "physical",
      income: { perTick: 12, interval: 4 },
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#3a3528", accentColor: "#fff37a", barrelColor: "#5a5028",
      barrelLength: 0, barrelWidth: 0,
    },
    paths: [
      {
        name: "Reserve Bank", tagline: "Steady stream of cash.",
        tiers: [
          { name: "Lockbox", cost: 350, description: "+18 every 4s.",
            stats: { income: { perTick: 18, interval: 4 } } },
          { name: "Vault", cost: 600, description: "+35 every 3.5s.",
            stats: { income: { perTick: 35, interval: 3.5 }, accentColor: "#dc2626" } },
          { name: "Federal Reserve", cost: 1100, description: "+85 every 3s.",
            stats: { income: { perTick: 85, interval: 3.0 }, accentColor: "#ef4444",
              appearance: ["heavy_cap"] } },
        ],
      },
      {
        name: "War Bonds", tagline: "Larger lump payouts on a slower interval.",
        tiers: [
          { name: "Bond Issue", cost: 400, description: "+45 every 7s.",
            stats: { income: { perTick: 45, interval: 7 } } },
          { name: "Treasury", cost: 700, description: "+110 every 6s.",
            stats: { income: { perTick: 110, interval: 6 }, accentColor: "#dc2626" } },
          { name: "Sovereign Wealth", cost: 1300, description: "+260 every 5.5s.",
            stats: { income: { perTick: 260, interval: 5.5 }, accentColor: "#ef4444",
              appearance: ["heavy_cap", "shield_plate"] } },
        ],
      },
      {
        name: "Black Market", tagline: "Risky payouts that scale with the wave.",
        tiers: [
          { name: "Smuggler", cost: 380, description: "+ (10 + level×2) every 4s.",
            stats: { income: { perTick: 10, interval: 4 } } },
          { name: "Cartel", cost: 650, description: "+ (20 + level×4) every 3.5s.",
            stats: { income: { perTick: 20, interval: 3.5 }, accentColor: "#dc2626" } },
          { name: "Syndicate", cost: 1200, description: "+ (40 + level×8) every 3s.",
            stats: { income: { perTick: 40, interval: 3.0 }, accentColor: "#ef4444",
              appearance: ["spikes"] } },
        ],
      },
    ],
  },

  recon: {
    kind: "recon", name: "Recon HQ",
    description: "Reveals stealth in radius. Provides intel on incoming waves.",
    cost: 280,
    base: {
      damage: 0, range: 160, fireRate: 0, damageType: "physical",
      hiddenDetect: true, intelLevel: 1,
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#2a3038", accentColor: "#9adfff", barrelColor: "#1a1a22",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["satellite_dish"],
    },
    paths: [
      {
        name: "Signal Intelligence", tagline: "Approximate counts and bigger reveal radius.",
        tiers: [
          { name: "SIGINT Array", cost: 220, description: "Larger reveal radius.",
            stats: { range: 220, intelLevel: 1, appearance: ["satellite_dish", "antenna"] } },
          { name: "Triangulation", cost: 380, description: "Approximate counts of every threat.",
            stats: { range: 260, intelLevel: 2, appearance: ["satellite_dish", "antenna"] } },
          { name: "Global Surveillance", cost: 600, description: "Exact counts. Reveals across map.",
            stats: { range: 999, intelLevel: 3, accentColor: "#dc2626",
              appearance: ["satellite_dish", "antenna", "energy_core"] } },
        ],
      },
      {
        name: "Combat Optics", tagline: "Buffs nearby towers' range and accuracy.",
        tiers: [
          { name: "Spotters", cost: 240, description: "+15% range to nearby towers.",
            stats: { range: 180, buffAura: { range: 180, fireRateMul: 1.0, damageMul: 1.0 },
              appearance: ["satellite_dish", "extra_optic"] } },
          { name: "Tactical Net", cost: 420, description: "+20% fire rate to nearby towers.",
            stats: { range: 200, buffAura: { range: 200, fireRateMul: 1.2 },
              appearance: ["satellite_dish", "extra_optic", "antenna"] } },
          { name: "Battlefield Awareness", cost: 700, description: "+35% damage to nearby towers.",
            stats: { range: 240, buffAura: { range: 240, fireRateMul: 1.2, damageMul: 1.35 },
              accentColor: "#dc2626",
              appearance: ["satellite_dish", "extra_optic", "antenna", "energy_core"] } },
        ],
      },
      {
        name: "Drone Swarm", tagline: "Launches autonomous combat drones.",
        tiers: [
          { name: "Recon Drone", cost: 320, description: "1 drone, light damage, hidden detect.",
            stats: { droneCount: 1, droneDamage: 12, range: 180,
              appearance: ["satellite_dish"] } },
          { name: "Strike Drones", cost: 540, description: "3 drones, more damage.",
            stats: { droneCount: 3, droneDamage: 24, range: 200, accentColor: "#dc2626",
              appearance: ["satellite_dish", "antenna"] } },
          { name: "Killer Swarm", cost: 900, description: "5 drones with cannon pods.",
            stats: { droneCount: 5, droneDamage: 50, range: 220, accentColor: "#ef4444",
              appearance: ["satellite_dish", "antenna", "energy_core"] } },
        ],
      },
    ],
  },

  flame: {
    kind: "flame", name: "Flamethrower",
    description: "Short range, high fire rate. Applies burn damage over time.",
    cost: 260,
    base: {
      damage: 10, range: 95, fireRate: 5.0, damageType: "fire",
      burnDps: 8, burnDuration: 2.0,
      projectileSpeed: 380, projectileColor: "#ff8a3d",
      bodyColor: "#3a2a22", accentColor: "#ff6020", barrelColor: "#1a1a1a",
      barrelLength: 18, barrelWidth: 6,
    },
    paths: [
      {
        name: "Inferno", tagline: "Massive burn damage over time.",
        tiers: [
          { name: "Hot Mix", cost: 220, description: "Stronger burn.",
            stats: { burnDps: 18, burnDuration: 2.5, appearance: ["energy_core"] } },
          { name: "Napalm", cost: 380, description: "Devastating sticky burn.",
            stats: { burnDps: 40, burnDuration: 3.0, accentColor: "#ef4444",
              appearance: ["energy_core", "second_barrel"] } },
          { name: "Hellfire", cost: 620, description: "Apocalyptic burn DoT.",
            stats: { burnDps: 95, burnDuration: 3.5, damage: 18, range: 110,
              accentColor: "#ef4444", barrelLength: 22,
              appearance: ["energy_core", "second_barrel", "spikes"] } },
        ],
      },
      {
        name: "Wide Cone", tagline: "Splash hits multiple enemies at once.",
        tiers: [
          { name: "Spray", cost: 200, description: "Splash radius added.",
            stats: { splashRadius: 35, damage: 12, appearance: ["muzzle_brake"] } },
          { name: "Wide Spray", cost: 340, description: "Bigger cone.",
            stats: { splashRadius: 55, damage: 16, accentColor: "#dc2626",
              appearance: ["muzzle_brake", "second_barrel"] } },
          { name: "Firestorm", cost: 560, description: "Giant fan of flame.",
            stats: { splashRadius: 85, damage: 24, fireRate: 6.0, accentColor: "#ef4444",
              appearance: ["muzzle_brake", "second_barrel", "heavy_cap"] } },
        ],
      },
      {
        name: "Plasma Torch", tagline: "Concentrated stream that pierces armor.",
        tiers: [
          { name: "Pressurized", cost: 240, description: "+50% range.",
            stats: { range: 145, damage: 14, appearance: ["scope"] } },
          { name: "Plasma Mix", cost: 400, description: "Damage becomes piercing.",
            stats: { range: 160, damage: 28, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope", "energy_core"] } },
          { name: "Plasma Lance", cost: 660, description: "Solid plasma beam.",
            stats: { range: 180, damage: 70, damageType: "piercing", fireRate: 4.0,
              projectileColor: "#ef4444", accentColor: "#ef4444",
              appearance: ["scope", "energy_core", "spikes"] } },
        ],
      },
    ],
  },

  mortar: {
    kind: "mortar", name: "Mortar Pit",
    description: "Lobbed shells with extreme range. Ignores line of sight.",
    cost: 480,
    base: {
      damage: 55, range: 360, fireRate: 0.5, damageType: "explosion", splashRadius: 70,
      arcShot: true,
      projectileSpeed: 240, projectileColor: "#1a1a1a",
      bodyColor: "#2e2e2e", accentColor: "#888", barrelColor: "#0a0a0a",
      barrelLength: 12, barrelWidth: 8,
    },
    paths: [
      {
        name: "Heavy Mortar", tagline: "Bigger shells.",
        tiers: [
          { name: "120mm", cost: 380, description: "+50% damage.",
            stats: { damage: 90, splashRadius: 80, appearance: ["heavy_cap"] } },
          { name: "152mm", cost: 620, description: "Devastating shells.",
            stats: { damage: 160, splashRadius: 110, barrelWidth: 9,
              appearance: ["heavy_cap", "shield_plate"] } },
          { name: "Bunker Buster", cost: 1100, description: "Penetrates anything.",
            stats: { damage: 320, splashRadius: 140, range: 420, barrelWidth: 11,
              accentColor: "#ef4444",
              appearance: ["heavy_cap", "shield_plate", "muzzle_brake"] } },
        ],
      },
      {
        name: "Saturation Fire", tagline: "Multiple shells per shot.",
        tiers: [
          { name: "Triple Tube", cost: 420, description: "Three shells per volley.",
            stats: { damage: 35, splashRadius: 55, fireRate: 0.8,
              appearance: ["second_barrel"] } },
          { name: "Six-Pack", cost: 720, description: "Saturation barrage.",
            stats: { damage: 45, splashRadius: 65, fireRate: 1.4, accentColor: "#dc2626",
              appearance: ["second_barrel", "antenna"] } },
          { name: "Stalin's Organ", cost: 1200, description: "Continuous rocket barrage.",
            stats: { damage: 60, splashRadius: 75, fireRate: 3.0, accentColor: "#ef4444",
              appearance: ["second_barrel", "antenna", "muzzle_brake"] } },
        ],
      },
      {
        name: "Smart Munitions", tagline: "Guided shells with utility effects.",
        tiers: [
          { name: "Guided Shells", cost: 360, description: "Shells home in on targets.",
            stats: { damage: 70, splashRadius: 60, projectileSpeed: 320,
              appearance: ["antenna"] } },
          { name: "Cluster Round", cost: 600, description: "Submunition shells.",
            stats: { damage: 60, splashRadius: 95, fireRate: 0.6, accentColor: "#dc2626",
              appearance: ["antenna", "second_barrel"] } },
          { name: "Tactical Strike", cost: 1000, description: "Calls in MOAB-class strikes.",
            stats: { damage: 250, splashRadius: 150, fireRate: 0.45, range: 480,
              accentColor: "#ef4444",
              appearance: ["antenna", "second_barrel", "heavy_cap"] } },
        ],
      },
    ],
  },

  railgun: {
    kind: "railgun", name: "Railgun",
    description: "Charges then fires a piercing beam through every enemy in a line.",
    cost: 620,
    base: {
      damage: 200, range: 380, fireRate: 0.35, damageType: "piercing",
      pierceTargets: 5,
      projectileSpeed: 2400, projectileColor: "#9adfff",
      bodyColor: "#1a2028", accentColor: "#9adfff", barrelColor: "#0e0e16",
      barrelLength: 30, barrelWidth: 4,
      appearance: ["energy_core"],
    },
    paths: [
      {
        name: "Slug Caliber", tagline: "Heavier slug, more damage per hit.",
        tiers: [
          { name: "Tungsten", cost: 500, description: "+80% damage.",
            stats: { damage: 360, appearance: ["energy_core", "muzzle_brake"] } },
          { name: "Uranium", cost: 850, description: "Devastating slug.",
            stats: { damage: 700, accentColor: "#dc2626",
              appearance: ["energy_core", "muzzle_brake", "shield_plate"] } },
          { name: "Singularity", cost: 1500, description: "Pulls all enemies in line.",
            stats: { damage: 1500, range: 460, accentColor: "#ef4444",
              appearance: ["energy_core", "muzzle_brake", "shield_plate", "spikes"] } },
        ],
      },
      {
        name: "Mass Driver", tagline: "Pierces more enemies in the line.",
        tiers: [
          { name: "Coilgun", cost: 460, description: "Pierces up to 10 enemies.",
            stats: { pierceTargets: 10, damage: 180, appearance: ["energy_core", "antenna"] } },
          { name: "Mass Driver", cost: 780, description: "Pierces up to 20.",
            stats: { pierceTargets: 20, damage: 240, accentColor: "#dc2626",
              appearance: ["energy_core", "antenna", "second_barrel"] } },
          { name: "Particle Cannon", cost: 1300, description: "Pierces all enemies in line.",
            stats: { pierceTargets: 99, damage: 360, range: 480, accentColor: "#ef4444",
              appearance: ["energy_core", "antenna", "second_barrel", "muzzle_brake"] } },
        ],
      },
      {
        name: "Quick Charge", tagline: "Shorter cycles, lower per-shot damage.",
        tiers: [
          { name: "Capacitor Bank", cost: 400, description: "+50% fire rate.",
            stats: { fireRate: 0.55, damage: 160, appearance: ["energy_core", "antenna"] } },
          { name: "Auto-Charger", cost: 700, description: "Faster cycle.",
            stats: { fireRate: 1.0, damage: 140, accentColor: "#dc2626",
              appearance: ["energy_core", "antenna", "extra_optic"] } },
          { name: "Hyperflux", cost: 1200, description: "Continuous beam.",
            stats: { fireRate: 2.5, damage: 180, accentColor: "#ef4444",
              appearance: ["energy_core", "antenna", "extra_optic", "second_barrel"] } },
        ],
      },
    ],
  },

  engineer: {
    kind: "engineer", name: "Field Engineer",
    description: "Buffs adjacent towers. No direct attack.",
    cost: 340,
    base: {
      damage: 0, range: 110, fireRate: 0, damageType: "physical",
      buffAura: { range: 110, fireRateMul: 1.15, damageMul: 1.0 },
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#3a3528", accentColor: "#fff37a", barrelColor: "#5a5028",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["antenna"],
    },
    paths: [
      {
        name: "Logistics", tagline: "Boosts allied fire rate.",
        tiers: [
          { name: "Munitions Truck", cost: 280, description: "+25% fire rate, +20% range.",
            stats: { range: 140, buffAura: { range: 140, fireRateMul: 1.25 },
              appearance: ["antenna", "shield_plate"] } },
          { name: "Forward Depot", cost: 480, description: "+45% fire rate.",
            stats: { range: 160, buffAura: { range: 160, fireRateMul: 1.45 },
              accentColor: "#dc2626",
              appearance: ["antenna", "shield_plate", "satellite_dish"] } },
          { name: "Quartermaster", cost: 800, description: "+80% fire rate.",
            stats: { range: 180, buffAura: { range: 180, fireRateMul: 1.8 },
              accentColor: "#ef4444",
              appearance: ["antenna", "shield_plate", "satellite_dish", "energy_core"] } },
        ],
      },
      {
        name: "Armorer", tagline: "Boosts allied damage.",
        tiers: [
          { name: "Reinforced Rounds", cost: 320, description: "+25% damage to allies.",
            stats: { range: 130, buffAura: { range: 130, damageMul: 1.25 },
              appearance: ["shield_plate"] } },
          { name: "Ballistic Coatings", cost: 540, description: "+50% damage.",
            stats: { range: 150, buffAura: { range: 150, damageMul: 1.5 },
              accentColor: "#dc2626", appearance: ["shield_plate", "muzzle_brake"] } },
          { name: "Master Armorer", cost: 900, description: "+90% damage.",
            stats: { range: 170, buffAura: { range: 170, damageMul: 1.9 },
              accentColor: "#ef4444",
              appearance: ["shield_plate", "muzzle_brake", "heavy_cap"] } },
        ],
      },
      {
        name: "Combat Medic", tagline: "Combines smaller boosts to both stats.",
        tiers: [
          { name: "Field Hospital", cost: 300, description: "+15% rate, +15% damage.",
            stats: { range: 130, buffAura: { range: 130, fireRateMul: 1.15, damageMul: 1.15 },
              appearance: ["heavy_cap"] } },
          { name: "Surgical Team", cost: 500, description: "+25% rate, +25% damage.",
            stats: { range: 150, buffAura: { range: 150, fireRateMul: 1.25, damageMul: 1.25 },
              accentColor: "#dc2626", appearance: ["heavy_cap", "energy_core"] } },
          { name: "Combat Medic", cost: 850, description: "+45% rate, +45% damage.",
            stats: { range: 180, buffAura: { range: 180, fireRateMul: 1.45, damageMul: 1.45 },
              accentColor: "#ef4444",
              appearance: ["heavy_cap", "energy_core", "antenna"] } },
        ],
      },
    ],
  },

  minelayer: {
    kind: "minelayer", name: "Mine Layer",
    description: "Periodically lays mines along the path. Detonate on contact.",
    cost: 380,
    base: {
      damage: 0, range: 200, fireRate: 0, damageType: "explosion",
      mineDamage: 80, mineSplash: 50, mineCooldown: 4.0,
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#2a2a2a", accentColor: "#dc2626", barrelColor: "#1a1a1a",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["spikes"],
    },
    paths: [
      {
        name: "Heavy Charges", tagline: "Bigger boom per mine.",
        tiers: [
          { name: "Frag Mine", cost: 280, description: "Bigger blast.",
            stats: { mineDamage: 160, mineSplash: 65, appearance: ["spikes", "heavy_cap"] } },
          { name: "Demolition", cost: 480, description: "Devastating mines.",
            stats: { mineDamage: 320, mineSplash: 90, accentColor: "#dc2626",
              appearance: ["spikes", "heavy_cap", "shield_plate"] } },
          { name: "Tactical Nuke", cost: 900, description: "Each mine is a small nuke.",
            stats: { mineDamage: 800, mineSplash: 140, mineCooldown: 5.0,
              accentColor: "#ef4444",
              appearance: ["spikes", "heavy_cap", "shield_plate", "energy_core"] } },
        ],
      },
      {
        name: "Rapid Deployment", tagline: "Lays mines faster.",
        tiers: [
          { name: "Quick Lay", cost: 240, description: "Faster mine cooldown.",
            stats: { mineCooldown: 2.5, appearance: ["antenna"] } },
          { name: "Mine Spam", cost: 420, description: "Even faster.",
            stats: { mineCooldown: 1.5, mineDamage: 90, accentColor: "#dc2626",
              appearance: ["antenna", "second_barrel"] } },
          { name: "Carpet Layer", cost: 720, description: "Constant mine spawning.",
            stats: { mineCooldown: 0.7, mineDamage: 110, accentColor: "#ef4444",
              appearance: ["antenna", "second_barrel", "spikes"] } },
        ],
      },
      {
        name: "Smart Mines", tagline: "EMP and cluster mine variants.",
        tiers: [
          { name: "EMP Mine", cost: 320, description: "Slows enemies in blast.",
            stats: { mineDamage: 50, mineSplash: 70, slowFactor: 0.4, slowDuration: 2.0,
              appearance: ["energy_core"] } },
          { name: "Cluster Mine", cost: 540, description: "Bigger AoE on detonation.",
            stats: { mineDamage: 90, mineSplash: 100, slowFactor: 0.4, slowDuration: 2.0,
              accentColor: "#dc2626", appearance: ["energy_core", "spikes"] } },
          { name: "Doomsday", cost: 900, description: "Massive area, severe slow.",
            stats: { mineDamage: 200, mineSplash: 150, slowFactor: 0.25, slowDuration: 3.0,
              accentColor: "#ef4444",
              appearance: ["energy_core", "spikes", "heavy_cap"] } },
        ],
      },
    ],
  },

  drone: {
    kind: "drone", name: "Drone Bay",
    description: "Launches autonomous drones that orbit and engage enemies.",
    cost: 460,
    base: {
      damage: 18, range: 180, fireRate: 1.6, damageType: "physical",
      droneCount: 2, droneDamage: 18,
      projectileSpeed: 600, projectileColor: "#fff",
      bodyColor: "#2a2a2e", accentColor: "#9adfff", barrelColor: "#1a1a22",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["antenna"],
    },
    paths: [
      {
        name: "Swarm Bay", tagline: "More drones, lighter weapons.",
        tiers: [
          { name: "Quad Bay", cost: 380, description: "4 drones.",
            stats: { droneCount: 4, droneDamage: 16, appearance: ["antenna", "second_barrel"] } },
          { name: "Hex Bay", cost: 640, description: "6 drones.",
            stats: { droneCount: 6, droneDamage: 22, accentColor: "#dc2626",
              appearance: ["antenna", "second_barrel", "satellite_dish"] } },
          { name: "Drone Swarm", cost: 1100, description: "10 drones.",
            stats: { droneCount: 10, droneDamage: 28, accentColor: "#ef4444",
              appearance: ["antenna", "second_barrel", "satellite_dish", "energy_core"] } },
        ],
      },
      {
        name: "Heavy Drones", tagline: "Fewer, more dangerous drones.",
        tiers: [
          { name: "Gunship", cost: 420, description: "Bigger guns.",
            stats: { droneCount: 2, droneDamage: 50, range: 200,
              appearance: ["heavy_cap"] } },
          { name: "Strike Craft", cost: 720, description: "Heavy ordnance.",
            stats: { droneCount: 2, droneDamage: 110, range: 230, accentColor: "#dc2626",
              appearance: ["heavy_cap", "muzzle_brake"] } },
          { name: "Stealth Bomber", cost: 1200, description: "Devastating piercing strikes.",
            stats: { droneCount: 3, droneDamage: 240, damageType: "piercing", range: 260,
              accentColor: "#ef4444",
              appearance: ["heavy_cap", "muzzle_brake", "spikes"] } },
        ],
      },
      {
        name: "Hellfire Drones", tagline: "Drones with explosive missiles.",
        tiers: [
          { name: "Missile Pod", cost: 460, description: "Missiles with splash.",
            stats: { droneCount: 2, droneDamage: 60, splashRadius: 40, damageType: "explosion",
              appearance: ["second_barrel"] } },
          { name: "Hellfire", cost: 760, description: "Larger blasts.",
            stats: { droneCount: 3, droneDamage: 140, splashRadius: 65, damageType: "explosion",
              accentColor: "#dc2626", appearance: ["second_barrel", "muzzle_brake"] } },
          { name: "MOAB Carriers", cost: 1300, description: "Drones drop MOAB-class bombs.",
            stats: { droneCount: 4, droneDamage: 320, splashRadius: 100, damageType: "explosion",
              accentColor: "#ef4444",
              appearance: ["second_barrel", "muzzle_brake", "heavy_cap"] } },
        ],
      },
    ],
  },
};

export const TOWER_ORDER: TowerKind[] = [
  "rifleman", "frost", "sniper", "tesla", "flame", "drone",
  "howitzer", "mortar", "railgun", "minelayer", "engineer", "recon", "bank",
];

export function effectiveStats(def: TowerDef, pathIdx: number | null, tier: number): TowerStats {
  if (pathIdx === null || tier === 0) return def.base;
  const path = def.paths[pathIdx];
  let stats: TowerStats = { ...def.base, appearance: [...(def.base.appearance ?? [])] };
  for (let i = 0; i < tier && i < path.tiers.length; i++) {
    const t = path.tiers[i].stats;
    stats = { ...stats, ...t };
    if (t.appearance) stats.appearance = t.appearance;
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
export type EnemyKind =
  | "grunt" | "swift" | "tank" | "swarm" | "stealth" | "armored" | "summoner"
  | "sprinter" | "shielded" | "healer" | "regen" | "phaser" | "berserker"
  | "cloaker" | "juggernaut" | "empdrone"
  | "miniboss" | "boss"
  | "bossbrute" | "bossemp" | "bossaegis" | "bossnecro" | "bosscloaker" | "bossfinal";

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
  armored?: boolean;
  resistances?: Partial<Record<DamageType, number>>;
  immunities?: DamageType[];
  summon?: { kind: EnemyKind; interval: number; perSpawn: number };
  shape?: "circle" | "diamond" | "square" | "hex" | "skull" | "octagon" | "triangle";
  // special abilities
  healAura?: { range: number; perSec: number };
  regen?: number; // hp/sec
  phaseInterval?: number; // toggles invuln every N seconds
  berserkBelow?: number; // hp pct -> speed boost
  cloakAura?: { range: number };
  empAttack?: { range: number; interval: number; duration: number; targets: number };
  aegisAura?: { range: number; resist: number };
  necroOnDeath?: { kind: EnemyKind; count: number };
  description?: string;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt:    { kind: "grunt", name: "Grunt", baseHp: 45, speed: 55, reward: 8, damage: 1, radius: 11, color: "#cfcfcf", outline: "#1a1a1a", shape: "circle", description: "Standard infantry. No special traits." },
  swift:    { kind: "swift", name: "Scout", baseHp: 28, speed: 110, reward: 10, damage: 1, radius: 9, color: "#f5f5f5", outline: "#1a1a1a", shape: "diamond", description: "Fast and lightly armored." },
  tank:     { kind: "tank", name: "Heavy", baseHp: 180, speed: 32, reward: 18, damage: 2, radius: 15, color: "#7a7a7a", outline: "#0a0a0a", shape: "square", description: "Slow, durable footsoldier." },
  swarm:    { kind: "swarm", name: "Swarmer", baseHp: 18, speed: 80, reward: 4, damage: 1, radius: 7, color: "#a0a0a0", outline: "#1a1a1a", shape: "circle", description: "Comes in numbers." },
  stealth:  { kind: "stealth", name: "Phantom", baseHp: 60, speed: 95, reward: 16, damage: 1, radius: 10, color: "#444", outline: "#000", hidden: true, shape: "diamond", description: "Invisible without optics." },
  armored:  { kind: "armored", name: "Bulwark", baseHp: 220, speed: 42, reward: 22, damage: 2, radius: 14, color: "#5a5a5a", outline: "#000", armored: true,
              resistances: { physical: 0.20, energy: 0.30, fire: 0.40 }, shape: "hex", description: "Heavy armor. Resists physical, energy, and fire." },
  summoner: { kind: "summoner", name: "Summoner", baseHp: 280, speed: 36, reward: 35, damage: 2, radius: 14, color: "#dc2626", outline: "#3a0a0a",
              summon: { kind: "swarm", interval: 3.0, perSpawn: 2 }, shape: "hex", description: "Spawns Swarmers periodically." },

  sprinter: { kind: "sprinter", name: "Sprinter", baseHp: 50, speed: 165, reward: 14, damage: 1, radius: 8, color: "#fff", outline: "#dc2626", shape: "triangle", description: "Extreme speed. Lightly armored." },
  shielded: { kind: "shielded", name: "Shielded", baseHp: 200, speed: 50, reward: 24, damage: 2, radius: 13, color: "#444", outline: "#fff", shape: "octagon",
              resistances: { physical: 0.30, fire: 0.50 }, description: "Heavy ballistic shield. Vulnerable to piercing and explosion." },
  healer:   { kind: "healer", name: "Medic", baseHp: 90, speed: 60, reward: 30, damage: 1, radius: 11, color: "#22c55e", outline: "#0a3318", shape: "circle",
              healAura: { range: 70, perSec: 18 }, description: "Heals nearby enemies. Prioritize." },
  regen:    { kind: "regen", name: "Regenerator", baseHp: 160, speed: 50, reward: 22, damage: 2, radius: 12, color: "#90c090", outline: "#0a3318", shape: "hex",
              regen: 12, description: "Self-regenerates HP. Burst it down." },
  phaser:   { kind: "phaser", name: "Phaser", baseHp: 140, speed: 60, reward: 28, damage: 2, radius: 11, color: "#aa44ff", outline: "#220033", shape: "diamond",
              phaseInterval: 1.6, immunities: ["physical"], description: "Phases in and out of invulnerability." },
  berserker:{ kind: "berserker", name: "Berserker", baseHp: 220, speed: 55, reward: 28, damage: 3, radius: 13, color: "#ff5050", outline: "#3a0000", shape: "triangle",
              berserkBelow: 0.5, description: "Doubles speed below 50% HP." },
  cloaker:  { kind: "cloaker", name: "Cloaker", baseHp: 130, speed: 55, reward: 32, damage: 2, radius: 12, color: "#222", outline: "#5a5a5a", shape: "hex",
              hidden: true, cloakAura: { range: 90 }, description: "Hidden. Cloaks nearby allies." },
  juggernaut: { kind: "juggernaut", name: "Juggernaut", baseHp: 900, speed: 25, reward: 75, damage: 5, radius: 20, color: "#3a3a3a", outline: "#000", shape: "square",
                armored: true, resistances: { physical: 0.15, energy: 0.25, fire: 0.30 }, description: "Massive armor. Slow but devastating." },
  empdrone: { kind: "empdrone", name: "EMP Drone", baseHp: 80, speed: 90, reward: 30, damage: 1, radius: 9, color: "#fff37a", outline: "#3a3000", shape: "triangle",
              empAttack: { range: 110, interval: 5.0, duration: 2.5, targets: 1 }, description: "Periodically stuns a nearby tower." },

  miniboss: { kind: "miniboss", name: "Mini-Boss", baseHp: 1100, speed: 38, reward: 140, damage: 5, radius: 22, color: "#ef4444", outline: "#1a0000", shape: "skull", description: "A heavy strike unit." },
  boss:     { kind: "boss", name: "Boss", baseHp: 4500, speed: 30, reward: 500, damage: 12, radius: 30, color: "#ff2020", outline: "#1a0000",
              summon: { kind: "armored", interval: 6.0, perSpawn: 1 }, shape: "skull", description: "End-of-act warlord." },
  // unique boss variants
  bossbrute:   { kind: "bossbrute", name: "Brute", baseHp: 1400, speed: 40, reward: 160, damage: 5, radius: 22, color: "#ef4444", outline: "#1a0000", shape: "skull",
                 description: "Standard mini-boss with raw HP." },
  bossemp:     { kind: "bossemp", name: "EMP Walker", baseHp: 5000, speed: 26, reward: 600, damage: 12, radius: 30, color: "#fff37a", outline: "#332200", shape: "octagon",
                 empAttack: { range: 250, interval: 7.0, duration: 4.0, targets: 3 }, summon: { kind: "empdrone", interval: 8.0, perSpawn: 1 },
                 description: "Periodically stuns 3 nearby towers for 4s." },
  bossaegis:   { kind: "bossaegis", name: "Aegis Titan", baseHp: 5400, speed: 28, reward: 600, damage: 11, radius: 32, color: "#9adfff", outline: "#0a1820", shape: "hex",
                 aegisAura: { range: 130, resist: 0.5 }, armored: true, resistances: { physical: 0.25, energy: 0.35 },
                 description: "Halves damage on all enemies within 130 units." },
  bossnecro:   { kind: "bossnecro", name: "Necromancer", baseHp: 4800, speed: 30, reward: 600, damage: 12, radius: 30, color: "#aa44ff", outline: "#220033", shape: "skull",
                 summon: { kind: "swarm", interval: 2.5, perSpawn: 3 }, necroOnDeath: { kind: "grunt", count: 4 },
                 description: "Constantly raises swarms. Spawns more on death." },
  bosscloaker: { kind: "bosscloaker", name: "Wraith King", baseHp: 5200, speed: 34, reward: 600, damage: 12, radius: 30, color: "#222", outline: "#dc2626", shape: "skull",
                 hidden: true, cloakAura: { range: 160 }, summon: { kind: "stealth", interval: 5.0, perSpawn: 2 },
                 description: "Hidden. Cloaks all enemies in a 160 radius." },
  bossfinal:   { kind: "bossfinal", name: "Overlord", baseHp: 12000, speed: 28, reward: 1500, damage: 25, radius: 36, color: "#ff2020", outline: "#1a0000", shape: "skull",
                 empAttack: { range: 300, interval: 9.0, duration: 4.0, targets: 4 },
                 aegisAura: { range: 160, resist: 0.5 },
                 summon: { kind: "armored", interval: 4.0, perSpawn: 2 },
                 armored: true, resistances: { physical: 0.20, energy: 0.30, fire: 0.30 },
                 description: "Final boss. Stuns towers, armors allies, summons constantly." },
};

// ===== Wave generation =====
export type WaveSpawn = { kind: EnemyKind; count: number; interval: number; delay: number };

function pickBoss(level: number): EnemyKind {
  if (level >= 30) return "bossfinal";
  if (level === 10) return "bossemp";
  if (level === 20) return "bossnecro";
  if (level >= 25 && level % 5 === 0) return "bosscloaker";
  if (level === 15) return "bossaegis";
  return "boss";
}

function pickMiniBoss(level: number): EnemyKind {
  return "bossbrute";
}

export function generateWave(level: number): { spawns: WaveSpawn[]; hpMul: number; isMiniBoss: boolean; isBoss: boolean; bossKind?: EnemyKind } {
  const isBoss = level % 10 === 0;
  const isMiniBoss = !isBoss && level % 5 === 0;
  const hpMul = Math.pow(1.18, level - 1);

  if (isBoss) {
    const bk = pickBoss(level);
    return {
      spawns: [
        { kind: "swarm", count: 14 + Math.floor(level / 2), interval: 0.32, delay: 0 },
        { kind: "armored", count: 4 + Math.floor(level / 5), interval: 1.2, delay: 6 },
        { kind: "shielded", count: 2 + Math.floor(level / 8), interval: 1.4, delay: 8 },
        { kind: "phaser", count: level >= 20 ? 3 : 0, interval: 1.5, delay: 9 },
        { kind: "summoner", count: 2, interval: 3, delay: 10 },
        { kind: bk, count: 1, interval: 1, delay: 14 },
      ],
      hpMul, isMiniBoss, isBoss, bossKind: bk,
    };
  }
  if (isMiniBoss) {
    return {
      spawns: [
        { kind: "grunt", count: 8 + level, interval: 0.5, delay: 0 },
        { kind: "swift", count: 6, interval: 0.4, delay: 4 },
        { kind: "stealth", count: level >= 10 ? 4 : 0, interval: 0.7, delay: 7 },
        { kind: "regen", count: level >= 15 ? 3 : 0, interval: 1.0, delay: 8 },
        { kind: pickMiniBoss(level), count: 1, interval: 1, delay: 10 },
      ],
      hpMul, isMiniBoss, isBoss, bossKind: pickMiniBoss(level),
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
  if (level >= 3) spawns.push({ kind: "sprinter", count: 2 + Math.floor(level / 4), interval: 0.5, delay: delay + 1 });
  if (level >= 4) { spawns.push({ kind: "tank", count: 1 + Math.floor(level / 4), interval: 1.4, delay }); delay += 3; }
  if (level >= 6) spawns.push({ kind: "stealth", count: 2 + Math.floor((level - 6) / 2), interval: 0.6, delay });
  if (level >= 7) spawns.push({ kind: "shielded", count: 1 + Math.floor((level - 7) / 4), interval: 1.0, delay: delay + 1 });
  if (level >= 8) spawns.push({ kind: "armored", count: 1 + Math.floor((level - 8) / 3), interval: 1.2, delay: delay + 1 });
  if (level >= 9) spawns.push({ kind: "berserker", count: 1 + Math.floor((level - 9) / 4), interval: 1.0, delay: delay + 2 });
  if (level >= 11) spawns.push({ kind: "healer", count: 1 + Math.floor((level - 11) / 5), interval: 2.0, delay: delay + 1 });
  if (level >= 12) spawns.push({ kind: "summoner", count: 1 + Math.floor((level - 12) / 5), interval: 2.5, delay });
  if (level >= 13) spawns.push({ kind: "regen", count: 1 + Math.floor((level - 13) / 4), interval: 1.5, delay: delay + 2 });
  if (level >= 14) spawns.push({ kind: "phaser", count: 1 + Math.floor((level - 14) / 4), interval: 1.5, delay: delay + 1 });
  if (level >= 16) spawns.push({ kind: "empdrone", count: 1 + Math.floor((level - 16) / 4), interval: 2.0, delay: delay + 2 });
  if (level >= 17) spawns.push({ kind: "cloaker", count: 1 + Math.floor((level - 17) / 5), interval: 2.0, delay: delay + 2 });
  if (level >= 22) spawns.push({ kind: "juggernaut", count: 1 + Math.floor((level - 22) / 4), interval: 3.0, delay: delay + 2 });

  if (level >= 7) spawns.push({ kind: "swarm", count: 8 + level, interval: 0.25, delay: delay + 2 });
  return { spawns, hpMul, isMiniBoss, isBoss };
}
