import { Router, type IRouter } from "express";
import { createLobby, getLobby, publicView, makePlayerId } from "../lib/lobby";

const router: IRouter = Router();

router.post("/lobby", (req, res) => {
  const body = req.body as { mode?: string; hostName?: string };
  const mode = body.mode === "2v2" ? "2v2" : "1v1";
  const hostName = (body.hostName ?? "Commander").toString().slice(0, 20);
  const { lobby, hostId } = createLobby({ mode, hostName });
  res.json({ code: lobby.code, hostId, lobby: publicView(lobby) });
});

router.get("/lobby/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const lobby = getLobby(code);
  if (!lobby) {
    res.status(404).json({ error: "Lobby not found" });
    return;
  }
  if (lobby.status !== "waiting") {
    res.status(409).json({ error: "Lobby is not accepting joiners" });
    return;
  }
  // Issue a fresh playerId for the joiner
  res.json({ playerId: makePlayerId(), lobby: publicView(lobby) });
});

export default router;
