import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";
import { logger } from "./logger";

export type LobbyMode = "1v1" | "2v2";
export type AIDifficulty = "rookie" | "veteran" | "elite";
export type SlotKind = "empty" | "player" | "ai";

export type Slot = {
  index: number;
  team: 0 | 1;
  kind: SlotKind;
  playerId?: string;
  playerName?: string;
  aiDifficulty?: AIDifficulty;
};

export type Player = {
  id: string;
  name: string;
  ws: WebSocket | null;
  slot: number;
};

export type Lobby = {
  code: string;
  mode: LobbyMode;
  hostId: string;
  status: "waiting" | "in-game" | "ended";
  slots: Slot[];
  players: Map<string, Player>;
  mapId: string | null;
  level: number;
  createdAt: number;
  cleanupAt: number;
};

const lobbies = new Map<string, Lobby>();

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing chars

function makeCode(): string {
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function makePlayerId(): string {
  return randomBytes(12).toString("base64url");
}

function defaultSlots(mode: LobbyMode): Slot[] {
  if (mode === "1v1") {
    return [
      { index: 0, team: 0, kind: "empty" },
      { index: 1, team: 1, kind: "empty" },
    ];
  }
  return [
    { index: 0, team: 0, kind: "empty" },
    { index: 1, team: 0, kind: "empty" },
    { index: 2, team: 1, kind: "empty" },
    { index: 3, team: 1, kind: "empty" },
  ];
}

export function createLobby(opts: { mode: LobbyMode; hostName: string }): { lobby: Lobby; hostId: string } {
  let code = makeCode();
  while (lobbies.has(code)) code = makeCode();
  const hostId = makePlayerId();
  const lobby: Lobby = {
    code,
    mode: opts.mode,
    hostId,
    status: "waiting",
    slots: defaultSlots(opts.mode),
    players: new Map(),
    mapId: null,
    level: 1,
    createdAt: Date.now(),
    cleanupAt: Date.now() + 1000 * 60 * 60, // 1h
  };
  // Pre-register host as a Player record (no ws yet); they'll attach via WS.
  lobby.players.set(hostId, { id: hostId, name: opts.hostName.slice(0, 20) || "Host", ws: null, slot: 0 });
  lobby.slots[0] = { ...lobby.slots[0], kind: "player", playerId: hostId, playerName: opts.hostName.slice(0, 20) || "Host" };
  lobbies.set(code, lobby);
  return { lobby, hostId };
}

export function getLobby(code: string): Lobby | undefined {
  return lobbies.get(code.toUpperCase());
}

export function publicView(lobby: Lobby) {
  return {
    code: lobby.code,
    mode: lobby.mode,
    hostId: lobby.hostId,
    status: lobby.status,
    mapId: lobby.mapId,
    level: lobby.level,
    slots: lobby.slots.map((s) => ({
      index: s.index, team: s.team, kind: s.kind,
      playerId: s.playerId, playerName: s.playerName, aiDifficulty: s.aiDifficulty,
    })),
  };
}

function broadcast(lobby: Lobby, msg: unknown, exceptPlayerId?: string) {
  const data = JSON.stringify(msg);
  for (const p of lobby.players.values()) {
    if (exceptPlayerId && p.id === exceptPlayerId) continue;
    if (p.ws && p.ws.readyState === 1) p.ws.send(data);
  }
}

function broadcastState(lobby: Lobby) {
  broadcast(lobby, { t: "state", lobby: publicView(lobby) });
}

export function attachPlayer(lobby: Lobby, playerId: string, name: string, ws: WebSocket): { ok: boolean; reason?: string } {
  const trimmedName = (name || "Commander").slice(0, 20);
  let player = lobby.players.get(playerId);
  if (!player) {
    // Try to claim an empty slot
    const empty = lobby.slots.find((s) => s.kind === "empty");
    if (!empty) return { ok: false, reason: "Lobby is full" };
    if (lobby.status !== "waiting") return { ok: false, reason: "Game already started" };
    player = { id: playerId, name: trimmedName, ws, slot: empty.index };
    lobby.players.set(playerId, player);
    lobby.slots[empty.index] = { ...empty, kind: "player", playerId, playerName: trimmedName };
  } else {
    player.ws = ws;
    player.name = trimmedName;
    const slot = lobby.slots[player.slot];
    if (slot) lobby.slots[player.slot] = { ...slot, kind: "player", playerId, playerName: trimmedName };
  }
  ws.send(JSON.stringify({ t: "joined", you: playerId, lobby: publicView(lobby) }));
  broadcastState(lobby);
  return { ok: true };
}

export function detachPlayer(lobby: Lobby, playerId: string) {
  const player = lobby.players.get(playerId);
  if (!player) return;
  player.ws = null;
  // If game is in progress, keep the slot reserved (player can reconnect).
  // Only clear slot if waiting state and they leave by closing.
  if (lobby.status === "waiting" && playerId !== lobby.hostId) {
    const slot = lobby.slots[player.slot];
    if (slot && slot.playerId === playerId) {
      lobby.slots[player.slot] = { index: slot.index, team: slot.team, kind: "empty" };
    }
    lobby.players.delete(playerId);
  }
  broadcastState(lobby);
  if (lobby.players.size === 0) {
    lobbies.delete(lobby.code);
    logger.info({ code: lobby.code }, "Lobby empty, deleted");
  }
}

export function setSlotAI(lobby: Lobby, hostId: string, slotIndex: number, difficulty: AIDifficulty | null) {
  if (lobby.hostId !== hostId) return;
  if (lobby.status !== "waiting") return;
  const slot = lobby.slots[slotIndex];
  if (!slot) return;
  if (slot.kind === "player") return; // can't override a real player
  if (difficulty === null) {
    lobby.slots[slotIndex] = { index: slot.index, team: slot.team, kind: "empty" };
  } else {
    lobby.slots[slotIndex] = { index: slot.index, team: slot.team, kind: "ai", aiDifficulty: difficulty, playerName: `AI ${difficulty.toUpperCase()}` };
  }
  broadcastState(lobby);
}

export function kickSlot(lobby: Lobby, hostId: string, slotIndex: number) {
  if (lobby.hostId !== hostId) return;
  if (lobby.status !== "waiting") return;
  const slot = lobby.slots[slotIndex];
  if (!slot || slot.kind === "empty") return;
  if (slot.kind === "player" && slot.playerId) {
    if (slot.playerId === hostId) return; // host can't kick self
    const p = lobby.players.get(slot.playerId);
    if (p?.ws && p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({ t: "kicked" }));
      try { p.ws.close(); } catch { /* noop */ }
    }
    lobby.players.delete(slot.playerId);
  }
  lobby.slots[slotIndex] = { index: slot.index, team: slot.team, kind: "empty" };
  broadcastState(lobby);
}

