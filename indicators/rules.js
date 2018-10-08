const { SMA } = require('technicalindicators');

const smoothedSeries = (values, smoothFactor) => {
  const smoothed = SMA.calculate({ period: 18, values });
  const doubleSmoothed = SMA.calculate({ period: 18, values: smoothed });
  const tripleSmoothed = SMA.calculate({ period: 18, values: doubleSmoothed });
  const difference = values.length - tripleSmoothed.length;
  return values.map((v, index) => {
    if (index < difference) return 0;
    else return tripleSmoothed[index - difference];
  }, []);
};

exports.RSI = (historic, index, period) => {
  const label = `RSI${period}`;
  let score = 0;
  const currentRsi = historic[index][label];
  const smoothed = smoothedSeries(historic.map(h => h[label]), 14);
  const rising = smoothed[index] > smoothed[index - 1] && smoothed[index - 1] > smoothed[index - 2];
  if (currentRsi < 30 && rising) score++;
  if (currentRsi > 70) score--;
  return score;
};

const previousUnder = (historic, index) => {
  const TIME = 10;
  let under = false;
  const pt = historic.slice(0, index).reverse();
  for (let i = 0; i < TIME; i++) {
    if (pt.length < TIME) break;
    under = pt[i].EMA8 < pt[i].EMA55;
  }
  return under;
};

exports.EMA = (historic, index, periods) => {
  let score = 0;
  const h = historic[index];
  const separation = h.close * 0.001;
  const trulySeparated = h.EMA8 - h.EMA55 > separation;
  const ordered = h.EMA8 > h.EMA13 && h.EMA13 > h.EMA21 && h.EMA21 > h.EMA55 && trulySeparated;
  const justRised = previousUnder(historic, index);
  if (!ordered) score -= 10;
  if (justRised) score++;
  return score;
};

exports.ADX = (historic, index, period) => {
  let score = 0;
  const h = historic[index];
  if (h[`PDI${period}`] > h[`MDI${period}`] && h[`ADX${period}`] > 20) score++;
  if (h[`PDI${period}`] < h[`MDI${period}`] && h[`ADX${period}`] > 20) score--;
  return score;
};

// const previousOverClose = (historic, index) => {
//   let under = false;
//   const pt = historic.slice(0, index).reverse();
//   for (let i = 0; i < 3; i++) {
//     if (pt.length < 5) break;
//     under = pt[i].VWAP < pt[i].close;
//   }
//   return under;
// };

exports.VWAP = (historic, index, period) => {
  let score = 0;
  const h = historic[index];
  if (h.close > h.VWAP) score++;
  if (h.close < h.VWAP) score--;
  return score;
};

exports.KST = (historic, index, period) => {
  let score = 0;
  const h = historic[index];
  if (h.KST < h.KSTSIGNAL && h.KST > 0) score++;
  if (h.KST > h.KSTSIGNAL && h.KST < 0) score--;
  return score;
};
