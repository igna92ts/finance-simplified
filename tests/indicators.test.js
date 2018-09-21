const { stochRsi, expMovingAvg, relStrIndex } = require('../index');

describe('index functions', () => {
  const averagingTrades = [22.81, 23.09, 22.91, 23.23, 22.83, 23.05, 23.02, 23.29, 23.41, 23.49];

  describe('expMovingAvg', () => {
    test('calculates exp moving average for an N range period', () => {
      const expAvg = expMovingAvg(averagingTrades, 9);
      console.log(expAvg);
      expect(expAvg).toBe(23.18152516096);
    });
  });

  describe('relStrIndex', () => {
    test('calculates rel str index for an N range period', () => {
      const trades = [
        44.34,
        44.09,
        44.15,
        43.61,
        44.33,
        44.83,
        45.1,
        45.42,
        45.84,
        46.08,
        45.89,
        46.03,
        45.61,
        46.28,
        46.28
      ];
      const rsiArr = relStrIndex(trades, 14);
      expect(rsiArr[rsiArr.length - 1]).toBe(70.46413502109704); // TODO: REVISAR RSI, UN PAR DE DECIMALES MAL
    });
  });

  describe('stochRsi', () => {
    test('calculates stochastic rsi 14 day', () => {
      const rsiArr = [
        54.09,
        59.9,
        58.2,
        59.76,
        52.35,
        52.82,
        56.94,
        57.47,
        55.26,
        57.51,
        54.8,
        51.47,
        56.16,
        58.34
      ];
      const stoch = stochRsi(rsiArr);
      expect(stoch).toBe(0.8149466192170824);
    });
  });
});
