import { Wallet, Zap, User, ArrowLeft } from "lucide-react";
import PokerCard, { Suit } from "./PokerCard";
import { motion, AnimatePresence } from "motion/react";
import { SocketContext } from "../App";
import { useEffect, useState, useContext, useCallback } from "react";
import { cn } from "../lib/utils";

// ============================================================
// 牌值工具（跑得快：无大小王，2 最大，A 次之）
// ============================================================
const parseCardId = (id: string) => {
  const parts = id.split("-");
  const suit = parts[0];
  const value = parts.slice(1).join("-");
  return { suit, value };
};

// 跑得快牌力排序（3最小，2最大）
const CARD_ORDER: Record<string, number> = {
  "3": 1, "4": 2, "5": 3, "6": 4, "7": 5, "8": 6, "9": 7,
  "10": 8, "J": 9, "Q": 10, "K": 11, "A": 12, "2": 13,
};

function sortCards(cards: any[]) {
  return [...cards].sort((a, b) => {
    const { value: valA } = parseCardId(a.id);
    const { value: valB } = parseCardId(b.id);
    return CARD_ORDER[valB] - CARD_ORDER[valA];
  });
}

// 牌型判断辅助（中文）
function getPatternLabel(cards: any[]) {
  if (cards.length === 1) return "单张";
  if (cards.length === 2 && parseCardId(cards[0].id).value === parseCardId(cards[1].id).value) return "对子";
  if (cards.length === 3) {
    const vals = cards.map(c => parseCardId(c.id).value);
    if (vals[0] === vals[1] && vals[1] === vals[2]) return "三张";
  }
  if (cards.length >= 4) return "组合牌";
  return null;
}

