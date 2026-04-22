import { Button } from "@/components/ui/button";
import { Crosshair, Map as MapIcon } from "lucide-react";

type Props = { onPlay: () => void };

export default function MainMenu({ onPlay }: Props) {
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
        <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-6">Tactical Defense System</div>
        <p className="text-base text-muted-foreground mb-10 max-w-md mx-auto">
          Hold the line across thirty escalating waves.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <Button size="lg" className="w-64 h-12 text-base rounded-sm" onClick={onPlay}>
            <MapIcon className="w-5 h-5 mr-2" /> Choose Map
          </Button>
        </div>
      </div>
    </div>
  );
}
