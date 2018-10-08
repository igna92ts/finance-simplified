const { setupKLineSocket, fetchKLines, fetchExchangeInfo } = require('./binance'),
  { advancedFeatures } = require('./indicators'),
  { calculateReturns } = require('./validator'),
  { setGraphingServer } = require('./chart');

const processKLineData = (kLineData, trackerObj) => {
  const symbol = kLineData.s;
  trackerObj[symbol] = {
    ...trackerObj[symbol],
    tracker: kLineData.x
      ? [
          ...trackerObj[symbol].tracker,
          {
            close: parseFloat(kLineData.c),
            high: parseFloat(kLineData.h),
            low: parseFloat(kLineData.l),
            volume: parseFloat(kLineData.v),
            closeTime: kLineData.T
          }
        ]
      : trackerObj[symbol].tracker
  };
  if (kLineData.x) {
    trackerObj[symbol].tracker = advancedFeatures(trackerObj[symbol].tracker);
    trackerObj[symbol].action = trackerObj[symbol].tracker[trackerObj[symbol].tracker.length - 1].action;
    if (trackerObj[symbol].action === 'BUY') console.log(symbol);
  }
};

const setKLineSockets = (symbols, trackerObj) => {
  const promises = symbols.map(async s => {
    const kLineHistory = await fetchKLines(s, 200);
    trackerObj[s] = {
      tracker: advancedFeatures(kLineHistory),
      action: 'NOTHING'
    };
    return setupKLineSocket(s, kLineData => processKLineData(kLineData, trackerObj));
  });
  return Promise.all(promises);
};

const run = async () => {
  try {
    const trackerObj = {};
    const symbols = await fetchExchangeInfo();
    await setKLineSockets(symbols, trackerObj);
  } catch (err) {
    console.log(err);
  }
};

run();
