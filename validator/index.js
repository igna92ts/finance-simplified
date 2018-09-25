const { getKLineHistory } = require('../binance'),
  { smoothRsi, relStrIndex, expMovingAvg, stochRsi } = require('../indicators'),
  { checkBuySell } = require('../index'),
  { graphToImg } = require('../chart');

const run = async () => {
  const symbol = 'ZECETH';
  let historicalLines = await getKLineHistory(symbol, 500);
  historicalLines = relStrIndex(historicalLines, 14);
  historicalLines = expMovingAvg(historicalLines, 8, 'EMA8');
  historicalLines = expMovingAvg(historicalLines, 13, 'EMA13');
  historicalLines = expMovingAvg(historicalLines, 21, 'EMA21');
  historicalLines = expMovingAvg(historicalLines, 55, 'EMA55');
  historicalLines = stochRsi(historicalLines, 14, 'STOCHRSI');
  historicalLines = smoothRsi(historicalLines, 14).map(h => ({ ...h, RSI: h.SMOOTHRSI }));
  historicalLines = historicalLines.reduce((res, h, index) => {
    if (index === 0 || index === 1) return [...res, { ...h, action: 'NOTHING' }];
    else {
      return [
        ...res,
        checkBuySell(
          symbol,
          { ...h, tracker: [res[res.length - 2], res[res.length - 1]] },
          res[res.length - 1].action
        )
      ];
    }
  }, []);
  graphToImg(historicalLines);
};

run();
