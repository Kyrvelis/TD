export type Point = { x: number; y: number };

export type Difficulty = "Easy" | "Medium" | "Hard" | "Brutal";

export type NoBuildZone =
  | { kind: "rect"; x: number; y: number; w: number; h: number; label?: string; tone?: "building" | "water" | "park" | "platform" | "wall" | "rail" }
  | { kind: "circle"; x: number; y: number; r: number; label?: string; tone?: "building" | "water" | "park" | "platform" | "wall" | "rail" };

export type Decoration =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; opacity?: number; stroke?: string; strokeWidth?: number; radius?: number }
  | { kind: "circle"; x: number; y: number; r: number; color: string; opacity?: number; stroke?: string }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number; dash?: number[]; opacity?: number; cap?: "round" | "butt" }
  | { kind: "text"; x: number; y: number; text: string; color: string; size: number; opacity?: number; weight?: number; align?: "left" | "center" | "right" }
  | { kind: "polyline"; points: Point[]; color: string; width: number; dash?: number[]; opacity?: number }
  | { kind: "windowGrid"; x: number; y: number; w: number; h: number; cols: number; rows: number; color: string; opacity?: number }
  | { kind: "bridge"; from: Point; to: Point; deckColor: string; railColor: string; width: number };

export type MapDef = {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  bgColor: string;
  pathColor: string;
  pathOutline: string;
  pathStripeColor?: string;
  pathStripeDash?: [number, number];
  pathStripeWidth?: number;
  pathWidth?: number;
  pathOutlineWidth?: number;
  decorations: Decoration[];
  topDecorations?: Decoration[]; // drawn after path
  noBuildZones: NoBuildZone[];
  waypoints: Point[];
};

// =========================================================================
// MAPS — three highly detailed locales with realistic layouts and no-build zones
// =========================================================================

const interstate: MapDef = {
  id: "interstate",
  name: "Interstate 95",
  difficulty: "Medium",
  description: "Six-lane highway with cloverleaf interchange and a perpendicular overpass.",
  bgColor: "#0e1014",
  pathColor: "#2c2d31",
  pathOutline: "#050608",
  pathStripeColor: "rgba(255,213,79,0.85)",
  pathStripeDash: [22, 18],
  pathStripeWidth: 2.5,
  pathWidth: 38,
  pathOutlineWidth: 46,
  // Path: enters left at lane height, goes right, exits down a ramp (cloverleaf), 
  // loops up onto an overpass crossing the highway, and continues to the right exit
  waypoints: [
    { x: 0, y: 110 }, { x: 200, y: 110 }, { x: 260, y: 130 },
    { x: 290, y: 180 }, { x: 280, y: 240 }, { x: 240, y: 290 },
    { x: 200, y: 320 }, { x: 200, y: 380 }, { x: 240, y: 410 },
    { x: 320, y: 410 }, { x: 380, y: 380 }, { x: 410, y: 320 },
    { x: 410, y: 240 }, { x: 440, y: 200 }, { x: 510, y: 190 },
    { x: 580, y: 200 }, { x: 600, y: 230 }, { x: 600, y: 290 },
    { x: 640, y: 320 }, { x: 720, y: 320 }, { x: 760, y: 280 },
    { x: 800, y: 280 },
  ],
  decorations: [
    // grass shoulder bands
    { kind: "rect", x: 0, y: 0, w: 800, h: 60, color: "#14191a" },
    { kind: "rect", x: 0, y: 460, w: 800, h: 40, color: "#14191a" },
    // outer highway main lanes (decorative road rendered behind the path band)
    { kind: "rect", x: 0, y: 78, w: 800, h: 76, color: "#1f2024" },
    { kind: "rect", x: 0, y: 78, w: 800, h: 1, color: "#3a3a3a", opacity: 0.5 },
    { kind: "rect", x: 0, y: 153, w: 800, h: 1, color: "#3a3a3a", opacity: 0.5 },
    // lane stripes on the outer highway
    { kind: "line", x1: 0, y1: 100, x2: 800, y2: 100, color: "rgba(255,255,255,0.18)", width: 1, dash: [16, 14] },
    { kind: "line", x1: 0, y1: 130, x2: 800, y2: 130, color: "rgba(255,213,79,0.5)", width: 1.5, dash: [22, 18] },
    // concrete center divider
    { kind: "rect", x: 0, y: 116, w: 800, h: 4, color: "#3a3a3a" },
    // perpendicular overpass road approach (decorative cross road)
    { kind: "rect", x: 660, y: 0, w: 60, h: 500, color: "#1f2024", opacity: 0.55 },
    { kind: "line", x1: 690, y1: 0, x2: 690, y2: 500, color: "rgba(255,213,79,0.45)", width: 1.5, dash: [16, 14], opacity: 0.7 },
    // mile markers / signs
    { kind: "rect", x: 30, y: 70, w: 28, h: 12, color: "#3a3a00", stroke: "#ffd54f" },
    { kind: "text", x: 33, y: 80, text: "MI 12", color: "#ffd54f", size: 9, weight: 700 },
    { kind: "rect", x: 740, y: 70, w: 28, h: 12, color: "#1a3a1a", stroke: "#7ad77a" },
    { kind: "text", x: 745, y: 80, text: "EXIT", color: "#7ad77a", size: 8, weight: 700 },
    // grass detail (trees/bushes on shoulders)
    { kind: "circle", x: 60, y: 30, r: 10, color: "#1c2820" },
    { kind: "circle", x: 75, y: 36, r: 8, color: "#1c2820" },
    { kind: "circle", x: 480, y: 30, r: 12, color: "#1c2820" },
    { kind: "circle", x: 500, y: 40, r: 9, color: "#1c2820" },
    { kind: "circle", x: 80, y: 480, r: 10, color: "#1c2820" },
    { kind: "circle", x: 110, y: 488, r: 8, color: "#1c2820" },
    { kind: "circle", x: 540, y: 478, r: 10, color: "#1c2820" },
    // small lake at top right (no-build)
    { kind: "rect", x: 580, y: 8, w: 70, h: 56, color: "#0c2435", radius: 14 },
    { kind: "circle", x: 612, y: 24, r: 3, color: "#1c4a66", opacity: 0.7 },
    { kind: "circle", x: 624, y: 38, r: 3, color: "#1c4a66", opacity: 0.7 },
    { kind: "circle", x: 605, y: 48, r: 2, color: "#1c4a66", opacity: 0.7 },
    // gas station decoration (bottom-left)
    { kind: "rect", x: 18, y: 410, w: 110, h: 40, color: "#1a1a1a" },
    { kind: "rect", x: 18, y: 410, w: 110, h: 6, color: "#dc2626" },
    { kind: "text", x: 28, y: 432, text: "FUEL", color: "#fff", size: 11, weight: 800 },
    { kind: "rect", x: 90, y: 422, w: 20, h: 22, color: "#0a0a0a" },
    { kind: "rect", x: 92, y: 426, w: 6, h: 8, color: "#fff37a" },
    // billboards
    { kind: "rect", x: 360, y: 30, w: 80, h: 26, color: "#1a1a1a", stroke: "#3a3a3a" },
    { kind: "text", x: 372, y: 49, text: "BULWARK", color: "#dc2626", size: 12, weight: 900 },
  ],
  topDecorations: [
    // bridge crossing the highway perpendicular at x=660-720
    { kind: "bridge", from: { x: 690, y: 60 }, to: { x: 690, y: 280 }, deckColor: "#3a3a3e", railColor: "#dc2626", width: 60 },
    { kind: "bridge", from: { x: 690, y: 320 }, to: { x: 690, y: 470 }, deckColor: "#3a3a3e", railColor: "#dc2626", width: 60 },
  ],
  noBuildZones: [
    // small lake top right
    { kind: "rect", x: 580, y: 8, w: 70, h: 56, tone: "water", label: "WATER" },
    // tree clusters
    { kind: "circle", x: 70, y: 32, r: 16, tone: "park" },
    { kind: "circle", x: 490, y: 36, r: 18, tone: "park" },
    { kind: "circle", x: 100, y: 484, r: 18, tone: "park" },
    { kind: "circle", x: 540, y: 480, r: 14, tone: "park" },
    // gas station
    { kind: "rect", x: 18, y: 410, w: 110, h: 50, tone: "building", label: "FUEL" },
    // billboard
    { kind: "rect", x: 358, y: 28, w: 84, h: 30, tone: "building" },
    // perpendicular overpass deck region (no building on the bridge or its approaches near path)
    { kind: "rect", x: 660, y: 0, w: 60, h: 60, tone: "wall", label: "BRIDGE" },
    { kind: "rect", x: 660, y: 320, w: 60, h: 60, tone: "wall", label: "BRIDGE" },
  ],
};

