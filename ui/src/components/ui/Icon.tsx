import { cn } from "../../lib/cn";

/**
 * The stroke icons: one square-capped, mitred 24 grid line set, the weight the Contact sheet comps draw (1.9 at
 * 16px, 1.75 at 20px). An icon is a word's companion, never its replacement: it sits beside a label or carries an
 * `aria-label` of its own on the control that wraps it.
 */
const PATHS = {
  pulse: ["M2 12h5l3-8 4 16 3-8h5"],
  board: ["M4 9V4h5", "M15 4h5v5", "M20 15v5h-5", "M9 20H4v-5", "M9 9h6v6H9z"],
  stack: ["M4 8h12v12H4z", "M8 4h12v12"],
  lines: ["M4 5h16", "M4 10h10", "M4 15h16", "M4 20h8"],
  sliders: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", "M13 4v6", "M7 14v6"],
  check: ["M3 12l5 5L21 6"],
  chevronDown: ["M6 9l6 6 6-6"],
  chevronRight: ["M9 6l6 6-6 6"],
  plus: ["M12 5v14", "M5 12h14"],
  up: ["M12 19V5", "M5 12l7-7 7 7"],
  down: ["M12 5v14", "M5 12l7 7 7-7"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  search: ["M4 10a6 6 0 1 0 12 0a6 6 0 1 0-12 0", "M16 16l4 4"],
  pencil: ["M4 20h4L19 9l-4-4L4 16z", "M13 7l4 4"],
  layers: ["M3 8l9-5 9 5-9 5z", "M3 13l9 5 9-5"],
  download: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  send: ["M4 12L20 4l-6 16-3-7z"],
  refresh: ["M20 11A8 8 0 0 0 6 6L4 8", "M4 4v4h4", "M4 13a8 8 0 0 0 14 5l2-2", "M20 20v-4h-4"],
  back: ["M19 12H5", "M12 5l-7 7 7 7"],
  bookmark: ["M6 4h12v17l-6-4-6 4z"],
  rss: ["M5 5a14 14 0 0 1 14 14", "M5 11a8 8 0 0 1 8 8", "M5 19h1"],
  disk: ["M4 4h13l3 3v13H4z", "M8 4v5h8V4", "M8 20v-6h8v6"],
  box: ["M4 4h16v16H4z"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M6 7l1 13h10l1-13", "M10 11v6", "M14 11v6"],
  alert: ["M12 4l9 16H3z", "M12 10v4", "M12 17v1"],
  pointer: ["M5 4l14 7-6 2-2 6z"],
  info: ["M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0", "M12 11v5", "M12 8v1"],
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  /** 16 by default; 20 for the places, 28 for an empty state. */
  size?: number;
  className?: string;
  /** `box` is drawn dashed: the "not rendered" mark. */
  dashed?: boolean;
}

export function Icon({ name, size = 16, className, dashed = false }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 28 ? 1.6 : size >= 20 ? 1.75 : 1.9}
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeDasharray={dashed ? "3 3" : undefined}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
