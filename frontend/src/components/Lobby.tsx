import React, { useState, useEffect } from "react";
import { LogIn, Plus, User, ArrowRight, Search } from "lucide-react";
import { motion } from "motion/react";

interface RoomInfo {
  id: string;
  type: "mahjong" | "doudizhu";
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

interface LobbyProps {
  onSelectGame: (game: "mahjong" | "doudizhu" | "paodekuai") => void;
  onJoinRoom: (roomId: string) => void;
}

export default function Lobby({ onSelectGame, onJoinRoom }: LobbyProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  // 获取房间列表
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/rooms");
        const data = await res.json();
        if (data.success) {
          setRooms(data.rooms);
        }
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // 每3秒刷新
    return () => clearInterval(interval);
  }, []);

  const handleJoin = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim());
      setShowJoinModal(false);
      setRoomId("");
    }
  };

  return (
    <div className="w-[1280px] h-[720px] px-12 pt-1 pb-10 flex flex-col overflow-y-auto no-scrollbar">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center text-center"
      >
        <h1 className="font-headline text-6xl font-extrabold text-on-surface tracking-tighter mb-4">
          闲着也是闲着，<span className="text-primary">整两把？</span>
        </h1>
        <p className="font-body text-on-surface-variant max-w-3xl text-xl font-medium">
          经典的扑克麻将，随时随地拉上好友开一局。输赢不重要，开心最要紧。
        </p>
      </motion.section>

      {/* Game Cards */}
      <div className="grid grid-cols-2 gap-10 mb-12 shrink-0">
        {/* Dou Dizhu Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group relative overflow-hidden rounded-[32px] bg-surface-container-high aspect-[16/9] flex flex-col justify-end p-10 transition-all duration-500 card-shadow cursor-pointer"
          onClick={() => onSelectGame("doudizhu")}
        >
          <div className="absolute inset-0 z-0">
            <img
              alt="斗地主"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=800&auto=format&fit=crop"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-black tracking-widest uppercase">3人对局</span>
            </div>
            <h2 className="font-headline text-5xl font-bold text-white mb-3 tracking-tight">斗地主</h2>
            <p className="font-body text-white/80 text-base max-w-md mb-6">经典三人扑克游戏，抢地主、出牌策略、配合队友。</p>
            <button className="flex items-center gap-3 text-primary bg-white px-6 py-3 rounded-2xl font-black group-hover:gap-5 transition-all w-fit text-base">
              创建房间 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Paodekuai Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group relative overflow-hidden rounded-[32px] bg-surface-container-high aspect-[16/9] flex flex-col justify-end p-10 transition-all duration-500 card-shadow cursor-pointer"
          onClick={() => onSelectGame("paodekuai")}
        >
          <div className="absolute inset-0 z-0">
            <img
              alt="跑得快"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              src="https://images.unsplash.com/photo-1606167668584-78701c57f13d?q=80&w=800&auto=format&fit=crop"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-secondary text-white text-xs font-black tracking-widest uppercase">极速竞技</span>
            </div>
            <h2 className="font-headline text-5xl font-bold text-white mb-3 tracking-tight">跑得快</h2>
            <p className="font-body text-white/80 text-base max-w-md mb-6">三人扑克竞速，先出完手牌者胜，无需叫地主，黑桃3先手。</p>
            <button className="flex items-center gap-3 text-secondary bg-white px-6 py-3 rounded-2xl font-black group-hover:gap-5 transition-all w-fit text-base">
              创建房间 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Room List */}
      {rooms.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-center w-full"
        >
          <h3 className="text-2xl font-black text-slate-800 mb-8 text-center uppercase tracking-widest">可加入的房间</h3>
          <div className="grid grid-cols-3 gap-8 w-full">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest ${room.type === "paodekuai"
                      ? "bg-secondary/10 text-secondary border border-secondary/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                    {room.type === "paodekuai" ? "跑得快" : "斗地主"}
                  </span>
                  <div className="flex items-center gap-2 font-black text-slate-400 text-sm">
                    <User className="w-4 h-4" />
                    <span>{room.playerCount}/{room.maxPlayers}</span>
                  </div>
                </div>
                <p className="font-headline font-black text-slate-800 text-xl uppercase tracking-tight mb-2">{room.hostName} 的对局</p>
                <div className="flex items-center justify-between mt-6">
                  <p className="text-xs text-slate-400 font-mono font-bold">ID: {room.id}</p>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Call to Actions */}
      <section className="flex gap-8 items-center justify-center w-full mt-6 pb-4">
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-[400px] py-8 bg-primary hover:opacity-95 text-white font-headline text-3xl font-black rounded-[24px] transition-all duration-300 transform active:scale-95 shadow-2xl shadow-primary/30 flex items-center justify-center gap-5 group"
        >
          <LogIn className="w-10 h-10 transition-transform group-hover:scale-110" />
          加入房间
        </button>
      </section>

      {showJoinModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-10 w-[450px] shadow-2xl border border-slate-200"
          >
            <h3 className="text-3xl font-black text-slate-800 mb-6">加入房间</h3>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="输入 6 位房间号"
              className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary mb-8 text-xl font-bold"
            />
            <div className="flex gap-5">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors text-lg"
              >
                取消
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary/95 transition-all text-lg shadow-xl shadow-primary/20"
              >
                加入对局
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}