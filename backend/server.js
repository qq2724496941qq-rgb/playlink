require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const doudizhuLogic = require('./doudizhuLogic');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==================== 数据存储 ====================
// 在线用户
const users = new Map(); // userId -> { id, nickname, socketId, roomId, score }

// 房间
const rooms = new Map(); // roomId -> { id, type, status, hostId, players, maxPlayers, gameData, totalRounds, completedRounds, sessionScores, isPublic }
const gameTimers = new Map(); // roomId -> Interval ID

// 麻将牌型
const MAHJONG_TILES = [
  // 万子 1-9
  ...Array(4).fill(['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬']).flat(),
  // 筒子 1-9
  ...Array(4).fill(['1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒']).flat(),
  // 索子 1-9
  ...Array(4).fill(['1索','2索','3索','4索','5索','6索','7索','8索','9索']).flat(),
  // 东南西北
  ...Array(4).fill(['東','南','西','北']).flat(),
  // 中发白
  ...Array(4).fill(['中','發','白']).flat()
];

// ==================== 工具函数 ====================
function generateNickname() {
  const adjectives = ['快乐', '幸运', '超级', '无敌', '神秘', '疯狂', '冷静'];
  const nouns = ['玩家', '麻将王', '斗地主', '高手', '大师', '萌新'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + 
         nouns[Math.floor(Math.random() * nouns.length)] + 
         Math.floor(Math.random() * 1000);
}

function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 生成 6 位数字房间号，且在当前内存房间内不重复
function generateRoomId() {
  for (let i = 0; i < 1000; i++) {
    const id = String(Math.floor(100000 + Math.random() * 900000)); // [100000, 999999]
    if (!rooms.has(id)) return id;
  }
  // 极小概率碰撞时，回退到截断 UUID（过滤非数字，保证尽量长度足够）
  const fallback = uuidv4().replace(/\D/g, "").slice(0, 6);
  return fallback && fallback.length === 6 ? fallback : String(Date.now()).slice(-6).padStart(6, "0");
}

function createDoudizhuGame() {
  const VALUES = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
  const SUITS = ["heart", "spade", "diamond", "club"];
  const deck = [];
  
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ id: `${suit}-${value}`, value, suit });
    }
  }
  // Jokers
  deck.push({ id: 'joker-black', value: 'Joker', suit: 'black' });
  deck.push({ id: 'joker-red', value: 'JOKER', suit: 'red' });
  
  const shuffled = shuffle(deck);
  
  return {
    landlordCards: shuffled.slice(51),
    hands: [
      shuffled.slice(0, 17),
      shuffled.slice(17, 34),
      shuffled.slice(34, 51)
    ],
    currentPlayer: 0,
    status: 'calling', // 'calling' | 'playing' | 'finished'
    highestBid: 0,
    highestBidder: -1,
    callCount: 0,
    currentMultiplier: 1,
    bombCount: 0,
    playersPlayedCards: [false, false, false],
    landlordTrickCount: 0,
    lastPlay: null,
    playedCards: [[], [], []],
    turnDeadline: Date.now() + 15000 // 15秒倒计时
  };
}

/** 出牌后更新炸弹倍数、是否出过牌、地主出牌次数（用于春天/反春） */
function registerPlayEffects(game, playerIndex, cards, room) {
  if (!cards || cards.length === 0) return;
  const pattern = doudizhuLogic.analyzePattern(cards);
  if (!pattern) return;
  if (pattern.type === 'bomb' || pattern.type === 'rocket') {
    game.bombCount = (game.bombCount || 0) + 1;
  }
  if (!game.playersPlayedCards) game.playersPlayedCards = [false, false, false];
  game.playersPlayedCards[playerIndex] = true;
  const landlordIdx = room.players.findIndex((p) => p.role === 'landlord');
  if (landlordIdx !== -1 && playerIndex === landlordIdx) {
    game.landlordTrickCount = (game.landlordTrickCount || 0) + 1;
  }
  const base = game.highestBid || 1;
  game.currentMultiplier = base * Math.pow(2, game.bombCount || 0);
}

/**
 * 一局结束：按叫分底分 × 炸弹翻倍 × 春天/反春 结算，累加 session 与用户积分；未满总局则发新一局。
 */
