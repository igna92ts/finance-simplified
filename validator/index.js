const { MFI, SMA, EMA, RSI, ADX } = require('technicalindicators'),
  { getKLineHistory } = require('../binance'),
  { checkBuySell, assignIndicator } = require('../index2'),
  { graphToImg } = require('../chart');

const run = async () => {
  const symbol = 'ADAETH';
  let historicalLines = await getKLineHistory(symbol, 500);
  const prices = historicalLines.map(t => t.price);
  const high = historicalLines.map(t => t.highPrice);
  const low = historicalLines.map(t => t.lowPrice);
  const volume = historicalLines.map(t => t.volume);
  historicalLines = assignIndicator(historicalLines, EMA.calculate({ period: 8, values: prices }), 'EMA8');
  historicalLines = assignIndicator(historicalLines, EMA.calculate({ period: 13, values: prices }), 'EMA13');
  historicalLines = assignIndicator(historicalLines, EMA.calculate({ period: 21, values: prices }), 'EMA21');
  historicalLines = assignIndicator(historicalLines, EMA.calculate({ period: 55, values: prices }), 'EMA55');
  const rsi = RSI.calculate({ period: 14, values: prices });
  historicalLines = assignIndicator(historicalLines, rsi, 'RSI14');
  historicalLines = assignIndicator(
    historicalLines,
    ADX.calculate({ period: 14, close: prices, high, low }).map(e => e.adx),
    'ADX14'
  );
  historicalLines = assignIndicator(
    historicalLines,
    MFI.calculate({ period: 14, volume, high, low, close: prices }),
    'MFI14'
  );
  historicalLines = historicalLines.slice(100).reduce((res, h, index) => {
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
