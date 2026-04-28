import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Plus, LogIn, Users, Swords, AlertCircle } from "lucide-react";
import { createLobby, fetchLobby, type LobbyMode, type LobbyView } from "@/lib/lobbyClient";

type Props = {
  onBack: () => void;
  onJoined: (args: { code: string; playerId: string; lobby: LobbyView; isHost: boolean }) => void;
};

export default function LobbyHome({ onBack, onJoined }: Props) {
  const [mode, setMode] = useState<LobbyMode>("1v1");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerName = (typeof window !== "undefined" && localStorage.getItem("bulwark.name")) || "Commander";

  const doCreate = async () => {
    setBusy(true); setError(null);
    try {
      const r = await createLobby(mode, playerName);
      onJoined({ code: r.code, playerId: r.hostId, lobby: r.lobby, isHost: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lobby");
    } finally { setBusy(false); }
  };

  const doJoin = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) { setError("Lobby codes are 6 characters."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetchLobby(c);
      onJoined({ code: c, playerId: r.playerId, lobby: r.lobby, isHost: r.lobby.hostId === r.playerId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join lobby");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 flex flex-col min-h-screen items-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-sm mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-[0.4em] text-primary mb-1">Multiplayer</div>
            <h1 className="text-3xl font-black tracking-tight">JOIN THE FRONT LINE</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Each commander defends their own lane. Empty slots can be filled by AI before the match starts.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border mb-4">
            <TabBtn active={tab === "create"} onClick={() => { setTab("create"); setError(null); }}>
              <Plus className="w-4 h-4" /> Create lobby
            </TabBtn>
            <TabBtn active={tab === "join"} onClick={() => { setTab("join"); setError(null); }}>
              <LogIn className="w-4 h-4" /> Join with code
            </TabBtn>
          </div>

          {tab === "create" ? (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Match format</div>
                <div className="grid grid-cols-2 gap-2">
                  <ModeCard
                    selected={mode === "1v1"} onClick={() => setMode("1v1")}
                    icon={<Swords className="w-5 h-5" />}
                    title="1 vs 1"
                    desc="Head to head. Recon Intel reveals your foe's defenses."
                    slots={2}
                  />
                  <ModeCard
                    selected={mode === "2v2"} onClick={() => setMode("2v2")}
                    icon={<Users className="w-5 h-5" />}
                    title="2 vs 2"
                    desc="Team play. 50% income share with your ally on every kill."
                    slots={4}
                  />
                </div>
              </div>
              <Button onClick={doCreate} disabled={busy} size="lg" className="w-full rounded-sm">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Open lobby
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Lobby code</div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="A1B2C3"
                  className="w-full bg-card border border-border rounded-sm px-4 py-3 text-2xl font-mono tracking-[0.4em] text-center uppercase focus:border-primary outline-none"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") doJoin(); }}
                />
                <div className="text-[10px] text-muted-foreground mt-1 text-center">
                  Ask the host for the 6-character code.
                </div>
              </div>
              <Button onClick={doJoin} disabled={busy || code.length !== 6} size="lg" className="w-full rounded-sm">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                Connect
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 border border-primary/40 bg-primary/5 rounded-sm flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 text-[10px] text-muted-foreground border-t border-border pt-4 leading-relaxed">
            Joining as <span className="text-foreground font-bold">{playerName}</span>. Change your callsign on the main menu.
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold tracking-wide border-b-2 -mb-px transition-colors ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ModeCard({ selected, onClick, icon, title, desc, slots }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; slots: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-sm border transition-all ${
        selected ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(220,38,38,0.3)]" : "border-border hover:border-primary/40 bg-card/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={selected ? "text-primary" : "text-muted-foreground"}>{icon}</div>
        <div className="text-base font-bold">{title}</div>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{slots} slots</span>
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug">{desc}</div>
    </button>
  );
}
