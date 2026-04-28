import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Copy, Check, Crown, User, Bot, X, Loader2, Play, Users, Swords, Wifi, WifiOff,
} from "lucide-react";
import { connectLobby, type AIDifficulty, type LobbyClient, type LobbyView, type ServerMsg, type Slot } from "@/lib/lobbyClient";
import { MAPS, type MapDef } from "@/game/data";

type Props = {
  code: string;
  playerId: string;
  initialLobby: LobbyView;
  onLeave: () => void;
  onStart: (args: { lobby: LobbyView; mapId: string; seed: number; client: LobbyClient }) => void;
};

export default function LobbyRoom({ code, playerId, initialLobby, onLeave, onStart }: Props) {
  const [lobby, setLobby] = useState<LobbyView>(initialLobby);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string>(MAPS[0].id);
  const clientRef = useRef<LobbyClient | null>(null);
  const handedOffRef = useRef(false);
  const playerName = (typeof window !== "undefined" && localStorage.getItem("bulwark.name")) || "Commander";

  const isHost = lobby.hostId === playerId;

  useEffect(() => {
    const client = connectLobby(code, playerId, playerName);
    clientRef.current = client;
    const off = client.on((msg: ServerMsg) => {
      if (msg.t === "joined" || msg.t === "state") {
        setLobby(msg.lobby as LobbyView);
        setConnected(true);
      } else if (msg.t === "started") {
        handedOffRef.current = true;
        // Hand off to game with the live client (do NOT close on unmount)
        onStart({ lobby: msg.lobby as LobbyView, mapId: msg.mapId as string, seed: msg.seed as number, client });
      } else if (msg.t === "kicked") {
        setError("You were removed from the lobby.");
        setTimeout(onLeave, 1200);
      } else if (msg.t === "error") {
        setError(msg.msg as string);
      }
    });
    return () => {
      off();
      if (!handedOffRef.current) { try { client.close(); } catch { /* noop */ } }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerId]);

  const team0 = lobby.slots.filter((s) => s.team === 0);
  const team1 = lobby.slots.filter((s) => s.team === 1);
  const filledTeam0 = team0.filter((s) => s.kind !== "empty").length;
  const filledTeam1 = team1.filter((s) => s.kind !== "empty").length;
  const canStart = isHost && filledTeam0 > 0 && filledTeam1 > 0;

  const setAI = (slot: number, difficulty: AIDifficulty | null) => {
    clientRef.current?.send({ t: "setSlotAI", slot, difficulty });
  };
  const kick = (slot: number) => {
    clientRef.current?.send({ t: "kickSlot", slot });
  };
  const start = () => {
    clientRef.current?.send({ t: "startGame", mapId: selectedMapId });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  };

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}#join=${code}`;
  }, [code]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(inviteLink); } catch { /* noop */ }
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
      <div className="relative z-10 flex flex-col min-h-screen items-center px-6 py-8">
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onLeave} className="rounded-sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Leave lobby
            </Button>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]">
              {connected ? (
                <span className="flex items-center gap-1 text-emerald-400"><Wifi className="w-3 h-3" /> Connected</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400"><WifiOff className="w-3 h-3" /> Connecting…</span>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-4 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Lobby code</div>
              <div className="text-3xl font-black font-mono tracking-[0.4em] text-primary">{code}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Share this code so other commanders can join.</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copy} className="rounded-sm">
                {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Code</>}
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink} className="rounded-sm">
                <Copy className="w-3.5 h-3.5 mr-1" /> Link
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <TeamColumn
              label="Team Alpha"
              colorClass="emerald"
              slots={team0}
              isHost={isHost}
              hostId={lobby.hostId}
              myId={playerId}
              status={lobby.status}
              onSetAI={setAI}
              onKick={kick}
            />
            <TeamColumn
              label="Team Bravo"
              colorClass="red"
              slots={team1}
              isHost={isHost}
              hostId={lobby.hostId}
              myId={playerId}
              status={lobby.status}
              onSetAI={setAI}
              onKick={kick}
            />
          </div>

          <div className="bg-card border border-border rounded-sm p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-2">
                {lobby.mode === "1v1" ? <Swords className="w-3 h-3" /> : <Users className="w-3 h-3" />} {lobby.mode.toUpperCase()} match
              </div>
              <div className="text-[10px] text-muted-foreground">
                Filled: <span className="text-emerald-400 font-bold">{filledTeam0}</span>/{team0.length} vs <span className="text-red-400 font-bold">{filledTeam1}</span>/{team1.length}
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Map</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MAPS.map((m) => (
                <MapPick
                  key={m.id}
                  map={m}
                  selected={selectedMapId === m.id}
                  disabled={!isHost}
                  onSelect={() => setSelectedMapId(m.id)}
                />
              ))}
            </div>
            {!isHost && <div className="mt-2 text-[10px] text-muted-foreground italic">Only the host can change the map and start the match.</div>}
          </div>

          {error && (
            <div className="mb-3 p-3 border border-primary/40 bg-primary/5 rounded-sm text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            {isHost ? (
              <Button onClick={start} disabled={!canStart} size="lg" className="rounded-sm">
                <Play className="w-4 h-4 mr-1" /> Deploy match
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for host to deploy…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  label, colorClass, slots, isHost, hostId, myId, status, onSetAI, onKick,
}: {
  label: string;
  colorClass: "emerald" | "red";
  slots: Slot[];
  isHost: boolean;
  hostId: string;
  myId: string;
  status: LobbyView["status"];
  onSetAI: (slot: number, d: AIDifficulty | null) => void;
  onKick: (slot: number) => void;
}) {
  const accent = colorClass === "emerald" ? "border-emerald-700" : "border-red-700";
  const dot = colorClass === "emerald" ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className={`bg-card border ${accent} rounded-sm overflow-hidden`}>
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <div className="text-sm font-bold tracking-wide">{label}</div>
      </div>
      <div className="p-2 space-y-2">
        {slots.map((s) => (
          <SlotRow key={s.index} slot={s} isHost={isHost} hostId={hostId} myId={myId} status={status} onSetAI={onSetAI} onKick={onKick} />
        ))}
      </div>
    </div>
  );
}

