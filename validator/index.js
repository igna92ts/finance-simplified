const errors = require('../errors');

const operate = (symbol, action, currentPrice, money) => {
  if (money[symbol] === undefined) money[symbol] = 0;
  const fees = 0.001;
  const buyAmount = 0.1;
  if (action === 'BUY' && money.ETH > 0) {
    money[symbol] += (money.ETH * buyAmount) / (currentPrice + currentPrice * fees);
    money.ETH -= money.ETH * buyAmount;
  }
  if (action === 'SELL') {
    money.ETH += money[symbol] * (currentPrice - currentPrice * fees);
    money[symbol] = 0;
  }
  return money.ETH + money[symbol] * currentPrice;
};

const calculateReturns = data => {
  const money = {
    ETH: 5
  };
  let result = 5;
  let previousAction = 'NOTHING';
  data.forEach((d, index) => {
    if (!d.action) throw errors.missingRequiredProperty('action');
    if (!d.close) throw errors.missingRequiredProperty('close');
    if (d.EMA8 === undefined || d.EMA55 === undefined) throw errors.missingRequiredProperty('EMA');
    if (data[index - 1] && data[index - 1].EMA8 > data[index - 1].EMA55 && d.EMA8 < d.EMA55) {
      result = operate('XRPETH', 'SELL', d.close, money);
      previousAction = 'SELL';
    }
    if (previousAction !== d.action) {
      result = operate('XRPETH', d.action, d.close, money);
      previousAction = d.action;
    }
  });
  return result;
};

module.exports = {
  calculateReturns
};
