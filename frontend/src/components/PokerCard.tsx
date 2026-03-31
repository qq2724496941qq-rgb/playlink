import React, { memo } from "react";
import { Heart, Spade, Diamond, Club } from "lucide-react";
import { cn } from "../lib/utils";

export type Suit = "heart" | "spade" | "diamond" | "club";

interface PokerCardProps {
  value: string;
  suit: Suit;
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const PokerCard = memo(({ value, suit, isSelected, className, onClick, size = "md" }: PokerCardProps) => {
  const isRed = suit === "heart" || suit === "diamond";
  
  const SuitIcon = {
    heart: Heart,
    spade: Spade,
    diamond: Diamond,
    club: Club,
  }[suit];

  /* 固定尺寸 — 基于 1280×720 设计稿 */
  const sizeClasses = {
    xs: {
      container: "w-[32px] h-[48px] p-[2px] rounded-md",
      text: "text-[8px]",
      icon: "w-[8px] h-[8px]",
      centerIcon: "w-[16px] h-[16px]"
    },
    sm: {
      container: "w-[48px] h-[72px] p-[4px] rounded-lg",
      text: "text-[11px]",
      icon: "w-[10px] h-[10px]",
      centerIcon: "w-[22px] h-[22px]"
    },
    md: {
      container: "w-[72px] h-[108px] p-[6px] rounded-xl",
      text: "text-[16px]",
      icon: "w-[14px] h-[14px]",
      centerIcon: "w-[36px] h-[36px]"
    },
    lg: {
      container: "w-[88px] h-[132px] p-[8px] rounded-xl",
      text: "text-[22px]",
      icon: "w-[16px] h-[16px]",
      centerIcon: "w-[48px] h-[48px]"
    },
    xl: {
      container: "w-[100px] h-[148px] p-[10px] rounded-xl",
      text: "text-[26px]",
      icon: "w-[18px] h-[18px]",
      centerIcon: "w-[56px] h-[56px]"
    }
  }[size];

  return (
    <div 
      className={cn(
        "poker-card bg-white flex flex-col shadow-xl cursor-pointer border border-outline-variant/30 transition-all duration-300",
        "bg-gradient-to-br from-white via-white to-slate-50",
        sizeClasses.container,
        isRed ? "text-error" : "text-on-surface",
        isSelected && "ring-4 ring-primary ring-offset-2 border-primary/20 shadow-2xl scale-[1.05] z-50",
        !isSelected && "hover:shadow-2xl hover:-translate-y-1 hover:border-primary/20",
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <span className={cn("font-headline font-extrabold leading-none", sizeClasses.text)}>{value}</span>
        <SuitIcon className={cn(sizeClasses.icon, isRed ? "fill-error" : "fill-on-surface")} />
      </div>
      <div className="flex-1 flex items-center justify-center opacity-5 overflow-hidden">
        <SuitIcon className={sizeClasses.centerIcon} />
      </div>
    </div>
  );
});

PokerCard.displayName = "PokerCard";

export default PokerCard;