const subway: MapDef = {
  id: "subway",
  name: "Metro Line 7",
  difficulty: "Hard",
  description: "Three subway tunnels, four stations, sharp platform turns. Stay off the platforms and tracks.",
  bgColor: "#080a0c",
  pathColor: "#23252a",
  pathOutline: "#000",
  pathStripeColor: "rgba(220,38,38,0.55)",
  pathStripeDash: [4, 14],
  pathStripeWidth: 1.5,
  pathWidth: 36,
  pathOutlineWidth: 44,
  // path follows the central tunnel with sharp 90-degree platform turns at stations
  waypoints: [
    { x: 0, y: 100 }, { x: 130, y: 100 }, { x: 170, y: 130 }, { x: 170, y: 220 },
    { x: 200, y: 250 }, { x: 380, y: 250 }, { x: 410, y: 220 }, { x: 410, y: 130 },
    { x: 440, y: 100 }, { x: 540, y: 100 }, { x: 570, y: 130 }, { x: 570, y: 230 },
    { x: 600, y: 260 }, { x: 670, y: 260 }, { x: 700, y: 290 }, { x: 700, y: 410 },
    { x: 730, y: 440 }, { x: 800, y: 440 },
  ],
  decorations: [
    // Concrete walls/sub-floor base
    { kind: "rect", x: 0, y: 0, w: 800, h: 500, color: "#0e1114" },
    // upper platforms (long horizontal)
    { kind: "rect", x: 0, y: 60, w: 800, h: 14, color: "#2c2e34" },
    { kind: "rect", x: 0, y: 60, w: 800, h: 2, color: "#48484e" },
    { kind: "rect", x: 0, y: 72, w: 800, h: 2, color: "#dc2626", opacity: 0.7 },
    // bottom platform
    { kind: "rect", x: 0, y: 460, w: 800, h: 40, color: "#1a1d22" },
    { kind: "rect", x: 0, y: 460, w: 800, h: 2, color: "#48484e" },
    // additional decorative parallel tunnel (Line 9, top)
    { kind: "rect", x: 0, y: 14, w: 800, h: 38, color: "#1a1d22" },
    { kind: "line", x1: 0, y1: 32, x2: 800, y2: 32, color: "rgba(255,255,255,0.12)", width: 1, dash: [3, 11] },
    { kind: "rect", x: 290, y: 22, w: 12, h: 22, color: "#3a3a3a" }, // train silhouette
    { kind: "rect", x: 302, y: 22, w: 30, h: 22, color: "#dc2626" },
    { kind: "rect", x: 332, y: 22, w: 30, h: 22, color: "#dc2626" },
    { kind: "rect", x: 304, y: 26, w: 4, h: 4, color: "#fff37a" },
    { kind: "rect", x: 312, y: 26, w: 4, h: 4, color: "#fff37a" },
    { kind: "rect", x: 320, y: 26, w: 4, h: 4, color: "#fff37a" },
    // tunnel pillars between platforms
    ...Array.from({ length: 10 }, (_, i) => ({
      kind: "rect" as const, x: 30 + i * 80, y: 88, w: 8, h: 12, color: "#2a2c30", stroke: "#48484e",
    })),
    // station name signs
    { kind: "rect", x: 30, y: 6, w: 60, h: 14, color: "#dc2626" },
    { kind: "text", x: 36, y: 17, text: "LINE 7", color: "#fff", size: 10, weight: 800 },
    { kind: "rect", x: 720, y: 6, w: 60, h: 14, color: "#dc2626" },
    { kind: "text", x: 727, y: 17, text: "TERMINAL", color: "#fff", size: 8, weight: 800 },
    // station labels along the route
    { kind: "text", x: 60, y: 95, text: "GRAND ST", color: "#48484e", size: 9, weight: 700 },
    { kind: "text", x: 230, y: 245, text: "MIDTOWN", color: "#48484e", size: 9, weight: 700 },
    { kind: "text", x: 470, y: 95, text: "UNION", color: "#48484e", size: 9, weight: 700 },
    { kind: "text", x: 720, y: 295, text: "PARK PL", color: "#48484e", size: 9, weight: 700 },
    // emergency lights on ceiling
    ...Array.from({ length: 16 }, (_, i) => ({
      kind: "rect" as const, x: 30 + i * 50, y: 0, w: 8, h: 4,
      color: i % 4 === 0 ? "#dc2626" : "#fff37a", opacity: 0.85,
    })),
    // turnstiles at stations
    { kind: "rect", x: 200, y: 470, w: 22, h: 18, color: "#3a3a3a" },
    { kind: "rect", x: 224, y: 470, w: 22, h: 18, color: "#3a3a3a" },
    { kind: "rect", x: 248, y: 470, w: 22, h: 18, color: "#3a3a3a" },
    { kind: "text", x: 200, y: 482, text: "EXIT", color: "#fff37a", size: 7, weight: 700 },
    // tracks decoration alongside the path (third rail)
    // benches on platforms
    { kind: "rect", x: 100, y: 76, w: 28, h: 4, color: "#5a4a30" },
    { kind: "rect", x: 100, y: 80, w: 4, h: 6, color: "#5a4a30" },
    { kind: "rect", x: 124, y: 80, w: 4, h: 6, color: "#5a4a30" },
    { kind: "rect", x: 480, y: 76, w: 28, h: 4, color: "#5a4a30" },
    { kind: "rect", x: 480, y: 80, w: 4, h: 6, color: "#5a4a30" },
    { kind: "rect", x: 504, y: 80, w: 4, h: 6, color: "#5a4a30" },
    // electric sub-station (no-build)
    { kind: "rect", x: 90, y: 380, w: 70, h: 60, color: "#1a1a1a", stroke: "#3a3a3a" },
    { kind: "text", x: 96, y: 395, text: "SUB-STA", color: "#fff37a", size: 8, weight: 800 },
    { kind: "rect", x: 96, y: 400, w: 8, h: 32, color: "#3a3a3a" },
    { kind: "rect", x: 110, y: 400, w: 8, h: 32, color: "#3a3a3a" },
    { kind: "rect", x: 124, y: 400, w: 8, h: 32, color: "#3a3a3a" },
    { kind: "rect", x: 138, y: 400, w: 8, h: 32, color: "#3a3a3a" },
    // ventilation grate
    { kind: "rect", x: 470, y: 360, w: 80, h: 70, color: "#1a1d22" },
    ...Array.from({ length: 6 }, (_, i) => ({
      kind: "rect" as const, x: 478, y: 370 + i * 10, w: 64, h: 4, color: "#3a3a3a",
    })),
    // graffiti accents
    { kind: "text", x: 280, y: 130, text: "BULWARK", color: "#dc2626", size: 10, weight: 900, opacity: 0.4 },
  ],
  topDecorations: [
    // bridge over the path: the upper Line 9 tunnel passes above at x=400
  ],
  noBuildZones: [
    // upper platform
    { kind: "rect", x: 0, y: 60, w: 800, h: 14, tone: "platform", label: "PLATFORM" },
    // bottom platform
    { kind: "rect", x: 0, y: 462, w: 800, h: 38, tone: "platform", label: "PLATFORM" },
    // upper tunnel decorative (Line 9)
    { kind: "rect", x: 0, y: 0, w: 800, h: 56, tone: "rail", label: "LINE 9" },
    // electric sub-station
    { kind: "rect", x: 90, y: 380, w: 70, h: 60, tone: "wall", label: "SUB-STA" },
    // ventilation grate
    { kind: "rect", x: 470, y: 360, w: 80, h: 70, tone: "wall", label: "VENT" },
    // service alcoves
    { kind: "rect", x: 320, y: 100, w: 40, h: 40, tone: "wall" },
    { kind: "rect", x: 620, y: 100, w: 40, h: 40, tone: "wall" },
    { kind: "rect", x: 240, y: 380, w: 50, h: 40, tone: "wall" },
  ],
};

