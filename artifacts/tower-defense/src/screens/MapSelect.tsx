import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MAPS, type MapDef, type Difficulty } from "@/game/data";

type Props = { onSelect: (m: MapDef) => void; onBack: () => void };

const diffColor: Record<Difficulty, string> = {
  Easy: "bg-zinc-700 text-zinc-200",
  Medium: "bg-amber-900/60 text-amber-200",
  Hard: "bg-red-900/70 text-red-200",
  Brutal: "bg-red-700 text-white",
};

export default function MapSelect({ onSelect, onBack }: Props) {
  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold tracking-tight">SELECT THEATER</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
          {MAPS.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className="group text-left rounded-sm border border-border bg-card overflow-hidden hover:border-primary transition-colors"
            >
              <div className="relative aspect-[8/5] overflow-hidden" style={{ background: m.bgColor }}>
                <svg viewBox="0 0 800 500" className="w-full h-full" preserveAspectRatio="none">
                  {m.decorations.map((d, i) => {
                    if (d.kind === "rect") return <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} fill={d.color} stroke={d.stroke} opacity={d.opacity ?? 1} />;
                    if (d.kind === "circle") return <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={d.opacity ?? 1} />;
                    if (d.kind === "text") return <text key={i} x={d.x} y={d.y} fill={d.color} fontSize={d.size} fontFamily="Inter, sans-serif" fontWeight="700" opacity={d.opacity ?? 1}>{d.text}</text>;
                    return <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={d.color} strokeWidth={d.width} strokeDasharray={d.dash?.join(" ")} opacity={d.opacity ?? 1} />;
                  })}
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none"
                    stroke={m.pathOutline}
                    strokeWidth="44"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none"
                    stroke={m.pathColor}
                    strokeWidth="36"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none"
                    stroke={m.centerStripe?.color ?? "rgba(255,255,255,0.2)"}
                    strokeWidth={m.centerStripe?.width ?? 2}
                    strokeDasharray={(m.centerStripe?.dash ?? [8, 10]).join(" ")}
                    strokeLinecap="round"
                  />
                  <circle cx={m.waypoints[0].x} cy={m.waypoints[0].y} r="14" fill="#f5f5f5" />
                  <circle cx={m.waypoints[m.waypoints.length - 1].x} cy={m.waypoints[m.waypoints.length - 1].y} r="14" fill="#dc2626" />
                </svg>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{m.name}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-semibold ${diffColor[m.difficulty]}`}>
                    {m.difficulty}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{m.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
