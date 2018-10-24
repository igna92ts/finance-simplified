const {
    BollingerBands: BB,
    Stochastic: STOCH,
    AwesomeOscillator: AO,
    VWAP,
    PSAR,
    OBV,
    KST,
    RSI,
    EMA,
    ADX,
    MFI,
    SMA,
    ROC,
    HeikinAshi
  } = require('technicalindicators'),
  errors = require('../errors');

exports.fill = (historic, values, label) => {
  const difference = historic.length - values.length;
  return historic.reduce((res, t, index) => {
    if (index < difference) return [...res, { [label]: t[label] || 0 }];
    else return [...res, { [label]: values[index - difference] }];
  }, []);
};

exports.EMA = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const ema = EMA.calculate({ period, values });
  return exports.fill(historic, ema, `EMA${period}`);
};

exports.SMA = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const ema = SMA.calculate({ period, values });
  return exports.fill(historic, ema, `SMA${period}`);
};

exports.RSI = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const rsi = RSI.calculate({ period, values });
  return exports.fill(historic, rsi, `RSI${period}`);
};

exports.ADX = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const close = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const high = historic.map(h => {
    if (h.high === undefined) throw errors.missingRequiredProperty('high');
    return h.high;
  });
  const low = historic.map(h => {
    if (h.low === undefined) throw errors.missingRequiredProperty('low');
    return h.low;
  });
  const adxArr = ADX.calculate({ period, close, high, low });
  const adx = exports.fill(historic, adxArr.map(e => e.adx), `ADX${period}`);
  const mdi = exports.fill(historic, adxArr.map(e => e.mdi), `MDI${period}`);
  const pdi = exports.fill(historic, adxArr.map(e => e.pdi), `PDI${period}`);
  return historic.map((e, index) => ({ ...adx[index], ...mdi[index], ...pdi[index] }));
};

exports.MFI = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const close = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const high = historic.map(h => {
    if (h.high === undefined) throw errors.missingRequiredProperty('high');
    return h.high;
  });
  const low = historic.map(h => {
    if (h.low === undefined) throw errors.missingRequiredProperty('low');
    return h.low;
  });
  const volume = historic.map(h => {
    if (h.volume === undefined) throw errors.missingRequiredProperty('volume');
    return h.volume;
  });
  const mfi = MFI.calculate({ period, volume, high, low, close });
  return exports.fill(historic, mfi, `MFI${period}`);
};

exports.BB = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const bb = BB.calculate({ period, values, stdDev: 2 });
  const lower = exports.fill(historic, bb.map(b => b.lower), `LOWERBB${period}`);
  const middle = exports.fill(historic, bb.map(b => b.middle), `MIDDLEBB${period}`);
  const upper = exports.fill(historic, bb.map(b => b.upper), `UPPERBB${period}`);
  const pb = exports.fill(historic, bb.map(b => b.pb), `PERCENTB${period}`);
  return historic.map((e, index) => ({ ...lower[index], ...middle[index], ...upper[index], ...pb[index] }));
};

exports.PROC = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const proc = ROC.calculate({ period, values });
  return exports.fill(historic, proc, `PROC${period}`);
};

exports.VROC = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const values = historic.map(h => {
    if (h.volume === undefined) throw errors.missingRequiredProperty('volume');
    return h.volume;
  });
  const vroc = ROC.calculate({ period, values });
  return exports.fill(historic, vroc, `VROC${period}`);
};

exports.KST = historic => {
  const values = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const kstObj = KST.calculate({
    values,
    ROCPer1: 10,
    ROCPer2: 15,
    ROCPer3: 20,
    ROCPer4: 30,
    SMAROCPer1: 10,
    SMAROCPer2: 10,
    SMAROCPer3: 10,
    SMAROCPer4: 15,
    signalPeriod: 3
  });
  const kst = exports.fill(historic, kstObj.map(k => k.kst), 'KST');
  const signal = exports.fill(historic, kstObj.map(k => k.signal), 'KSTSIGNAL');
  return historic.map((e, index) => ({ ...kst[index], ...signal[index] }));
};

