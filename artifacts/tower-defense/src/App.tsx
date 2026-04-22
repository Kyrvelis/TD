import { useState } from "react";
import MainMenu from "./screens/MainMenu";
import MapSelect from "./screens/MapSelect";
import Game from "./game/Game";
import type { MapDef } from "./game/data";

type Screen = "menu" | "maps" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedMap, setSelectedMap] = useState<MapDef | null>(null);
  const [mpToast, setMpToast] = useState(false);

  if (screen === "menu") return (
    <>
      <MainMenu
        onSinglePlayer={() => setScreen("maps")}
        onMultiplayer={() => { setMpToast(true); setTimeout(() => setMpToast(false), 2400); }}
      />
      {mpToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-primary px-4 py-2 rounded-sm text-sm shadow-xl">
          Multiplayer is coming in the next update.
        </div>
      )}
    </>
  );
  if (screen === "maps") return (
    <MapSelect
      onBack={() => setScreen("menu")}
      onSelect={(m) => { setSelectedMap(m); setScreen("game"); }}
    />
  );
  if (screen === "game" && selectedMap) {
    return <Game map={selectedMap} onExit={() => setScreen("menu")} />;
  }
  return null;
}

export default App;
