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
  size?: "sm" | "md" | "lg" | "xl";
}

const PokerCard = memo(({ value, suit, isSelected, className, onClick, size = "md" }: PokerCardProps) => {
  const isRed = suit === "heart" || suit === "diamond";
  
  const SuitIcon = {
    heart: Heart,
    spade: Spade,
    diamond: Diamond,
    club: Club,
  }[suit];

  const sizeClasses = {
    sm: {
      container: "w-16 h-24 p-1.5 rounded-lg",
      text: "text-xs",
      icon: "w-3 h-3",
      centerIcon: "w-8 h-8"
    },
    md: {
      container: "w-24 h-36 p-2 rounded-xl",
      text: "text-lg",
      icon: "w-4 h-4",
      centerIcon: "w-12 h-12"
    },
    lg: {
      container: "w-28 h-40 p-3 rounded-xl",
      text: "text-2xl",
      icon: "w-5 h-5",
      centerIcon: "w-16 h-16"
    },
    xl: {
      container: "w-32 h-44 p-4 rounded-2xl",
      text: "text-4xl",
      icon: "w-6 h-6",
      centerIcon: "w-20 h-20"
    }
  }[size];

  return (
    <div 
      className={cn(
        "poker-card bg-white flex flex-col shadow-lg cursor-pointer border border-outline-variant/20 transition-all duration-200",
        sizeClasses.container,
        isRed ? "text-error" : "text-on-surface",
        isSelected && "ring-4 ring-primary border-primary/10 shadow-2xl scale-[1.02]",
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
