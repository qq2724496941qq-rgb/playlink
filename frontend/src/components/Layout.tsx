import React from "react";
import ScaleContainer from "./ScaleContainer";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  hideHeader?: boolean;
}

export default function Layout({ children, activeTab, onTabChange, hideHeader }: LayoutProps) {
  return (
    <ScaleContainer>
      <div className="w-[1280px] h-[720px] overflow-hidden flex flex-col bg-background text-on-surface font-body">
        {/* TopNavBar */}
        {!hideHeader && (
          <nav className="w-full z-50 flex justify-between items-center px-6 py-4 shrink-0">
            <div className="flex items-center">
              <div 
                className="text-2xl font-black tracking-tighter text-primary font-headline cursor-pointer transition-transform active:scale-95"
                onClick={() => onTabChange("lobby")}
              >
                PlayLink
              </div>
            </div>
          </nav>
        )}

        <main className={`flex-1 flex flex-col min-h-0 relative overflow-hidden ${!hideHeader ? "" : ""}`}>
          {children}
        </main>
      </div>
    </ScaleContainer>
  );
}
