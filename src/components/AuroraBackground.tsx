import React from "react";

/**
 * Yengil, to'liq CSS asosidagi fon. Tashqi resurs (YouTube, rasm) talab qilmaydi.
 * Faqat transform/opacity animatsiya qilinadi — GPU-da ishlaydi, CPU yuki deyarli nol.
 */
const AuroraBackground: React.FC = () => {
  return (
    <div className="aurora-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />
    </div>
  );
};

export default AuroraBackground;
