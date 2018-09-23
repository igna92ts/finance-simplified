const request = require('request-promise'),
  WebSocket = require('ws'),
  { setGraphingServer } = require('./chart'),
  { relStrIndex, expMovingAvg, stochRsi } = require('./indicators');

const binanceKey = '8tc4fJ1ddM2VmnbFzTk3f7hXsrehnT8wP7u6EdIoVq7gyXWiL852TP1wnKp0qaGM';

// "k": {
//   "t": 123400000, // Kline start time
//   "T": 123460000, // Kline close time
//   "s": "BNBBTC",  // Symbol
//   "i": "1m",      // Interval
//   "f": 100,       // First trade ID
//   "L": 200,       // Last trade ID
//   "o": "0.0010",  // Open price
//   "c": "0.0020",  // Close price
//   "h": "0.0025",  // High price
//   "l": "0.0015",  // Low price
//   "v": "1000",    // Base asset volume
//   "n": 100,       // Number of trades
//   "x": false,     // Is this kline closed?
//   "q": "1.0000",  // Quote asset volume
//   "V": "500",     // Taker buy base asset volume
//   "Q": "0.500",   // Taker buy quote asset volume
//   "B": "123456"   // Ignore

const advancedFeatures = symbolTracker => {
  let tempTrack = [...symbolTracker.tracker, { price: symbolTracker.currentPrice }];
  tempTrack = relStrIndex(tempTrack, 14);
  tempTrack = expMovingAvg(tempTrack, 8, 'EMA8');
  tempTrack = expMovingAvg(tempTrack, 13, 'EMA13');
  tempTrack = expMovingAvg(tempTrack, 21, 'EMA21');
  tempTrack = expMovingAvg(tempTrack, 55, 'EMA55');
  tempTrack = stochRsi(tempTrack, 14, 'STOCHRSI');
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

const K_LINE_INTERVAL = '1m'; // MINUTES
const getKLineHistory = symbol => {
  return request
    .get({
      url: `https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=${K_LINE_INTERVAL}&limit=100`,
      headers: {
        'X-MBX-APIKEY': binanceKey
      },
      json: true
    })
    .then(kLineData => kLineData.map(k => ({ id: k[0], price: parseFloat(k[4]), closeTime: k[6] })))
    .catch(console.log);
};

const setupKLineSocket = (symbol, cb) => {
  return new Promise((resolve, reject) => {
    const ticker = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${K_LINE_INTERVAL}`
    );
    ticker.on('open', () => {
      ticker.on('message', kLineData => {
        cb(JSON.parse(kLineData).k);
      });
      resolve(ticker);
    });
  });
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

const debug = 'XRPETH';
const processKLineData = (kLineData, trackerObj, graphSocket) => {
  const symbol = kLineData.s;
  trackerObj[symbol] = {
    ...trackerObj[symbol],
    currentPrice: parseFloat(kLineData.c),
    tracker: checkOpen(trackerObj[symbol].tracker, kLineData)
  };
  trackerObj[symbol] = advancedFeatures(trackerObj[symbol]);
  console.log(JSON.stringify(trackerObj, 0, 2));
  if (debug === symbol && kLineData.x) graphSocket({ ...trackerObj[symbol], tracker: [] });
};

const setKLineSockets = (symbols, trackerObj, graphSocket) => {
  const promises = symbols.map(async s => {
    const kLineHistory = await getKLineHistory(s);
    trackerObj[s] = { currentPrice: kLineHistory[kLineHistory.length - 1].price, tracker: kLineHistory };
    return setupKLineSocket(s, kLineData => processKLineData(kLineData, trackerObj, graphSocket));
  });
  return Promise.all(promises);
};

const run = async () => {
  const graphSocket = await setGraphingServer();
  const trackerObj = {};
  await setKLineSockets(['XRPETH'], trackerObj, graphSocket);
};

run();
