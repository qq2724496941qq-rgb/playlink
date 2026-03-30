import React, { useState, useEffect, useCallback } from "react";
import MahjongTile from "./MahjongTile";
import { motion, AnimatePresence } from "motion/react";

interface Tile {
  id: string;
  v: string;
  c: string;
}

const TILE_TYPES = [
  { v: "1萬", c: "text-red-600" }, { v: "2萬", c: "text-red-600" }, { v: "3萬", c: "text-red-600" },
  { v: "4萬", c: "text-red-600" }, { v: "5萬", c: "text-red-600" }, { v: "6萬", c: "text-red-600" },
  { v: "7萬", c: "text-red-600" }, { v: "8萬", c: "text-red-600" }, { v: "9萬", c: "text-red-600" },
  { v: "1筒", c: "text-blue-600" }, { v: "2筒", c: "text-blue-600" }, { v: "3筒", c: "text-blue-600" },
  { v: "4筒", c: "text-blue-600" }, { v: "5筒", c: "text-blue-600" }, { v: "6筒", c: "text-blue-600" },
  { v: "7筒", c: "text-blue-600" }, { v: "8筒", c: "text-blue-600" }, { v: "9筒", c: "text-blue-600" },
  { v: "1索", c: "text-green-600" }, { v: "2索", c: "text-green-600" }, { v: "3索", c: "text-green-600" },
  { v: "4索", c: "text-green-600" }, { v: "5索", c: "text-green-600" }, { v: "6索", c: "text-green-600" },
  { v: "7索", c: "text-green-600" }, { v: "8索", c: "text-green-600" }, { v: "9索", c: "text-green-600" },
  { v: "東", c: "text-slate-800" }, { v: "南", c: "text-slate-800" }, { v: "西", c: "text-slate-800" }, { v: "北", c: "text-slate-800" },
  { v: "中", c: "text-red-700" }, { v: "發", c: "text-green-700" }, { v: "白", c: "text-slate-400" },
];

const getRandomTile = (): Tile => {
  const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
  return { ...type, id: Math.random().toString(36).substr(2, 9) };
};

const DIRECTIONS = ["東", "南", "西", "北"];