async function finishDoudizhuRound(io, room, game, winnerIndex) {
  const landlordIdx = room.players.findIndex((p) => p.role === 'landlord');
  const isLandlordWin = winnerIndex === landlordIdx;
  const farmers = [0, 1, 2].filter((i) => i !== landlordIdx);
  const base = game.highestBid || 1;
  let multiplier = base * Math.pow(2, game.bombCount || 0);
  let spring = false;
  let antiSpring = false;

  if (isLandlordWin) {
    const bothNeverPlayed = farmers.every((f) => !(game.playersPlayedCards && game.playersPlayedCards[f]));
    if (bothNeverPlayed) {
      spring = true;
      multiplier *= 2;
    }
  } else if ((game.landlordTrickCount || 0) === 1) {
    antiSpring = true;
    multiplier *= 2;
  }

  const deltas = [0, 0, 0];
  if (isLandlordWin) {
    deltas[landlordIdx] = 2 * multiplier;
    farmers.forEach((f) => {
      deltas[f] = -multiplier;
    });
  } else {
    deltas[landlordIdx] = -2 * multiplier;
    farmers.forEach((f) => {
      deltas[f] = multiplier;
    });
  }

  if (!room.sessionScores) room.sessionScores = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const pid = room.players[i].id;
    await db.updateUserScore(pid, deltas[i]);
    room.sessionScores[i] += deltas[i];
  }

  room.completedRounds = (room.completedRounds || 0) + 1;
  await db.recordMatch('doudizhu', room.players, room.players[winnerIndex].id);

  const totalRounds = room.totalRounds || 3;
  const matchComplete = room.completedRounds >= totalRounds;

  io.to(room.id).emit('doudizhu-finished', {
    winner: winnerIndex,
    winnerRole: isLandlordWin ? 'landlord' : 'farmer',
    game,
    roundScores: deltas,
    sessionScores: [...room.sessionScores],
    roundIndex: room.completedRounds,
    totalRounds,
    spring,
    antiSpring,
    finalMultiplier: multiplier,
    matchComplete,
    room,
    playerScores: room.players.map((p) => ({ id: p.id, score: users.get(p.id)?.score ?? 0 }))
  });

  if (!matchComplete) {
    room.players.forEach((p) => {
      delete p.role;
    });
    room.gameData = createDoudizhuGame();
    room.players.forEach((player, index) => {
      const userData = users.get(player.id);
      if (userData?.socketId) {
        const playerSocket = io.sockets.sockets.get(userData.socketId);
        if (playerSocket) {
          playerSocket.emit('game-started', {
            room,
            hand: room.gameData.hands[index],
            seat: index
          });
        }
      }
    });
  } else {
    room.status = 'waiting';
    room.gameData = null;
    room.players.forEach((p) => {
      delete p.role;
    });
    if (gameTimers.has(room.id)) {
      clearInterval(gameTimers.get(room.id));
      gameTimers.delete(room.id);
    }
    io.to(room.id).emit('doudizhu-match-end', { room });
  }
}

function createMahjongGame() {
  const tiles = shuffle(MAHJONG_TILES);
  return {
    wall: tiles.slice(52), // 牌山（剩余牌）
    hands: [
      tiles.slice(0, 13),
      tiles.slice(13, 26),
      tiles.slice(26, 39),
      tiles.slice(39, 52)
    ],
    discards: [[], [], [], []], // 弃牌
    melds: [[], [], [], []], // 吃碰杠
    currentPlayer: 0,
    turnCount: 0,
    lastDiscard: null,
    status: 'playing'
  };
}

// HTTP API
// 游客登录
app.post('/api/guest-login', async (req, res) => {
  const userId = uuidv4();
  const user = {
    id: userId,
    nickname: generateNickname(),
    score: 0,
    roomId: null
  };
  
  // 插入到内存存储
  await db.createUser(user);
  
  users.set(userId, user);
  res.json({ success: true, user });
});

// 获取房间列表
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values())
    .filter(r => r.status === 'waiting' && r.isPublic === true)
    .map(r => ({
      id: r.id,
      type: r.type,
      hostName: users.get(r.hostId)?.nickname || '未知',
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers
    }));
  res.json({ success: true, rooms: roomList });
});

