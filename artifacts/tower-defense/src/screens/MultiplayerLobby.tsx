import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords, Shield, Bot, Users, Cpu, Zap, Eye } from "lucide-react";

export type MultiplayerMode = "1v1" | "2v2";

type Props = {
  onBack: () => void;
  onStart: (mode: MultiplayerMode, difficulty: AIDifficulty) => void;
};

export type AIDifficulty = "rookie" | "veteran" | "elite";

const DIFFICULTIES: { id: AIDifficulty; label: string; description: string; color: string }[] = [
  { id: "rookie", label: "Rookie", description: "AI builds slowly, basic upgrades.", color: "text-emerald-400" },
  { id: "veteran", label: "Veteran", description: "AI builds steadily and upgrades smartly.", color: "text-amber-400" },
  { id: "elite", label: "Elite", description: "AI plays aggressively with rapid economy.", color: "text-red-400" },
];

export default function MultiplayerLobby({ onBack, onStart }: Props) {
  const [mode, setMode] = useState<MultiplayerMode>("1v1");
  const [difficulty, setDifficulty] = useState<AIDifficulty>("veteran");

  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold tracking-tight">MULTIPLAYER LOBBY</h2>
        <span className="text-xs text-muted-foreground ml-2">Race against AI commanders. Survive longer than them to win.</span>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Mode select */}
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Game Mode</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <ModeCard
            active={mode === "1v1"}
            onClick={() => setMode("1v1")}
            icon={<Swords className="w-7 h-7" />}
            title="1 vs 1"
            sub="Free-for-all duel"
            description="You and 1 AI commander each face the same wave on your own lane. Last commander standing wins."
            slots={[
              { label: "YOU", color: "primary" },
              { label: "VS", color: "muted" },
              { label: "AI", color: "outline" },
            ]}
          />
          <ModeCard
            active={mode === "2v2"}
            onClick={() => setMode("2v2")}
            icon={<Shield className="w-7 h-7" />}
            title="2 vs 2"
            sub="Team battle"
            description="You + AI ally vs 2 enemy AIs. Income from kills is split with your teammate. Last team standing wins."
            slots={[
              { label: "YOU", color: "primary" },
              { label: "ALLY", color: "primary" },
              { label: "VS", color: "muted" },
              { label: "AI", color: "outline" },
              { label: "AI", color: "outline" },
            ]}
          />
        </div>

        {/* Difficulty */}
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">AI Difficulty</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {DIFFICULTIES.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`text-left p-3 rounded-sm border transition-colors ${
                difficulty === d.id
                  ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Cpu className={`w-4 h-4 ${d.color}`} />
                <div className={`font-bold ${d.color}`}>{d.label}</div>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug">{d.description}</div>
            </button>
          ))}
        </div>

        {/* Tactical briefing */}
        <div className="border border-border rounded-sm p-4 bg-card mb-6">
          <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> Recon Intel
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <div className="text-primary mt-0.5"><Zap className="w-4 h-4" /></div>
              <div>
                <div className="font-bold mb-0.5">Toggle View</div>
                <div className="text-muted-foreground leading-snug">Click an opponent in the header bar to spy on their lane mid-game. By default you can only see where their towers are placed — not what they are.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-primary mt-0.5"><Bot className="w-4 h-4" /></div>
              <div>
                <div className="font-bold mb-0.5">Build a Recon HQ</div>
                <div className="text-muted-foreground leading-snug">Higher recon intel reveals more of your opponent's towers and unlocks their funds. Tier 3 reveals all opponent towers and their full intel.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-primary mt-0.5"><Users className="w-4 h-4" /></div>
              <div>
                <div className="font-bold mb-0.5">Team Income (2v2)</div>
                <div className="text-muted-foreground leading-snug">Every kill in your lane shares 50% of the bounty with your teammate. Your AI ally specializes in economy and support.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-primary mt-0.5"><Swords className="w-4 h-4" /></div>
              <div>
                <div className="font-bold mb-0.5">Synced Waves</div>
                <div className="text-muted-foreground leading-snug">All commanders face the same wave at the same time. A single boss leak now costs 60+ lives — defend or die.</div>
              </div>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-lg rounded-sm"
          onClick={() => onStart(mode, difficulty)}
        >
          <Swords className="w-5 h-5 mr-2" /> Continue to Map Select
        </Button>
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, sub, description, slots }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  description: string;
  slots: { label: string; color: string }[];
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-sm border transition-colors ${
        active
          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
          : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`${active ? "text-primary" : "text-foreground"}`}>{icon}</div>
        <div>
          <div className="text-xl font-bold">{title}</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{sub}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground leading-snug mb-3">{description}</div>
      <div className="flex items-center gap-1.5">
        {slots.map((s, i) => (
          <span
            key={i}
            className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-bold ${
              s.color === "primary"
                ? "bg-primary text-primary-foreground"
                : s.color === "muted"
                ? "bg-muted text-muted-foreground"
                : "bg-card border border-border text-foreground"
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </button>
  );
}
