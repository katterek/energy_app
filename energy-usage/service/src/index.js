const Koa = require('koa');
const KoaRouter = require('koa-router');
const data = require('./data');

const PORT = process.env.PORT || 3000;

/**
   * Check whether the meter reading has been
   * passed in the correct format
   * @param {Object} meterReading
   */
function verifyMeterReadingFormat(meterReading) {
  // This is just an example of simple format verification.
  // Naturally, real-life use case should be more comprehensive.

  const keys = ['cumulative', 'reading_date', 'unit'];
  const meterReadingKeys = (Object.keys(meterReading));
  const result = {
    value: true,
    message: 'Format validation passed.',
  };
  if ((meterReadingKeys[0] !== keys[0]) ||
      (meterReadingKeys[1] !== keys[1]) ||
      (meterReadingKeys[2] !== keys[2])) {
    result.value = false;
    result.message = 'Incorrect parameters';
  } else if (meterReading.cumulative < 0) {
    result.value = false;
    result.message = 'Cumulative Value is negative or Not a Number';
  } else if (Date.parse(meterReading.reading_date) < 0) {
    result.value = false;
    result.message = 'Incorrect Date formatting';
  } else if (meterReading.unit !== 'kWh') {
    result.value = false;
    result.message = 'Incorrect Meter Reading Unit';
  }
  console.log(result.message);
  return result;
}

function createServer() {
  console.log('CreateServer called');
  const server = new Koa();
  const router = new KoaRouter();

  router.get('/getMeterReading', async (ctx) => {
    const meterData = await data.getAllMeterReadings()
      .then(result => result)
      .catch(error => `Could not retrieve meter readings from the database: ${error}`);
    ctx.body = meterData;
  })
    .get('/estimateMeterReadings', async (ctx) => {
      const meterData = await data.getAllMeterReadings()
        .then(result => data.estimateMonthlyMeterReadings(result))
        .then(result => result)
        .catch(error => `Could not retrieve meter readings from the database: ${error}`);
      ctx.body = meterData;
    })
    .get('/calculateMeterReadings', async (ctx) => {
      const meterData = await data.getAllMeterReadings()
        .then(result => data.calculateMonthlyMeterReadings(result))
        .then(result => result)
        .catch(error => `Could not retrieve meter readings from the database: ${error}`);
      ctx.body = meterData;
    })
    .post('/setMeterReading', async (ctx) => {
      const newMeterReading = ctx.request.query;
      const validation = verifyMeterReadingFormat(newMeterReading);
      console.log(`Validation result: ${validation.value}`);
      if (validation.value) {
        const meterData = await data.setNewMeterReadings(newMeterReading).then((result) => {
          console.log(result.message);
          if (result.value) {
            console.log(`${JSON.stringify(newMeterReading)} has been successfully inserted into the database.`);
            return `${JSON.stringify(newMeterReading)} has been successfully inserted into the database.`;
          }
          console.log(`Failure to insert the reading into the database: ${result.message}`);
          return `Failure to insert the reading into the database: ${result.message}`;
        }).catch((error) => {
          console.log(`Error: Could not insert new meter readings to the database: ${error.message}`);
          return `Error: Could not insert new meter readings to the database: ${error.message}`;
        });
        ctx.body = meterData;
      } else {
        console.log(`Provided Meter Reading format is corrupted: ${validation.message}`);
        ctx.body = `Provided Meter Reading format is corrupted: ${validation.message}`;
      }
    });
  server.use(router.allowedMethods());
  server.use(router.routes());

  return server;
}

module.exports = createServer;

if (!module.parent) {
  data.initialize();
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
  });
}
