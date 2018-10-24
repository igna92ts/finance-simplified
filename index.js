const { setupKLineSocket, fetchKLines, fetchExchangeInfo } = require('./binance'),
  { advancedFeatures } = require('./indicators'),
  { realBuySignals, sellLogic } = require('./validator'),
  bayes = require('./bayes'),
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
    const kLineHistory = await fetchKLines('ADAETH', 5000);
    const advancedHistoric = advancedFeatures(kLineHistory).slice(250);
    console.log(sellLogic(advancedHistoric));
    const realSignalHistoric = realBuySignals(advancedHistoric);
    const bayesianHistoric = advancedHistoric.map((a, index) => {
      const bayesianClassifier = bayes.buildClassifier(
        realSignalHistoric
          .slice(0, index)
          .map(r => [r.reality, r.RSI14, r.STOCHK14, r.STOCHD14, r.ADX14, r.MDI14, r.PDI14]),
        {
          type: 'array',
          items: {
            type: 'array',
            items: [
              { type: 'string' },
              { type: 'number' },
              { type: 'number' },
              { type: 'number' },
              { type: 'number' },
              { type: 'number' },
              { type: 'number' }
            ],
            additionalItems: false
          }
        }
      );
      const certainty = bayesianClassifier.classify([
        'BUY',
        a.RSI14,
        a.STOCHK14,
        a.STOCHD14,
        a.ADX14,
        a.MDI14,
        a.PDI14
      ]);
      console.log(certainty * 100);
      return { ...a, certainty, action: certainty > 0.01 || a.action === 'SELL' ? a.action : 'NOTHING' };
    });
    await graphToImg(realSignalHistoric.map(e => ({ ...e, action: e.reality })).slice(3000), 'expected');
    await graphToImg(bayesianHistoric.slice(3000), 'predicted');
  } catch (err) {
    console.log(err);
  }
};

run();
