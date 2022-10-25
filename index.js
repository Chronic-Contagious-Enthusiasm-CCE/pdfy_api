var express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser');
var validUrl = require('valid-url');
const cors = require('cors')
var corsOptions = {
  origin: true,
  optionsSuccessStatus: 200,
};

app = express()
app.use(bodyParser.json());
if(process.env.DEBUG) app.use(cors())
else app.use(cors(corsOptions))

port = process.env.PORT || 3000;
app.listen(port);

app.post('/render', function (req, res, next) {
  let url = req.body.url
  let format = req.body.format || 'A4'
  let landscape = req.body.landscape || false
  let headersDict = req.body.headers || {}

  if (!validUrl.isUri(url)) {
    return res.status(400).send("url parameter must be a valid url");
  }

  let allowedFormats = ['A4', 'A3']
  if (allowedFormats.indexOf(format) == -1) {
    return res.status(400).send("Allowed formats: 'A4', 'A3', 'A4 Landscape', 'A3 Landscape'");
  }

  printPDF(url, format, landscape, headersDict).then(pdf => {
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
    res.send(pdf)
  }).catch(e => {
    res.status(500).send("Could not print the page")
    next(e)
  })
});

async function printPDF(url, format, landscape, headersDict) {
  let scale = 0.59 // if scale is 0.6 or higher it would only print the 1st page in A4 portrait. reasons are unnknown
  viewPorts = {
    'A4': { width: 790, height: 560 },
    'A3': { width: 1120, height: 790 },
  }
  let viewPort = viewPorts[format]
  if (landscape){
    viewPort.width = parseInt(viewPort.width * 1.414)
    viewPort.height = parseInt(viewPort.height * 1.414)
  } 
  viewPort.width = parseInt(viewPort.width / scale)
  viewPort.height = parseInt(viewPort.height / scale)
  console.log(viewPort)
  let browserArgs = ['--no-sandbox', '--disable-setuid-sandbox']
  const browser = await puppeteer.launch({
    args: browserArgs,
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true)
  page.on('request', (request) => {
    let hostName = (new URL(request.url())).hostname;
    if (headersDict[hostName]) {
      request.continue({
        headers: {
          ...request.headers(),
          ...headersDict[hostName]
        }
      });
    } else {
      request.continue()
    }
  });

  page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('requestfailed', request =>
      console.log(`${request.failure().errorText} ${request.url()}`))

  page.setViewport(viewPort)
  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.addStyleTag(
      { 'content': '@page {size: auto}' }
    )
    const pdf = await page.pdf({ format: format, landscape: landscape, scale: scale });
    await browser.close();
  
    return pdf
  } catch (error){
    browser.close()
    throw error
  }
}
