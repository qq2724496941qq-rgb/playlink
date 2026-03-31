import { Wallet, Square, User, Crown, ArrowLeft } from "lucide-react";
import PokerCard, { Suit } from "./PokerCard";
import { motion, AnimatePresence } from "motion/react";
import { SocketContext } from "../App";
import { useEffect, useState, useContext, useCallback, useRef } from "react";
import { cn } from "../lib/utils";

const parseCardId = (id: string) => {
  if (id === "joker-black") return { value: "Joker", suit: "spade" };
  if (id === "joker-red") return { value: "JOKER", suit: "heart" };
  const parts = id.split("-");
  const suit = parts[0];
  const value = parts.slice(1).join("-");
  return { suit, value };
};

const CARD_ORDER: Record<string, number> = {
  "3": 1, "4": 2, "5": 3, "6": 4, "7": 5, "8": 6, "9": 7,
  "10": 8, "J": 9, "Q": 10, "K": 11, "A": 12, "2": 13,
  "Joker": 14, "JOKER": 15,
};

function sortCards(cards: any[]) {
  return [...cards].sort((a, b) => {
    const va = CARD_ORDER[a.value] ?? 0;
    const vb = CARD_ORDER[b.value] ?? 0;
    return va - vb;
  });
}

interface LogEntry {
  id: number;
  text: string;
  type: "call" | "play" | "pass" | "system";
}

