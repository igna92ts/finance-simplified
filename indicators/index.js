const { detectPatterns } = require('./patterns'),
  {
    SMA,
    PSAR,
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
    HEIKINASHICANDLE
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
  ROC: 8,
  SMA: [21, 55, 233]
};

const basicIndicators = historic => {
  return combineIndicators([
    historic,
    SMA(historic, periods.SMA[0]),
    SMA(historic, periods.SMA[1]),
    SMA(historic, periods.SMA[2]),
    // EMA(historic, periods.EMA[0]),
    // EMA(historic, periods.EMA[1]),
    // EMA(historic, periods.EMA[2]),
    // EMA(historic, periods.EMA[3]),
    RSI(historic, periods.RSI),
    ADX(historic, periods.ADX),
    // PSAR(historic),
    HEIKINASHICANDLE(historic),
    // MFI(historic, periods.MFI),
    // BB(historic, periods.BB),
    STOCH(historic, periods.STOCH)
    // VWAP(historic),
    // VO(historic),
    // KST(historic)
    // AO(historic),
    // PROC(historic, periods.ROC),
    // VROC(historic, periods.ROC)
  ]);
};

const scoreData = historic => {
  return historic.map((h, index) => {
    const results = [];
    // results.push(rules.RSI(historic, index, periods.RSI));
    // results.push(rules.EMA(historic, index, periods.EMA));
    results.push(rules.STOCH(historic, index, periods.STOCH));
    // results.push(rules.PSAR(historic, index));
    // results.push(rules.ADX(historic, index, periods.ADX));
    // results.push(rules.HEIKINCANDLE(historic, index));
    // score += rules.VWAP(historic, index);
    results.push(rules.SMA(historic, index, periods.SMA));
    if (!results.some(r => r === false)) return { ...h, action: 'BUY' };
    return { ...h, action: 'NOTHING' };
  });
};

const advancedFeatures = historic => {
  let tempHistoric = [...historic];
  tempHistoric = basicIndicators(tempHistoric);
  tempHistoric = detectPatterns(tempHistoric);
  tempHistoric = scoreData(tempHistoric);
  rules.RSI(tempHistoric, 50, periods.RSI);

  return tempHistoric;
};

module.exports = { advancedFeatures, combineIndicators };
