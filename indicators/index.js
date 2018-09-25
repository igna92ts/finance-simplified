const smoothRsi = (timesteps, time, label = 'SMOOTHRSI') => {
  return timesteps.map((t, index) => {
    if (t[label] !== undefined) return t;
    let temp = 0;
    let divider = time;
    for (let i = index; i > index - time; i--) {
      if (i < 0) {
        divider = index + 1;
        break;
      } else divider = time;
      temp += timesteps[i].RSI;
    }
    return {
      ...t,
      [label]: temp / divider
    };
  });
};

const stochRsi = (timesteps, period, label = 'STOCHRSI') => {
  // smooth it with a 3 minute MA
  const RSI_SMOOTHING = 3;
  const stochsArr = timesteps.reduce((res, t, index) => {
    if (t[label] !== undefined) return [...res, t];
    if (index - period + 1 < 0) return [...res, { ...t, [label]: { value: 0 } }];
    const rsiPeriod = timesteps.slice(index - period + 1, index + 1).map(r => r.RSI); // inclusivo con el actual
    const lowestRsi = Math.min(...rsiPeriod);
    const highestRsi = Math.max(...rsiPeriod);
    const stoch = (t.RSI - lowestRsi) / (highestRsi - lowestRsi) || 0;
    return [...res, { ...t, [label]: { value: stoch * 100 } }];
  }, []);
  const percentKArr = stochsArr.map((s, index) => {
    if (s[label] !== undefined && s[label].percentK !== undefined) return s;
    if (index - RSI_SMOOTHING + 1 < 0) return { ...s, [label]: { ...s[label], percentK: 0 } };
    const stochPeriod = stochsArr.slice(index - RSI_SMOOTHING + 1, index + 1).map(t => t[label].value);
    return {
      ...s,
      [label]: { ...s[label], percentK: stochPeriod.reduce((sum, v) => sum + v, 0) / RSI_SMOOTHING }
    };
  });
  const percentDArr = percentKArr.map((s, index) => {
    if (s[label] !== undefined && s[label].percentD !== undefined) return s;
    if (index - RSI_SMOOTHING + 1 < 0) return { ...s, [label]: { ...s[label], percentD: 0 } };
    const kPeriod = percentKArr.slice(index - RSI_SMOOTHING + 1, index + 1).map(t => t[label].percentK);
    return {
      ...s,
      [label]: { ...s[label], percentD: kPeriod.reduce((sum, v) => sum + v, 0) / RSI_SMOOTHING }
    };
  });
  return percentDArr;
};

const expMovingAvg = (timesteps, period, label = 'EMA') => {
  const k = 2 / (period + 1);
  // first item is just the same as the first item in the input
  // for the rest of the items, they are computed with the previous one
  let emaArray = [];
  if (timesteps[0][label] === undefined) emaArray = [{ ...timesteps[0], [label]: timesteps[0].price }];
  else emaArray = [timesteps[0]];
  for (let i = 1; i < timesteps.length; i++) {
    if (timesteps[i][label] !== undefined) {
      emaArray.push(timesteps[i]);
    } else {
      emaArray.push({
        ...timesteps[i],
        [label]: timesteps[i].price * k + emaArray[i - 1][label] * (1 - k)
      });
    }
  }
  return emaArray;
};

const diffNumbers = (num1, num2) => {
  if (num1 > num2) return num1 - num2;
  else return num2 - num1;
};

const relStrIndex = (timesteps, time, label = 'RSI') => {
  const rsiArray = [];
  let lastAvgGain = 0;
  let lastAvgLoss = 0;
  timesteps.forEach((t, index) => {
    let tempGain = 0;
    let tempLoss = 0;
    if (index >= time) {
      if (t.price > timesteps[index - 1].price) {
        tempGain = diffNumbers(t.price, timesteps[index - 1].price);
      } else {
        tempLoss = diffNumbers(t.price, timesteps[index - 1].price);
      }
      lastAvgGain = (lastAvgGain * (time - 1) + tempGain) / time;
      lastAvgLoss = (lastAvgLoss * (time - 1) + tempLoss) / time;
    } else {
      for (let i = index; i > index - time; i--) {
        if (i - 1 < 0) break;
        if (timesteps[i].price > timesteps[i - 1].price) {
          tempGain += diffNumbers(timesteps[i].price, timesteps[i - 1].price);
        } else {
          tempLoss += diffNumbers(timesteps[i].price, timesteps[i - 1].price);
        }
      }
      lastAvgGain = tempGain / time;
      lastAvgLoss = tempLoss / time;
    }
    const firstRs = lastAvgGain / lastAvgLoss || 0;
    const firstRsi = 100 - 100 / (1 + firstRs);
    rsiArray.push({
      ...t,
      [label]: index < time ? 0 : firstRsi
    });
  });
  return rsiArray;
};

module.exports = { expMovingAvg, relStrIndex, stochRsi, smoothRsi };
