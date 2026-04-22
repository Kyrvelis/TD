import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MAPS, type MapDef } from "@/game/data";

type Props = { onSelect: (m: MapDef) => void; onBack: () => void };

export default function MapSelect({ onSelect, onBack }: Props) {
  return (
    <div className="h-screen w-screen bg-background flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold">Select a Map</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {MAPS.map(m => (
            <button
              key={m.id}
              onClick={() => onSelect(m)}
              className="group text-left rounded-lg border border-border bg-card overflow-hidden hover:border-primary transition-colors"
            >
              <div className="relative aspect-[8/5] overflow-hidden" style={{ background: m.bgColor }}>
                <svg viewBox="0 0 800 500" className="w-full h-full">
                  <polyline
                    points={m.waypoints.map(w => `${w.x},${w.y}`).join(" ")}
                    fill="none"
                    stroke="rgba(0,0,0,0.5)"
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
                  <circle cx={m.waypoints[0].x} cy={m.waypoints[0].y} r="14" fill="#7be59a" />
                  <circle cx={m.waypoints[m.waypoints.length - 1].x} cy={m.waypoints[m.waypoints.length - 1].y} r="14" fill="#ff5050" />
                </svg>
              </div>
              <div className="p-4">
                <div className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{m.name}</div>
                <div className="text-sm text-muted-foreground">{m.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
