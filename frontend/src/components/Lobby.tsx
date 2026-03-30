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
  onSelectGame: (game: "mahjong" | "doudizhu") => void;
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
    <div className="flex-1 px-6 md:px-12 flex flex-col max-w-7xl mx-auto w-full py-12">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col items-center text-center"
      >
        <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface tracking-tighter mb-4">
          开启你的<span className="text-primary">竞技之旅</span>
        </h1>
        <p className="font-body text-on-surface-variant max-w-2xl text-lg font-medium">
          体验极致流畅的卡牌与棋牌博弈，高精度视觉效果，与全球玩家同台竞技。
        </p>
      </motion.section>

      {/* Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Dou Dizhu Card */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="group relative overflow-hidden rounded-3xl bg-surface-container-high aspect-[16/10] flex flex-col justify-end p-8 transition-all duration-500 card-shadow cursor-pointer"
          onClick={() => onSelectGame("doudizhu")}
        >
          <div className="absolute inset-0 z-0">
            <img 
              alt="斗地主" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              src="https://images.unsplash.com/photo-1511193311914-0346f16efe90?q=80&w=800&auto=format&fit=crop"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold tracking-widest uppercase">3人</span>
            </div>
            <h2 className="font-headline text-4xl font-bold text-white mb-2 tracking-tight">斗地主</h2>
            <p className="font-body text-white/80 text-sm max-w-xs mb-4">经典三人扑克游戏，抢地主、出牌策略、配合队友。</p>
            <button className="flex items-center gap-2 text-primary bg-white px-4 py-2 rounded-lg font-bold group-hover:gap-3 transition-all w-fit text-sm">
              创建房间 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Mahjong Card */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="group relative overflow-hidden rounded-3xl bg-surface-container-high aspect-[16/10] flex flex-col justify-end p-8 transition-all duration-500 card-shadow cursor-pointer"
          onClick={() => onSelectGame("mahjong")}
        >
          <div className="absolute inset-0 z-0">
            <img 
              alt="麻将" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              src="https://images.unsplash.com/photo-1523875194681-bedd468c58bf?q=80&w=800&auto=format&fit=crop"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-secondary text-white text-[10px] font-bold tracking-widest uppercase">4人</span>
            </div>
            <h2 className="font-headline text-4xl font-bold text-white mb-2 tracking-tight">麻将</h2>
            <p className="font-body text-white/80 text-sm max-w-xs mb-4">四人经典国粹，摸牌、吃碰杠胡，体验最纯正的乐趣。</p>
            <button className="flex items-center gap-2 text-secondary bg-white px-4 py-2 rounded-lg font-bold group-hover:gap-3 transition-all w-fit text-sm">
              创建房间 <ArrowRight className="w-4 h-4" />
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
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">可加入的房间</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
            {rooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => onJoinRoom(room.id)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    room.type === "mahjong" 
                      ? "bg-secondary/10 text-secondary border border-secondary/20" 
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    {room.type === "mahjong" ? "麻将博弈" : "斗地主竞技"}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-400 text-xs">
                     <User className="w-3 h-3" />
                     <span>{room.playerCount}/{room.maxPlayers}</span>
                  </div>
                </div>
                <p className="font-headline font-bold text-slate-800 text-lg uppercase tracking-tight">{room.hostName} 的对局</p>
                <div className="flex items-center justify-between mt-4">
                   <p className="text-[10px] text-slate-400 font-mono">ID: {room.id}</p>
                   <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Call to Actions */}
      <section className="flex flex-col md:flex-row gap-6 items-center justify-center max-w-4xl mx-auto w-full">
        <button 
          onClick={() => setShowJoinModal(true)}
          className="w-full md:flex-1 py-6 bg-primary hover:opacity-90 text-white font-headline text-2xl font-bold rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-4 group"
        >
          <LogIn className="w-8 h-8 transition-transform group-hover:scale-110" />
          加入房间
        </button>
      </section>

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-xl font-bold text-slate-800 mb-4">加入房间</h3>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="输入房间号"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleJoin}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                加入
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}