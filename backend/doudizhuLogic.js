/**
 * 斗地主核心规则逻辑
 */

// 牌值映射 (3-17)
const CARD_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  'black': 16, 'red': 17 // 小王, 大王
};

/**
 * 解析卡牌对象，返回数值
 */
function getCardValue(cardId) {
  if (cardId === 'joker-black') return CARD_VALUES['black'];
  if (cardId === 'joker-red') return CARD_VALUES['red'];
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

  // 1. 火箭 (最强)
  if (len === 2 && values[0] === 16 && values[1] === 17) {
    return { type: 'rocket', value: 999 };
  }

  // 2. 单张
  if (len === 1) {
    return { type: 'single', value: values[0] };
  }

  // 3. 对子
  if (len === 2 && values[0] === values[1]) {
    return { type: 'pair', value: values[0] };
  }

  // 4. 三张/三带
  if (len === 3 && values[0] === values[2]) {
    return { type: 'trio', value: values[0] };
  }
  if (len === 4) {
    // 三带一
    if (values[0] === values[2]) return { type: 'trio_single', value: values[0] };
    if (values[1] === values[3]) return { type: 'trio_single', value: values[1] };
  }
  if (len === 5) {
    // 三带二 (对子)
    if (values[0] === values[2] && values[3] === values[4]) return { type: 'trio_pair', value: values[0] };
    if (values[0] === values[1] && values[2] === values[4]) return { type: 'trio_pair', value: values[2] };
  }

  // 5. 炸弹
  if (len === 4 && values[0] === values[3]) {
    return { type: 'bomb', value: values[0] };
  }

  // 6. 顺子 (5张起, 不能包含 2 或大小王)
  if (len >= 5 && values[len-1] < 15) {
    let isStraight = true;
    for (let i = 0; i < len - 1; i++) {
        if (values[i+1] !== values[i] + 1) {
            isStraight = false;
            break;
        }
    }
    if (isStraight) return { type: 'straight', value: values[0], length: len };
  }

  // 7. 连对 (3对起, 不能包含 2)
  if (len >= 6 && len % 2 === 0 && values[len-1] < 15) {
    let isDoubleStraight = true;
    for (let i = 0; i < len; i += 2) {
      if (values[i] !== values[i+1]) isDoubleStraight = false;
      if (i > 0 && values[i] !== values[i-2] + 1) isDoubleStraight = false;
    }
    if (isDoubleStraight) return { type: 'double_straight', value: values[0], length: len };
  }

  // 8. 四带二 (暂不细分是带两张还是两对，统称为 four_two)
  if (len === 6) {
     if (values[0] === values[3] || values[1] === values[4] || values[2] === values[5]) {
         const mainValue = (values[0] === values[3]) ? values[0] : (values[1] === values[4] ? values[1] : values[2]);
         return { type: 'four_two', value: mainValue };
     }
  }

  return null; // 非法牌型
}

/**
 * 比较两手牌的大小
 */
function canPlay(newCards, lastPlay) {
  const newPattern = analyzePattern(newCards);
  if (!newPattern) return false; // 自己本身就不合法

  // 如果上一手为空，只要自己合法就行
  if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) return true;

  const lastPattern = analyzePattern(lastPlay.cards);
  if (!lastPattern) return true; // 容错

  // 王炸无敌
  if (newPattern.type === 'rocket') return true;
  if (lastPattern.type === 'rocket') return false;

  // 炸弹逻辑
  if (newPattern.type === 'bomb' && lastPattern.type !== 'bomb') return true;
  if (newPattern.type !== 'bomb' && lastPattern.type === 'bomb') return false;

  // 普通牌型比较：必须牌型相同 且 数量相同 且 分值更高
  if (newPattern.type === lastPattern.type && (newPattern.length || 0) === (lastPattern.length || 0)) {
    return newPattern.value > lastPattern.value;
  }

  return false;
}

module.exports = {
  analyzePattern,
  canPlay,
  getCardValue
};