function SlotRow({ slot, isHost, hostId, myId, status, onSetAI, onKick }: {
  slot: Slot;
  isHost: boolean;
  hostId: string;
  myId: string;
  status: LobbyView["status"];
  onSetAI: (slot: number, d: AIDifficulty | null) => void;
  onKick: (slot: number) => void;
}) {
  const isMe = slot.kind === "player" && slot.playerId === myId;
  const isSlotHost = slot.kind === "player" && slot.playerId === hostId;
  return (
    <div className={`p-2 rounded-sm border ${isMe ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-card border border-border">
          {slot.kind === "player" ? <User className="w-3.5 h-3.5" /> : slot.kind === "ai" ? <Bot className="w-3.5 h-3.5 text-amber-400" /> : <span className="text-muted-foreground text-xs">—</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold flex items-center gap-1.5 truncate">
            {slot.kind === "player" ? slot.playerName : slot.kind === "ai" ? `AI ${slot.aiDifficulty?.toUpperCase()}` : "Open slot"}
            {isSlotHost && <Crown className="w-3 h-3 text-amber-400" />}
            {isMe && <span className="text-[9px] uppercase tracking-wider bg-primary text-primary-foreground px-1 rounded-sm">YOU</span>}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {slot.kind === "empty" ? "Waiting for a commander…" : slot.kind === "ai" ? "Computer-controlled" : "Connected"}
          </div>
        </div>
        {isHost && status === "waiting" && slot.kind === "player" && !isSlotHost && (
          <Button size="sm" variant="ghost" onClick={() => onKick(slot.index)} className="rounded-sm h-7 px-2 text-muted-foreground hover:text-primary">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {isHost && status === "waiting" && slot.kind !== "player" && (
        <div className="mt-2 flex flex-wrap gap-1">
          <AIBtn label="Empty" active={slot.kind === "empty"} onClick={() => onSetAI(slot.index, null)} />
          <AIBtn label="AI Rookie" active={slot.kind === "ai" && slot.aiDifficulty === "rookie"} onClick={() => onSetAI(slot.index, "rookie")} />
          <AIBtn label="AI Veteran" active={slot.kind === "ai" && slot.aiDifficulty === "veteran"} onClick={() => onSetAI(slot.index, "veteran")} />
          <AIBtn label="AI Elite" active={slot.kind === "ai" && slot.aiDifficulty === "elite"} onClick={() => onSetAI(slot.index, "elite")} />
        </div>
      )}
    </div>
  );
}

function AIBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-bold px-2 py-1 rounded-sm border transition-colors ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function MapPick({ map, selected, disabled, onSelect }: { map: MapDef; selected: boolean; disabled: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`text-left p-2 rounded-sm border transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div className="text-xs font-bold tracking-tight">{map.name}</div>
      <div className="text-[10px] text-muted-foreground line-clamp-1">{map.description}</div>
    </button>
  );
}
