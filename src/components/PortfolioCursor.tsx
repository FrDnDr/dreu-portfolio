import { useEffect, useState } from "react";
import GlowCursor from "./GlowCursor";

export function PortfolioCursor({ dark }: { dark: boolean }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  if (!enabled) return null;

  return <GlowCursor
    className="portfolio-cursor"
    color={dark ? "#C7F430" : "#405218"}
    secondaryColor={dark ? "#91B82A" : "#A5B879"}
    theme={dark ? "dark" : "light"}
    intensity={1.3}
    trailWidth={3}
    linger={2}
    glow={1.2}
    clickBurst
    quality="medium"
    maxDevicePixelRatio={1.5}
    aria-hidden="true"
  />;
}
