import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Lock } from "lucide-react";
import { MAPS, type MapDef, type Difficulty } from "@/game/data";

type Props = { onSelect: (m: MapDef) => void; onBack: () => void };

const diffColor: Record<Difficulty, string> = {
  Easy: "bg-zinc-700 text-zinc-200",
  Medium: "bg-amber-900/60 text-amber-200",
  Hard: "bg-red-900/70 text-red-200",
  Brutal: "bg-red-700 text-white",
};

const noBuildTone: Record<string, string> = {
  building: "rgba(50,52,58,0.0)",
  water: "rgba(40,90,140,0.4)",
  park: "rgba(34,140,80,0.4)",
  platform: "rgba(80,80,90,0.5)",
  wall: "rgba(70,70,80,0.5)",
  rail: "rgba(110,40,40,0.4)",
};

export default function MapSelect({ onSelect, onBack }: Props) {
  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold tracking-tight">SELECT THEATER</h2>
        <span className="text-xs text-muted-foreground ml-2">3 maps available · more via map creator (soon)</span>
      </div>
      <div className="flex-1 overflow-auto p-6 flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-7xl mx-auto w-full">
          {MAPS.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className="group text-left rounded-sm border border-border bg-card overflow-hidden hover:border-primary transition-colors shadow-lg"
            >
              <div className="relative aspect-[8/5] overflow-hidden" style={{ background: m.bgColor }}>
                <svg viewBox="0 0 800 500" className="w-full h-full" preserveAspectRatio="none">
                  {m.decorations.map((d, i) => {
                    if (d.kind === "rect") return <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.color} stroke={d.stroke} opacity={d.opacity ?? 1} rx={(d as { radius?: number }).radius ?? 0} />;
                    if (d.kind === "circle") return <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={d.opacity ?? 1} />;
                    if (d.kind === "text") return <text key={i} x={d.x} y={d.y} fill={d.color} fontSize={d.size} fontFamily="Inter, sans-serif" fontWeight={d.weight ?? 700} opacity={d.opacity ?? 1}>{d.text}</text>;
                    if (d.kind === "line") return <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth={d.width} strokeDasharray={d.dash?.join(" ")} opacity={d.opacity ?? 1} />;
                    if (d.kind === "windowGrid") {
                      const cw = d.w / d.cols; const rh = d.h / d.rows;
                      const cells: React.ReactElement[] = [];
                      for (let r = 0; r < d.rows; r++) for (let c = 0; c < d.cols; c++) {
                        if (((c * 7 + r * 11 + d.x + d.y) % 5) >= 2) {
                          cells.push(<rect key={`${i}-${r}-${c}`} x={d.x + c * cw + 1} y={d.y + r * rh + 1} width={Math.max(1, cw - 2)} height={Math.max(1, rh - 2)} fill={d.color} opacity={(d.opacity ?? 0.85) * (0.4 + ((c + r) % 3) * 0.2)} />);
                        }
                      }
                      return <g key={i}>{cells}</g>;
                    }
                    return null;
                  })}
                  {/* path outline */}
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none" stroke={m.pathOutline}
                    strokeWidth={m.pathOutlineWidth ?? 44} strokeLinecap="round" strokeLinejoin="round"
                  />
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none" stroke={m.pathColor}
                    strokeWidth={m.pathWidth ?? 36} strokeLinecap="round" strokeLinejoin="round"
                  />
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none" stroke={m.pathStripeColor ?? "rgba(255,255,255,0.2)"}
                    strokeWidth={m.pathStripeWidth ?? 2}
                    strokeDasharray={(m.pathStripeDash ?? [8, 10]).join(" ")}
                    strokeLinecap="round"
                  />
                  {/* No-build zone overlays (only for non-building tones; buildings already drawn) */}
                  {m.noBuildZones.map((z, i) => {
                    if (z.tone === "building" || !z.tone) return null;
                    const fill = noBuildTone[z.tone] ?? "rgba(80,80,80,0.3)";
                    if (z.kind === "rect") return <rect key={`nb-${i}`} x={z.x} y={z.y} width={z.w} height={z.h} fill={fill} stroke="rgba(255,80,80,0.35)" strokeDasharray="4 4" />;
                    return <circle key={`nb-${i}`} cx={z.x} cy={z.y} r={z.r} fill={fill} stroke="rgba(255,80,80,0.35)" strokeDasharray="4 4" />;
                  })}
                  <circle cx={m.waypoints[0].x} cy={m.waypoints[0].y} r="14" fill="#0a0a0a" />
                  <circle cx={m.waypoints[0].x} cy={m.waypoints[0].y} r="11" fill="#e8e8ec" />
                  <circle cx={m.waypoints[m.waypoints.length - 1].x} cy={m.waypoints[m.waypoints.length - 1].y} r="14" fill="#0a0a0a" />
                  <circle cx={m.waypoints[m.waypoints.length - 1].x} cy={m.waypoints[m.waypoints.length - 1].y} r="11" fill="#dc2626" />
                </svg>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{m.name}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-semibold ${diffColor[m.difficulty]}`}>
                    {m.difficulty}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground leading-snug">{m.description}</div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                  <Layers className="w-3 h-3" />
                  <span>{m.waypoints.length - 1} segments · {m.noBuildZones.length} no-build zones</span>
                </div>
              </div>
            </button>
          ))}
          {/* Locked map creator slot */}
          <div className="rounded-sm border border-dashed border-border/50 bg-card/30 overflow-hidden flex items-center justify-center aspect-[8/5] md:aspect-auto md:min-h-[280px] opacity-70">
            <div className="text-center px-4">
              <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-bold mb-1">Custom Maps</div>
              <div className="text-[11px] text-muted-foreground leading-snug">Build your own with the Map Creator. Coming soon.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
