import React from "react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-3 bg-white/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="flex items-center">
          <div 
            className="text-2xl font-black tracking-tighter text-primary font-headline cursor-pointer transition-transform active:scale-95"
            onClick={() => onTabChange("lobby")}
          >
            PlayLink
          </div>
          
          <div className="hidden md:flex items-center gap-10 ml-12">
            <button 
              className={`font-label text-sm font-black tracking-widest uppercase transition-all pb-1 border-b-2 hover:text-primary ${
                activeTab === "lobby" ? "text-primary border-primary" : "text-slate-400 border-transparent"
              }`}
              onClick={() => onTabChange("lobby")}
            >
              游戏大厅
            </button>
            <button 
              className={`font-label text-sm font-black tracking-widest uppercase transition-all pb-1 border-b-2 hover:text-primary ${
                activeTab !== "lobby" ? "text-primary border-primary" : "text-slate-400 border-transparent"
              }`}
              onClick={() => onTabChange("games")}
            >
              游戏房间
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Icons removed as per user request */}
        </div>
      </nav>

      <main className="flex-1 flex flex-col pt-16">
        {children}
      </main>
    </div>
  );
}
