// 内存数据库存储
const memoryUsers = new Map();
const memoryMatchHistory = [];

/**
 * 获取用户信息
 * @param {string} id 用户 ID
 * @returns {Promise<Object|null>}
 */
async function getUser(id) {
  return memoryUsers.get(id) || null;
}

/**
 * 创建新用户
 * @param {Object} user 用户对象 { id, nickname, score }
 * @returns {Promise<Object>}
 */
async function createUser(user) {
  memoryUsers.set(user.id, user);
  return user;
}

/**
 * 更新用户积分
 * @param {string} id 用户 ID
 * @param {number} scoreDelta 积分增量
 * @returns {Promise<Object|null>}
 */
async function updateUserScore(id, scoreDelta) {
  const user = memoryUsers.get(id);
  if (user) {
    user.score += scoreDelta;
    return user;
  }
  return null;
}

/**
 * 记录对局结果
 * @param {string} gameType 游戏类型 ('mahjong' | 'doudizhu')
 * @param {Array} players 玩家列表
 * @param {string} winnerId 获胜者 ID
 * @returns {Promise<void>}
 */
async function recordMatch(gameType, players, winnerId) {
  const record = {
    game_type: gameType,
    players: players,
    winner_id: winnerId,
    timestamp: new Date().toISOString()
  };
  
  memoryMatchHistory.push(record);
}

module.exports = {
  getUser,
  createUser,
  updateUserScore,
  recordMatch
};

