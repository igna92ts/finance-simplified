const { detectPatterns } = require('./patterns'),
  {
    PROC,
    VROC,
    KST,
    AO,
    EMA,
    RSI,
    ADX,
    MFI,
    BB,
    STOCH,
    VWAP,
    VO,
    heikinAshiConversion
  } = require('./indicators'),
  rules = require('./rules'),
  errors = require('../errors');

const combineIndicators = indicatorsObj => {
  const { length } = indicatorsObj[0];
  indicatorsObj.forEach(ind => {
    if (ind.length !== length) throw errors.defaultError('indicator lengths should be equal');
  });
  return indicatorsObj.reduce((res, indicator, index) => {
    if (index === 0) return indicator;
    indicator.forEach((e, i) => {
      res[i] = { ...res[i], ...e };
    });
    return res;
  }, []);
};

const periods = {
  EMA: [8, 13, 21, 55],
  RSI: 14,
  ADX: 14,
  MFI: 14,
  BB: 21,
  STOCH: 14,
  ROC: 8
};

const basicIndicators = historic => {
  return combineIndicators([
    historic,
    EMA(historic, periods.EMA[0]),
    EMA(historic, periods.EMA[1]),
    EMA(historic, periods.EMA[2]),
    EMA(historic, periods.EMA[3])
    // RSI(historic, periods.RSI),
    // ADX(historic, periods.ADX),
    // MFI(historic, periods.MFI),
    // BB(historic, periods.BB),
    // STOCH(historic, periods.STOCH),
    // VWAP(historic),
    // VO(historic),
    // KST(historic),
    // AO(historic),
    // PROC(historic, periods.ROC),
    // VROC(historic, periods.ROC)
  ]);
};

const scoreData = historic => {
  return historic.map((h, index) => {
    let score = 0;
    // score += rules.RSI(historic, index, periods.RSI);
    score += rules.EMA(historic, index, periods.EMA);
    // score += rules.KST(historic, index);
    // score += rules.ADX(historic, index, periods.ADX);
    // score += rules.VWAP(historic, index);
    if (score > 0) return { ...h, action: 'BUY' };
    if (historic[index - 1] && historic[index - 1].EMA8 > historic[index - 1].EMA55 && h.EMA8 < h.EMA55)
      return { ...h, action: 'SELL' };
    return { ...h, action: 'NOTHING' };
  });
};

const advancedFeatures = historic => {
  let tempHistoric = [...historic];
  tempHistoric = basicIndicators(tempHistoric);
  tempHistoric = detectPatterns(tempHistoric);
  tempHistoric = scoreData(tempHistoric);

  return tempHistoric;
};

module.exports = { advancedFeatures, combineIndicators };
