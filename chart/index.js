const http = require('http'),
  socketio = require('socket.io'),
  plotly = require('plotly')('igna92ts', 'RN0DdzqHUxNglJiMPRgr'),
  fs = require('fs');

exports.setGraphingServer = () => {
  return new Promise((resolve, reject) => {
    // const handler = (req, res) => {
    //   fs.readFile(`${__dirname}/fronend/index.html`, (err, data) => {
    //     res.writeHead(200);
    //     return res.end(data);
    //   });
    // };
    const app = http.createServer();
    app.listen(8080);
    const io = socketio(app);

    return resolve(tick => {
      io.emit('data', tick);
    });
  });
};

exports.lineGraph = (fileName = 'line', dataSets) => {
  const traces = dataSets.map(d => {
    const { name, values, mode, dates } = d;
    return {
      x: dates || values.map((v, index) => index),
      y: values,
      mode: mode || 'lines',
      name
    };
  });
  const imgOptions = {
    format: 'png',
    width: 3000,
    height: 2000
  };
  const figure = { data: traces };
  plotly.getImage(figure, imgOptions, (error, imageStream) => {
    if (error) console.log(error);
    const fileStream = fs.createWriteStream(`${fileName}.png`);
    imageStream.pipe(fileStream);
  });
};

exports.graphToImg = (kLineArr, fileName = 'plot') => {
  const dates = kLineArr.map(k => new Date(k.id));
  const traces = [
    {
      x: dates,
      y: kLineArr.map(k => k.close),
      line: { color: '#000000' },
      mode: 'lines',
      name: 'PRICE'
    },
    {
      x: dates,
      y: kLineArr.map(k => k.SMA55),
      line: { color: '#0000FF' },
      mode: 'lines',
      name: 'SMA55'
    },
    {
      x: dates,
      y: kLineArr.map(k => k.SMA233),
      line: { color: '#00FF00' },
      mode: 'lines',
      name: 'SMA233'
    },
    {
      x: kLineArr.filter(k => k.action && k.action === 'BUY').map(k => new Date(k.id)),
      y: kLineArr.filter(k => k.action && k.action === 'BUY').map(k => k.close),
      mode: 'markers',
      name: 'BUY',
      marker: { color: '#00FF00' }
    },
    {
      x: kLineArr.filter(k => k.action && k.action === 'SELL').map(k => new Date(k.id)),
      y: kLineArr.filter(k => k.action && k.action === 'SELL').map(k => k.close),
      mode: 'markers',
      name: 'SELL',
      marker: { color: '#FF0000' }
    },
    {
      x: dates,
      y: kLineArr.map(k => k.PSAR),
      mode: 'markers',
      name: 'PSAR',
      marker: { color: '#000000' }
    },
    // {
    //   x: kLineArr.filter(k => k.action && k.action === 'NOTHING').map(k => new Date(k.id)),
    //   y: kLineArr.filter(k => k.action && k.action === 'NOTHING').map(k => k.price),
    //   mode: 'markers',
    //   name: 'NOTHING',
    //   marker: { color: '#000000' }
    // },
    // {
    //   x: dates,
    //   y: kLineArr.map(k => k.STOCHRSI.percentK),
    //   mode: 'lines',
    //   name: 'K',
    //   line: { color: '#0000FF' },
    //   xaxis: 'x2',
    //   yaxis: 'y2'
    // },
    // {
    //   x: dates,
    //   y: kLineArr.map(k => k.STOCHRSI.percentD),
    //   mode: 'lines',
    //   name: 'D',
    //   line: { color: '#00FF00' },
    //   xaxis: 'x2',
    //   yaxis: 'y2'
    // },
    {
      x: dates,
      y: kLineArr.map(k => k.RSI14),
      mode: 'lines',
      name: 'RSI14',
      line: { color: '#00FF00' },
      xaxis: 'x3',
      yaxis: 'y3'
    },
    {
      x: dates,
      y: kLineArr.map(k => k.certainty),
      mode: 'lines',
      name: 'BAYES',
      line: { color: '#FF0000' },
      xaxis: 'x2',
      yaxis: 'y2'
    }
  ];
  const layout = {
    yaxis: { domain: [0, 0.266] },
    legend: { traceorder: 'reversed' },
    xaxis3: { anchor: 'y3' },
    xaxis2: { anchor: 'y2' },
    yaxis2: { domain: [0.366, 0.633] },
    yaxis3: { domain: [0.733, 1] }
  };
  const figure = { data: traces, layout };
  const imgOptions = {
    format: 'png',
    width: 3000,
    height: 2000
  };
  plotly.getImage(figure, imgOptions, (error, imageStream) => {
    if (error) console.log(error);
    const fileStream = fs.createWriteStream(`${fileName}.png`);
    imageStream.pipe(fileStream);
  });
};
