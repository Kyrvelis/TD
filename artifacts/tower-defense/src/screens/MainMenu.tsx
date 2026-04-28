import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, User, Users, Lock, PencilRuler } from "lucide-react";

type Props = {
  onSinglePlayer: () => void;
  onMultiplayer: () => void;
  onMapCreator: () => void;
};

export default function MainMenu({ onSinglePlayer, onMultiplayer, onMapCreator }: Props) {
  const [name, setName] = useState<string>(() => localStorage.getItem("bulwark.name") || "");
  const [editing, setEditing] = useState<boolean>(() => !localStorage.getItem("bulwark.name"));
  const [draft, setDraft] = useState<string>(name);

  useEffect(() => { if (name) localStorage.setItem("bulwark.name", name); }, [name]);

  const saveName = () => {
    const n = draft.trim().slice(0, 20);
    if (!n) return;
    setName(n); setEditing(false);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 20% 30%, hsl(0 84% 50% / 0.18), transparent 45%), radial-gradient(circle at 80% 80%, hsl(0 0% 25% / 0.4), transparent 55%)",
      }} />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "linear-gradient(0deg, #fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="relative text-center px-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crosshair className="w-14 h-14 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-7xl md:text-8xl font-black tracking-tight mb-3 text-foreground">
          BUL<span className="text-primary">WARK</span>
        </h1>
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-8">Tactical Defense System</div>

        <div className="flex flex-col gap-3 items-center w-72 mx-auto">
          <div className="w-full bg-card border border-border rounded-sm px-3 py-2 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {editing ? (
              <>
                <input
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  placeholder="Enter callsign"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                  maxLength={20}
                />
                <button onClick={saveName} className="text-xs text-primary uppercase tracking-wide font-semibold">Save</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-left text-sm font-mono">{name}</span>
                <button onClick={() => { setDraft(name); setEditing(true); }} className="text-[10px] text-muted-foreground uppercase tracking-wide hover:text-foreground">Edit</button>
              </>
            )}
          </div>

          <Button size="lg" className="w-full h-12 text-base rounded-sm" onClick={onSinglePlayer} disabled={!name && editing}>
            <User className="w-5 h-5 mr-2" /> Singleplayer
          </Button>
          <Button size="lg" variant="outline" className="w-full h-12 text-base rounded-sm relative" onClick={onMultiplayer} disabled={!name && editing}>
            <Users className="w-5 h-5 mr-2" /> Multiplayer
            <span className="absolute -top-2 -right-2 text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm font-bold">New</span>
          </Button>
          <Button size="lg" variant="outline" className="w-full h-12 text-base rounded-sm relative" onClick={onMapCreator} disabled>
            <PencilRuler className="w-5 h-5 mr-2" /> Map Creator
            <Lock className="w-3.5 h-3.5 ml-2 opacity-60" />
            <span className="absolute -top-2 -right-2 text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm font-bold">Soon</span>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 right-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        v0.4 · Iron Doctrine
      </div>
    </div>
  );
}