export default function DouDizhuArena() {
  const { socket, room, user, goToLobby } = useContext(SocketContext);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const game = room?.gameData;
  const meIndex = room?.players?.findIndex((p: any) => p.id === user?.id) ?? -1;
  const myHand = game?.hands?.[meIndex] || [];
  const status = game?.status || "waiting";
  const isMyTurn = game?.currentPlayer === meIndex;

  const sortedHand = sortCards(myHand);

  const leftIndex = (meIndex + 2) % 3;
  const rightIndex = (meIndex + 1) % 3;
  const leftPlayer = room?.players?.[leftIndex];
  const rightPlayer = room?.players?.[rightIndex];
  const mePlayer = room?.players?.[meIndex];
  const sessionScores = room?.sessionScores;
  const totalRounds = room?.totalRounds ?? 3;
  const completedRounds = room?.completedRounds ?? 0;

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
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const playCards = useCallback(() => {
    if (selectedCardIds.length === 0) return;
    const cardsToPlay = myHand.filter((c: any) => selectedCardIds.includes(c.id));
    socket?.emit("doudizhu-play", { cards: cardsToPlay });
    setSelectedCardIds([]);
  }, [selectedCardIds, myHand, socket]);

  const passPlay = useCallback(() => {
    socket?.emit("doudizhu-play", { cards: [] });
    setSelectedCardIds([]);
  }, [socket]);

  const callScore = useCallback((score: number) => {
    socket?.emit("doudizhu-call", { score });
  }, [socket]);

  // 桌面展示牌（排序）
  const centerCards = sortCards(game?.lastPlay?.cards || []);

  // 行动标签
  const getActionLabel = (idx: number) => {
    if (game?.currentPlayer === idx) {
      if (status === "calling") return { text: "叫分中…", color: "text-amber-500" };
      if (status === "playing") return { text: "出牌中…", color: "text-primary" };
    }
    if (
      status === "playing" &&
      Array.isArray(game?.playedCards?.[idx]) &&
      game.playedCards[idx].length === 0 &&
      game?.lastPlay?.player !== idx
    ) {
      return { text: "不出", color: "text-slate-400" };
    }
    return null;
  };

  const getRoleTag = (idx: number) => {
    const role = room?.players?.[idx]?.role;
    if (role === "landlord")
      return <span className="text-[11px] bg-orange-500 text-white px-2 py-0.5 rounded font-black">地主</span>;
    if (role === "farmer")
      return <span className="text-[11px] bg-green-600 text-white px-2 py-0.5 rounded font-black">农民</span>;
    return null;
  };

  // 侧边玩家卡片
  const SidePlayer = ({ idx, align }: { idx: number; align: "left" | "right" }) => {
    const player = room?.players?.[idx];
    const isCurrent = game?.currentPlayer === idx;
    const label = getActionLabel(idx);
    return (
      <div className="w-[140px] shrink-0 flex flex-col items-center justify-center gap-3 px-2">
        <div className={`w-full flex flex-col items-center gap-2 p-3 rounded-[24px] border bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 ${isCurrent ? "border-primary ring-2 ring-primary/20 shadow-primary/10 shadow-md" : "border-outline-variant/30"
          }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow ${player?.role === "landlord" ? "bg-orange-500" : align === "left" ? "bg-primary/70" : "bg-secondary/70"
            }`}>
            {player?.nickname?.[0] ?? "?"}
          </div>
          <p className="text-[12px] font-black text-on-surface truncate max-w-[110px] text-center">{player?.nickname ?? "等待中"}</p>
          <div>{getRoleTag(idx)}</div>
          <div className="flex flex-col items-center gap-1 mt-1">
            <div className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-600">
              {game?.playerCardCounts?.[idx] ?? 0} 张
            </div>
            {sessionScores && (
              <div className="text-[11px] font-black text-amber-700 tabular-nums">
                {sessionScores[idx] ?? 0}
              </div>
            )}
          </div>
        </div>
        {label && (
          <span className={`text-[12px] font-black italic ${label.color} animate-pulse`}>{label.text}</span>
        )}
      </div>
    );
  };

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  return (
    <div className="w-[1280px] h-[720px] relative flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-primary/5 to-primary/10">

      {/* 顶部：底牌（绝对居中） + 倍数/状态（右侧） + 退出（左侧） */}
      <div className="relative z-10 pt-6 w-full px-8 flex justify-between items-center shrink-0">
        {/* 左侧：退出按钮 */}
        <div className="w-40 flex items-center">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-12 h-12 rounded-2xl bg-white/60 backdrop-blur-xl border border-primary/20 shadow-sm flex items-center justify-center text-primary hover:bg-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* 中间：底牌 */}
        <div className="flex flex-col items-center">
          <div className="flex gap-2 p-2 bg-white/60 backdrop-blur-xl rounded-[24px] border border-primary/20 shadow-md">
            {(game?.landlordCards && game.landlordCards.length > 0 ? game.landlordCards : [1, 2, 3]).map((c: any, i: number) => {
              const isPlaceholder = typeof c === "number";
              const isHidden = isPlaceholder || status === "calling";
              if (isHidden) {
                return (
                  <div
                    key={i}
                    className="w-[48px] h-[72px] bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center"
                  >
                    <Square className="w-5 h-5 text-primary/20 rotate-45" />
                  </div>
                );
              }
              const { suit, value } = parseCardId(c.id);
              return <PokerCard key={i} value={value} suit={suit as Suit} size="sm" />;
            })}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="px-4 py-2 bg-primary/5 backdrop-blur-md text-primary text-[12px] font-black rounded-xl border border-primary/10 shadow-sm flex items-center gap-2">
              <span className="text-[10px] opacity-60">倍数</span>
              <span className="text-xl font-black">×{game?.currentMultiplier || 1}</span>
            </div>
            {typeof game?.bombCount === "number" && game.bombCount > 0 && (
              <span className="text-[11px] text-slate-500 font-black">炸弹 {game.bombCount}</span>
            )}
            <div className="px-3 py-1 bg-slate-700/90 text-white text-[11px] font-black rounded-lg">
              {completedRounds}/{totalRounds} 局
            </div>
          </div>
        </div>

        {/* 右侧占位（为了让中间绝对居中） */}
        <div className="w-40 flex justify-end">
          {status === "calling" && (
            <div className="px-4 py-2 bg-amber-500 text-white text-[11px] font-black rounded-xl shadow-md animate-pulse">
              叫分中
            </div>
          )}
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-10 w-[420px] shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <ArrowLeft className="w-10 h-10 text-red-500 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">确定退出游戏？</h3>
              <p className="text-slate-500 font-medium mb-8">退出后将返回大厅，您可能会错过当前的牌局进展。</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() => goToLobby()}
                  className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all"
                >
                  退出桌面
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 中间战区 */}
      <div className="flex-1 flex items-center min-h-0 px-10 gap-0">

        {/* 左侧玩家 */}
        <SidePlayer idx={leftIndex} align="left" />

        {/* 中央区域：倒计时与出牌 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">

          <div className="flex flex-col items-center gap-4">
            {/* 倒计时 - 居中 */}
            {status !== "finished" && (
              <div className="flex flex-col items-center z-30">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-colors duration-300 ${timeLeft <= 5
                  ? "bg-red-500 text-white border-red-300 animate-pulse"
                  : "bg-white/90 text-primary border-primary/30"
                  }`}>
                  <span className="font-black text-3xl leading-none">{timeLeft}</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] mt-2 text-slate-400/80">
                  {status === "calling" ? "叫分" : "出牌"}
                </p>
              </div>
            )}

            {/* 桌面出牌展示 */}
            <div className={`flex items-start justify-center transition-all duration-500 min-h-[120px] ${centerCards.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              {centerCards.length > 0 && (
                <div className="flex -space-x-8 items-start px-8">
                  {centerCards.map((card: any, i: number) => {
                    const { suit, value } = parseCardId(card.id);
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ scale: 0.8, opacity: 0, y: -12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.02 }}
                        style={{ zIndex: i + 1 }}
                      >
                        <PokerCard value={value} suit={suit as Suit} size="sm" className="shadow-xl" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {status === "finished" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-10 py-3 bg-primary text-white font-bold rounded-full text-lg shadow-lg"
            >
              🏆 游戏结束
            </motion.div>
          )}
        </div>

        {/* 右侧玩家 */}
        <SidePlayer idx={rightIndex} align="right" />
      </div>

      {/* 底部区域：手牌 + 按钮 + 个人信息 */}
      <div className="relative z-20 shrink-0 flex gap-10 px-12 pb-10 pt-4 items-end">

        {/* 我的信息 - 左下角 (恢复 180px) */}
        <div className="w-[180px] shrink-0 flex flex-col gap-4 justify-end text-sm">
          <div className={cn(
            "flex items-center gap-4 px-5 py-4 bg-white/90 backdrop-blur-md rounded-[24px] border shadow-xl transition-all",
            mePlayer?.role === "landlord" ? "border-orange-400/60 ring-1 ring-orange-500/10" : "border-primary/20",
            isMyTurn && "ring-4 ring-primary/40 shadow-md"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-inner shrink-0",
              mePlayer?.role === "landlord" ? "bg-orange-500" : "bg-primary"
            )}>
              {mePlayer?.role === "landlord"
                ? <Crown className="w-5 h-5 text-white" />
                : <User className="w-5 h-5 text-white" />}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base font-black text-on-surface truncate">{user?.nickname}</p>
              <div className="flex items-center gap-1 mt-1">
                {mePlayer?.role === "landlord" && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black">地主</span>}
                {mePlayer?.role === "farmer" && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-black">农民</span>}
                {isMyTurn && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black animate-pulse">思考</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-4 bg-white/90 border border-primary/10 rounded-[24px] shadow-sm">
            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-black">当前积分</p>
              <p className="font-black text-primary text-xl">{user?.score ?? 0}</p>
            </div>
          </div>
        </div>

        {/* 手牌 + 操作按钮 (容器居中) */}
        <div className="flex-1 flex flex-col items-center gap-8 min-w-0">
          {/* 操作按钮栏 - 保持在 flex-1 的中心(即屏幕正中心) */}
          <div className="flex gap-4 h-[64px] items-center z-[2000]">
            {isMyTurn && status === "calling" && (
              <div className="flex gap-4">
                <button onClick={() => callScore(0)} className="px-8 py-3 bg-white border-2 border-slate-200 rounded-full font-black shadow-lg text-lg">不叫</button>
                <button disabled={game?.highestBid >= 1} onClick={() => callScore(1)} className="px-8 py-3 bg-blue-50 text-blue-700 border-2 border-blue-200 disabled:opacity-40 rounded-full font-black shadow-lg text-lg">1分</button>
                <button disabled={game?.highestBid >= 2} onClick={() => callScore(2)} className="px-8 py-3 bg-blue-50 text-blue-700 border-2 border-blue-200 disabled:opacity-40 rounded-full font-black shadow-lg text-lg">2分</button>
                <button disabled={game?.highestBid >= 3} onClick={() => callScore(3)} className="px-10 py-3 bg-primary text-white border-2 border-primary disabled:opacity-40 rounded-full font-black shadow-xl text-lg">3分</button>
              </div>
            )}

            {isMyTurn && status === "playing" && (
              <div className="flex gap-6">
                <button onClick={passPlay} className="px-10 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-full font-black shadow-lg text-lg">不出</button>
                <button onClick={playCards} disabled={selectedCardIds.length === 0} className="px-12 py-3 bg-primary text-white border-2 border-primary disabled:opacity-40 rounded-full font-black shadow-2xl text-lg">
                  出牌{selectedCardIds.length > 0 ? ` (${selectedCardIds.length})` : ""}
                </button>
              </div>
            )}

            {!isMyTurn && status !== "finished" && (
              <div className="px-8 py-3 bg-slate-100/50 border border-slate-200 rounded-full">
                <p className="text-base text-slate-400 font-black uppercase tracking-widest">Waiting...</p>
              </div>
            )}

            {status === "finished" && (
              <button onClick={() => goToLobby()} className="px-12 py-4 bg-primary text-white rounded-full font-black shadow-2xl text-xl ring-8 ring-primary/10">
                返回大厅
              </button>
            )}
          </div>

          {/* 手牌区域 - 仅对此区域增加 ml-24 的偏移 */}
          <div className="relative w-full h-[180px] ml-24">
            <div className="absolute inset-0">
              {sortedHand.map((card: any, i: number) => {
                const { suit, value } = parseCardId(card.id);
                const isSelected = selectedCardIds.includes(card.id);
                const total = sortedHand.length;
                const spread = total <= 8 ? 64 : total <= 12 ? 56 : total <= 16 ? 48 : 42;
                const offsetPx = (i - (total - 1) / 2) * spread;
                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: isSelected ? -40 : 0, opacity: 1 }}
                    onClick={() => status === "playing" ? toggleCard(card.id) : undefined}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: `calc(50% + ${offsetPx}px - 50px)`,
                      zIndex: i + 1,
                    }}
                  >
                    <PokerCard value={value} suit={suit as Suit} size="xl" isSelected={isSelected} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧占位 (恢复 180px 以保证按钮绝对居中) */}
        <div className="w-[180px] shrink-0" />
      </div>
    </div>
  );
}