export function startGame(lobby: Lobby, hostId: string, mapId: string) {
  if (lobby.hostId !== hostId) return;
  if (lobby.status !== "waiting") return;
  // require at least one filled slot per team
  const team0 = lobby.slots.filter(s => s.team === 0 && s.kind !== "empty").length;
  const team1 = lobby.slots.filter(s => s.team === 1 && s.kind !== "empty").length;
  if (team0 === 0 || team1 === 0) {
    const host = lobby.players.get(hostId);
    if (host?.ws && host.ws.readyState === 1) {
      host.ws.send(JSON.stringify({ t: "error", msg: "Each team needs at least one slot filled." }));
    }
    return;
  }
  lobby.status = "in-game";
  lobby.mapId = mapId;
  lobby.level = 1;
  broadcast(lobby, { t: "started", mapId, lobby: publicView(lobby), seed: Math.floor(Math.random() * 0x7fffffff) });
}

export function relayInGame(lobby: Lobby, fromPlayerId: string, raw: { t: string; [k: string]: unknown }) {
  if (lobby.status !== "in-game") return;
  const msg = { ...raw, from: fromPlayerId };

  // Authoritative wave start: any human on the current side requests, host approves automatically
  if (raw.t === "requestWave") {
    if (fromPlayerId !== lobby.hostId) return;
    lobby.level = (raw["level"] as number) ?? lobby.level;
    broadcast(lobby, { t: "waveStart", level: lobby.level, seed: Math.floor(Math.random() * 0x7fffffff) });
    return;
  }
  if (raw.t === "endGame") {
    if (fromPlayerId !== lobby.hostId) return;
    lobby.status = "ended";
    broadcast(lobby, { t: "ended", winnerTeam: raw["winnerTeam"] });
    return;
  }
  // All other messages are simply relayed
  broadcast(lobby, msg, fromPlayerId);
}

// Periodically clean up stale lobbies
setInterval(() => {
  const now = Date.now();
  for (const [code, lobby] of lobbies) {
    if (lobby.cleanupAt < now && lobby.players.size === 0) {
      lobbies.delete(code);
    }
    // Also delete lobbies older than 4 hours regardless
    if (now - lobby.createdAt > 1000 * 60 * 60 * 4) {
      lobbies.delete(code);
    }
  }
}, 60 * 1000);

export { makePlayerId };
