import React from "react";

export const CornerDecorations: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Top left corner decoration */}
      <div className="absolute top-0 left-0 opacity-60">
        <img
          src="/assets/ui/corner-decoration-01.png"
          alt="Corner decoration"
          width={180}
          height={180}
          className="w-[180px] h-[180px]"
        />
      </div>

      {/* Bottom left corner decoration (flipped vertically) */}
      <div className="absolute bottom-0 left-0 opacity-60">
        <div className="transform scale-y-[-1]">
          <img
            src="/assets/ui/corner-decoration-01.png"
            alt="Corner decoration"
            width={180}
            height={180}
            className="w-[180px] h-[180px]"
          />
        </div>
      </div>
    </div>
  );
};
