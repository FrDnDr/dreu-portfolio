import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface GlowCursorProps extends HTMLAttributes<HTMLDivElement> {
  color?: string;
  secondaryColor?: string;
  intensity?: number;
  trailWidth?: number;
  linger?: number;
  glow?: number;
  hotspot?: number;
  followSpeed?: number;
  grain?: number;
  clickBurst?: boolean;
  quality?: "low" | "medium" | "high";
  theme?: "dark" | "light";
  blendMode?: CSSProperties["mixBlendMode"];
  maxDevicePixelRatio?: number;
  enabled?: boolean;
  children?: ReactNode;
}
export default function GlowCursor(props: GlowCursorProps): ReactNode;
