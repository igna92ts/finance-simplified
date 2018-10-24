const errors = require('../errors');

const determineSellPrice = (totalCurr, tracker) => {
  const { buyPrices, difference } = tracker;
  const temp = buyPrices.map(b => {
    return { ...b, weighted: b.price * ((b.amount * 100) / totalCurr) };
  });
  return buyPrices[buyPrices.length - 1] ? buyPrices[buyPrices.length - 1].price * (1 + difference) : 0;
  // return (temp.reduce((res, b) => res + b.weighted, 0) / 100) * (1 + difference);
};

const INC_DIFFERENCE = 0.005;
const sellLogic = data => {
  const symbol = 'XRPETH';
  const money = {
    ETH: 10,
    [symbol]: 0
  };
  const fees = 0.001;
  const buyAmount = 0.1;
  const sellAmount = 0.1;
  const tracker = {
    buyPrices: [],
    difference: INC_DIFFERENCE
  };
  let idleCounter = 0;
  data.forEach((d, index) => {
    if (idleCounter > 50) tracker.difference = INC_DIFFERENCE;
    idleCounter++;
    if (d.action === 'BUY') {
      idleCounter = 0;
      const amount = (money.ETH * buyAmount) / (d.close + d.close * fees);
      money[symbol] += amount;
      money.ETH -= money.ETH * buyAmount;
      tracker.buyPrices.push({ price: d.close, amount });
    }
    const sellPrice = determineSellPrice(money[symbol], tracker);
    if (tracker.buyPrices.length > 0 && d.close >= sellPrice && d.action !== 'BUY') {
      idleCounter = 0;
      if (
        money[symbol] * d.close <= 0.2 ||
        (data[index - 1] && d.SMA233 > d.SMA55 && data[index - 1].SMA233 < data[index - 1].SMA55)
      ) {
        // aprox 5 dolares
        money.ETH += money[symbol] * (d.close - d.close * fees);
        money[symbol] = 0;
        tracker.buyPrices = [];
        tracker.difference = INC_DIFFERENCE;
      } else {
        money.ETH += money[symbol] * sellAmount * (d.close - d.close * fees);
        money[symbol] -= money[symbol] * sellAmount;
        tracker.buyPrices = tracker.buyPrices.map(b => ({ ...b, amount: b.amount - b.amount * sellAmount }));
        tracker.difference += INC_DIFFERENCE;
      }
      d.action = 'SELL';
    }
  });
  console.log(money);
  return money.ETH + money[symbol] * data[data.length - 1].close;
};

const realBuySignals = data => {
  let lastAction = 'NOTHING';
  let lastActionIndex = 0;
  return data.reduce((res, d, index) => {
    if (!data[index + 1]) return [...res, { ...d, reality: d.action }];
    if (d.action === 'BUY' && lastAction === 'BUY') {
      res[lastActionIndex] = { ...res[lastActionIndex], reality: 'NOTHING' };
    }
    if (d.action === 'BUY' || d.action === 'SELL') {
      lastAction = d.action;
      lastActionIndex = index;
    }
    return [...res, { ...d, reality: d.action }];
  }, []);
};

module.exports = { sellLogic, realBuySignals };