const city: MapDef = {
  id: "city",
  name: "Downtown Manhattan",
  difficulty: "Brutal",
  description: "Dense city grid with skyscrapers, a river, a park, and an elevated railway crossing the streets.",
  bgColor: "#0a0b0e",
  pathColor: "#1f2024",
  pathOutline: "#000",
  pathStripeColor: "rgba(255,213,79,0.7)",
  pathStripeDash: [12, 12],
  pathStripeWidth: 2,
  pathWidth: 32,
  pathOutlineWidth: 40,
  // path winds through city blocks following streets (90-degree turns)
  waypoints: [
    { x: 0, y: 90 }, { x: 130, y: 90 }, { x: 130, y: 180 }, { x: 250, y: 180 },
    { x: 250, y: 90 }, { x: 380, y: 90 }, { x: 380, y: 220 }, { x: 250, y: 220 },
    { x: 250, y: 300 }, { x: 130, y: 300 }, { x: 130, y: 400 }, { x: 380, y: 400 },
    { x: 380, y: 300 }, { x: 510, y: 300 }, { x: 510, y: 180 }, { x: 640, y: 180 },
    { x: 640, y: 90 }, { x: 800, y: 90 },
  ],
  decorations: [
    // background asphalt grid (decorative full street network)
    // horizontal streets
    ...[60, 150, 240, 330, 420].flatMap(y => [
      { kind: "rect" as const, x: 0, y: y, w: 800, h: 22, color: "#16181c" },
      { kind: "line" as const, x1: 0, y1: y + 11, x2: 800, y2: y + 11, color: "rgba(255,213,79,0.18)", width: 1, dash: [8, 10] },
    ]),
    // vertical streets
    ...[100, 220, 350, 480, 610, 720].flatMap(x => [
      { kind: "rect" as const, x: x, y: 0, w: 22, h: 500, color: "#16181c" },
      { kind: "line" as const, x1: x + 11, y1: 0, x2: x + 11, y2: 500, color: "rgba(255,213,79,0.18)", width: 1, dash: [8, 10] },
    ]),
    // sidewalks faint outlines around blocks (skip — let buildings provide it)
    // === BUILDINGS (skyscrapers) ===
    // block 1 (top-left): tall building
    { kind: "rect", x: 18, y: 18, w: 78, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 22, y: 22, w: 70, h: 28, cols: 7, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 134, y: 18, w: 82, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 138, y: 22, w: 74, h: 28, cols: 8, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 254, y: 18, w: 92, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 258, y: 22, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 384, y: 18, w: 92, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 388, y: 22, w: 84, h: 28, cols: 9, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 514, y: 18, w: 92, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 518, y: 22, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 644, y: 18, w: 72, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 648, y: 22, w: 64, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 738, y: 18, w: 50, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 742, y: 22, w: 42, h: 28, cols: 5, rows: 3, color: "#5a8aff" },

    // mid blocks
    { kind: "rect", x: 18, y: 108, w: 78, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 22, y: 112, w: 70, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 244, y: 108, w: 100, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 248, y: 112, w: 92, h: 28, cols: 10, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 384, y: 108, w: 92, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 388, y: 112, w: 84, h: 28, cols: 9, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 514, y: 108, w: 92, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 518, y: 112, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 644, y: 108, w: 72, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 648, y: 112, w: 64, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 738, y: 108, w: 50, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 742, y: 112, w: 42, h: 28, cols: 5, rows: 3, color: "#5a8aff" },

    { kind: "rect", x: 18, y: 198, w: 78, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 22, y: 202, w: 70, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 134, y: 198, w: 82, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 138, y: 202, w: 74, h: 28, cols: 8, rows: 3, color: "#5a8aff" },
    // park (no buildings) at 244,198 100x36
    { kind: "rect", x: 244, y: 198, w: 100, h: 36, color: "#13321b", stroke: "#1c5a2e" },
    { kind: "circle", x: 264, y: 216, r: 6, color: "#1d6332" },
    { kind: "circle", x: 282, y: 222, r: 5, color: "#1d6332" },
    { kind: "circle", x: 300, y: 214, r: 6, color: "#1d6332" },
    { kind: "circle", x: 320, y: 220, r: 5, color: "#1d6332" },
    { kind: "text", x: 290, y: 232, text: "PARK", color: "#7ad77a", size: 7, weight: 700, align: "center" },
    { kind: "rect", x: 514, y: 198, w: 92, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 518, y: 202, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 644, y: 198, w: 72, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 648, y: 202, w: 64, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 738, y: 198, w: 50, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 742, y: 202, w: 42, h: 28, cols: 5, rows: 3, color: "#5a8aff" },

    { kind: "rect", x: 18, y: 288, w: 78, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 22, y: 292, w: 70, h: 28, cols: 7, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 134, y: 288, w: 82, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 138, y: 292, w: 74, h: 28, cols: 8, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 384, y: 288, w: 92, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 388, y: 292, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 644, y: 288, w: 72, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 648, y: 292, w: 64, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 738, y: 288, w: 50, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 742, y: 292, w: 42, h: 28, cols: 5, rows: 3, color: "#5a8aff" },

    // bottom row + river
    { kind: "rect", x: 18, y: 378, w: 78, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 22, y: 382, w: 70, h: 28, cols: 7, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 244, y: 378, w: 100, h: 36, color: "#1f2228", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 248, y: 382, w: 92, h: 28, cols: 10, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 384, y: 378, w: 92, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 388, y: 382, w: 84, h: 28, cols: 9, rows: 3, color: "#fff37a" },
    { kind: "rect", x: 514, y: 378, w: 92, h: 36, color: "#1d2025", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 518, y: 382, w: 84, h: 28, cols: 9, rows: 3, color: "#5a8aff" },
    { kind: "rect", x: 644, y: 378, w: 144, h: 36, color: "#23262d", stroke: "#3a3d44" },
    { kind: "windowGrid", x: 648, y: 382, w: 136, h: 28, cols: 14, rows: 3, color: "#fff37a" },

    // RIVER along the bottom (no-build) with bridge crossings
    { kind: "rect", x: 0, y: 444, w: 800, h: 56, color: "#0c2435" },
    { kind: "line", x1: 0, y1: 460, x2: 800, y2: 462, color: "#1c4a66", width: 1, dash: [4, 9] },
    { kind: "line", x1: 0, y1: 478, x2: 800, y2: 476, color: "#1c4a66", width: 1, dash: [6, 11] },
    { kind: "circle", x: 80, y: 470, r: 2, color: "#2a6e8a", opacity: 0.7 },
    { kind: "circle", x: 250, y: 480, r: 2, color: "#2a6e8a", opacity: 0.7 },
    { kind: "circle", x: 540, y: 470, r: 2, color: "#2a6e8a", opacity: 0.7 },

    // street lights at intersections
    ...[111, 231, 361, 491, 621, 731].flatMap(x => [60, 150, 240, 330, 420].map(y => ({
      kind: "circle" as const, x: x, y: y + 11, r: 1.5, color: "#fff37a", opacity: 0.9,
    }))),
    // crosswalks at major intersections
    ...[111, 491, 621].flatMap(x => Array.from({ length: 5 }, (_, i) => ({
      kind: "rect" as const, x: x - 8 + i * 4, y: 60 + 4, w: 2, h: 14, color: "#f0f0f0", opacity: 0.45,
    }))),
  ],
  topDecorations: [
    // elevated railway (raised bridge crossing across the city east-west at y~340)
    { kind: "bridge", from: { x: 0, y: 340 }, to: { x: 800, y: 340 }, deckColor: "#3a3a3e", railColor: "#dc2626", width: 28 },
    // foot bridge crossing the river to give it a bridge
    { kind: "bridge", from: { x: 200, y: 444 }, to: { x: 200, y: 500 }, deckColor: "#3a3a3e", railColor: "#dc2626", width: 30 },
    { kind: "bridge", from: { x: 590, y: 444 }, to: { x: 590, y: 500 }, deckColor: "#3a3a3e", railColor: "#dc2626", width: 30 },
  ],
  noBuildZones: [
    // top row buildings
    { kind: "rect", x: 18, y: 18, w: 78, h: 36, tone: "building" }, { kind: "rect", x: 134, y: 18, w: 82, h: 36, tone: "building" },
    { kind: "rect", x: 254, y: 18, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 384, y: 18, w: 92, h: 36, tone: "building" },
    { kind: "rect", x: 514, y: 18, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 644, y: 18, w: 72, h: 36, tone: "building" },
    { kind: "rect", x: 738, y: 18, w: 50, h: 36, tone: "building" },
    // mid row 1
    { kind: "rect", x: 18, y: 108, w: 78, h: 36, tone: "building" }, { kind: "rect", x: 244, y: 108, w: 100, h: 36, tone: "building" },
    { kind: "rect", x: 384, y: 108, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 514, y: 108, w: 92, h: 36, tone: "building" },
    { kind: "rect", x: 644, y: 108, w: 72, h: 36, tone: "building" }, { kind: "rect", x: 738, y: 108, w: 50, h: 36, tone: "building" },
    // mid row 2 + park
    { kind: "rect", x: 18, y: 198, w: 78, h: 36, tone: "building" }, { kind: "rect", x: 134, y: 198, w: 82, h: 36, tone: "building" },
    { kind: "rect", x: 244, y: 198, w: 100, h: 36, tone: "park", label: "PARK" },
    { kind: "rect", x: 514, y: 198, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 644, y: 198, w: 72, h: 36, tone: "building" },
    { kind: "rect", x: 738, y: 198, w: 50, h: 36, tone: "building" },
    // mid row 3
    { kind: "rect", x: 18, y: 288, w: 78, h: 36, tone: "building" }, { kind: "rect", x: 134, y: 288, w: 82, h: 36, tone: "building" },
    { kind: "rect", x: 384, y: 288, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 644, y: 288, w: 72, h: 36, tone: "building" },
    { kind: "rect", x: 738, y: 288, w: 50, h: 36, tone: "building" },
    // bottom row
    { kind: "rect", x: 18, y: 378, w: 78, h: 36, tone: "building" }, { kind: "rect", x: 244, y: 378, w: 100, h: 36, tone: "building" },
    { kind: "rect", x: 384, y: 378, w: 92, h: 36, tone: "building" }, { kind: "rect", x: 514, y: 378, w: 92, h: 36, tone: "building" },
    { kind: "rect", x: 644, y: 378, w: 144, h: 36, tone: "building" },
    // river
    { kind: "rect", x: 0, y: 444, w: 800, h: 56, tone: "water", label: "RIVER" },
  ],
};

export const MAPS: MapDef[] = [interstate, subway, city];

// ===== Damage =====
export type DamageType = "physical" | "piercing" | "explosion" | "energy" | "fire";

