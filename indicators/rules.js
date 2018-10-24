const { SMA } = require('technicalindicators');
const { lineGraph } = require('../chart');

const smoothedSeries = (values, smoothFactor) => {
  const smoothed = SMA.calculate({ period: smoothFactor, values });
  const difference = values.length - smoothed.length;
  return values.map((v, index) => {
    if (index < difference) return 0;
    else return smoothed[index - difference];
  }, []);
};

exports.RSI = (historic, index, period) => {
  const label = `RSI${period}`;
  const currentRsi = historic[index][label];
  const smoothed = smoothedSeries(historic.map(h => h[label]), 55);
  const rising = smoothed[index] > smoothed[index - 1] && smoothed[index - 1] > smoothed[index - 2];
  if (currentRsi < 35) return true;
  else return false;
};

const checkPrevOrder = (previousHistory, timesteps) => {
  const reversed = [...previousHistory].reverse();
  if (reversed.length < timesteps) return false;
  for (let i = 0; i < timesteps; i++) {
    const h = reversed[i];
    const ordered = h.EMA8 > h.EMA13 && h.EMA13 > h.EMA21 && h.EMA21 > h.EMA55;
    if (!ordered) return false;
  }
  return true;
};

exports.EMA = (historic, index, periods) => {
  const h = historic[index];
  const ordered = h.EMA8 > h.EMA13 && h.EMA13 > h.EMA21 && h.EMA21 > h.EMA55;
  const comply = checkPrevOrder(historic.slice(0, index), 21);
  if (comply) return true;
  return false;
};

const checkUpTrend = (current, previousHistory, timesteps) => {
  const reversed = [...previousHistory].reverse();
  if (reversed.length < timesteps) return false;
  for (let i = 0; i < timesteps; i++) {
    if (reversed[i].SMA233 > current) return false;
  }
  return true;
};

exports.SMA = (historic, index, periods) => {
  const h = historic[index];
  // const ordered = h.close > h.SMA233; // h.SMA55 > h.close && h.close > h.SMA233;
  // const ordered = h.SMA55 > h.close && h.close > h.SMA233;
  // if (ordered) return true;
  // const isUpTrend = checkUpTrend(h.SMA233, historic.slice(0, index), 55);
  // if (isUpTrend) return true;
  if (h.close < h.SMA233 && h.close < h.SMA55) return true;
  return false;
};

exports.PSAR = (historic, index) => {
  const h = historic[index];
  if (h.PSAR <= h.close) return true;
  return false;
};

exports.HEIKINCANDLE = (historic, index) => {
  const h = historic[index];
  if (h.HEIKINCANDLE === 'GREEN') return true;
  else return false;
};

exports.ADX = (historic, index, period) => {
  const label = `ADX${period}`;
  const h = historic[index];
  const smoothed = smoothedSeries(historic.map(e => e[label]), 4);
  const rising = smoothed[index] > smoothed[index - 1] && smoothed[index - 1] > smoothed[index - 2];
  if (h[label] > 20 && rising) return true;
  else return false;
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
  const h = historic[index];
  if (h.KST < h.KSTSIGNAL && h.KST < 20) return true;
  return false;
};

exports.STOCH = (historic, index, period) => {
  const h = historic[index];
  if (
    h[`STOCHK${period}`] > h[`STOCHD${period}`] &&
    h[`STOCHK${period}`] > 20 &&
    historic[index - 1][`STOCHK${period}`] < 20
  )
    return true;
  return false;
};
