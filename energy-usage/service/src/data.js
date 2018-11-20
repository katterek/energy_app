const sqlite3 = require('sqlite3').verbose();
const sampleData = require('../sampleData.json');
const moment = require('moment');

const connection = new sqlite3.Database(':memory:');

/**
 * Imports the data from the sampleData.json file into a `meter_reads` table.
 * The table contains three columns - cumulative, reading_date and unit.
 *
 * An example query to get all meter reads,
 *   connection.all('SELECT * FROM meter_reads', (error, data) => console.log(data));
 *
 * Note, it is an in-memory database, so the data will be reset when the
 * server restarts.
 */
function initialize() {
  connection.serialize(() => {
    connection.run('CREATE TABLE meter_reads (cumulative INTEGER, reading_date TEXT, unit TEXT)');

    const { electricity } = sampleData;
    electricity.forEach((data) => {
      connection.run(
        'INSERT INTO meter_reads (cumulative, reading_date, unit) VALUES (?, ?, ?)',
        [data.cumulative, data.readingDate, data.unit],
      );
    });
  });
}

/**
   * returns all the meter readings
   * @param
   */
async function getAllMeterReadings() {
  return new Promise(((resolve, reject) => {
    console.log('getAllMeterReadings() called');
    connection.all(
      'SELECT * FROM meter_reads',
      (error, data) => {
        if (data) {
          console.log('Fetching meter readings has been successful');
          console.log('Resolving');
          resolve(data);
        } else {
          console.log('Rejecting');
          reject(error);
        }
      },
    );
  }));
}
/**
   * Set new meter readings in the database.
   * Ignore the time part.
   * @param {Object} newMeterReadings
   */
async function setNewMeterReadings(newMeterReadings) {
  return new Promise(((resolve, reject) => {
    const result = {
      value: true,
      message: '',
    };
    console.log('setNewMeterReadings() called');
    console.log(`New Meter Readings: ${JSON.stringify(newMeterReadings)}`);
    connection.run(
      'INSERT INTO meter_reads (cumulative, reading_date, unit) VALUES (?, ?, ?)',
      [newMeterReadings.cumulative, newMeterReadings.reading_date, newMeterReadings.unit],
    );
    connection.all(
      'SELECT * FROM meter_reads',
      (error, data) => {
        if (data) {
          // checking if the last value in the updated dataset is actually the inserted value
          if (data[(data.length) - 1][0] === newMeterReadings[0]
              && data[(data.length) - 1][1] === newMeterReadings[1]
              && data[(data.length) - 1][2] === newMeterReadings[2]) {
            result.message = 'Inserting new meter readings has been successful';
            result.value = true;
          } else {
            result.message = `Inserting new readings has not been successful: ${error}`;
            result.value = false;
          }
          resolve(result);
        } else {
          result.value = false;
          result.message = error;
          reject(result);
        }
      },
    );
  }));
}
/**
   * Returns the difference between two moment objects in number of days.
   * @param {moment} mmt1
   * @param {moment} mm2
   */
function getDiffInDays(mmt1, mm2) {
  return mmt1.diff(mm2, 'days');
}

/**
   * Return the number of days between the given moment object
   * and the end of the month of this moment object.
   * @param {moment} mmt
   */
function getDaysUntilMonthEnd(mmt) {
  return getDiffInDays(moment.utc(mmt).endOf('month'), mmt);
}
/**
   * Return estimated monthly usage based on
   * the two nearest energy meter readings.
   * @param {Object} meterReadings
   */
function estimateMonthlyMeterReadings(meterReadings) {
  console.log('estimateMonthlyMeterReadings() called');
  const monthlyUsageArray = new Array(Object.keys(meterReadings).length);
  let readingDate;
  let timeDifference;
  let i;
  for (i = 1; i < monthlyUsageArray.length - 1; i += 1) {
    monthlyUsageArray[i] = {};
    readingDate = new Date(meterReadings[i].reading_date);
    monthlyUsageArray[i].month = readingDate.getMonth();
    monthlyUsageArray[i].year = readingDate.getFullYear();
    // I don't think splitting this line is going to be readable
    // or making variable names shorter will be helpful but that's
    // what your lint wants me to do
    timeDifference = new moment.duration(new Date(meterReadings[i + 1].reading_date)
        - new Date(meterReadings[i - 1].reading_date))
      .asDays();

    monthlyUsageArray[i].monthlyElectricity =
    ((meterReadings[i + 1].cumulative - meterReadings[i - 1].cumulative) / timeDifference) * 31;
    monthlyUsageArray[i].monthlyElectricity = parseInt(monthlyUsageArray[i].monthlyElectricity, 10);
  }
  return monthlyUsageArray;
}
/**
   * Return the number of days between the given moment object
   * and the end of the month of this moment object.
   * @param {moment} x1
   * @param {moment} y1
   * @param {moment} x2
   * @param {moment} x3
   * @param {moment} y3
   */
function linearInterpolation(x1, y1, x2, x3, y3) {
  const y2 = (((x2 - x1) * (y3 - y1)) / (x3 - x1)) + y1;
  return y2;
}
/**
   * Return calculated monthly usage based on
   * the interpolated difference between the
   * end of the month readings.
   * @param {Object} meterReadings
   */
function calculateMonthlyMeterReadings(meterReadings) {
  console.log('calculateMonthlyMeterReadings() called');
  const monthlyUsageArray = new Array(Object.keys(meterReadings).length);
  let date1;
  let reading1;
  let date2;
  let reading2;
  let date3;
  let reading3;
  let i;
  for (i = 1; i < monthlyUsageArray.length - 1; i = +1) {
    monthlyUsageArray[i] = {};
    date1 = new moment(new Date(meterReadings[i].reading_date));
    date2 = date1 + getDaysUntilMonthEnd(date1);
    date3 = new moment(new Date(meterReadings[i + 1].reading_date));

    reading1 = meterReadings[i].cumulative;
    reading3 = meterReadings[i + 1].cumulative;

    reading2 = parseInt(linearInterpolation(date1, reading1, date2, date3, reading3), 10);

    monthlyUsageArray[i].reading_date = date2;
    monthlyUsageArray[i].cumulative = reading2;
    monthlyUsageArray[i].unit = 'kWh';
  }
  console.log('Finished the loop');
  monthlyUsageArray[0] = {};
  monthlyUsageArray[0].reading_date = monthlyUsageArray[1].reading_date;
  monthlyUsageArray[0].cumulative = monthlyUsageArray[1].cumulative;
  monthlyUsageArray[0].unit = 'kWh';

  monthlyUsageArray[monthlyUsageArray.length - 1] = {};

  monthlyUsageArray[monthlyUsageArray.length - 1].reading_date =
  monthlyUsageArray[monthlyUsageArray.length - 2].reading_date;

  monthlyUsageArray[monthlyUsageArray.length - 1].cumulative =
  monthlyUsageArray[monthlyUsageArray.length - 2].cumulative;

  monthlyUsageArray[monthlyUsageArray.length - 1].unit = 'kWh';

  console.log(monthlyUsageArray);
  return estimateMonthlyMeterReadings(monthlyUsageArray);
}

module.exports = {
  initialize,
  connection,
  getAllMeterReadings,
  setNewMeterReadings,
  estimateMonthlyMeterReadings,
  calculateMonthlyMeterReadings,
};