export const DAMAGE_LABELS: Record<DamageType, { label: string; color: string }> = {
  physical: { label: "Physical", color: "#e8e8ec" },
  piercing: { label: "Piercing", color: "#dc2626" },
  explosion: { label: "Explosion", color: "#ef4444" },
  energy: { label: "Energy", color: "#fff37a" },
  fire: { label: "Fire", color: "#ff8a3d" },
};

// ===== Towers & Upgrade Paths =====
export type TowerKind =
  | "rifleman" | "howitzer" | "frost" | "sniper" | "tesla"
  | "bank" | "recon" | "flame" | "mortar" | "railgun"
  | "engineer" | "minelayer" | "drone";

export type Appearance =
  | "beret" | "helmet" | "scope" | "antenna" | "second_barrel"
  | "shield_plate" | "extra_optic" | "muzzle_brake" | "bipod"
  | "satellite_dish" | "heavy_cap" | "spikes" | "energy_core";

export type TowerStats = {
  damage: number;
  range: number;
  fireRate: number;
  damageType: DamageType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  chainCount?: number;
  hiddenDetect?: boolean;
  burstCount?: number;
  burstInterval?: number;
  underbarrel?: { interval: number; damage: number; splashRadius: number };
  income?: { perTick: number; interval: number };
  intelLevel?: number;
  buffAura?: { range: number; fireRateMul?: number; damageMul?: number };
  mineDamage?: number;
  mineSplash?: number;
  mineCooldown?: number;
  droneCount?: number;
  droneDamage?: number;
  arcShot?: boolean;
  pierceTargets?: number;
  projectileSpeed: number;
  projectileColor: string;
  bodyColor: string;
  accentColor: string;
  barrelColor: string;
  barrelLength: number;
  barrelWidth: number;
  appearance?: Appearance[];
};

export type PathTier = {
  name: string;
  description: string;
  cost: number;
  stats: Partial<TowerStats>;
};

export type UpgradePath = {
  name: string;
  tagline: string;
  tiers: [PathTier, PathTier, PathTier];
};

