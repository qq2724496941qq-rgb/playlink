/**
 * 跑得快核心规则逻辑 (复用斗地主逻辑并进行调整)
 */

// 牌值映射 (3-15) - 跑得快通常 2 最大，A 次之
const CARD_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
};

/**
 * 解析卡牌对象，返回数值
 */
function getCardValue(cardId) {
  const valueStr = cardId.split('-')[1];
  return CARD_VALUES[valueStr];
}

/**
 * 识别牌型
 */
function analyzePattern(cards) {
  if (!cards || cards.length === 0) return { type: 'pass', value: 0 };
  
  const values = cards.map(c => getCardValue(c.id)).sort((a, b) => a - b);
  const len = values.length;

  // 1. 单张
  if (len === 1) {
    return { type: 'single', value: values[0] };
  }

  // 2. 对子
  if (len === 2 && values[0] === values[1]) {
    return { type: 'pair', value: values[0] };
  }

  // 3. 三张 (跑得快通常是三带二，如果是最后手牌可以不满二)
  if (len === 5) {
      // 检查是否包含三张一样的
      const counts = {};
      values.forEach(v => counts[v] = (counts[v] || 0) + 1);
      const trioValue = Object.keys(counts).find(v => counts[v] >= 3);
      if (trioValue) {
          return { type: 'trio_two', value: parseInt(trioValue) };
      }
  }

  // 4. 炸弹 (4张)
  if (len === 4 && values[0] === values[3]) {
    return { type: 'bomb', value: values[0] };
  }

  // 5. 顺子 (5张起)
  if (len >= 5) {
    let isStraight = true;
    for (let i = 0; i < len - 1; i++) {
        if (values[i+1] !== values[i] + 1) {
            isStraight = false;
            break;
        }
    }
    if (isStraight) return { type: 'straight', value: values[0], length: len };
  }

  // 6. 连对 (2对起)
  if (len >= 4 && len % 2 === 0) {
    let isDoubleStraight = true;
    for (let i = 0; i < len; i += 2) {
      if (values[i] !== values[i+1]) isDoubleStraight = false;
      if (i > 0 && values[i] !== values[i-2] + 1) isDoubleStraight = false;
    }
    if (isDoubleStraight) return { type: 'double_straight', value: values[0], length: len };
  }

  // 7. 三顺/飞机 (暂简单实现)
  // ... 略过更复杂的飞机，跑得快最核心是单张/对子/顺子

  return null; // 非法牌型
}

/**
 * 比较两手牌的大小
 */
function canPlay(newCards, lastPlay) {
  const newPattern = analyzePattern(newCards);
  if (!newPattern) return false;

  if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return true;

  const lastPattern = analyzePattern(lastPlay.cards);
  if (!lastPattern) return true;

  // 炸弹逻辑
  if (newPattern.type === 'bomb' && lastPattern.type !== 'bomb') return true;
  if (newPattern.type !== 'bomb' && lastPattern.type === 'bomb') return false;

  // 普通牌型比较
  if (newPattern.type === lastPattern.type && (newPattern.length || 0) === (lastPattern.length || 0)) {
    // 特殊处理三带二的数量，如果不是最后一张牌，必须满5张
    if (newPattern.type === 'trio_two' && newCards.length !== lastPlay.cards.length) return false;
    return newPattern.value > lastPattern.value;
  }

  return false;
}

/**
 * 校验玩家是否有可出的牌 (用于强制出牌逻辑)
 */
function findPlayableHand(hand, lastPlay) {
    // 这是一个简化版的提示逻辑
    // 遍历手牌中的所有可能牌型
    // 如果有能管上的，返回第一种方案
    // 这里简单实现：只提示单张和对子
    if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return [hand[0]];

    const lastPattern = analyzePattern(lastPlay.cards);
    if (!lastPattern) return null;

    // 搜索比上家大的牌
    if (lastPattern.type === 'single') {
        const bigger = hand.filter(c => getCardValue(c.id) > lastPattern.value);
        return bigger.length > 0 ? [bigger[0]] : null;
    }
    // ... 对子及其他逻辑类似，为了性能生产环境需要更复杂的搜索算法
    return null;
}

module.exports = {
  analyzePattern,
  canPlay,
  getCardValue,
  findPlayableHand
};
