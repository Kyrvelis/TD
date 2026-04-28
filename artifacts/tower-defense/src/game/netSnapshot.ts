// Lightweight serialization of a lane's visible state for network sync.
// We send only what's needed to RENDER + show summary HUD on remote clients.
// Sim-only fields (cooldowns, burnDps, etc.) are omitted and defaulted on apply.

import type { EnemyKind, TowerKind, DamageType } from "./data";

export type EnemySnap = {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  segIdx: number;
  segT: number;
  slowUntil: number;
  burnUntil: number;
  invuln: boolean;
  cloakedUntil: number;
};

export type TowerSnap = {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  pathIdx: number | null;
  tier: number;
  aimAngle: number;
  stunUntil: number;
  drones: { angle: number }[];
};

export type ProjectileSnap = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  damageType: DamageType;
  color: string;
  size: number;
};

export type BeamSnap = { x1: number; y1: number; x2: number; y2: number; color: string; width: number; ttl: number };
export type ZapSnap = { points: { x: number; y: number }[]; ttl: number };
export type FloaterSnap = { text: string; x: number; y: number; ttl: number; color: string };
export type MineSnap = { x: number; y: number; splash: number; ttl: number };

export type LaneSnap = {
  slot: number;
  alive: boolean;
  lives: number;
  money: number;
  waveActive: boolean;
  enemies: EnemySnap[];
  towers: TowerSnap[];
  projectiles: ProjectileSnap[];
  beams: BeamSnap[];
  zaps: ZapSnap[];
  floaters: FloaterSnap[];
  mines: MineSnap[];
};
