import { useState } from "react";
import MainMenu from "./screens/MainMenu";
import MapSelect from "./screens/MapSelect";
import Game from "./game/Game";
import type { MapDef } from "./game/data";

type Screen = "menu" | "maps" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedMap, setSelectedMap] = useState<MapDef | null>(null);

  if (screen === "menu") return <MainMenu onPlay={() => setScreen("maps")} />;
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
