import React, { memo } from "react";
import { cn } from "../lib/utils";

interface MahjongTileProps {
  value: string;
  colorClass?: string;
  isGlow?: boolean;
  className?: string;
  onClick?: () => void;
}

const MahjongTile = memo(({ value, colorClass = "text-primary", isGlow, className, onClick }: MahjongTileProps) => {
  return (
    <div 
      className={cn(
        "mahjong-tile w-10 md:w-12 aspect-[3/4] bg-white rounded-md flex items-center justify-center border border-outline-variant/30 shadow-sm transition-all duration-200 cursor-pointer",
        isGlow && "border-primary/50 shadow-[0_0_15px_rgba(0,105,118,0.2)]",
        className
      )}
      onClick={onClick}
    >
      <span className={cn("font-headline font-bold text-lg", colorClass)}>{value}</span>
    </div>
  );
});

MahjongTile.displayName = "MahjongTile";

export default MahjongTile;