export default function MahjongArena() {
  const [hand, setHand] = useState<Tile[]>(Array.from({ length: 13 }, getRandomTile));
  const [discards, setDiscards] = useState<{ [key: number]: Tile[] }>({
    0: [], // Bottom (Self)
    1: [], // Right
    2: [], // Top
    3: [], // Left
  });
  const [melds, setMelds] = useState<{ [key: number]: Tile[][] }>({
    0: [], // Bottom (Self)
    1: [], // Right
    2: [], // Top
    3: [], // Left
  });
  const [activePlayer, setActivePlayer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setActivePlayer((p) => (p + 1) % 4);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDiscard = useCallback((tile: Tile) => {
    if (activePlayer !== 0) return;

    setHand((prev) => prev.filter((t) => t.id !== tile.id));
    setDiscards((prev) => ({
      ...prev,
      0: [...prev[0], tile],
    }));
    
    // Simulate next player turn
    setActivePlayer(1);
    setTimeLeft(15);

    // Auto-draw for self after a delay (simulated game loop)
    setTimeout(() => {
      setHand(prev => [...prev, getRandomTile()]);
    }, 2000);
  }, [activePlayer]);

  const handleAction = useCallback((action: string) => {
    // Find the last player who discarded
    const lastPlayer = (activePlayer + 3) % 4;
    
    setDiscards((prev) => {
      const newDiscards = { ...prev };
      if (newDiscards[lastPlayer].length > 0) {
        const removedTile = newDiscards[lastPlayer][newDiscards[lastPlayer].length - 1];
        newDiscards[lastPlayer] = newDiscards[lastPlayer].slice(0, -1);
        
        // Add to current player's melds
        setMelds(mPrev => {
          const newMelds = { ...mPrev };
          // Simulate a set of 3 for Eat/Pong, or 4 for Gong
          const count = action === "Gong" ? 4 : 3;
          const meldSet = Array.from({ length: count }, () => ({ ...removedTile, id: Math.random().toString(36).substr(2, 9) }));
          newMelds[activePlayer] = [...newMelds[activePlayer], meldSet];
          return newMelds;
        });

        console.log(`${action} performed on tile: ${removedTile.v}`);
      }
      return newDiscards;
    });
  }, [activePlayer]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
      {/* Table Surface - Clean & Bright */}
      <div className="absolute inset-0 z-0 bg-[#ffffff]"></div>
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] bg-[size:32px_32px]"></div>
      
      {/* Arena Border */}
      <div className="absolute inset-8 z-0 border border-slate-100 rounded-[40px] pointer-events-none"></div>

      {/* Game Table Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10">
        
        {/* Top Player (Opponent 2) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {/* Melds Area Top */}
          <div className="flex gap-1.5">
            {melds[2].map((meld, mi) => (
              <div key={mi} className="flex gap-0.5 bg-slate-200/50 p-1 rounded-md shadow-inner">
                {meld.map((tile) => (
                  <div key={tile.id} className="w-4 h-6 bg-white rounded-sm border-b-2 border-slate-200 flex items-center justify-center">
                    <span className={`text-[7px] font-bold ${tile.c}`}>{tile.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Hand */}
          <div className="flex gap-0.5">
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="w-4 h-6 bg-white rounded-sm border-b-2 border-slate-200 shadow-sm"></div>
            ))}
          </div>

          {/* Player Info (Right of hand) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-full border border-slate-200 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-slate-700">Wei_Master</span>
            {activePlayer === 2 && <motion.div layoutId="active" className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />}
          </div>
        </div>

        {/* Left Player (Opponent 3) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-start gap-4">
          {/* Player Info (Horizontal like self) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-full border border-slate-200 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-slate-700">Sakura_X</span>
            {activePlayer === 3 && <motion.div layoutId="active" className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />}
          </div>

          <div className="flex items-center gap-3">
            {/* Melds Area Left */}
            <div className="flex flex-col gap-2">
              {melds[3].map((meld, mi) => (
                <div key={mi} className="flex gap-0.5 bg-slate-200/50 p-1 rounded-md shadow-inner">
                  {meld.map((tile) => (
                    <div key={tile.id} className="w-4 h-6 bg-white rounded-sm border-b-2 border-slate-200 flex items-center justify-center">
                      <span className={`text-[7px] font-bold ${tile.c}`}>{tile.v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Hand */}
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="w-6 h-4 bg-white rounded-sm border-r-2 border-slate-200 shadow-sm"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Player (Opponent 1) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end gap-4">
          {/* Player Info (Horizontal like self) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-full border border-slate-200 shadow-sm shrink-0">
            <span className="text-[10px] font-bold text-slate-700">Dragon_L</span>
            {activePlayer === 1 && <motion.div layoutId="active" className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />}
          </div>

          <div className="flex items-center gap-3">
            {/* Hand */}
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="w-6 h-4 bg-white rounded-sm border-l-2 border-slate-200 shadow-sm"></div>
              ))}
            </div>
            {/* Melds Area Right */}
            <div className="flex flex-col gap-2">
              {melds[1].map((meld, mi) => (
                <div key={mi} className="flex gap-0.5 bg-slate-200/50 p-1 rounded-md shadow-inner">
                  {meld.map((tile) => (
                    <div key={tile.id} className="w-4 h-6 bg-white rounded-sm border-b-2 border-slate-200 flex items-center justify-center">
                      <span className={`text-[7px] font-bold ${tile.c}`}>{tile.v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Central Area: Timer + Discards (Smaller) */}
        <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px] flex items-center justify-center">
          
          {/* Central Compass & Timer (Compact) */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-white border border-slate-200 shadow-lg flex items-center justify-center relative z-20 overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/30"></div>
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-1 opacity-80 z-10">
              <div className="flex items-center justify-center"></div>
              <div className={`flex items-center justify-center text-[9px] font-bold ${activePlayer === 2 ? 'text-orange-600' : 'text-slate-400'}`}>北</div>
              <div className="flex items-center justify-center"></div>
              <div className={`flex items-center justify-center text-[9px] font-bold ${activePlayer === 3 ? 'text-orange-600' : 'text-slate-400'}`}>西</div>
              <div className="flex items-center justify-center"></div>
              <div className={`flex items-center justify-center text-[9px] font-bold ${activePlayer === 1 ? 'text-orange-600' : 'text-slate-400'}`}>東</div>
              <div className="flex items-center justify-center"></div>
              <div className={`flex items-center justify-center text-[9px] font-bold ${activePlayer === 0 ? 'text-orange-600' : 'text-slate-400'}`}>南</div>
              <div className="flex items-center justify-center"></div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl md:text-2xl font-mono font-bold text-orange-600">
                {timeLeft.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Discarded Tiles (Grid in front of each player) */}
          <div className="absolute inset-0 z-10">
            {/* Bottom Discards (Self) - Moved closer to center */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 grid grid-cols-6 gap-0.5 w-[160px]">
              <AnimatePresence>
                {discards[0].map((tile, idx) => {
                  const isLast = idx === discards[0].length - 1 && activePlayer === 1;
                  return (
                    <motion.div
                      key={tile.id}
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`w-6 h-8 bg-white rounded-sm flex items-center justify-center border shadow-sm relative ${isLast ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200'}`}
                    >
                      <span className={`text-[9px] font-bold ${tile.c}`}>{tile.v}</span>
                      {isLast && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-sm"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Top Discards - Moved closer to center */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 grid grid-cols-6 gap-0.5 w-[160px] rotate-180">
              {discards[2].map((tile, idx) => {
                const isLast = idx === discards[2].length - 1 && activePlayer === 3;
                return (
                  <div key={tile.id} className={`w-6 h-8 bg-white rounded-sm flex items-center justify-center border shadow-sm relative ${isLast ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                    <span className={`text-[9px] font-bold ${tile.c}`}>{tile.v}</span>
                    {isLast && <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-sm" />}
                  </div>
                );
              })}
            </div>

            {/* Left Discards - Moved closer to center */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 grid grid-rows-6 grid-flow-col gap-0.5 h-[160px] rotate-90">
              {discards[3].map((tile, idx) => {
                const isLast = idx === discards[3].length - 1 && activePlayer === 0;
                return (
                  <div key={tile.id} className={`w-6 h-8 bg-white rounded-sm flex items-center justify-center border shadow-sm relative ${isLast ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                    <span className={`text-[9px] font-bold ${tile.c}`}>{tile.v}</span>
                    {isLast && <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-sm" />}
                  </div>
                );
              })}
            </div>

            {/* Right Discards - Moved closer to center */}
            <div className="absolute right-20 top-1/2 -translate-y-1/2 grid grid-rows-6 grid-flow-col gap-0.5 h-[160px] -rotate-90">
              {discards[1].map((tile, idx) => {
                const isLast = idx === discards[1].length - 1 && activePlayer === 2;
                return (
                  <div key={tile.id} className={`w-6 h-8 bg-white rounded-sm flex items-center justify-center border shadow-sm relative ${isLast ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200'}`}>
                    <span className={`text-[9px] font-bold ${tile.c}`}>{tile.v}</span>
                    {isLast && <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white shadow-sm" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player Interaction Controls */}
        <div className="mt-6 flex gap-2">
          <button 
            onClick={() => handleAction("Eat")}
            className="px-5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >吃</button>
          <button 
            onClick={() => handleAction("Pong")}
            className="px-5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >碰</button>
          <button 
            onClick={() => handleAction("Gong")}
            className="px-5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >杠</button>
          <button className="px-7 py-1.5 bg-orange-500 text-white rounded-lg text-[11px] font-bold shadow-sm hover:bg-orange-600 transition-all active:scale-95 ml-2">胡</button>
        </div>
      </div>

      {/* Bottom Player Hand (Self) */}
      <div className="w-full bg-white py-4 px-4 md:px-10 border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
          {/* Player Info Header */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <div>
                  <div className="text-[9px] text-orange-600 font-bold uppercase tracking-widest leading-none">轮到你了</div>
                  <div className="text-xs font-bold text-slate-800">ProPlayer_99</div>
                </div>
              </div>

              {/* Melds Area Bottom (Self) - Right of hand */}
              <div className="flex gap-2 ml-4">
                {melds[0].map((meld, mi) => (
                  <div key={mi} className="flex gap-0.5 bg-slate-200/50 p-1.5 rounded-md shadow-inner">
                    {meld.map((tile) => (
                      <div key={tile.id} className="w-6 h-8 bg-white rounded-sm border-b-2 border-slate-200 flex items-center justify-center">
                        <span className={`text-[10px] font-bold ${tile.c}`}>{tile.v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-orange-600 text-base font-mono font-bold leading-none">32,800</div>
              <div className="text-slate-400 text-[8px] uppercase tracking-widest">积分</div>
            </div>
          </div>

          {/* Player Hand - Single Row, No Scroll */}
          <div className="flex gap-0.5 md:gap-1 items-end justify-center w-full">
            <AnimatePresence>
              {hand.map((tile, i) => (
                <motion.div
                  key={tile.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  whileHover={{ y: -12 }}
                  className="shrink-0"
                >
                  <MahjongTile 
                    value={tile.v} 
                    colorClass={tile.c} 
                    className={`w-10 md:w-12 border-b-4 border-slate-200 ${activePlayer === 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                    onClick={() => handleDiscard(tile)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
