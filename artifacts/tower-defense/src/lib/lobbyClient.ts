// Lobby + game-room WebSocket client wrapper.

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

export type LobbyView = {
  code: string;
  mode: LobbyMode;
  hostId: string;
  status: "waiting" | "in-game" | "ended";
  mapId: string | null;
  level: number;
  slots: Slot[];
};

export type ServerMsg =
  | { t: "joined"; you: string; lobby: LobbyView }
  | { t: "state"; lobby: LobbyView }
  | { t: "started"; mapId: string; lobby: LobbyView; seed: number }
  | { t: "waveStart"; level: number; seed: number }
  | { t: "ended"; winnerTeam: 0 | 1 }
  | { t: "kicked" }
  | { t: "error"; msg: string }
  | { t: string; from?: string; [k: string]: unknown }; // game-relayed

export type ClientMsg =
  | { t: "setSlotAI"; slot: number; difficulty: AIDifficulty | null }
  | { t: "kickSlot"; slot: number }
  | { t: "startGame"; mapId: string }
  | { t: "requestWave"; level: number }
  | { t: "endGame"; winnerTeam: 0 | 1 }
  | { t: string; [k: string]: unknown }; // game-relayed

const apiBase = (): string => {
  // Replit/dev/prod: same origin, /api prefix
  return "/api";
};

export async function createLobby(mode: LobbyMode, hostName: string): Promise<{ code: string; hostId: string; lobby: LobbyView }> {
  const r = await fetch(`${apiBase()}/lobby`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, hostName }),
  });
  if (!r.ok) throw new Error(`Failed to create lobby (${r.status})`);
  return r.json();
}

export async function fetchLobby(code: string): Promise<{ playerId: string; lobby: LobbyView }> {
  const r = await fetch(`${apiBase()}/lobby/${encodeURIComponent(code)}`);
  if (r.status === 404) throw new Error("Lobby not found");
  if (r.status === 409) throw new Error("Lobby is no longer accepting joiners");
  if (!r.ok) throw new Error(`Failed to fetch lobby (${r.status})`);
  return r.json();
}

export type LobbyClient = {
  send: (msg: ClientMsg) => void;
  close: () => void;
  on: (handler: (msg: ServerMsg) => void) => () => void;
  isOpen: () => boolean;
  playerId: string;
  code: string;
};

export function connectLobby(code: string, playerId: string, name: string): LobbyClient {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${proto}//${window.location.host}${apiBase()}/lobby/ws?code=${encodeURIComponent(code)}&playerId=${encodeURIComponent(playerId)}&name=${encodeURIComponent(name)}`;
  const ws = new WebSocket(url);
  const handlers = new Set<(msg: ServerMsg) => void>();
  ws.addEventListener("message", (e) => {
    let msg: ServerMsg;
    try { msg = JSON.parse(e.data); } catch { return; }
    for (const h of handlers) {
      try { h(msg); } catch (err) { console.error(err); }
    }
  });
  return {
    playerId,
    code,
    send: (msg: ClientMsg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      else if (ws.readyState === WebSocket.CONNECTING) {
        const onOpen = () => { ws.send(JSON.stringify(msg)); ws.removeEventListener("open", onOpen); };
        ws.addEventListener("open", onOpen);
      }
    },
    close: () => { try { ws.close(); } catch { /* noop */ } },
    on: (h) => { handlers.add(h); return () => { handlers.delete(h); }; },
    isOpen: () => ws.readyState === WebSocket.OPEN,
  };
}
