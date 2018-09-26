const { EMA, RSI, ADX } = require('technicalindicators'),
  { setupKLineSocket, fetchExchangeInfo, getKLineHistory } = require('./binance');

const money = {
  ETH: 5
};
const operate = (symbol, action, currentPrice) => {
  if (money[symbol] === undefined) money[symbol] = 0;
  const fees = 0.001;
  const buyAmount = 0.1;
  if (action === 'BUY' && money.ETH > 0) {
    money[symbol] += (money.ETH * buyAmount) / (currentPrice + currentPrice * fees);
    money.ETH -= money.ETH * buyAmount;
  }
  if (action === 'SELL') {
    money.ETH += money[symbol] * (currentPrice - currentPrice * fees);
    money[symbol] = 0;
  }
  console.log(JSON.stringify(money, 0, 2));
};

const printMoney = trackerObj => {
  const amount = Object.keys(money).reduce((res, k) => {
    if (k === 'ETH') return res + money[k];
    else return res + money[k] * trackerObj[k].tracker[trackerObj[k].tracker.length - 1].price;
  }, 0);
  console.log(amount);
};

const checkBuySell = (symbol, symbolObj, previousAction) => {
  if (!previousAction) throw new Error('NO PREVIOUS ACTION');
  const { MFI14, ADX14, EMA8, EMA13, EMA21, EMA55, RSI14, price } = symbolObj;
  const orderedEma = EMA8 > EMA13 && EMA13 > EMA21;
  const previousRsi = symbolObj.tracker[symbolObj.tracker.length - 2].RSI14;
  const previousMfi = symbolObj.tracker[symbolObj.tracker.length - 2].MFI14;
  // const previousAdx = symbolObj.tracker[symbolObj.tracker.length - 2].ADX14;
  const rsiOver50AndRising = RSI14 > 50 && previousRsi < RSI14;
  const adxOver25 = ADX14 > 30;
  const mfiOver80 = MFI14 > 80;
  const separation = price * 0.005;
  const sellSeparation = price * 0.001;
  const trueSeparation = EMA8 - EMA55 > separation;
  const emaCross = EMA8 < EMA13 && EMA8 - EMA55 > sellSeparation;
  if (/* orderedEma && rsiOver50AndRising && previousAction !== 'BUY' &&  */ rsiOver50AndRising && orderedEma && previousAction !== 'BUY' && trueSeparation) {
    operate(symbol, 'BUY', price);
    return { ...symbolObj, action: 'BUY' };
  }
  if (previousAction === 'BUY' && emaCross) {
    operate(symbol, 'SELL', price);
    return { ...symbolObj, action: 'SELL' };
  }
  return { ...symbolObj, action: previousAction };
};

const assignIndicator = (tracker, indicatorValues, label) => {
  const difference = tracker.length - indicatorValues.length;
  return tracker.reduce((res, t, index) => {
    if (index < difference) return [...res, { ...t, [label]: t[label] || 0 }];
    else return [...res, { ...t, [label]: indicatorValues[index - difference] }];
  }, []);
};

const advancedFeatures = tracker => {
  let tempTrack = [...tracker];
  const prices = tempTrack.map(t => t.price);
  const high = tempTrack.map(t => t.highPrice);
  const low = tempTrack.map(t => t.lowPrice);
  tempTrack = assignIndicator(tempTrack, EMA.calculate({ period: 8, values: prices }), 'EMA8');
  tempTrack = assignIndicator(tempTrack, EMA.calculate({ period: 13, values: prices }), 'EMA13');
  tempTrack = assignIndicator(tempTrack, EMA.calculate({ period: 21, values: prices }), 'EMA21');
  tempTrack = assignIndicator(tempTrack, EMA.calculate({ period: 55, values: prices }), 'EMA55');
  tempTrack = assignIndicator(tempTrack, RSI.calculate({ period: 14, values: prices }), 'RSI14');
  tempTrack = assignIndicator(tempTrack, ADX.calculate({ period: 14, close: prices, high, low }), 'ADX');
  return tempTrack;
};

const processKLineData = (kLineData, trackerObj) => {
  const symbol = kLineData.s;
  trackerObj[symbol] = {
    ...trackerObj[symbol],
    tracker: kLineData.x
      ? [
          ...trackerObj[symbol].tracker,
          {
            price: parseFloat(kLineData.c),
            highPrice: parseFloat(kLineData.h),
            lowPrice: parseFloat(kLineData.l),
            volume: parseFloat(kLineData.v),
            closeTime: kLineData.T
          }
        ]
      : trackerObj[symbol].tracker
  };
  trackerObj[symbol] = advancedFeatures(trackerObj[symbol].tracker);
  if (kLineData.x) {
    trackerObj[symbol] = checkBuySell(symbol, trackerObj[symbol], trackerObj[symbol].action);
    printMoney(trackerObj);
  }
};

const setKLineSockets = (symbols, trackerObj) => {
  const promises = symbols.map(async s => {
    const kLineHistory = await getKLineHistory(s);
    trackerObj[s] = {
      tracker: kLineHistory,
      action: 'NOTHING'
    };
    return setupKLineSocket(s, kLineData => processKLineData(kLineData, trackerObj));
  });
  return Promise.all(promises);
};

const run = async () => {
  const trackerObj = {};
  const symbols = await fetchExchangeInfo();
  await setKLineSockets(symbols, trackerObj);
};

run();

module.exports = { assignIndicator, checkBuySell };
