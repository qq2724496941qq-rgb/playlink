import React, { useState, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import Layout from "./components/Layout";
import Lobby from "./components/Lobby";
import DouDizhuArena from "./components/DouDizhuArena";
import MahjongArena from "./components/MahjongArena";
import PaodekuaiArena from "./components/PaodekuaiArena";
import { motion, AnimatePresence } from "motion/react";

type View = "lobby" | "doudizhu" | "mahjong" | "paodekuai" | "room";

// 用户类型
interface User {
  id: string;
  nickname: string;
  score: number;
}

// 房间类型
interface Room {
  id: string;
  type: "mahjong" | "doudizhu" | "paodekuai";
  status: "waiting" | "playing" | "finished";
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gameData?: any;
  totalRounds?: number;
  completedRounds?: number;
  sessionScores?: number[] | null;
  isPublic?: boolean;
}

interface Player {
  id: string;
  nickname: string;
  score: number;
  ready: boolean;
  seat: number;
}

// Socket 上下文
export const SocketContext = React.createContext<{
  socket: Socket | null;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  room: Room | null;
  setRoom: (room: Room | null) => void;
  goToLobby: () => void;
}>({
  socket: null,
  user: null,
  setUser: () => { },
  room: null,
  setRoom: () => { },
  goToLobby: () => { },
});

export default function App() {
  const [currentView, setCurrentView] = useState<View>("lobby");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // 初始化：游客登录并连接 WebSocket
  useEffect(() => {
    const init = async () => {
      try {
        // 1. 游客登录
        const res = await fetch("http://localhost:3001/api/guest-login", {
          method: "POST",
        });
        const data = await res.json();

        if (data.success) {
          setUser(data.user);

          // 2. 连接 WebSocket
          const newSocket = io("http://localhost:3001");

          newSocket.on("connect", () => {
            console.log("Connected to server");
            // 登录
            newSocket.emit("login", { userId: data.user.id });
          });

          newSocket.on("login-success", () => {
            console.log("Login success");
            setIsConnecting(false);
          });

          newSocket.on("login-failed", (err) => {
            console.error("Login failed:", err);
            setIsConnecting(false);
          });

          // 监听房间事件
          newSocket.on("room-created", (data) => {
            setRoom(data.room);
            setCurrentView("room");
          });

          newSocket.on("join-success", (data) => {
            setRoom(data.room);
            setCurrentView("room");
          });

          newSocket.on("join-failed", (err) => {
            alert(err.message);
          });

          newSocket.on("player-joined", (data) => {
            setRoom(data.room);
          });

          newSocket.on("player-left", (data) => {
            setRoom(data.room);
          });

          newSocket.on("player-ready", (data) => {
            setRoom(data.room);
          });

          newSocket.on("room-updated", (data: any) => {
            if (data?.room) setRoom(data.room);
          });

          newSocket.on("game-started", (data) => {
            setRoom(data.room);
            setCurrentView(data.room.type);
          });

          // 斗地主的实时事件处理
          newSocket.on("doudizhu-called", (data) => {
            if (data.game) setRoom(prev => prev ? ({ ...prev, gameData: data.game }) : prev);
          });
          newSocket.on("doudizhu-call-end", (data) => {
            if (data.game) setRoom(prev => prev ? ({ ...prev, gameData: data.game }) : prev);
          });
          newSocket.on("doudizhu-played", (data) => {
            if (data.game) setRoom(prev => prev ? ({ ...prev, gameData: data.game }) : prev);
          });
          newSocket.on("doudizhu-finished", (data: any) => {
            if (data.room) setRoom(data.room);
            else if (data.game)
              setRoom((prev) => (prev ? { ...prev, gameData: data.game } : prev));
            if (Array.isArray(data.playerScores)) {
              setUser((prev) => {
                if (!prev) return prev;
                const mine = data.playerScores.find((p: { id: string }) => p.id === prev.id);
                return mine ? { ...prev, score: mine.score } : prev;
              });
            }
          });

          newSocket.on("doudizhu-match-end", (data: { room: Room }) => {
            setRoom(data.room);
            setCurrentView("room");
          });

          // 跑得快事件处理
          newSocket.on("paodekuai-played", (data: any) => {
            if (data.game) setRoom(prev => prev ? ({ ...prev, gameData: data.game }) : prev);
          });
          newSocket.on("paodekuai-finished", (data: any) => {
            if (data.room) setRoom(data.room);
            else if (data.game)
              setRoom(prev => (prev ? { ...prev, gameData: data.game } : prev));
            if (Array.isArray(data.playerScores)) {
              setUser(prev => {
                if (!prev) return prev;
                const mine = data.playerScores.find((p: { id: string }) => p.id === prev.id);
                return mine ? { ...prev, score: mine.score } : prev;
              });
            }
          });
          newSocket.on("paodekuai-match-end", (data: { room: Room }) => {
            setRoom(data.room);
            setCurrentView("room");
          });

          // 强同步：完整覆盖gameData中的关键公共字段，保证所有端UI一致
          newSocket.on("game-sync", (data) => {
            setRoom(prev => {
              if (!prev || prev.id !== data.roomId) return prev;
              return {
                ...prev,
                status: data.status === 'finished' ? 'finished' : prev.status,
                gameData: {
                  ...prev.gameData,
                  status: data.status,
                  currentPlayer: data.currentPlayer,
                  highestBid: data.highestBid,
                  highestBidder: data.highestBidder,
                  callCount: data.callCount,
                  currentMultiplier: data.currentMultiplier,
                  bombCount: data.bombCount,
                  landlordCards: data.landlordCards ?? prev.gameData?.landlordCards,
                  lastPlay: data.lastPlay,
                  playedCards: data.playedCards ?? prev.gameData?.playedCards,
                  playerCardCounts: data.playerCardCounts,
                  turnDeadline: data.turnDeadline,
                  turnTimeLeft: data.turnTimeLeft,
                }
              };
            });
          });

          // 重新开始请求（如无人叫地主）
          newSocket.on("game-restarted", (data) => {
            setRoom(data.room);
            // 这里可以加个小提示
            console.log(data.message);
          });

          newSocket.on("error", (err) => {
            alert(err.message);
          });

          setSocket(newSocket);
        }
      } catch (err) {
        console.error("Init failed:", err);
        setIsConnecting(false);
      }
    };

    init();

    return () => {
      socket?.disconnect();
    };
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "lobby") setCurrentView("lobby");
    else if (tab === "games") setCurrentView("lobby");
  }, []);

  const goToLobby = useCallback(() => {
    socket?.emit("leave-room");
    setRoom(null);
    setCurrentView("lobby");
  }, [socket]);

  const renderView = () => {
    switch (currentView) {
      case "lobby":
        return (
          <Lobby
            onSelectGame={(game) => {
              socket?.emit("create-room", { type: game });
            }}
            onJoinRoom={(roomId) => {
              // 加入房间
              socket?.emit("join-room", { roomId });
            }}
          />
        );
      case "room":
        return (
          <RoomView
            room={room!}
            user={user!}
            socket={socket!}
            onLeave={() => {
              socket?.emit("leave-room");
              setRoom(null);
              setCurrentView("lobby");
            }}
          />
        );
      case "doudizhu":
        return <DouDizhuArena />;
      case "mahjong":
        return <MahjongArena />;
      case "paodekuai":
        return <PaodekuaiArena />;
      default:
        return <Lobby onSelectGame={(game) => { }} onJoinRoom={() => { }} />;
    }
  };

  if (isConnecting) {
    return (
      <div className="w-[1280px] h-[720px] flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">连接服务器中...</p>
        </div>
      </div>
    );
  }

  return (
    <SocketContext.Provider value={{ socket, user, setUser, room, setRoom, goToLobby }}>
      <Layout
        activeTab={currentView === "lobby" ? "lobby" : "games"}
        onTabChange={handleTabChange}
        hideHeader={["doudizhu", "mahjong", "paodekuai"].includes(currentView)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </Layout>
    </SocketContext.Provider>
  );
}

// 房间等待界面
function RoomView({
  room,
  user,
  socket,
  onLeave
}: {
  room: Room;
  user: User;
  socket: Socket;
  onLeave: () => void;
}) {
  const isHost = room.hostId === user.id;
  const me = room.players.find(p => p.id === user.id);
  const allReady = room.players.every(p => p.ready);
  const needPlayers = room.type === "mahjong" ? 4 : 3;
  const canStart = isHost && room.players.length >= needPlayers && allReady;

  const DDZ_ROUND_OPTIONS = [3, 6, 9, 12] as const;

  return (
    <div className="w-full h-full flex flex-col items-center justify-start pt-2 p-8 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-[480px]">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {room.type === "mahjong" ? "麻将房间" : room.type === "paodekuai" ? "跑得快房间" : "斗地主房间"}
          </h2>
          <p className="text-slate-500">房间号: {room.id}</p>
          {(room.type === "doudizhu" || room.type === "paodekuai") && room.totalRounds != null && (
            <p className="text-sm text-slate-500 mt-1">
              总局数：{room.totalRounds} 局（房间内所有局分数累加）
            </p>
          )}
        </div>

        {(room.type === "doudizhu" || room.type === "paodekuai") && isHost && room.status === "waiting" && (
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-center text-sm font-black text-slate-700 mb-2">
                  选择本房间总局数
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {DDZ_ROUND_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => socket.emit("set-doudizhu-total-rounds", { totalRounds: n })}
                      className={`py-4 rounded-2xl font-bold text-sm transition-all ${room.totalRounds === n
                          ? "bg-primary text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                      {n} 局
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-32">
                <p className="text-sm font-black text-slate-700 mb-2 text-center">公开房间</p>
                <label
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border ${room.isPublic
                      ? "bg-green-100 border-green-200 text-green-700"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={room.isPublic === true}
                    onChange={(e) => socket.emit("set-room-public", { isPublic: e.target.checked })}
                  />
                  <span className="text-[12px] font-bold">{room.isPublic ? "是" : "否"}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {room.players.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg ${player.id === user.id ? "bg-primary/10 border border-primary/20" : "bg-slate-50"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg">
                  {player.nickname[0]}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {player.nickname}
                    {player.id === room.hostId && (
                      <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded">房主</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(room.type === "doudizhu" || room.type === "paodekuai") && room.sessionScores
                      ? `本房累计: ${room.sessionScores[index] ?? 0}`
                      : `积分: ${player.score}`}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${player.ready
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
                }`}>
                {player.ready ? "已准备" : "未准备"}
              </div>
            </div>
          ))}

          {/* 空位占位 */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 border border-dashed border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  ?
                </div>
                <p className="text-slate-400">等待玩家加入...</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => socket.emit("ready", { ready: !me?.ready })}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${me?.ready
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                : "bg-primary text-white hover:bg-primary/90"
              }`}
          >
            {me?.ready ? "取消准备" : "准备"}
          </button>

          {isHost && (
            <button
              onClick={() => socket.emit("start-game")}
              disabled={!canStart}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${canStart
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
            >
              开始游戏
            </button>
          )}
        </div>

        <button
          onClick={onLeave}
          className="w-full mt-3 py-2 text-slate-500 hover:text-slate-700 text-sm"
        >
          离开房间
        </button>
      </div>
    </div>
  );
}