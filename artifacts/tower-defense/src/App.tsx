import { useState } from "react";
import MainMenu from "./screens/MainMenu";
import MapSelect from "./screens/MapSelect";
import MultiplayerLobby, { type MultiplayerMode, type AIDifficulty } from "./screens/MultiplayerLobby";
import Game, { type GameMode } from "./game/Game";
import type { MapDef } from "./game/data";

type Screen = "menu" | "lobby" | "maps" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedMap, setSelectedMap] = useState<MapDef | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("veteran");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  if (screen === "menu") return (
    <>
      <MainMenu
        onSinglePlayer={() => { setGameMode("solo"); setScreen("maps"); }}
        onMultiplayer={() => setScreen("lobby")}
        onMapCreator={() => showToast("The map creator is coming in a future update.")}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-primary px-4 py-2 rounded-sm text-sm shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
  if (screen === "lobby") return (
    <MultiplayerLobby
      onBack={() => setScreen("menu")}
      onStart={(mode: MultiplayerMode, diff: AIDifficulty) => {
        setGameMode(mode);
        setDifficulty(diff);
        setScreen("maps");
      }}
    />
  );
  if (screen === "maps") return (
    <MapSelect
      onBack={() => setScreen(gameMode === "solo" ? "menu" : "lobby")}
      onSelect={(m) => { setSelectedMap(m); setScreen("game"); }}
    />
  );
  if (screen === "game" && selectedMap) {
    return <Game map={selectedMap} mode={gameMode} difficulty={difficulty} onExit={() => setScreen("menu")} />;
  }
  return null;
}

export default App;
