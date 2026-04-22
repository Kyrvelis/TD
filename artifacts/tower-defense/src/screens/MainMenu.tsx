import { Button } from "@/components/ui/button";
import { Shield, Swords, Map as MapIcon } from "lucide-react";

type Props = { onPlay: () => void };

export default function MainMenu({ onPlay }: Props) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-background via-[hsl(217_40%_12%)] to-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 20% 30%, hsl(199 89% 55% / 0.3), transparent 40%), radial-gradient(circle at 80% 70%, hsl(142 71% 45% / 0.25), transparent 45%)",
      }} />
      <div className="relative text-center px-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-12 h-12 text-primary" />
          <Swords className="w-12 h-12 text-accent" />
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          BULWARK
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">v.01</p>
        <div className="flex flex-col gap-3 items-center">
          <Button size="lg" className="w-64 h-12 text-base" onClick={onPlay}>
            <MapIcon className="w-5 h-5 mr-2" /> Choose Map
          </Button>
          <div className="text-xs text-muted-foreground mt-6 max-w-sm">v.0.1</div>
        </div>
      </div>
    </div>
  );
}
