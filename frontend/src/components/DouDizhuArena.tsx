import { Wallet, Square, User, Crown } from "lucide-react";
import PokerCard, { Suit } from "./PokerCard";
import { motion, AnimatePresence } from "motion/react";
import { SocketContext } from "../App";
import { useEffect, useState, useContext, useCallback, useRef } from "react";

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
      return <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">地主</span>;
    if (role === "farmer")
      return <span className="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">农民</span>;
    return null;
  };

  // 侧边玩家卡片
  const SidePlayer = ({ idx, align }: { idx: number; align: "left" | "right" }) => {
    const player = room?.players?.[idx];
    const isCurrent = game?.currentPlayer === idx;
    const label = getActionLabel(idx);
    return (
      <div className="w-32 shrink-0 flex flex-col items-center justify-center gap-2 px-1">
        <div className={`w-full flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 ${isCurrent ? "border-primary ring-2 ring-primary/20 shadow-primary/10 shadow-md" : "border-outline-variant/30"
          }`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base shadow ${player?.role === "landlord" ? "bg-orange-500" : align === "left" ? "bg-primary/70" : "bg-secondary/70"
            }`}>
            {player?.nickname?.[0] ?? "?"}
          </div>
          <p className="text-[11px] font-bold text-on-surface truncate max-w-[88px] text-center">{player?.nickname ?? "等待中"}</p>
          <div>{getRoleTag(idx)}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
              {game?.playerCardCounts?.[idx] ?? 0} 张
            </div>
            {sessionScores && (
              <div className="text-[10px] font-bold text-amber-700 tabular-nums">
                累计 {sessionScores[idx] ?? 0}
              </div>
            )}
          </div>
        </div>
        {label && (
          <span className={`text-[11px] font-bold italic ${label.color} animate-pulse`}>{label.text}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 via-primary/5 to-primary/10 min-h-0">

      {/* 顶部：底牌（绝对居中） + 倍数/状态（磁吸式右贴） */}
      <div className="relative z-10 pt-4 w-full flex justify-center items-center shrink-0">
        {/* 中心定位容器 */}
        <div className="relative flex items-center">
          {/* 中心底牌区 */}
          <div className="flex gap-2 p-2.5 bg-white/60 backdrop-blur-xl rounded-2xl border border-primary/20 shadow-md">
            {(game?.landlordCards && game.landlordCards.length > 0 ? game.landlordCards : [1, 2, 3]).map((c: any, i: number) => {
              const isPlaceholder = typeof c === "number";
              const isHidden = isPlaceholder || status === "calling";
              if (isHidden) {
                return (
                  <div key={i} className="w-12 h-18 min-h-[68px] min-w-[48px] bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
                    <Square className="w-5 h-5 text-primary/20 rotate-45" />
                  </div>
                );
              }
              const { suit, value } = parseCardId(c.id);
              return <PokerCard key={i} value={value} suit={suit as Suit} size="sm" />;
            })}
          </div>

          {/* 右侧磁吸信息层 - 使用 absolute left-full 确保不影响底牌居中 */}
          <div className="absolute left-full ml-4 flex flex-col items-start gap-1.5 whitespace-nowrap">
            <div className="px-3.5 py-1.5 bg-primary/5 backdrop-blur-md text-primary text-[11px] font-black rounded-xl border border-primary/10 shadow-sm flex flex-col gap-0.5 items-start">
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-60">倍数</span>
                <span className="text-sm font-black tracking-tight">×{game?.currentMultiplier || 1}</span>
              </div>
              {typeof game?.bombCount === "number" && game.bombCount > 0 && (
                <span className="text-[10px] text-slate-500 font-bold">炸弹累计 {game.bombCount}（王炸计作 1 次翻倍）</span>
              )}
            </div>
            <div className="px-3 py-1 bg-slate-700/90 text-white text-[10px] font-black rounded-lg">
              局数 {completedRounds} / {totalRounds}（已完成 / 总局）
            </div>
            {status === "calling" && (
              <div className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-md shadow-amber-500/20 animate-pulse">
                叫分阶段
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 中间战区 */}
      <div className="flex-1 flex items-center min-h-0 gap-0">

        {/* 左侧玩家 */}
        <SidePlayer idx={leftIndex} align="left" />

        {/* 中央区域：倒计时与出牌极致居中 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">

          <div className="flex flex-col items-center -mt-6">
            {/* 倒计时 - 绝对居中容器 */}
            {status !== "finished" && (
              <div className="flex flex-col items-center z-30">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg transition-colors duration-300 ${timeLeft <= 5
                    ? "bg-red-500 text-white border-red-300 animate-pulse"
                    : "bg-white/90 text-primary border-primary/30"
                  }`}>
                  <span className="font-black text-xl leading-none">{timeLeft}</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-slate-400/80 drop-shadow-sm">
                  {status === "calling" ? "叫分" : "出牌"}
                </p>
              </div>
            )}

            {/* 桌面出牌展示 — 采用 flex -space-x 确保浏览器自动计算居中，消除手动计算误差 */}
            <div className={`flex items-start justify-center mt-2 transition-all duration-500 min-h-[96px] ${centerCards.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              {centerCards.length > 0 && (
                <div className="flex -space-x-8 items-start px-8">
                  {centerCards.map((card: any, i: number) => {
                    const { suit, value } = parseCardId(card.id);
                    // 右压左自然堆叠
                    const zIdx = i + 1;
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ scale: 0.8, opacity: 0, y: -12 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.02 }}
                        style={{ zIndex: zIdx }}
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
              className="px-8 py-2.5 bg-primary text-white font-bold rounded-full text-base shadow-lg"
            >
              🏆 游戏结束
            </motion.div>
          )}
        </div>

        {/* 右侧玩家 */}
        <SidePlayer idx={rightIndex} align="right" />
      </div>

      {/* 底部区域：手牌 + 按钮 + 个人信息 */}
      <div className="relative z-20 shrink-0 flex gap-4 px-4 pb-6 pt-2 items-end">

        {/* 我的信息 - 左下角 */}
        <div className="w-40 shrink-0 flex flex-col gap-2 justify-end">
          <div className={`flex items-center gap-3 px-3.5 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border shadow-sm transition-all ${mePlayer?.role === "landlord" ? "border-orange-400/60 ring-1 ring-orange-500/10" : "border-primary/20"
            } ${isMyTurn ? "ring-2 ring-primary/40 shadow-md" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-inner shrink-0 ${mePlayer?.role === "landlord" ? "bg-orange-500" : "bg-primary"
              }`}>
              {mePlayer?.role === "landlord"
                ? <Crown className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-white" />}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-black text-on-surface truncate tracking-tight">{user?.nickname}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {mePlayer?.role === "landlord" && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase">地主</span>}
                {mePlayer?.role === "farmer" && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black uppercase">农民</span>}
                {isMyTurn && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black animate-pulse">思考中</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/90 border border-primary/10 rounded-2xl shadow-sm backdrop-blur-md">
            <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-0.5">账户总积分</p>
              <p className="font-black text-primary text-base leading-none">{user?.score ?? 0}</p>
              {sessionScores && meIndex >= 0 && (
                <p className="text-[10px] text-amber-800 font-bold mt-1 tabular-nums">
                  本房间累计 {sessionScores[meIndex] ?? 0}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 手牌 + 操作按钮居中 */}
        <div className="flex-1 flex flex-col items-center gap-16 min-w-0">
          {/* 操作按钮栏 - 极高层级确保绝对优先点击 */}
          <div className="flex gap-4 h-14 items-center z-[2000] relative">
            {isMyTurn && status === "calling" && (
              <div className="flex gap-4 scale-125">
                <button onClick={() => callScore(0)} className="px-6 py-2 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-full font-black shadow-md text-sm transition-all active:scale-95">不叫</button>
                <button disabled={game?.highestBid >= 1} onClick={() => callScore(1)} className="px-6 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 disabled:opacity-40 rounded-full font-black shadow-md text-sm transition-all active:scale-95">1分</button>
                <button disabled={game?.highestBid >= 2} onClick={() => callScore(2)} className="px-6 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 disabled:opacity-40 rounded-full font-black shadow-md text-sm transition-all active:scale-95">2分</button>
                <button disabled={game?.highestBid >= 3} onClick={() => callScore(3)} className="px-8 py-2 bg-primary text-white border-2 border-primary hover:opacity-90 disabled:opacity-40 rounded-full font-black shadow-lg shadow-primary/30 text-sm transition-all active:scale-95">3分</button>
              </div>
            )}

            {isMyTurn && status === "playing" && (
              <div className="flex gap-4 scale-110">
                <button
                  onClick={passPlay}
                  className="px-8 py-2 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 rounded-full font-black transition-all hover:-translate-y-1 active:scale-95 shadow-md text-sm"
                >不出</button>
                <button
                  onClick={playCards}
                  disabled={selectedCardIds.length === 0}
                  className="px-10 py-2 bg-primary text-white border-2 border-primary hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-full font-black shadow-xl shadow-primary/40 transition-all hover:-translate-y-1 active:scale-95 text-sm"
                >
                  出牌{selectedCardIds.length > 0 ? ` (${selectedCardIds.length})` : ""}
                </button>
              </div>
            )}

            {!isMyTurn && status !== "finished" && (
              <div className="px-6 py-2 bg-slate-100/50 backdrop-blur-sm border border-slate-200 rounded-full">
                <p className="text-sm text-slate-400 font-black italic tracking-widest">等待其他玩家中…</p>
              </div>
            )}

            {status === "finished" && (
              <button
                type="button"
                onClick={() => goToLobby()}
                className="px-12 py-3 bg-primary text-white rounded-full font-black shadow-2xl hover:scale-105 transition-all text-base uppercase tracking-widest ring-4 ring-primary/20"
              >
                返回游戏大厅
              </button>
            )}
          </div>

          {/* 手牌区域 - 增加高度并将间距显著拉大 */}
          <div className="relative w-full h-52">
            {sortedHand.map((card: any, i: number) => {
              const { suit, value } = parseCardId(card.id);
              const isSelected = selectedCardIds.includes(card.id);
              const total = sortedHand.length;
              // 适配 XL 牌的超大间距：基础间距提升至 72
              const spread = total <= 8 ? 72 : total <= 12 ? 60 : total <= 16 ? 52 : 44;
              const leftPercent = 50;
              const offsetPx = (i - (total - 1) / 2) * spread;

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: isSelected ? -36 : 0, opacity: 1 }}
                  exit={{ y: -150, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  onClick={() => status === "playing" ? toggleCard(card.id) : undefined}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: `calc(${leftPercent}% + ${offsetPx}px - 64px)`, // 128px的一半
                    zIndex: i + 1,
                    cursor: status === "playing" ? "pointer" : "default",
                  }}
                >
                  <PokerCard
                    value={value}
                    suit={suit as Suit}
                    size="xl"
                    isSelected={isSelected}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 占位符确保右侧平衡 */}
        <div className="w-40 shrink-0" />
      </div>
    </div>
  );
}
