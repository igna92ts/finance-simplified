const request = require('request-promise'),
  WebSocket = require('ws');

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

const symbolVolumeFilter = async symbols => {
  const MINIMUM_VOLUME = 500;
  const symbolStats = await Promise.all(
    symbols.map(s => {
      return request
        .get({
          url: `https://api.binance.com/api/v1/ticker/24hr?symbol=${s}`,
          headers: {
            'X-MBX-APIKEY': binanceKey
          },
          json: true
        })
        .then(stats => ({ symbol: s, volume: parseFloat(stats.quoteVolume) }))
        .catch(console.log);
    })
  );
  return symbolStats
    .filter(s => s.volume > MINIMUM_VOLUME)
    .filter(s => !['PAXETH'].some(f => s.symbol === f))
    .map(s => s.symbol);
};

const fetchExchangeInfo = async () => {
  const QUOTE_ASSET = 'ETH';
  const exchangeInfo = await request
    .get({
      url: 'https://api.binance.com/api/v1/exchangeInfo',
      headers: {
        'X-MBX-APIKEY': binanceKey
      },
      json: true
    })
    .catch(console.log);
  const symbols = exchangeInfo.symbols
    .filter(s => s.status === 'TRADING')
    .filter(s => s.quoteAsset === QUOTE_ASSET)
    .map(s => s.symbol);
  // tick.q (quote asset volume) at least 500
  return symbolVolumeFilter(symbols);
};

const K_LINE_INTERVAL = '4h'; // MINUTES
const getKLineHistory = (symbol, limit = 100, endTime) => {
  return request
    .get({
      url: `https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=${K_LINE_INTERVAL}&limit=${limit}${
        endTime ? `&endTime=${endTime}` : ''
      }`,
      headers: {
        'X-MBX-APIKEY': binanceKey
      },
      json: true
    })
    .then(kLineData =>
      kLineData.map(k => ({
        id: k[0],
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        closeTime: k[6],
        volume: parseFloat(k[5]),
        open: parseFloat(k[1])
      }))
    )
    .catch(console.log);
};

const fetchKLines = async (symbol, count, accumulator = [], endTime) => {
  const history = await getKLineHistory(symbol, 1000, endTime);
  accumulator = [...history, ...accumulator];
  if (accumulator.length < count) {
    const [firstLine] = history;
    if (!firstLine) console.log(symbol);
    return fetchKLines(symbol, count, accumulator, firstLine.id - 1);
  } else {
    return accumulator;
  }
};

const setupKLineSocket = (symbol, cb) => {
  return new Promise((resolve, reject) => {
    const ticker = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${K_LINE_INTERVAL}`
    );
    ticker.on('open', () => {
      console.log(`OPENED CONNECTION TO ${symbol}`);
      ticker.on('message', kLineData => {
        cb(JSON.parse(kLineData).k);
      });
      resolve(ticker);
    });
    ticker.on('error', err => {
      console.log(err);
      throw err;
    });
  });
};

module.exports = { setupKLineSocket, getKLineHistory, fetchKLines, fetchExchangeInfo };
