import { useEffect, useState } from "react";
import MainMenu from "./screens/MainMenu";
import MapSelect from "./screens/MapSelect";
import LobbyHome from "./screens/LobbyHome";
import LobbyRoom from "./screens/LobbyRoom";
import Game, { type GameMode } from "./game/Game";
import type { MapDef } from "./game/data";
import { MAPS } from "./game/data";
import type { LobbyClient, LobbyView } from "./lib/lobbyClient";

type Screen = "menu" | "mp-home" | "mp-room" | "maps" | "game";

type OnlineCtx = {
  client: LobbyClient;
  mySlot: number;
  isHost: boolean;
  lobbyMode: "1v1" | "2v2";
  slots: LobbyView["slots"];
};

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedMap, setSelectedMap] = useState<MapDef | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [toast, setToast] = useState<string | null>(null);

  // Multiplayer state
  const [mpRoom, setMpRoom] = useState<{ code: string; playerId: string; lobby: LobbyView } | null>(null);
  const [online, setOnline] = useState<OnlineCtx | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  // Honor `#join=CODE` deep links
  useEffect(() => {
    const hash = window.location.hash;
    const m = /#join=([A-Z0-9]{6})/i.exec(hash);
    if (m) {
      // Just route to the join screen; user can press Connect.
      setScreen("mp-home");
      // clear hash so refresh doesn't re-fire
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (screen === "menu") return (
    <>
      <MainMenu
        onSinglePlayer={() => { setGameMode("solo"); setOnline(null); setScreen("maps"); }}
        onMultiplayer={() => setScreen("mp-home")}
        onMapCreator={() => showToast("The map creator is coming in a future update.")}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-primary px-4 py-2 rounded-sm text-sm shadow-xl">
          {toast}
        </div>
      )}
    </>
  );

  if (screen === "mp-home") return (
    <LobbyHome
      onBack={() => setScreen("menu")}
      onJoined={({ code, playerId, lobby }) => {
        setMpRoom({ code, playerId, lobby });
        setScreen("mp-room");
      }}
    />
  );

  if (screen === "mp-room" && mpRoom) return (
    <LobbyRoom
      code={mpRoom.code}
      playerId={mpRoom.playerId}
      initialLobby={mpRoom.lobby}
      onLeave={() => { setMpRoom(null); setScreen("mp-home"); }}
      onStart={({ lobby, mapId, client }) => {
        const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];
        const mySlot = lobby.slots.findIndex((s) => s.kind === "player" && s.playerId === mpRoom.playerId);
        const isHost = lobby.hostId === mpRoom.playerId;
        setSelectedMap(map);
        setGameMode(lobby.mode);
        setOnline({ client, mySlot: Math.max(0, mySlot), isHost, lobbyMode: lobby.mode, slots: lobby.slots });
        setScreen("game");
      }}
    />
  );

  if (screen === "maps") return (
    <MapSelect
      onBack={() => setScreen("menu")}
      onSelect={(m) => { setSelectedMap(m); setScreen("game"); }}
    />
  );

  if (screen === "game" && selectedMap) {
    return (
      <Game
        map={selectedMap}
        mode={gameMode}
        difficulty="veteran"
        online={online ?? undefined}
        onExit={() => {
          if (online) { try { online.client.close(); } catch { /* noop */ } }
          setOnline(null);
          setMpRoom(null);
          setScreen("menu");
        }}
      />
    );
  }
  return null;
}

export default App;
