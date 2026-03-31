import React, { useContext, useState, useEffect } from "react";
import { SocketContext } from "../App";
import { motion } from "motion/react";
import { Trophy, User, Wallet, Crown, Zap, Square } from "lucide-react";
import PokerCard, { Suit } from "./PokerCard"; // Mahjong might use different card component or just text, but let's stick to the design

interface MahjongGameData {
  status: "waiting" | "playing" | "finished";
  currentPlayer: number;
  leftTileCount: number;
  playersData: {
    hand: string[];
    discardedTiles: string[];
    melds: string[][];
  }[];
  turnDeadline?: number;
}

const parseCardId = (id: string) => {
  const [suit, value] = id.split("-");
  return { suit, value };
};

export default function MahjongArena() {
  const { socket, room, user, goToLobby } = useContext(SocketContext);
  const meIndex = room?.players?.findIndex((p: any) => p.id === user?.id) ?? -1;
  const game = room?.gameData as MahjongGameData | undefined;

  const currentIdx = game?.currentPlayer ?? -1;
  const status = game?.status ?? "waiting";
  const scores = room?.sessionScores;

  // 相对位置映射（四位玩家）
  const getRelativePos = (idx: number) => {
    if (meIndex === -1) return idx; // 观战模式
    return (idx - meIndex + 4) % 4;
  };

  const playersByPos = [null, null, null, null] as any[];
  if (room?.players) {
    room.players.forEach((p: any, idx: number) => {
      playersByPos[getRelativePos(idx)] = { ...p, index: idx };
    });
  }

  // 渲染单个玩家（头像/状态）
  const PlayerInfo = ({ pos, data }: { pos: number; data: any; key?: any }) => {
    if (!data) return null;
    const isCurrent = currentIdx === data.index;
    const isMe = data.index === meIndex;

    const posClasses = [
      "bottom-32 left-1/2 -translate-x-1/2", // 下 (Pos 0) - Me
      "right-20 top-1/2 -translate-y-1/2",   // 右 (Pos 1)
      "top-24 left-1/2 -translate-x-1/2",    // 上 (Pos 2)
      "left-20 top-1/2 -translate-y-1/2",    // 左 (Pos 3)
    ];

    return (
      <div className={`absolute ${posClasses[pos]} z-20 flex flex-col items-center gap-2`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-4 transition-all duration-300 ${isCurrent ? "border-amber-400 scale-110 ring-4 ring-amber-400/20" : "border-white/20"
          } ${isMe ? "bg-primary" : "bg-slate-700"}`}>
          {data.nickname?.[0]}
        </div>
        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex flex-col items-center">
          <span className="text-white text-[11px] font-black tracking-tight truncate max-w-[80px]">{data.nickname}</span>
          {scores && (
            <span className="text-amber-400 text-[10px] font-black tabular-nums">{scores[data.index] ?? 0}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[1280px] h-[720px] relative flex flex-col overflow-hidden bg-[#1a472a] shadow-inner">
      {/* 牌局背景装饰（麻将桌布纹理） */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>

      {/* 顶部标题栏 */}
      <div className="absolute top-6 left-0 right-0 z-10 flex justify-center">
        <div className="bg-black/30 backdrop-blur-md px-8 py-2 rounded-full border border-white/10 flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">剩余</span>
            <span className="text-white font-black text-xl">{game?.leftTileCount ?? 0}</span>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">玩法</span>
            <span className="text-amber-400 font-black text-sm">经典麻将</span>
          </div>
        </div>
      </div>

      {/* 玩家头像位置 */}
      {playersByPos.map((p, i) => <PlayerInfo key={i} pos={i} data={p} />)}

      {/* 中间打出的牌（弃牌堆） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[350px] border-2 border-white/5 rounded-[40px] relative">
          {game?.playersData?.map((pData, idx) => {
            const pos = getRelativePos(idx);
            const gridClasses = [
              "bottom-4 left-1/2 -translate-x-1/2 flex-row-reverse", // Pos 0
              "right-4 top-1/2 -translate-y-1/2 flex-col",           // Pos 1
              "top-4 left-1/2 -translate-x-1/2 flex-row",            // Pos 2
              "left-4 top-1/2 -translate-y-1/2 flex-col-reverse",    // Pos 3
            ];
            return (
              <div key={idx} className={`absolute ${gridClasses[pos]} flex flex-wrap gap-1 max-w-[200px] max-h-[120px] pointer-events-auto`}>
                {pData.discardedTiles?.map((tile, i) => (
                  <div key={i} className="w-[28px] h-[38px] bg-white rounded-sm border border-slate-300 shadow-sm flex items-center justify-center text-slate-800 font-black text-[10px]">
                    {tile}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 我的手牌（底部固定） */}
      {meIndex !== -1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-end gap-1 px-10">
          <div className="flex gap-1 items-end">
            {game?.playersData?.[meIndex]?.hand?.map((tile, i) => {
              const isLast = i === (game?.playersData?.[meIndex]?.hand?.length ?? 0) - 1;
              const isMyTurn = currentIdx === meIndex;
              const shouldMargin = isMyTurn && isLast && (game?.playersData?.[meIndex]?.hand?.length ?? 0) % 3 === 2;

              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -20 }}
                  className={`${shouldMargin ? "ml-4" : ""} w-[64px] h-[92px] bg-white rounded-lg border-2 border-slate-100 shadow-xl flex flex-col items-center justify-center cursor-pointer group transition-all`}
                  onClick={() => {
                    if (currentIdx === meIndex) {
                      socket?.emit("mahjong-discard", { tileIndex: i });
                    }
                  }}
                >
                  <span className="text-3xl font-black text-slate-800 drop-shadow-sm transition-transform group-hover:scale-110">{tile}</span>
                  <div className="mt-1 w-8 h-1.5 bg-green-100 rounded-full"></div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 游戏结束弹窗 */}
      {status === "finished" && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] p-12 w-[600px] shadow-2xl flex flex-col items-center"
          >
            <Trophy className="w-20 h-20 text-amber-500 mb-6" />
            <h2 className="text-4xl font-black text-slate-800 mb-8 uppercase tracking-tighter">对局结束</h2>

            <div className="w-full space-y-4 mb-10">
              {room?.players?.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">{p.nickname?.[0]}</div>
                    <span className="font-black text-slate-700">{p.nickname}</span>
                  </div>
                  <span className={`font-mono font-black text-xl ${scores?.[i] >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {scores?.[i] >= 0 ? "+" : ""}{scores?.[i] ?? 0}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => goToLobby()}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              返回大厅
            </button>
          </motion.div>
        </div>
      )}

      {/* 观战提示 */}
      {meIndex === -1 && status === "playing" && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-2 rounded-full font-black shadow-lg animate-bounce">
          正在观战中...
        </div>
      )}
    </div>
  );
}
