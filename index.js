const { setGraphingServer } = require('./chart'),
  { relStrIndex, expMovingAvg, stochRsi, smoothRsi } = require('./indicators'),
  { setupKLineSocket, fetchExchangeInfo, getKLineHistory } = require('./binance');

const advancedFeatures = symbolTracker => {
  let tempTrack = [...symbolTracker.tracker, { price: symbolTracker.currentPrice }];
  tempTrack = relStrIndex(tempTrack, 14);
  tempTrack = expMovingAvg(tempTrack, 8, 'EMA8');
  tempTrack = expMovingAvg(tempTrack, 13, 'EMA13');
  tempTrack = expMovingAvg(tempTrack, 21, 'EMA21');
  tempTrack = expMovingAvg(tempTrack, 55, 'EMA55');
  tempTrack = stochRsi(tempTrack, 14, 'STOCHRSI');
  tempTrack = smoothRsi(tempTrack, 14).map(h => ({ ...h, RSI: h.SMOOTHRSI }));
  const lastResult = tempTrack.pop();
  return {
    ...symbolTracker,
    EMA8: lastResult.EMA8,
    EMA13: lastResult.EMA13,
    EMA21: lastResult.EMA21,
    EMA55: lastResult.EMA55,
    STOCHRSI: lastResult.STOCHRSI,
    tracker: tempTrack
  };
};

const checkOpen = (tracker, kline) => {
  const MAX_TRACK = 100;
  if (kline.x) {
    if (kline.closeTime && kline.closeTime > Date.now()) {
      tracker[tracker.length - 1] = { price: parseFloat(kline.c), id: kline.t };
      return [...tracker].slice(-MAX_TRACK);
    } else {
      return [...tracker, { price: parseFloat(kline.c), id: kline.t }].slice(-MAX_TRACK);
    }
  } else {
    return [...tracker];
  }
};

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

const checkBuySell = (symbol, symbolObj, previousAction) => {
  if (!previousAction) throw new Error('NO PREVIOUS ACTION');
  const { EMA8, EMA13, EMA21, EMA55, STOCHRSI, RSI } = symbolObj;
  const { percentK, percentD } = STOCHRSI;
  const orderedEma = EMA8 > EMA13 && EMA13 > EMA21 && EMA21 > EMA55;
  const kOverD = percentK > percentD;
  const previousPercentK = symbolObj.tracker[symbolObj.tracker.length - 2].STOCHRSI.percentK;
  const previousPercentD = symbolObj.tracker[symbolObj.tracker.length - 2].STOCHRSI.percentD;
  const previousRsi = symbolObj.tracker[symbolObj.tracker.length - 2].RSI;
  const isRising = previousPercentK < percentK && previousPercentD > previousPercentK; // if it is smaller the its rising and previous timestep percentK broke out
  const emaCross = EMA8 < EMA13;
  if (/* kOverD && orderedEma && previousAction !== 'BUY' && isRising */kOverD && orderedEma && RSI > 50 && previousRsi < RSI && previousAction !== 'BUY') {
    operate(symbol, 'BUY', symbolObj.currentPrice);
    return { ...symbolObj, action: 'BUY' };
  }
  if (previousAction === 'BUY' && emaCross) {
    operate(symbol, 'SELL', symbolObj.currentPrice);
    return { ...symbolObj, action: 'SELL' };
  }
  return { ...symbolObj, action: previousAction };
};

const printMoney = trackerObj => {
  const amount = Object.keys(money).reduce((res, k) => {
    if (k === 'ETH') return res + money[k];
    else return res + money[k] * trackerObj[k].currentPrice;
  }, 0);
  console.log(amount);
};

const debug = 'XRPETH';
const processKLineData = (kLineData, trackerObj, graphSocket) => {
  const symbol = kLineData.s;
  trackerObj[symbol] = {
    ...trackerObj[symbol],
    currentPrice: parseFloat(kLineData.c),
    tracker: checkOpen(trackerObj[symbol].tracker, kLineData)
  };
  trackerObj[symbol] = advancedFeatures(trackerObj[symbol]);
  if (kLineData.x) {
    trackerObj[symbol] = checkBuySell(symbol, trackerObj[symbol], trackerObj[symbol].action);
    printMoney(trackerObj);
  }
  if (debug === symbol && kLineData.x) graphSocket({ ...trackerObj[symbol], tracker: [] });
};

const setKLineSockets = (symbols, trackerObj, graphSocket) => {
  const promises = symbols.map(async s => {
    const kLineHistory = await getKLineHistory(s);
    trackerObj[s] = {
      currentPrice: kLineHistory[kLineHistory.length - 1].price,
      tracker: kLineHistory,
      action: 'NOTHING'
    };
    return setupKLineSocket(s, kLineData => processKLineData(kLineData, trackerObj, graphSocket));
  });
  return Promise.all(promises);
};

const run = async () => {
  const graphSocket = await setGraphingServer();
  const trackerObj = {};
  const symbols = await fetchExchangeInfo();
  await setKLineSockets(symbols, trackerObj, graphSocket);
};

run();

module.exports = { checkBuySell };
