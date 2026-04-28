import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { getLobby, attachPlayer, detachPlayer, setSlotAI, kickSlot, startGame, relayInGame, type AIDifficulty } from "./lib/lobby";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/api/lobby/ws") {
    socket.destroy();
    return;
  }
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const playerId = url.searchParams.get("playerId") ?? "";
  const name = url.searchParams.get("name") ?? "";
  const lobby = getLobby(code);
  if (!lobby || !playerId) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, { code, playerId, name });
  });
});

wss.on("connection", (ws: WebSocket, _req: unknown, ctx: { code: string; playerId: string; name: string }) => {
  const lobby = getLobby(ctx.code);
  if (!lobby) { ws.close(); return; }
  const result = attachPlayer(lobby, ctx.playerId, ctx.name, ws);
  if (!result.ok) {
    ws.send(JSON.stringify({ t: "error", msg: result.reason ?? "Cannot join" }));
    ws.close();
    return;
  }
  ws.on("message", (data) => {
    let msg: { t: string; [k: string]: unknown };
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (typeof msg !== "object" || !msg || typeof msg.t !== "string") return;
    if (msg.t === "setSlotAI") {
      setSlotAI(lobby, ctx.playerId, msg["slot"] as number, (msg["difficulty"] as AIDifficulty | null) ?? null);
      return;
    }
    if (msg.t === "kickSlot") {
      kickSlot(lobby, ctx.playerId, msg["slot"] as number);
      return;
    }
    if (msg.t === "startGame") {
      startGame(lobby, ctx.playerId, (msg["mapId"] as string) ?? "metro");
      return;
    }
    relayInGame(lobby, ctx.playerId, msg);
  });
  ws.on("close", () => {
    detachPlayer(lobby, ctx.playerId);
  });
  ws.on("error", () => {
    detachPlayer(lobby, ctx.playerId);
  });
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening (HTTP + WebSocket)");
});