// ==================== WebSocket ====================
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  let currentUserId = null;

  // 登录
  socket.on('login', async (data) => {
    const { userId } = data;
    let user = users.get(userId);
    
    // 如果在线列表中找不到，尝试从“数据库”中恢复
    if (!user) {
      const dbUser = await db.getUser(userId);
      if (dbUser) {
        user = { ...dbUser, socketId: socket.id };
        users.set(userId, user);
      }
    } else {
      user.socketId = socket.id;
    }

    if (user) {
      currentUserId = userId;
      socket.emit('login-success', { user });
      console.log('用户登录:', user.nickname);
      
      // 如果用户已经在某个房间里，自动加入该房间的 socket room
      if (user.roomId) {
        socket.join(user.roomId);
      }
    } else {
      socket.emit('login-failed', { message: '用户不存在' });
    }
  });

  // 创建房间
  socket.on('create-room', (data) => {
    const { type, totalRounds: tr } = data; // 'mahjong' | 'doudizhu'
    const user = users.get(currentUserId);
    if (!user) return;

    // 离开旧房间
    if (user.roomId) {
      const oldRoom = rooms.get(user.roomId);
      if (oldRoom && oldRoom.status === 'playing') {
        socket.emit('error', { message: '游戏进行中，无法创建新房间，请先退出当前房间' });
        return;
      }
      leaveRoom(currentUserId);
    }

    const totalRounds =
      type === 'doudizhu' && [3, 6, 9, 12].includes(tr) ? tr : type === 'doudizhu' ? 3 : 1;

    const roomId = generateRoomId();
    const room = {
      id: roomId,
      type: type,
      status: 'waiting',
      hostId: currentUserId,
      players: [{
        id: currentUserId,
        nickname: user.nickname,
        score: user.score,
        ready: true, // 房主默认准备
        seat: 0
      }],
      maxPlayers: type === 'mahjong' ? 4 : 3,
      gameData: null,
      totalRounds,
      completedRounds: 0,
      sessionScores: type === 'doudizhu' ? [0, 0, 0] : null,
      // 斗地主房默认私有：需要房主在准备页选择“公开房间”才会出现在大厅
      isPublic: type === 'doudizhu' ? false : true
    };

    rooms.set(roomId, room);
    user.roomId = roomId;
    socket.join(roomId);

    socket.emit('room-created', { room });
    console.log('创建房间:', roomId, type);
  });

  // 加入房间
  socket.on('join-room', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    const user = users.get(currentUserId);
    
    if (!room) {
      socket.emit('join-failed', { message: '房间不存在' });
      return;
    }
    if (!user) {
      socket.emit('join-failed', { message: '请先登录' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('join-failed', { message: '游戏已开始' });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('join-failed', { message: '房间已满' });
      return;
    }

    // 离开旧房间
    if (user.roomId && user.roomId !== roomId) {
      leaveRoom(currentUserId);
    }

    room.players.push({
      id: currentUserId,
      nickname: user.nickname,
      score: user.score,
      ready: false,
      seat: room.players.length
    });
    user.roomId = roomId;
    socket.join(roomId);

    // 通知所有人
    io.to(roomId).emit('player-joined', { 
      room,
      newPlayer: { id: currentUserId, nickname: user.nickname }
    });
    
    socket.emit('join-success', { room });
    console.log('加入房间:', roomId, user.nickname);
  });

  // 准备/取消准备
  socket.on('ready', (data) => {
    const { ready } = data;
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === currentUserId);
    if (player) {
      player.ready = ready;
      io.to(room.id).emit('player-ready', { 
        playerId: currentUserId, 
        ready,
        room 
      });
    }
  });

  // 斗地主：房主在准备阶段选择总局数（3/6/9/12）
  socket.on('set-doudizhu-total-rounds', (data) => {
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room || room.type !== 'doudizhu') {
      socket.emit('error', { message: '当前不是斗地主房间' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', { message: '只能在准备阶段设置总局数' });
      return;
    }
    if (room.hostId !== currentUserId) {
      socket.emit('error', { message: '只有房主可以设置总局数' });
      return;
    }

    const totalRounds = data?.totalRounds;
    if (![3, 6, 9, 12].includes(totalRounds)) {
      socket.emit('error', { message: '总局数必须是 3/6/9/12' });
      return;
    }

    room.totalRounds = totalRounds;
    room.completedRounds = 0;
    room.sessionScores = [0, 0, 0];
    room.gameData = null;

    io.to(room.id).emit('room-updated', { room });
  });

  // 房间：房主在准备阶段设置是否公开（公开则大厅可见）
  socket.on('set-room-public', (data) => {
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', { message: '只能在准备阶段设置公开/私有' });
      return;
    }
    if (room.hostId !== currentUserId) {
      socket.emit('error', { message: '只有房主可以设置公开/私有' });
      return;
    }

    const isPublic = !!data?.isPublic;
    room.isPublic = isPublic;
    io.to(room.id).emit('room-updated', { room });
  });

  // 开始游戏
  socket.on('start-game', () => {
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room) return;
    if (room.hostId !== currentUserId) {
      socket.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }
    if (room.type === 'doudizhu' && room.players.length !== 3) {
      socket.emit('error', { message: '斗地主需要满3人才能开始' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('error', { message: '人数不足' });
      return;
    }
    if (!room.players.every(p => p.ready)) {
      socket.emit('error', { message: '有玩家未准备' });
      return;
    }

    if (room.type === 'doudizhu') {
      room.sessionScores = [0, 0, 0];
      room.completedRounds = 0;
    }

    // 初始化游戏
    room.status = 'playing';
    if (room.type === 'mahjong') {
      room.gameData = createMahjongGame();
    } else if (room.type === 'doudizhu') {
      room.gameData = createDoudizhuGame();
    }

    // 通知所有玩家游戏开始
    room.players.forEach((player, index) => {
      const userData = users.get(player.id);
      if (userData && userData.socketId) {
        const playerSocket = io.sockets.sockets.get(userData.socketId);
        if (playerSocket) {
          playerSocket.emit('game-started', {
            room,
            hand: room.gameData?.hands[index],
            seat: index
          });
        }
      }
    });

    // 清理旧定时器
    if (gameTimers.has(room.id)) {
      clearInterval(gameTimers.get(room.id));
    }

    // 启动 1 秒一次的高速心跳状态同步（不仅是心跳，也是强一致性同步）
    const timerId = setInterval(() => {
      const activeRoom = rooms.get(room.id);
      if (!activeRoom || activeRoom.status !== 'playing') {
        clearInterval(timerId);
        gameTimers.delete(room.id);
        return;
      }
      
      const game = activeRoom.gameData;
      if (!game) return;

      // 超时自动处理
      if (game.turnDeadline && Date.now() > game.turnDeadline + 1000) {
        if (game.status === 'calling') {
          // 超时自动叫0分（不叫）
          const playerIdx = game.currentPlayer;
          game.callCount++;
          game.currentPlayer = (game.currentPlayer + 1) % 3;
          game.turnDeadline = Date.now() + 15000;

          if (game.callCount >= 3) {
            if (game.highestBidder === -1) {
              const newGame = createDoudizhuGame();
              activeRoom.gameData = newGame;
              room.players.forEach((player, index) => {
                const userData = users.get(player.id);
                if (userData?.socketId) {
                  io.to(userData.socketId).emit('game-restarted', {
                    room: activeRoom, hand: newGame.hands[index], seat: index, message: '由于没人叫地主，本局重新开始'
                  });
                }
              });
              return;
            }
            game.status = 'playing';
            game.currentPlayer = game.highestBidder;
            room.players[game.highestBidder].role = 'landlord';
            game.currentMultiplier = game.highestBid;
            game.hands[game.highestBidder].push(...game.landlordCards);
            game.turnDeadline = Date.now() + 15000;
            io.to(activeRoom.id).emit('doudizhu-call-end', {
              landlord: game.highestBidder, landlordCards: game.landlordCards, score: game.highestBid, game
            });
          } else {
            io.to(activeRoom.id).emit('doudizhu-called', { player: playerIdx, score: 0, nextPlayer: game.currentPlayer, game });
          }
        } else if (game.status === 'playing') {
          // 超时自动"不出"（如果lastPlay存在）或自动出最小的一张牌
          const playerIdx = game.currentPlayer;
          if (game.lastPlay) {
            // 有上家出牌，自动不出
            game.playedCards[playerIdx] = [];
          } else {
            // 必须出牌，自动出第一张
            const autoCard = game.hands[playerIdx][0];
            game.hands[playerIdx] = game.hands[playerIdx].slice(1);
            game.lastPlay = { player: playerIdx, cards: [autoCard] };
            game.playedCards[playerIdx] = [autoCard];
            registerPlayEffects(game, playerIdx, [autoCard], activeRoom);
          }
          if (game.hands[playerIdx].length === 0) {
            game.status = 'finished';
            io.to(activeRoom.id).emit('doudizhu-played', {
              player: playerIdx, cards: game.playedCards[playerIdx], nextPlayer: playerIdx, game
            });
            finishDoudizhuRound(io, activeRoom, game, playerIdx).catch((err) => console.error(err));
            return;
          }
          const prevIdx = game.currentPlayer;
          game.currentPlayer = (game.currentPlayer + 1) % 3;
          game.turnDeadline = Date.now() + 15000;
          if (game.lastPlay && game.playedCards[prevIdx].length === 0 && game.lastPlay.player === game.currentPlayer) {
            game.lastPlay = null;
          }
          io.to(activeRoom.id).emit('doudizhu-played', {
            player: playerIdx, cards: game.playedCards[playerIdx], nextPlayer: game.currentPlayer, game
          });
        }
      }

      // 提取同步所需的关键数据（完整同步，保证所有客户端UI一致）
      const syncData = {
        roomId: activeRoom.id,
        status: game.status,
        currentPlayer: game.currentPlayer,
        highestBid: game.highestBid,
        highestBidder: game.highestBidder,
        callCount: game.callCount,
        currentMultiplier: game.currentMultiplier,
        bombCount: game.bombCount,
        landlordCards: game.landlordCards,
        lastPlay: game.lastPlay,
        playedCards: game.playedCards,
        // 所有玩家手牌张数（非本人看张数，本人看牌面由各自初始hand维护）
        playerCardCounts: room.players.map((_, i) => game.hands[i]?.length ?? 0),
        // 用于前端本地倒计时校准的服务器时间戳
        turnDeadline: game.turnDeadline,
        turnTimeLeft: Math.max(0, Math.floor((game.turnDeadline - Date.now()) / 1000))
      };

      io.to(activeRoom.id).emit('game-sync', syncData);
    }, 1000);
    gameTimers.set(room.id, timerId);

    console.log('游戏开始 (心跳同步已启用):', room.id);
  });

  // 斗地主：叫分机制
  socket.on('doudizhu-call', (data) => {
    const { score } = data; // 0 (不叫), 1, 2, 3
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room || !room.gameData || room.type !== 'doudizhu') return;
    
    const game = room.gameData;
    const playerIndex = room.players.findIndex(p => p.id === currentUserId);
    
    if (playerIndex !== game.currentPlayer || game.status !== 'calling') {
      socket.emit('error', { message: '错误操作，未轮到或不在叫分阶段' });
      return;
    }

    if (score > game.highestBid) {
      game.highestBid = score;
      game.highestBidder = playerIndex;
    }

    game.callCount++;

    // 如果三个人都表态了
    if (game.callCount >= 3) {
      if (game.highestBidder === -1) {
        // 优化点：如果没人叫地主，不再强制分配，而是重新洗牌发牌
        console.log('没人叫地主，准备重新发牌...');
        const newGame = createDoudizhuGame();
        room.gameData = newGame;
        
        // 通知所有人重新发牌
        room.players.forEach((player, index) => {
          const userData = users.get(player.id);
          if (userData?.socketId) {
            io.to(userData.socketId).emit('game-restarted', {
              room,
              hand: newGame.hands[index],
              seat: index,
              message: '由于没人叫地主，本局重新开始'
            });
          }
        });
        return;
      }
      
      game.status = 'playing';
      game.currentPlayer = game.highestBidder; // 地主首发
      room.players[game.highestBidder].role = 'landlord';
      game.currentMultiplier = game.highestBid;
      
      game.hands[game.highestBidder].push(...game.landlordCards);
      game.turnDeadline = Date.now() + 15000;
      
      io.to(room.id).emit('doudizhu-call-end', {
        landlord: game.highestBidder,
        landlordCards: game.landlordCards,
        score: game.highestBid,
        game
      });
    } else {
      // 叫 3 分直接结束
      if (score === 3) {
         game.status = 'playing';
         game.currentPlayer = game.highestBidder;
         room.players[game.highestBidder].role = 'landlord';
         game.currentMultiplier = 3;
         game.hands[game.highestBidder].push(...game.landlordCards);
         game.turnDeadline = Date.now() + 15000;
         io.to(room.id).emit('doudizhu-call-end', {
            landlord: game.highestBidder,
            landlordCards: game.landlordCards,
            score: 3,
            game
         });
         return;
      }

      // 轮到下一人叫分
      game.currentPlayer = (game.currentPlayer + 1) % 3;
      game.turnDeadline = Date.now() + 15000;
      io.to(room.id).emit('doudizhu-called', {
        player: playerIndex,
        score,
        nextPlayer: game.currentPlayer,
        game
      });
    }
  });

  // 斗地主：出牌机制
  socket.on('doudizhu-play', async (data) => {
    const { cards } = data; // [] 为不出
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room || !room.gameData || room.type !== 'doudizhu') return;
    
    const game = room.gameData;
    const playerIndex = room.players.findIndex(p => p.id === currentUserId);
    
    if (playerIndex !== game.currentPlayer || game.status !== 'playing') {
      socket.emit('error', { message: '未轮到您出牌' });
      return;
    }

    if (cards && cards.length > 0) {
      // 验证牌型是否合法且比上一手大
      if (!doudizhuLogic.canPlay(cards, game.lastPlay)) {
        socket.emit('error', { message: '牌型不合法或不够大' });
        return;
      }

      const ids = cards.map(c => c.id);
      game.hands[playerIndex] = game.hands[playerIndex].filter(c => !ids.includes(c.id));
      game.lastPlay = { player: playerIndex, cards };
      registerPlayEffects(game, playerIndex, cards, room);
    } else {
      // 不出
      if (!game.lastPlay) {
        socket.emit('error', { message: '您必须起牌，不能跳过' });
        return;
      }
    }

    game.playedCards[playerIndex] = cards || [];

    // 判胜
    if (game.hands[playerIndex].length === 0) {
      game.status = 'finished';
      await finishDoudizhuRound(io, room, game, playerIndex);
      return;
    }

    // 轮流
    const prevPlayer = game.currentPlayer;
    game.currentPlayer = (game.currentPlayer + 1) % 3;
    game.turnDeadline = Date.now() + 15000;

    // 如果这次是"不出"（cards为空），且下一个轮到的人就是最后出牌者，说明另外两家都不出了，清空lastPlay
    if ((!cards || cards.length === 0) && game.lastPlay && game.lastPlay.player === game.currentPlayer) {
      game.lastPlay = null; // 两家都不出，lastPlay清空，下家必须出牌
    }

    io.to(room.id).emit('doudizhu-played', {
      player: playerIndex,
      cards,
      nextPlayer: game.currentPlayer,
      game
    });
  });

  // 麻将：出牌
  socket.on('mahjong-discard', (data) => {
    const { tile } = data;
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room || !room.gameData) return;

    const game = room.gameData;
    const playerIndex = room.players.findIndex(p => p.id === currentUserId);
    if (playerIndex !== game.currentPlayer) {
      socket.emit('error', { message: '还没轮到你' });
      return;
    }

    // 验证手牌中有这张牌
    const hand = game.hands[playerIndex];
    const tileIndex = hand.indexOf(tile);
    if (tileIndex === -1) {
      socket.emit('error', { message: '手牌中没有这张牌' });
      return;
    }

    // 执行出牌
    hand.splice(tileIndex, 1);
    game.discards[playerIndex].push(tile);
    game.lastDiscard = { tile, player: playerIndex };
    
    // 轮到下一家
    game.currentPlayer = (game.currentPlayer + 1) % 4;
    game.turnCount++;

    // 摸牌
    if (game.wall.length > 0) {
      const newTile = game.wall.pop();
      game.hands[game.currentPlayer].push(newTile);
    }

    // 广播
    io.to(room.id).emit('mahjong-discarded', {
      player: playerIndex,
      tile,
      nextPlayer: game.currentPlayer,
      game
    });
  });

  // 麻将：吃碰杠胡（简化版）
  socket.on('mahjong-action', (data) => {
    const { action } = data; // 'chi' | 'peng' | 'gang' | 'hu'
    const user = users.get(currentUserId);
    if (!user || !user.roomId) return;
    const room = rooms.get(user.roomId);
    if (!room || !room.gameData) return;

    const game = room.gameData;
    const playerIndex = room.players.findIndex(p => p.id === currentUserId);
    
    // 简化处理：直接广播动作
    io.to(room.id).emit('mahjong-action', {
      player: playerIndex,
      action,
      game
    });
  });

  // 离开房间
  socket.on('leave-room', () => {
    leaveRoom(currentUserId);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    if (currentUserId) {
      leaveRoom(currentUserId);
      users.delete(currentUserId);
    }
  });

  // 辅助函数：离开房间
  function leaveRoom(userId) {
    const user = users.get(userId);
    if (!user || !user.roomId) return;

    const room = rooms.get(user.roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== userId);
      
      // 房间空了则删除
      if (room.players.length === 0) {
        rooms.delete(room.id);
      } else {
        // 房主离开则转让
        if (room.hostId === userId) {
          room.hostId = room.players[0].id;
        }
        io.to(room.id).emit('player-left', { 
          playerId: userId,
          room 
        });
      }
    }
    
    user.roomId = null;
    socket.leave(room?.id);
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`游戏服务器运行在端口 ${PORT}`);
});