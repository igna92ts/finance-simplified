const request = require('request-promise'),
  WebSocket = require('ws'),
  { setGraphingServer } = require('./chart');

const binanceKey = '8tc4fJ1ddM2VmnbFzTk3f7hXsrehnT8wP7u6EdIoVq7gyXWiL852TP1wnKp0qaGM';

/*
"e": "24hrTicker",  // Event type
"E": 123456789,     // Event time
"s": "BNBBTC",      // Symbol
"p": "0.0015",      // Price change
"P": "250.00",      // Price change percent
"w": "0.0018",      // Weighted average price
"x": "0.0009",      // Previous day's close price
"c": "0.0025",      // Current day's close price
"Q": "10",          // Close trade's quantity
"b": "0.0024",      // Best bid price
"B": "10",          // Best bid quantity
"a": "0.0026",      // Best ask price
"A": "100",         // Best ask quantity
"o": "0.0010",      // Open price
"h": "0.0025",      // High price
"l": "0.0010",      // Low price
"v": "10000",       // Total traded base asset volume
"q": "18",          // Total traded quote asset volume
"O": 0,             // Statistics open time
"C": 86400000,      // Statistics close time
"F": 0,             // First trade ID
"L": 18150,         // Last trade Id
"n": 18151          // Total number of trades
rateOfChange: ((parseFloat(tick.c) - parseFloat(tick.x)) / parseFloat(tick.x)) * 100
*/

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

const PERIOD_IN_SECONDS = 1;
const RSI_SMOOTHING = 3 * PERIOD_IN_SECONDS; // TODO: esto
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

const stochRsi = (timesteps, period, label = 'STOCHRSI') => {
  // smooth it with a 3 minute MA
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

const getSymbolPrice = symbol => {
  return request
    .get({
      url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      headers: {
        'X-MBX-APIKEY': binanceKey
      },
      json: true
    })
    .then(priceObj => ({ ...priceObj, price: parseFloat(priceObj.price) }))
    .catch(console.log);
};

const fetchExchangeInfo = () => {
  const QUOTE_ASSET = 'ETH';
  return request
    .get({
      url: 'https://api.binance.com/api/v1/exchangeInfo',
      headers: {
        'X-MBX-APIKEY': binanceKey
      },
      json: true
    })
    .then(exchangeInfo => {
      const symbols = exchangeInfo.symbols
        .filter(s => s.status === 'TRADING')
        .filter(s => s.quoteAsset === QUOTE_ASSET)
        .map(s => s.symbol);
      // tick.q (quote asset volume) at least 500
      return Promise.all(symbols.map(s => getSymbolPrice(s)));
    })
    .catch(console.log);
};

const formatInfo = (tickArray, trackerObj) => {
  const MAX_TRACK = 3300;
  return Object.keys(trackerObj).reduce((res, key) => {
    const tick = tickArray.find(t => t.s === key);
    if (tick) {
      return {
        ...res,
        [tick.s]: {
          changePercent: parseFloat(tick.P),
          currentClose: parseFloat(tick.c), // aka. currentPrice, market value
          volume: parseFloat(tick.v),
          tracker: res[tick.s]
            ? [...res[tick.s].tracker, { price: parseFloat(tick.c) }].slice(-MAX_TRACK)
            : [{ price: parseFloat(tick.c) }].slice(-MAX_TRACK)
        }
      };
    } else {
      return {
        ...res,
        [key]: {
          ...res[key],
          tracker: [
            ...res[key].tracker,
            { price: res[key].tracker[res[key].tracker.length - 1].price }
          ].slice(-MAX_TRACK)
        }
      };
    }
  }, trackerObj);
};

const formatDerivedFeatures = trackerObj => {
  return Object.keys(trackerObj).reduce((res, key) => {
    trackerObj[key].tracker = relStrIndex(trackerObj[key].tracker, 14 * PERIOD_IN_SECONDS);
    trackerObj[key].tracker = expMovingAvg(trackerObj[key].tracker, 8 * PERIOD_IN_SECONDS, 'EMA8');
    trackerObj[key].tracker = expMovingAvg(trackerObj[key].tracker, 13 * PERIOD_IN_SECONDS, 'EMA13');
    trackerObj[key].tracker = expMovingAvg(trackerObj[key].tracker, 21 * PERIOD_IN_SECONDS, 'EMA21');
    trackerObj[key].tracker = expMovingAvg(trackerObj[key].tracker, 55 * PERIOD_IN_SECONDS, 'EMA55');
    trackerObj[key].tracker = stochRsi(trackerObj[key].tracker, 14 * PERIOD_IN_SECONDS, 'STOCHRSI');
    return {
      ...res,
      [key]: {
        ...trackerObj[key],
        STOCHRSI: trackerObj[key].tracker[trackerObj[key].tracker.length - 1].STOCHRSI,
        EMA8: trackerObj[key].tracker[trackerObj[key].tracker.length - 1].EMA8,
        EMA13: trackerObj[key].tracker[trackerObj[key].tracker.length - 1].EMA13,
        EMA21: trackerObj[key].tracker[trackerObj[key].tracker.length - 1].EMA21,
        EMA55: trackerObj[key].tracker[trackerObj[key].tracker.length - 1].EMA55 // only super sell
      }
    };
  }, trackerObj);
};

const miniTickers = async () => {
  const graphSocket = await setGraphingServer();
  const tickers = new WebSocket(`wss://stream.binance.com:9443/ws/!ticker@arr`);
  const initialData = await fetchExchangeInfo();
  let trackerObj = initialData.reduce(
    (res, s) => ({ ...res, [s.symbol]: { tracker: [{ price: s.price }] } }),
    {}
  );
  tickers.on('open', () => {
    console.log('opened connection to price tickers');
  });
  tickers.on('message', rawData => {
    const data = JSON.parse(rawData);
    trackerObj = formatInfo(data, trackerObj);
    trackerObj = formatDerivedFeatures(trackerObj);
    graphSocket({ ...trackerObj.XRPETH, tracker: [] });
  });
};

miniTickers();

module.exports = { miniTickers, expMovingAvg, relStrIndex, stochRsi };
