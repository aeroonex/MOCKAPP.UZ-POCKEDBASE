import React from "react";

/**
 * Statik, to'liq CSS fon (animatsiya va blur filtrlarsiz) — hech qanday CPU/GPU yuki yo'q.
 */
const AuroraBackground: React.FC = () => (
  <div className="aurora-bg pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
);

export default AuroraBackground;