export type TowerDef = {
  kind: TowerKind;
  name: string;
  description: string;
  cost: number;
  base: TowerStats;
  paths: [UpgradePath, UpgradePath]; // exactly two paths
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  rifleman: {
    kind: "rifleman", name: "Rifleman",
    description: "Standard infantry. Reliable physical damage at low cost.",
    cost: 175,
    base: {
      damage: 14, range: 135, fireRate: 1.7, damageType: "physical",
      projectileSpeed: 720, projectileColor: "#fff",
      bodyColor: "#2a2a2a", accentColor: "#e8e8ec", barrelColor: "#0e0e0e",
      barrelLength: 16, barrelWidth: 3,
    },
    paths: [
      {
        name: "Green Beret", tagline: "Full-auto suppression with night optics.",
        tiers: [
          { name: "Improved Sights", cost: 140, description: "+25% range, hidden detection.",
            stats: { range: 168, hiddenDetect: true, appearance: ["scope"] } },
          { name: "Full Auto", cost: 240, description: "Heavy fire rate, lighter rounds.",
            stats: { range: 168, hiddenDetect: true, fireRate: 4.5, damage: 12,
              accentColor: "#dc2626", appearance: ["scope", "beret"] } },
          { name: "Green Beret Squad", cost: 420, description: "Squad-fire suppression.",
            stats: { range: 200, hiddenDetect: true, fireRate: 6.5, damage: 18,
              accentColor: "#22c55e", barrelLength: 18, appearance: ["scope", "beret", "second_barrel"] } },
        ],
      },
      {
        name: "Designated Marksman", tagline: "Semi-auto piercing rounds.",
        tiers: [
          { name: "AP Rounds", cost: 200, description: "Armor-piercing ammunition.",
            stats: { damage: 28, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope"] } },
          { name: "Marksman", cost: 360, description: "Heavier rounds, hidden detection.",
            stats: { damage: 56, damageType: "piercing", range: 185, hiddenDetect: true,
              projectileColor: "#dc2626", barrelLength: 20, appearance: ["scope", "extra_optic"] } },
          { name: "Battle Rifle", cost: 580, description: "Long-barrel battle rifle.",
            stats: { damage: 110, damageType: "piercing", range: 220, hiddenDetect: true, fireRate: 1.5,
              projectileColor: "#dc2626", barrelLength: 24, barrelWidth: 4, accentColor: "#ef4444",
              appearance: ["scope", "extra_optic", "bipod", "muzzle_brake"] } },
        ],
      },
    ],
  },

  frost: {
    kind: "frost", name: "Cryo Tower",
    description: "Slows enemies with cryogenic rounds.",
    cost: 240,
    base: {
      damage: 9, range: 130, fireRate: 1.5, damageType: "physical",
      slowFactor: 0.5, slowDuration: 1.6,
      projectileSpeed: 520, projectileColor: "#bff0ff",
      bodyColor: "#28323a", accentColor: "#9adfff", barrelColor: "#161e24",
      barrelLength: 16, barrelWidth: 4,
    },
    paths: [
      {
        name: "Deep Freeze", tagline: "Longer, harsher slows.",
        tiers: [
          { name: "Cryo Coolant", cost: 180, description: "Stronger slow effect.",
            stats: { slowFactor: 0.35, slowDuration: 2.0, damage: 11, appearance: ["energy_core"] } },
          { name: "Cryo Beam", cost: 320, description: "Sustained beam, very high fire rate.",
            stats: { slowFactor: 0.30, slowDuration: 2.2, damage: 16, fireRate: 3.0,
              accentColor: "#dc2626", appearance: ["energy_core", "extra_optic"] } },
          { name: "Absolute Zero", cost: 520, description: "Briefly freezes targets in place.",
            stats: { slowFactor: 0.05, slowDuration: 0.9, damage: 22, fireRate: 2.7,
              accentColor: "#ef4444", barrelLength: 20,
              appearance: ["energy_core", "extra_optic", "spikes"] } },
        ],
      },
      {
        name: "Cryo Lance", tagline: "Long-range piercing cold rounds.",
        tiers: [
          { name: "Long Barrel", cost: 220, description: "+50% range.",
            stats: { range: 195, damage: 14, barrelLength: 22, appearance: ["scope"] } },
          { name: "Heavy Slug", cost: 380, description: "Frozen slug pierces armor.",
            stats: { range: 220, damage: 40, damageType: "piercing", barrelLength: 24,
              appearance: ["scope", "bipod"] } },
          { name: "Glacier Round", cost: 600, description: "Solid ice penetrator.",
            stats: { range: 260, damage: 100, damageType: "piercing", fireRate: 1.0,
              accentColor: "#ef4444", barrelLength: 26, barrelWidth: 5,
              appearance: ["scope", "bipod", "muzzle_brake"] } },
        ],
      },
    ],
  },

  sniper: {
    kind: "sniper", name: "Sniper",
    description: "Long-range single-target precision.",
    cost: 400,
    base: {
      damage: 95, range: 300, fireRate: 0.5, damageType: "physical",
      projectileSpeed: 1100, projectileColor: "#ffeb70",
      bodyColor: "#262626", accentColor: "#e8e8ec", barrelColor: "#080808",
      barrelLength: 24, barrelWidth: 3,
    },
    paths: [
      {
        name: "Anti-Material", tagline: "Massive piercing rounds.",
        tiers: [
          { name: ".50 BMG", cost: 380, description: "Armor-piercing rounds.",
            stats: { damage: 200, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope", "bipod"] } },
          { name: "Anti-Material Rifle", cost: 660, description: "Heavier caliber.",
            stats: { damage: 360, damageType: "piercing", projectileColor: "#dc2626",
              barrelLength: 28, barrelWidth: 4,
              appearance: ["scope", "bipod", "muzzle_brake"] } },
          { name: "Railgun Rifle", cost: 1200, description: "Magnetic accelerator round.",
            stats: { damage: 800, damageType: "piercing", range: 400, projectileColor: "#ef4444",
              projectileSpeed: 1800, barrelLength: 32, barrelWidth: 5, accentColor: "#dc2626",
              appearance: ["scope", "bipod", "muzzle_brake", "energy_core"] } },
        ],
      },
      {
        name: "Spotter Team", tagline: "Optics, overwatch, and sustained fire.",
        tiers: [
          { name: "Optics", cost: 240, description: "+30% range, hidden detection.",
            stats: { range: 390, hiddenDetect: true, appearance: ["scope", "extra_optic"] } },
          { name: "Overwatch", cost: 420, description: "Better optics, faster sighting.",
            stats: { range: 420, hiddenDetect: true, fireRate: 0.75, damage: 130,
              appearance: ["scope", "extra_optic", "antenna"] } },
          { name: "Marksman Team", cost: 760, description: "Spotter doubles fire rate.",
            stats: { range: 460, hiddenDetect: true, fireRate: 1.5, damage: 170,
              accentColor: "#ef4444", barrelLength: 28,
              appearance: ["scope", "extra_optic", "antenna", "beret"] } },
        ],
      },
    ],
  },

  tesla: {
    kind: "tesla", name: "Tesla Coil",
    description: "Energy weapon. Lightning arcs between enemies.",
    cost: 340,
    base: {
      damage: 26, range: 125, fireRate: 1.2, damageType: "energy",
      chainCount: 3,
      projectileSpeed: 0, projectileColor: "#fff37a",
      bodyColor: "#2a2a32", accentColor: "#fff37a", barrelColor: "#1a1a22",
      barrelLength: 14, barrelWidth: 5,
    },
    paths: [
      {
        name: "High Voltage", tagline: "More raw energy damage per arc.",
        tiers: [
          { name: "Overcharge", cost: 300, description: "Stronger arcs.",
            stats: { damage: 55, fireRate: 1.3, appearance: ["energy_core"] } },
          { name: "Plasma Coil", cost: 500, description: "Heavy plasma damage.",
            stats: { damage: 110, fireRate: 1.5, accentColor: "#dc2626",
              appearance: ["energy_core", "spikes"] } },
          { name: "Lightning God", cost: 880, description: "Devastating arcs.",
            stats: { damage: 260, fireRate: 1.7, chainCount: 5, accentColor: "#ef4444",
              appearance: ["energy_core", "spikes", "antenna"] } },
        ],
      },
      {
        name: "EMP Net", tagline: "Hits more enemies, slows what it touches.",
        tiers: [
          { name: "Extra Conductor", cost: 260, description: "+2 chain.",
            stats: { chainCount: 5, appearance: ["antenna"] } },
          { name: "Mass Conductor", cost: 440, description: "+5 chain, longer range.",
            stats: { chainCount: 8, range: 155, damage: 32, accentColor: "#dc2626",
              appearance: ["antenna", "second_barrel"] } },
          { name: "EMP Pulse", cost: 760, description: "Pulses every target in range, brief slow.",
            stats: { chainCount: 14, range: 185, damage: 50,
              slowFactor: 0.5, slowDuration: 0.5, accentColor: "#ef4444",
              appearance: ["antenna", "second_barrel", "energy_core"] } },
        ],
      },
    ],
  },

  flame: {
    kind: "flame", name: "Flamethrower",
    description: "Short range, high fire rate. Applies burn damage over time.",
    cost: 280,
    base: {
      damage: 11, range: 100, fireRate: 5.0, damageType: "fire",
      burnDps: 9, burnDuration: 2.0,
      projectileSpeed: 380, projectileColor: "#ff8a3d",
      bodyColor: "#3a2822", accentColor: "#ff6020", barrelColor: "#1a1a1a",
      barrelLength: 18, barrelWidth: 6,
    },
    paths: [
      {
        name: "Inferno", tagline: "Massive burn damage over time.",
        tiers: [
          { name: "Hot Mix", cost: 240, description: "Stronger burn.",
            stats: { burnDps: 20, burnDuration: 2.5, appearance: ["energy_core"] } },
          { name: "Napalm", cost: 420, description: "Devastating sticky burn.",
            stats: { burnDps: 45, burnDuration: 3.0, accentColor: "#ef4444",
              appearance: ["energy_core", "second_barrel"] } },
          { name: "Hellfire", cost: 700, description: "Apocalyptic burn DoT.",
            stats: { burnDps: 110, burnDuration: 3.5, damage: 20, range: 115,
              accentColor: "#ef4444", barrelLength: 22,
              appearance: ["energy_core", "second_barrel", "spikes"] } },
        ],
      },
      {
        name: "Plasma Torch", tagline: "Concentrated stream that pierces armor.",
        tiers: [
          { name: "Pressurized", cost: 260, description: "+50% range.",
            stats: { range: 150, damage: 16, appearance: ["scope"] } },
          { name: "Plasma Mix", cost: 440, description: "Damage becomes piercing.",
            stats: { range: 165, damage: 32, damageType: "piercing", projectileColor: "#dc2626",
              appearance: ["scope", "energy_core"] } },
          { name: "Plasma Lance", cost: 720, description: "Solid plasma beam.",
            stats: { range: 185, damage: 80, damageType: "piercing", fireRate: 4.0,
              projectileColor: "#ef4444", accentColor: "#ef4444",
              appearance: ["scope", "energy_core", "spikes"] } },
        ],
      },
    ],
  },

  drone: {
    kind: "drone", name: "Drone Bay",
    description: "Launches autonomous drones that orbit and engage enemies.",
    cost: 480,
    base: {
      damage: 18, range: 180, fireRate: 1.6, damageType: "physical",
      droneCount: 2, droneDamage: 18,
      projectileSpeed: 600, projectileColor: "#fff",
      bodyColor: "#2a2a2e", accentColor: "#9adfff", barrelColor: "#1a1a22",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["antenna"],
    },
    paths: [
      {
        name: "Heavy Drones", tagline: "Fewer, more dangerous drones.",
        tiers: [
          { name: "Gunship", cost: 440, description: "Bigger guns per drone.",
            stats: { droneCount: 2, droneDamage: 55, range: 200,
              appearance: ["heavy_cap"] } },
          { name: "Strike Craft", cost: 760, description: "Heavy ordnance.",
            stats: { droneCount: 2, droneDamage: 120, range: 230, accentColor: "#dc2626",
              appearance: ["heavy_cap", "muzzle_brake"] } },
          { name: "Stealth Bomber", cost: 1300, description: "Devastating piercing strikes.",
            stats: { droneCount: 3, droneDamage: 260, damageType: "piercing", range: 260,
              accentColor: "#ef4444",
              appearance: ["heavy_cap", "muzzle_brake", "spikes"] } },
        ],
      },
      {
        name: "Hellfire Drones", tagline: "Drones with explosive missiles.",
        tiers: [
          { name: "Missile Pod", cost: 480, description: "Missiles with splash.",
            stats: { droneCount: 2, droneDamage: 65, splashRadius: 40, damageType: "explosion",
              appearance: ["second_barrel"] } },
          { name: "Hellfire", cost: 800, description: "Larger blasts.",
            stats: { droneCount: 3, droneDamage: 150, splashRadius: 65, damageType: "explosion",
              accentColor: "#dc2626", appearance: ["second_barrel", "muzzle_brake"] } },
          { name: "MOAB Carriers", cost: 1400, description: "Drones drop MOAB-class bombs.",
            stats: { droneCount: 4, droneDamage: 340, splashRadius: 100, damageType: "explosion",
              accentColor: "#ef4444",
              appearance: ["second_barrel", "muzzle_brake", "heavy_cap"] } },
        ],
      },
    ],
  },

  howitzer: {
    kind: "howitzer", name: "Howitzer",
    description: "Heavy artillery. Long range, devastating splash, slow reload.",
    cost: 700,
    base: {
      damage: 75, range: 220, fireRate: 0.45, damageType: "explosion", splashRadius: 60,
      projectileSpeed: 380, projectileColor: "#1a1a1a",
      bodyColor: "#3a3a3a", accentColor: "#e8e8ec", barrelColor: "#0a0a0a",
      barrelLength: 24, barrelWidth: 6,
    },
    paths: [
      {
        name: "Heavy Bombardment", tagline: "Bigger shells, bigger boom.",
        tiers: [
          { name: "HE Shells", cost: 540, description: "+60% damage.",
            stats: { damage: 120, splashRadius: 65, appearance: ["heavy_cap"] } },
          { name: "Wide Spread", cost: 840, description: "Massive blast radius.",
            stats: { damage: 150, splashRadius: 100, barrelWidth: 7,
              appearance: ["heavy_cap", "muzzle_brake"] } },
          { name: "Heavy Artillery", cost: 1500, description: "Crushing strike, enormous AoE.",
            stats: { damage: 300, splashRadius: 145, range: 260, barrelWidth: 9, barrelLength: 28,
              accentColor: "#ef4444", appearance: ["heavy_cap", "muzzle_brake", "shield_plate"] } },
        ],
      },
      {
        name: "Cluster Munitions", tagline: "Faster fire, smaller blasts.",
        tiers: [
          { name: "Submunitions", cost: 620, description: "Higher fire rate, smaller per shell.",
            stats: { damage: 65, splashRadius: 55, fireRate: 0.6, accentColor: "#dc2626",
              appearance: ["second_barrel"] } },
          { name: "Cluster", cost: 920, description: "Five-warhead spread.",
            stats: { damage: 85, splashRadius: 70, fireRate: 0.75, accentColor: "#dc2626",
              barrelWidth: 7, appearance: ["second_barrel", "heavy_cap"] } },
          { name: "MOAB", cost: 1600, description: "Mother of all blasts.",
            stats: { damage: 240, splashRadius: 165, fireRate: 0.45, accentColor: "#ef4444",
              barrelLength: 28, barrelWidth: 9, appearance: ["heavy_cap", "muzzle_brake", "shield_plate"] } },
        ],
      },
    ],
  },

  mortar: {
    kind: "mortar", name: "Mortar Pit",
    description: "Lobbed shells with extreme range. Ignores line of sight.",
    cost: 520,
    base: {
      damage: 60, range: 360, fireRate: 0.55, damageType: "explosion", splashRadius: 70,
      arcShot: true,
      projectileSpeed: 240, projectileColor: "#1a1a1a",
      bodyColor: "#2e2e2e", accentColor: "#888", barrelColor: "#0a0a0a",
      barrelLength: 14, barrelWidth: 8,
    },
    paths: [
      {
        name: "Heavy Mortar", tagline: "Bigger shells.",
        tiers: [
          { name: "120mm", cost: 420, description: "+50% damage.",
            stats: { damage: 100, splashRadius: 80, appearance: ["heavy_cap"] } },
          { name: "152mm", cost: 700, description: "Devastating shells.",
            stats: { damage: 180, splashRadius: 110, barrelWidth: 9,
              appearance: ["heavy_cap", "shield_plate"] } },
          { name: "Bunker Buster", cost: 1200, description: "Penetrates anything.",
            stats: { damage: 360, splashRadius: 145, range: 420, barrelWidth: 11,
              accentColor: "#ef4444",
              appearance: ["heavy_cap", "shield_plate", "muzzle_brake"] } },
        ],
      },
      {
        name: "Saturation Fire", tagline: "Multiple shells per shot.",
        tiers: [
          { name: "Triple Tube", cost: 460, description: "Three shells per volley.",
            stats: { damage: 40, splashRadius: 55, fireRate: 0.85,
              appearance: ["second_barrel"] } },
          { name: "Six-Pack", cost: 800, description: "Saturation barrage.",
            stats: { damage: 50, splashRadius: 65, fireRate: 1.5, accentColor: "#dc2626",
              appearance: ["second_barrel", "antenna"] } },
          { name: "Stalin's Organ", cost: 1300, description: "Continuous rocket barrage.",
            stats: { damage: 65, splashRadius: 75, fireRate: 3.2, accentColor: "#ef4444",
              appearance: ["second_barrel", "antenna", "muzzle_brake"] } },
        ],
      },
    ],
  },

  railgun: {
    kind: "railgun", name: "Railgun",
    description: "Charges then fires a piercing beam through every enemy in a line.",
    cost: 660,
    base: {
      damage: 220, range: 380, fireRate: 0.4, damageType: "piercing",
      pierceTargets: 5,
      projectileSpeed: 2400, projectileColor: "#9adfff",
      bodyColor: "#1a2028", accentColor: "#9adfff", barrelColor: "#0e0e16",
      barrelLength: 30, barrelWidth: 4,
      appearance: ["energy_core"],
    },
    paths: [
      {
        name: "Slug Caliber", tagline: "Heavier slug, more damage per hit.",
        tiers: [
          { name: "Tungsten", cost: 540, description: "+80% damage.",
            stats: { damage: 400, appearance: ["energy_core", "muzzle_brake"] } },
          { name: "Uranium", cost: 920, description: "Devastating slug.",
            stats: { damage: 800, accentColor: "#dc2626",
              appearance: ["energy_core", "muzzle_brake", "shield_plate"] } },
          { name: "Singularity", cost: 1600, description: "One-shot most enemies in line.",
            stats: { damage: 1600, range: 460, accentColor: "#ef4444",
              appearance: ["energy_core", "muzzle_brake", "shield_plate", "spikes"] } },
        ],
      },
      {
        name: "Mass Driver", tagline: "Pierces more enemies in the line.",
        tiers: [
          { name: "Coilgun", cost: 500, description: "Pierces up to 10 enemies.",
            stats: { pierceTargets: 10, damage: 200, appearance: ["energy_core", "antenna"] } },
          { name: "Mass Driver", cost: 840, description: "Pierces up to 20.",
            stats: { pierceTargets: 20, damage: 270, accentColor: "#dc2626",
              appearance: ["energy_core", "antenna", "second_barrel"] } },
          { name: "Particle Cannon", cost: 1400, description: "Pierces all enemies in line.",
            stats: { pierceTargets: 99, damage: 400, range: 480, accentColor: "#ef4444",
              appearance: ["energy_core", "antenna", "second_barrel", "muzzle_brake"] } },
        ],
      },
    ],
  },

  minelayer: {
    kind: "minelayer", name: "Mine Layer",
    description: "Periodically lays mines along the path. Detonate on contact.",
    cost: 400,
    base: {
      damage: 0, range: 200, fireRate: 0, damageType: "explosion",
      mineDamage: 90, mineSplash: 50, mineCooldown: 4.0,
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#2a2a2a", accentColor: "#dc2626", barrelColor: "#1a1a1a",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["spikes"],
    },
    paths: [
      {
        name: "Heavy Charges", tagline: "Bigger boom per mine.",
        tiers: [
          { name: "Frag Mine", cost: 300, description: "Bigger blast.",
            stats: { mineDamage: 180, mineSplash: 65, appearance: ["spikes", "heavy_cap"] } },
          { name: "Demolition", cost: 520, description: "Devastating mines.",
            stats: { mineDamage: 360, mineSplash: 90, accentColor: "#dc2626",
              appearance: ["spikes", "heavy_cap", "shield_plate"] } },
          { name: "Tactical Nuke", cost: 980, description: "Each mine is a small nuke.",
            stats: { mineDamage: 900, mineSplash: 145, mineCooldown: 5.0,
              accentColor: "#ef4444",
              appearance: ["spikes", "heavy_cap", "shield_plate", "energy_core"] } },
        ],
      },
      {
        name: "Smart Mines", tagline: "EMP and cluster mine variants that slow.",
        tiers: [
          { name: "EMP Mine", cost: 340, description: "Slows enemies in blast.",
            stats: { mineDamage: 60, mineSplash: 70, slowFactor: 0.4, slowDuration: 2.0,
              appearance: ["energy_core"] } },
          { name: "Cluster Mine", cost: 580, description: "Bigger AoE on detonation.",
            stats: { mineDamage: 100, mineSplash: 100, slowFactor: 0.4, slowDuration: 2.0,
              accentColor: "#dc2626", appearance: ["energy_core", "spikes"] } },
          { name: "Doomsday", cost: 980, description: "Massive area, severe slow.",
            stats: { mineDamage: 220, mineSplash: 150, slowFactor: 0.25, slowDuration: 3.0,
              accentColor: "#ef4444",
              appearance: ["energy_core", "spikes", "heavy_cap"] } },
        ],
      },
    ],
  },

  engineer: {
    kind: "engineer", name: "Field Engineer",
    description: "Buffs adjacent towers. No direct attack.",
    cost: 360,
    base: {
      damage: 0, range: 110, fireRate: 0, damageType: "physical",
      buffAura: { range: 110, fireRateMul: 1.15, damageMul: 1.0 },
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#3a3528", accentColor: "#fff37a", barrelColor: "#5a5028",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["antenna"],
    },
    paths: [
      {
        name: "Logistics", tagline: "Boosts allied fire rate.",
        tiers: [
          { name: "Munitions Truck", cost: 300, description: "+25% fire rate, +20% range.",
            stats: { range: 140, buffAura: { range: 140, fireRateMul: 1.25 },
              appearance: ["antenna", "shield_plate"] } },
          { name: "Forward Depot", cost: 520, description: "+45% fire rate.",
            stats: { range: 160, buffAura: { range: 160, fireRateMul: 1.45 },
              accentColor: "#dc2626",
              appearance: ["antenna", "shield_plate", "satellite_dish"] } },
          { name: "Quartermaster", cost: 880, description: "+80% fire rate.",
            stats: { range: 180, buffAura: { range: 180, fireRateMul: 1.8 },
              accentColor: "#ef4444",
              appearance: ["antenna", "shield_plate", "satellite_dish", "energy_core"] } },
        ],
      },
      {
        name: "Armorer", tagline: "Boosts allied damage.",
        tiers: [
          { name: "Reinforced Rounds", cost: 340, description: "+25% damage to allies.",
            stats: { range: 130, buffAura: { range: 130, damageMul: 1.25 },
              appearance: ["shield_plate"] } },
          { name: "Ballistic Coatings", cost: 580, description: "+50% damage.",
            stats: { range: 150, buffAura: { range: 150, damageMul: 1.5 },
              accentColor: "#dc2626", appearance: ["shield_plate", "muzzle_brake"] } },
          { name: "Master Armorer", cost: 960, description: "+90% damage.",
            stats: { range: 170, buffAura: { range: 170, damageMul: 1.9 },
              accentColor: "#ef4444",
              appearance: ["shield_plate", "muzzle_brake", "heavy_cap"] } },
        ],
      },
    ],
  },

  recon: {
    kind: "recon", name: "Recon HQ",
    description: "Reveals stealth in radius. Provides intel on incoming waves.",
    cost: 300,
    base: {
      damage: 0, range: 160, fireRate: 0, damageType: "physical",
      hiddenDetect: true, intelLevel: 1,
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#2a3038", accentColor: "#9adfff", barrelColor: "#1a1a22",
      barrelLength: 0, barrelWidth: 0,
      appearance: ["satellite_dish"],
    },
    paths: [
      {
        name: "Signal Intelligence", tagline: "Approximate counts and bigger reveal radius.",
        tiers: [
          { name: "SIGINT Array", cost: 220, description: "Larger reveal radius.",
            stats: { range: 220, intelLevel: 1, appearance: ["satellite_dish", "antenna"] } },
          { name: "Triangulation", cost: 380, description: "Approximate counts of every threat.",
            stats: { range: 260, intelLevel: 2, appearance: ["satellite_dish", "antenna"] } },
          { name: "Global Surveillance", cost: 600, description: "Exact counts. Reveals across map.",
            stats: { range: 999, intelLevel: 3, accentColor: "#dc2626",
              appearance: ["satellite_dish", "antenna", "energy_core"] } },
        ],
      },
      {
        name: "Drone Swarm", tagline: "Launches autonomous combat drones.",
        tiers: [
          { name: "Recon Drone", cost: 320, description: "1 drone, light damage, hidden detect.",
            stats: { droneCount: 1, droneDamage: 14, range: 180,
              appearance: ["satellite_dish"] } },
          { name: "Strike Drones", cost: 560, description: "3 drones, more damage.",
            stats: { droneCount: 3, droneDamage: 28, range: 200, accentColor: "#dc2626",
              appearance: ["satellite_dish", "antenna"] } },
          { name: "Killer Swarm", cost: 940, description: "5 drones with cannon pods.",
            stats: { droneCount: 5, droneDamage: 56, range: 220, accentColor: "#ef4444",
              appearance: ["satellite_dish", "antenna", "energy_core"] } },
        ],
      },
    ],
  },

  bank: {
    kind: "bank", name: "Supply Depot",
    description: "Generates passive income during waves. Does not attack.",
    cost: 420,
    base: {
      damage: 0, range: 0, fireRate: 0, damageType: "physical",
      income: { perTick: 14, interval: 4 },
      projectileSpeed: 0, projectileColor: "#000",
      bodyColor: "#3a3528", accentColor: "#fff37a", barrelColor: "#5a5028",
      barrelLength: 0, barrelWidth: 0,
    },
    paths: [
      {
        name: "Reserve Bank", tagline: "Steady stream of cash.",
        tiers: [
          { name: "Lockbox", cost: 360, description: "+22 every 4s.",
            stats: { income: { perTick: 22, interval: 4 } } },
          { name: "Vault", cost: 620, description: "+42 every 3.5s.",
            stats: { income: { perTick: 42, interval: 3.5 }, accentColor: "#dc2626" } },
          { name: "Federal Reserve", cost: 1100, description: "+95 every 3s.",
            stats: { income: { perTick: 95, interval: 3.0 }, accentColor: "#ef4444",
              appearance: ["heavy_cap"] } },
        ],
      },
      {
        name: "Black Market", tagline: "Risky payouts that scale with the wave.",
        tiers: [
          { name: "Smuggler", cost: 400, description: "+ (12 + level×2) every 4s.",
            stats: { income: { perTick: 12, interval: 4 } } },
          { name: "Cartel", cost: 680, description: "+ (24 + level×4) every 3.5s.",
            stats: { income: { perTick: 24, interval: 3.5 }, accentColor: "#dc2626" } },
          { name: "Syndicate", cost: 1250, description: "+ (45 + level×8) every 3s.",
            stats: { income: { perTick: 45, interval: 3.0 }, accentColor: "#ef4444",
              appearance: ["spikes"] } },
        ],
      },
    ],
  },
};

export const TOWER_ORDER: TowerKind[] = [
  "rifleman", "frost", "sniper", "tesla", "flame", "drone",
  "howitzer", "mortar", "railgun", "minelayer", "engineer", "recon", "bank",
];

export function effectiveStats(def: TowerDef, pathIdx: number | null, tier: number): TowerStats {
  if (pathIdx === null || tier === 0) return def.base;
  if (pathIdx < 0 || pathIdx >= def.paths.length) return def.base;
  const path = def.paths[pathIdx];
  let stats: TowerStats = { ...def.base, appearance: [...(def.base.appearance ?? [])] };
  for (let i = 0; i < tier && i < path.tiers.length; i++) {
    const t = path.tiers[i].stats;
    stats = { ...stats, ...t };
    if (t.appearance) stats.appearance = t.appearance;
  }
  return stats;
}

export function upgradeCostFor(def: TowerDef, pathIdx: number, tier: number): number | null {
  if (pathIdx < 0 || pathIdx >= def.paths.length) return null;
  const path = def.paths[pathIdx];
  if (tier >= path.tiers.length) return null;
  return path.tiers[tier].cost;
}

export function totalSpent(def: TowerDef, pathIdx: number | null, tier: number): number {
  let total = def.cost;
  if (pathIdx !== null && pathIdx >= 0 && pathIdx < def.paths.length) {
    for (let i = 0; i < tier; i++) total += def.paths[pathIdx].tiers[i].cost;
  }
  return total;
}

// ===== Enemies =====
export type EnemyKind =
  | "grunt" | "swift" | "tank" | "swarm" | "stealth" | "armored" | "summoner"
  | "sprinter" | "shielded" | "healer" | "regen" | "phaser" | "berserker"
  | "cloaker" | "juggernaut" | "empdrone"
  | "miniboss" | "boss"
  | "bossbrute" | "bossemp" | "bossaegis" | "bossnecro" | "bosscloaker" | "bossfinal";

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  baseHp: number;
  speed: number;
  reward: number;
  damage: number;
  radius: number;
  color: string;
  outline: string;
  hidden?: boolean;
  armored?: boolean;
  resistances?: Partial<Record<DamageType, number>>;
  immunities?: DamageType[];
  summon?: { kind: EnemyKind; interval: number; perSpawn: number };
  shape?: "circle" | "diamond" | "square" | "hex" | "skull" | "octagon" | "triangle";
  healAura?: { range: number; perSec: number };
  regen?: number;
  phaseInterval?: number;
  berserkBelow?: number;
  cloakAura?: { range: number };
  empAttack?: { range: number; interval: number; duration: number; targets: number };
  aegisAura?: { range: number; resist: number };
  necroOnDeath?: { kind: EnemyKind; count: number };
  description?: string;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  grunt:    { kind: "grunt", name: "Grunt", baseHp: 50, speed: 55, reward: 9, damage: 1, radius: 11, color: "#cfcfcf", outline: "#1a1a1a", shape: "circle", description: "Standard infantry. No special traits." },
  swift:    { kind: "swift", name: "Scout", baseHp: 30, speed: 110, reward: 11, damage: 1, radius: 9, color: "#f5f5f5", outline: "#1a1a1a", shape: "diamond", description: "Fast and lightly armored." },
  tank:     { kind: "tank", name: "Heavy", baseHp: 200, speed: 32, reward: 20, damage: 2, radius: 15, color: "#7a7a7a", outline: "#0a0a0a", shape: "square", description: "Slow, durable footsoldier." },
  swarm:    { kind: "swarm", name: "Swarmer", baseHp: 20, speed: 80, reward: 4, damage: 1, radius: 7, color: "#a0a0a0", outline: "#1a1a1a", shape: "circle", description: "Comes in numbers." },
  stealth:  { kind: "stealth", name: "Phantom", baseHp: 65, speed: 95, reward: 17, damage: 1, radius: 10, color: "#444", outline: "#000", hidden: true, shape: "diamond", description: "Invisible without optics." },
  armored:  { kind: "armored", name: "Bulwark", baseHp: 240, speed: 42, reward: 24, damage: 2, radius: 14, color: "#5a5a5a", outline: "#000", armored: true,
              resistances: { physical: 0.20, energy: 0.30, fire: 0.40 }, shape: "hex", description: "Heavy armor. Resists physical, energy, and fire." },
  summoner: { kind: "summoner", name: "Summoner", baseHp: 300, speed: 36, reward: 38, damage: 2, radius: 14, color: "#dc2626", outline: "#3a0a0a",
              summon: { kind: "swarm", interval: 3.0, perSpawn: 2 }, shape: "hex", description: "Spawns Swarmers periodically." },

  sprinter: { kind: "sprinter", name: "Sprinter", baseHp: 55, speed: 165, reward: 15, damage: 1, radius: 8, color: "#fff", outline: "#dc2626", shape: "triangle", description: "Extreme speed. Lightly armored." },
  shielded: { kind: "shielded", name: "Shielded", baseHp: 220, speed: 50, reward: 26, damage: 2, radius: 13, color: "#444", outline: "#fff", shape: "octagon",
              resistances: { physical: 0.30, fire: 0.50 }, description: "Heavy ballistic shield. Vulnerable to piercing and explosion." },
  healer:   { kind: "healer", name: "Medic", baseHp: 100, speed: 60, reward: 32, damage: 1, radius: 11, color: "#22c55e", outline: "#0a3318", shape: "circle",
              healAura: { range: 70, perSec: 18 }, description: "Heals nearby enemies. Prioritize." },
  regen:    { kind: "regen", name: "Regenerator", baseHp: 175, speed: 50, reward: 24, damage: 2, radius: 12, color: "#90c090", outline: "#0a3318", shape: "hex",
              regen: 14, description: "Self-regenerates HP. Burst it down." },
  phaser:   { kind: "phaser", name: "Phaser", baseHp: 150, speed: 60, reward: 30, damage: 2, radius: 11, color: "#aa44ff", outline: "#220033", shape: "diamond",
              phaseInterval: 1.6, immunities: ["physical"], description: "Phases in and out of invulnerability." },
  berserker:{ kind: "berserker", name: "Berserker", baseHp: 240, speed: 55, reward: 30, damage: 3, radius: 13, color: "#ff5050", outline: "#3a0000", shape: "triangle",
              berserkBelow: 0.5, description: "Doubles speed below 50% HP." },
  cloaker:  { kind: "cloaker", name: "Cloaker", baseHp: 145, speed: 55, reward: 34, damage: 2, radius: 12, color: "#222", outline: "#5a5a5a", shape: "hex",
              hidden: true, cloakAura: { range: 90 }, description: "Hidden. Cloaks nearby allies." },
  juggernaut: { kind: "juggernaut", name: "Juggernaut", baseHp: 1000, speed: 25, reward: 80, damage: 5, radius: 20, color: "#3a3a3a", outline: "#000", shape: "square",
                armored: true, resistances: { physical: 0.15, energy: 0.25, fire: 0.30 }, description: "Massive armor. Slow but devastating." },
  empdrone: { kind: "empdrone", name: "EMP Drone", baseHp: 90, speed: 90, reward: 32, damage: 1, radius: 9, color: "#fff37a", outline: "#3a3000", shape: "triangle",
              empAttack: { range: 110, interval: 5.0, duration: 2.5, targets: 1 }, description: "Periodically stuns a nearby tower." },

  miniboss: { kind: "miniboss", name: "Mini-Boss", baseHp: 1200, speed: 38, reward: 150, damage: 5, radius: 22, color: "#ef4444", outline: "#1a0000", shape: "skull", description: "A heavy strike unit." },
  boss:     { kind: "boss", name: "Boss", baseHp: 4800, speed: 30, reward: 540, damage: 12, radius: 30, color: "#ff2020", outline: "#1a0000",
              summon: { kind: "armored", interval: 6.0, perSpawn: 1 }, shape: "skull", description: "End-of-act warlord." },
  bossbrute:   { kind: "bossbrute", name: "Brute", baseHp: 1500, speed: 40, reward: 175, damage: 5, radius: 22, color: "#ef4444", outline: "#1a0000", shape: "skull",
                 description: "Standard mini-boss with raw HP." },
  bossemp:     { kind: "bossemp", name: "EMP Walker", baseHp: 5400, speed: 26, reward: 650, damage: 12, radius: 30, color: "#fff37a", outline: "#332200", shape: "octagon",
                 empAttack: { range: 250, interval: 7.0, duration: 4.0, targets: 3 }, summon: { kind: "empdrone", interval: 8.0, perSpawn: 1 },
                 description: "Periodically stuns 3 nearby towers for 4s." },
  bossaegis:   { kind: "bossaegis", name: "Aegis Titan", baseHp: 5800, speed: 28, reward: 650, damage: 11, radius: 32, color: "#9adfff", outline: "#0a1820", shape: "hex",
                 aegisAura: { range: 130, resist: 0.5 }, armored: true, resistances: { physical: 0.25, energy: 0.35 },
                 description: "Halves damage on all enemies within 130 units." },
  bossnecro:   { kind: "bossnecro", name: "Necromancer", baseHp: 5200, speed: 30, reward: 650, damage: 12, radius: 30, color: "#aa44ff", outline: "#220033", shape: "skull",
                 summon: { kind: "swarm", interval: 2.5, perSpawn: 3 }, necroOnDeath: { kind: "grunt", count: 4 },
                 description: "Constantly raises swarms. Spawns more on death." },
  bosscloaker: { kind: "bosscloaker", name: "Wraith King", baseHp: 5600, speed: 34, reward: 650, damage: 12, radius: 30, color: "#222", outline: "#dc2626", shape: "skull",
                 hidden: true, cloakAura: { range: 160 }, summon: { kind: "stealth", interval: 5.0, perSpawn: 2 },
                 description: "Hidden. Cloaks all enemies in a 160 radius." },
  bossfinal:   { kind: "bossfinal", name: "Overlord", baseHp: 13000, speed: 28, reward: 1600, damage: 25, radius: 36, color: "#ff2020", outline: "#1a0000", shape: "skull",
                 empAttack: { range: 300, interval: 9.0, duration: 4.0, targets: 4 },
                 aegisAura: { range: 160, resist: 0.5 },
                 summon: { kind: "armored", interval: 4.0, perSpawn: 2 },
                 armored: true, resistances: { physical: 0.20, energy: 0.30, fire: 0.30 },
                 description: "Final boss. Stuns towers, armors allies, summons constantly." },
};

// ===== Wave generation =====
export type WaveSpawn = { kind: EnemyKind; count: number; interval: number; delay: number };

function pickBoss(level: number): EnemyKind {
  if (level >= 30) return "bossfinal";
  if (level === 10) return "bossemp";
  if (level === 20) return "bossnecro";
  if (level >= 25 && level % 5 === 0) return "bosscloaker";
  if (level === 15) return "bossaegis";
  return "boss";
}

function pickMiniBoss(_level: number): EnemyKind {
  return "bossbrute";
}

export function generateWave(level: number): { spawns: WaveSpawn[]; hpMul: number; isMiniBoss: boolean; isBoss: boolean; bossKind?: EnemyKind } {
  const isBoss = level % 10 === 0;
  const isMiniBoss = !isBoss && level % 5 === 0;
  const hpMul = Math.pow(1.16, level - 1);

  if (isBoss) {
    const bk = pickBoss(level);
    return {
      spawns: [
        { kind: "swarm", count: 14 + Math.floor(level / 2), interval: 0.32, delay: 0 },
        { kind: "armored", count: 4 + Math.floor(level / 5), interval: 1.2, delay: 6 },
        { kind: "shielded", count: 2 + Math.floor(level / 8), interval: 1.4, delay: 8 },
        { kind: "phaser", count: level >= 20 ? 3 : 0, interval: 1.5, delay: 9 },
        { kind: "summoner", count: 2, interval: 3, delay: 10 },
        { kind: bk, count: 1, interval: 1, delay: 14 },
      ],
      hpMul, isMiniBoss, isBoss, bossKind: bk,
    };
  }
  if (isMiniBoss) {
    return {
      spawns: [
        { kind: "grunt", count: 8 + level, interval: 0.5, delay: 0 },
        { kind: "swift", count: 6, interval: 0.4, delay: 4 },
        { kind: "stealth", count: level >= 10 ? 4 : 0, interval: 0.7, delay: 7 },
        { kind: "regen", count: level >= 15 ? 3 : 0, interval: 1.0, delay: 8 },
        { kind: pickMiniBoss(level), count: 1, interval: 1, delay: 10 },
      ],
      hpMul, isMiniBoss, isBoss, bossKind: pickMiniBoss(level),
    };
  }

  const spawns: WaveSpawn[] = [];
  let delay = 0;
  const gruntCount = 6 + Math.floor(level * 1.5);
  spawns.push({ kind: "grunt", count: gruntCount, interval: Math.max(0.32, 0.9 - level * 0.02), delay });
  delay += gruntCount * 0.6 + 1;

  if (level >= 2) {
    const swiftCount = 3 + Math.floor(level * 0.8);
    spawns.push({ kind: "swift", count: swiftCount, interval: 0.4, delay });
    delay += swiftCount * 0.45 + 1;
  }
  if (level >= 3) spawns.push({ kind: "sprinter", count: 2 + Math.floor(level / 4), interval: 0.5, delay: delay + 1 });
  if (level >= 4) { spawns.push({ kind: "tank", count: 1 + Math.floor(level / 4), interval: 1.4, delay }); delay += 3; }
  if (level >= 6) spawns.push({ kind: "stealth", count: 2 + Math.floor((level - 6) / 2), interval: 0.6, delay });
  if (level >= 7) spawns.push({ kind: "shielded", count: 1 + Math.floor((level - 7) / 4), interval: 1.0, delay: delay + 1 });
  if (level >= 8) spawns.push({ kind: "armored", count: 1 + Math.floor((level - 8) / 3), interval: 1.2, delay: delay + 1 });
  if (level >= 9) spawns.push({ kind: "berserker", count: 1 + Math.floor((level - 9) / 4), interval: 1.0, delay: delay + 2 });
  if (level >= 11) spawns.push({ kind: "healer", count: 1 + Math.floor((level - 11) / 5), interval: 2.0, delay: delay + 1 });
  if (level >= 12) spawns.push({ kind: "summoner", count: 1 + Math.floor((level - 12) / 5), interval: 2.5, delay });
  if (level >= 13) spawns.push({ kind: "regen", count: 1 + Math.floor((level - 13) / 4), interval: 1.5, delay: delay + 2 });
  if (level >= 14) spawns.push({ kind: "phaser", count: 1 + Math.floor((level - 14) / 4), interval: 1.5, delay: delay + 1 });
  if (level >= 16) spawns.push({ kind: "empdrone", count: 1 + Math.floor((level - 16) / 4), interval: 2.0, delay: delay + 2 });
  if (level >= 17) spawns.push({ kind: "cloaker", count: 1 + Math.floor((level - 17) / 5), interval: 2.0, delay: delay + 2 });
  if (level >= 22) spawns.push({ kind: "juggernaut", count: 1 + Math.floor((level - 22) / 4), interval: 3.0, delay: delay + 2 });

  if (level >= 7) spawns.push({ kind: "swarm", count: 8 + level, interval: 0.25, delay: delay + 2 });
  return { spawns, hpMul, isMiniBoss, isBoss };
}
