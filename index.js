const { setupKLineSocket, fetchKLines, fetchExchangeInfo } = require('./binance'),
  { advancedFeatures } = require('./indicators'),
  { calculateReturns } = require('./validator'),
  { setGraphingServer, graphToImg } = require('./chart');

const CHART_URL = 'https://www.binance.com/en/trade/pro/';

const processKLineData = (kLineData, trackerObj, emit) => {
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
    emit();
    // console.log(
    //   JSON.stringify({
    //     SELL: Object.keys(trackerObj).filter(k => trackerObj[k].action === 'SELL'),
    //     BUY: Object.keys(trackerObj).filter(k => trackerObj[k].action === 'BUY')
    //   })
    // );
  }
};

const setChartApi = async trackerObj => {
  const emit = await setGraphingServer();
  return () => {
    const data = Object.keys(trackerObj)
      .filter(k => trackerObj[k].action !== 'NOTHING')
      .map(k => {
        const [singleSymbol] = k.split('ETH');
        return {
          symbol: k,
          action: trackerObj[k].action,
          signalCount: [...trackerObj[k].tracker].reverse().reduce((res, e, i) => {
            if (e.action !== trackerObj[k].action && res === 0) res = i;
            return res;
          }, 0),
          chartUrl: `${CHART_URL}${[singleSymbol, '_', 'ETH'].join('')}`
        };
      });
    emit(data);
  };
};

const setKLineSockets = (symbols, trackerObj, emit) => {
  const promises = symbols.map(async s => {
    const kLineHistory = await fetchKLines(s, 500);
    trackerObj[s] = {
      tracker: advancedFeatures(kLineHistory),
      action: 'NOTHING'
    };
    return setupKLineSocket(s, kLineData => processKLineData(kLineData, trackerObj, emit));
  });
  return Promise.all(promises);
};

const run = async () => {
  try {
    const kLineHistory = await fetchKLines('XRPETH', 500);
    const advancedHistoric = advancedFeatures(kLineHistory);
    console.log(calculateReturns(advancedHistoric));
    // await graphToImg(advancedHistoric, 'test');
    // const trackerObj = {};
    // const emit = await setChartApi(trackerObj);
    // setInterval(() => emit(), 10000);
    // const symbols = await fetchExchangeInfo();
    // await setKLineSockets(symbols, trackerObj, emit);
  } catch (err) {
    console.log(err);
  }
};

run();