exports.STOCH = (historic, period) => {
  if (!period) throw errors.missingRequiredProperty('period');
  const close = historic.map(h => {
    if (h.close === undefined) throw errors.missingRequiredProperty('close');
    return h.close;
  });
  const high = historic.map(h => {
    if (h.high === undefined) throw errors.missingRequiredProperty('high');
    return h.high;
  });
  const low = historic.map(h => {
    if (h.low === undefined) throw errors.missingRequiredProperty('low');
    return h.low;
  });
  const stoch = STOCH.calculate({ high, low, close, period, signalPeriod: 3 });
  const pk = exports.fill(historic, stoch.map(s => s.k), `STOCHK${period}`);
  const pd = exports.fill(historic, stoch.map(s => s.d || 0), `STOCHD${period}`);
  return historic.map((e, index) => ({ ...pk[index], ...pd[index] }));
};

exports.VWAP = historic => {
  return historic.map((h, index) => {
    const TIME = 55;
    if (!historic[index - TIME]) return { ...h, VWAP: h.EMA8 };
    const timeframe = historic.slice(index - TIME, index + 1);
    const close = timeframe.map(t => {
      if (t.close === undefined) throw errors.missingRequiredProperty('close');
      return t.close;
    });
    const high = timeframe.map(t => {
      if (t.high === undefined) throw errors.missingRequiredProperty('high');
      return t.high;
    });
    const low = timeframe.map(t => {
      if (t.low === undefined) throw errors.missingRequiredProperty('low');
      return t.low;
    });
    const volume = timeframe.map(t => {
      if (t.volume === undefined) throw errors.missingRequiredProperty('volume');
      return t.volume;
    });
    const vwap = VWAP.calculate({ high, low, volume, close });
    return { ...h, VWAP: vwap[vwap.length - 1] };
  });
};

exports.VO = historic => {
  const volume = historic.map(h => {
    if (h.volume === undefined) throw errors.missingRequiredProperty('volume');
    return h.volume;
  });
  const shortSma = exports.fill([...historic], EMA.calculate({ values: volume, period: 5 }), 'SHORTSMA');
  const longSma = exports.fill([...historic], EMA.calculate({ values: volume, period: 10 }), 'LONGSMA');
  return historic.map((h, index) => {
    if (shortSma[index].SHORTSMA === 0 || longSma[index].LONGSMA === 0) {
      return { VO: 0 };
    } else {
      return {
        VO: ((shortSma[index].SHORTSMA - longSma[index].LONGSMA) / longSma[index].LONGSMA) * 100
      };
    }
  });
};

exports.AO = historic => {
  const high = historic.map(h => {
    if (h.high === undefined) throw errors.missingRequiredProperty('high');
    return h.high;
  });
  const low = historic.map(h => {
    if (h.low === undefined) throw errors.missingRequiredProperty('low');
    return h.low;
  });
  const ao = AO.calculate({ high, low, fastPeriod: 5, slowPeriod: 34 });
  return exports.fill(historic, ao, 'AO');
};

exports.PSAR = historic => {
  const high = historic.map(h => {
    if (h.high === undefined) throw errors.missingRequiredProperty('high');
    return h.high;
  });
  const low = historic.map(h => {
    if (h.low === undefined) throw errors.missingRequiredProperty('low');
    return h.low;
  });
  const psar = PSAR.calculate({ high, low, step: 0.02, max: 0.02 });
  return exports.fill(historic, psar, 'PSAR');
};

exports.HEIKINASHICANDLE = historic => {
  const volume = historic.map(h => h.volume);
  const open = historic.map(h => h.open);
  const high = historic.map(h => h.high);
  const low = historic.map(h => h.low);
  const close = historic.map(h => h.close);
  const chart = HeikinAshi.calculate({ close, low, open, high, volume });
  return historic.map((h, index) => {
    return {
      ...h,
      HEIKINCANDLE: chart.close[index] >= chart.open[index] ? 'GREEN' : 'RED'
    };
  });
};