// ============================================================
// 子组件：侧边玩家
// ============================================================
function PlayerSide({ idx, align, room, user }: { idx: number, align: "left" | "right", room: any, user: any }) {
  const game = room?.gameData;
  const player = room?.players?.[idx];
  const isCurrent = game?.currentPlayer === idx;
  const sessionScores = room?.sessionScores;
  
  const getActionLabelText = () => {
     if (game?.currentPlayer === idx) return { text: "出牌中…", color: "text-primary" };
     if (game?.playedCards?.[idx]?.length === 0 && game?.lastPlay?.player !== idx && game?.status === "playing") {
        return { text: "不要", color: "text-slate-400" };
     }
     return null;
  };

  const label = getActionLabelText();
  const cardCount = game?.playerCardCounts?.[idx] ?? game?.hands?.[idx]?.length ?? 0;

  // 已打出的牌（最近一手）
  const lastPlayed: any[] = [];
  if (
    game?.lastPlay?.player === idx &&
    Array.isArray(game?.lastPlay?.cards) &&
    game.lastPlay.cards.length > 0
  ) {
    lastPlayed.push(...sortCards(game.lastPlay.cards));
  }

  return (
    <div className="w-[160px] shrink-0 flex flex-col items-center justify-center gap-3 px-2">
      <div className={cn(
        "w-full flex flex-col items-center gap-2 p-3 rounded-2xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300",
        isCurrent ? "border-primary ring-2 ring-primary/20 shadow-primary/10 shadow-md" : "border-outline-variant/30"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm transition-transform duration-300",
          isCurrent && "scale-110",
          align === "left" ? "bg-primary/80" : "bg-secondary/80"
        )}>
          {player?.nickname?.[0] ?? "?"}
        </div>
        <p className="text-[13px] font-black text-on-surface truncate max-w-[120px] text-center">
          {player?.nickname ?? "等待中"}
        </p>
        <div className="flex items-center gap-2 mt-1 justify-center">
          <div className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-600">
            {cardCount} 张
          </div>
          {sessionScores && (
            <div className="text-[11px] font-black text-amber-700 tabular-nums">
              {sessionScores[idx] >= 0 ? "+" : ""}{sessionScores[idx] ?? 0}
            </div>
          )}
        </div>
      </div>

      {lastPlayed.length > 0 && (
        <div className="flex -space-x-6 justify-center">
          {lastPlayed.slice(0, 5).map((card: any, i: number) => {
            const { suit, value } = parseCardId(card.id);
            return (
              <motion.div key={card.id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ zIndex: i + 1 }}>
                <PokerCard value={value} suit={suit as Suit} size="xs" className="shadow-md" />
              </motion.div>
            );
          })}
        </div>
      )}

      {label && (
        <span className={`text-[12px] font-black italic ${label.color} animate-pulse`}>
          {label.text}
        </span>
      )}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function PaodekuaiArena() {
  const { socket, room, user, goToLobby } = useContext(SocketContext);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const game = room?.gameData;
  const meIndex = room?.players?.findIndex((p: any) => p.id === user?.id) ?? -1;
  const myHand: any[] = game?.hands?.[meIndex] || [];
  const status: string = game?.status || "waiting";
  const isMyTurn = game?.currentPlayer === meIndex;
  const sortedHand = sortCards(myHand);
  const leftIndex = (meIndex + 2) % 3;
  const rightIndex = (meIndex + 1) % 3;
  const totalRounds = room?.totalRounds ?? 3;
  const completedRounds = room?.completedRounds ?? 0;

  // 滑动选牌逻辑
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [dragCurrentId, setDragCurrentId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    if (status !== "playing") return;
    setDragStartId(id);
    setDragCurrentId(id);
  };

  const handleDragOver = (id: string) => {
    if (dragStartId) setDragCurrentId(id);
  };

  const handleDragEnd = () => {
    if (dragStartId && dragCurrentId) {
      const startIndex = sortedHand.findIndex(c => c.id === dragStartId);
      const currentIndex = sortedHand.findIndex(c => c.id === dragCurrentId);
      const min = Math.min(startIndex, currentIndex);
      const max = Math.max(startIndex, currentIndex);

      if (min === max) toggleCard(dragStartId);
      else {
        const rangeIds = sortedHand.slice(min, max + 1).map(c => c.id);
        const alreadySelected = rangeIds.filter(id => selectedCardIds.includes(id));
        if (alreadySelected.length >= rangeIds.length / 2) {
          setSelectedCardIds(prev => prev.filter(id => !rangeIds.includes(id)));
        } else {
          setSelectedCardIds(prev => Array.from(new Set([...prev, ...rangeIds])));
        }
      }
    }
    setDragStartId(null);
    setDragCurrentId(null);
  };

  // 倒计时
  const [timeLeft, setTimeLeft] = useState(15);
  useEffect(() => {
    if (!game?.turnDeadline) return;
    const calc = () => Math.max(0, Math.floor((game.turnDeadline - Date.now()) / 1000));
    setTimeLeft(calc());
    const timer = setInterval(() => {
      const r = calc();
      setTimeLeft(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [game?.turnDeadline]);

  const toggleCard = useCallback((id: string) => {
    setSelectedCardIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const playCards = useCallback(() => {
    if (selectedCardIds.length === 0) return;
    const cardsToPlay = myHand.filter((c: any) => selectedCardIds.includes(c.id));
    socket?.emit("paodekuai-play", { cards: cardsToPlay });
    setSelectedCardIds([]);
  }, [selectedCardIds, myHand, socket]);

  const passPlay = useCallback(() => {
    socket?.emit("paodekuai-play", { cards: [] });
    setSelectedCardIds([]);
  }, [socket]);

  const centerCards = sortCards(game?.lastPlay?.cards || []);
  const centerPlayer = game?.lastPlay?.player ?? -1;
  const centerPlayerName = centerPlayer >= 0 ? room?.players?.[centerPlayer]?.nickname : null;
  const selectedCards = myHand.filter((c: any) => selectedCardIds.includes(c.id));
  const patternLabel = selectedCards.length > 0 ? getPatternLabel(selectedCards) : null;
  const isFirstMove = !game?.lastPlay && status === "playing";
  const myHasSpade3 = myHand.some((c: any) => c.id === "spade-3");
  const mustIncludeSpade3 = isFirstMove && myHasSpade3;

  return (
    <div className="w-[1280px] h-[720px] relative flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-primary/5 to-primary/10">
      {/* 顶部：退出与名字 + 局数 */}
      <div className="relative z-10 pt-4 w-full px-12 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4 min-w-[200px]">
           <button onClick={() => setShowExitConfirm(true)} className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-xl border border-primary/20 shadow-sm flex items-center justify-center text-primary hover:bg-white transition-all active:scale-95">
             <ArrowLeft className="w-6 h-6 stroke-[3]" />
           </button>
           <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/40">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold">
                {user?.nickname?.[0] ?? "P"}
              </div>
              <span className="text-sm font-black text-slate-700">{user?.nickname}</span>
           </div>
        </div>
        <div className="relative flex items-center gap-4 ml-20">
          <div className="px-6 py-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-primary/20 shadow-sm flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div className="text-sm font-black text-slate-700">
              <span className="text-primary text-xl">{completedRounds}</span>
              <span className="text-slate-400"> / {totalRounds}</span>
            </div>
          </div>
        </div>
        <div className="w-40" />
      </div>

      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[32px] p-10 w-[420px] shadow-2xl border border-slate-200 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ArrowLeft className="w-10 h-10 text-red-500 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">确定退出游戏？</h3>
              <p className="text-slate-500 font-medium mb-8">退出后将返回大厅，您可能会错过当前的牌局进展。</p>
              <div className="flex gap-4">
                <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">取消</button>
                <button onClick={() => goToLobby()} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all">退出桌面</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex items-center min-h-0 px-10 gap-0">
        <PlayerSide idx={leftIndex} align="left" room={room} user={user} />
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">
          <div className="flex flex-col items-center gap-4">
            {status !== "finished" && (
              <div className="flex flex-col items-center z-30">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-colors duration-300", timeLeft <= 5 ? "bg-red-500 text-white border-red-300 animate-pulse" : "bg-white/90 text-primary border-primary/30")}>
                  <span className="font-black text-3xl leading-none">{timeLeft}</span>
                </div>
              </div>
            )}
            <div className={cn("flex items-start justify-center transition-all duration-500 min-h-[140px]", centerCards.length > 0 ? 'opacity-100' : 'opacity-0')}>
              {centerCards.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex -space-x-8 items-start px-8">
                    {centerCards.map((card: any, i: number) => {
                      const { suit, value } = parseCardId(card.id);
                      return (
                        <motion.div key={card.id} initial={{ scale: 0.8, opacity: 0, y: -12 }} animate={{ scale: 1, opacity: 1, y: 0 }} style={{ zIndex: i + 1 }}>
                          <PokerCard value={value} suit={suit as Suit} size="sm" className="shadow-xl" />
                        </motion.div>
                      );
                    })}
                  </div>
                  {centerPlayerName && <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{centerPlayerName} 出的牌</span>}
                </div>
              )}
            </div>
          </div>
          {status === "finished" && game?.result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute z-[100] bg-white rounded-[32px] p-8 shadow-2xl border-4 border-primary/30 w-[400px] text-center">
              <h2 className="text-3xl font-black text-slate-800 mb-2">本局结束</h2>
              <div className="text-5xl font-black text-primary mb-6">#{game.result.winner === meIndex ? "获得胜利" : "惜败"}</div>
              <div className="space-y-3 mb-8">
                {game.result.scores.map((s: number, i: number) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-600">{room?.players?.[i]?.nickname}</span>
                    <span className={cn("font-black tabular-nums", s >= 0 ? "text-green-600" : "text-red-600")}>{s >= 0 ? "+" : ""}{s}</span>
                  </div>
                ))}
              </div>
              {room.players[room.hostId === user?.id ? meIndex : 0]?.id === user?.id && <button onClick={() => socket.emit("restart-game")} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">下一局</button>}
            </motion.div>
          )}
        </div>
        <PlayerSide idx={rightIndex} align="right" room={room} user={user} />
      </div>

      {/* 底部：操作与手牌 (名字区域还原，手牌右移) */}
      <div className="relative z-20 shrink-0 flex gap-10 px-12 pb-10 pt-4 items-end bg-gradient-to-t from-white/40 to-transparent">
        <div className="w-[180px] shrink-0 flex flex-col gap-4 justify-end">
          <div className={cn("flex items-center gap-4 px-5 py-4 bg-white/90 backdrop-blur-md rounded-[24px] border shadow-xl transition-all", isMyTurn ? "ring-4 ring-primary/40 shadow-md border-primary/20" : "border-slate-200")}>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white shadow-inner shrink-0"><User className="w-5 h-5" /></div>
            <div className="flex flex-col min-w-0">
              <p className="text-base font-black text-on-surface truncate">{user?.nickname}</p>
              <div className="flex items-center gap-1 mt-1">
                {isMyTurn && <span className="text-[10px] bg-primary/10 text-primary px-3 py-0.5 rounded-full font-black animate-pulse">正在思考</span>}
                <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">我</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 py-4 bg-white/90 border border-primary/10 rounded-[24px] shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-black">积分</p>
              <p className="font-black text-primary text-xl">{user?.score ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-end min-w-0">
          <AnimatePresence>
            {isMyTurn && status === "playing" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex gap-4 mb-4 z-50">
                <button onClick={passPlay} disabled={mustIncludeSpade3 || isFirstMove || game?.lastPlay?.player === meIndex} className={cn("px-10 py-4 rounded-2xl font-black text-lg transition-all", (mustIncludeSpade3 || isFirstMove || game?.lastPlay?.player === meIndex) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white text-slate-700 shadow-lg border border-slate-200 hover:bg-slate-50 active:scale-95")}>不要</button>
                {selectedCardIds.length > 0 && <button onClick={playCards} disabled={mustIncludeSpade3 && !selectedCardIds.includes("spade-3")} className={cn("px-16 py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95", (mustIncludeSpade3 && !selectedCardIds.includes("spade-3")) ? "opacity-50 cursor-not-allowed" : "hover:brightness-110")}>出牌 {patternLabel && <span className="opacity-60 ml-1 text-sm">[{patternLabel}]</span>}</button>}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative group flex justify-center w-full ml-24">
            <div className="flex -space-x-12 pb-6 pt-10">
              {sortedHand.map((card, index) => {
                const { suit, value } = parseCardId(card.id);
                const isSelected = selectedCardIds.includes(card.id);
                const isSpade3 = card.id === "spade-3";
                const isDragged = card.id === dragCurrentId || (dragStartId && dragCurrentId && isSelected);
                return (
                  <motion.div key={card.id} layoutId={card.id} className="relative transition-all duration-300 ease-out" style={{ zIndex: index, y: isSelected ? -30 : 0 }} onMouseDown={() => handleDragStart(card.id)} onMouseEnter={() => handleDragOver(card.id)} onMouseUp={handleDragEnd}>
                    <PokerCard value={value} suit={suit as Suit} className={cn("cursor-pointer shadow-xl rounded-xl transition-all duration-300", isSelected ? "ring-4 ring-primary shadow-primary/40" : "hover:-translate-y-4", mustIncludeSpade3 && isSpade3 ? "ring-4 ring-amber-400 shadow-amber-300/50" : "", isDragged ? "ring-4 ring-primary/40 shadow-2xl" : "")} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="w-[180px] shrink-0" />
      </div>
    </div>
  );
}
