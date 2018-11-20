const { expect } = require('chai');

const data = require('./data');
const sampleData = require('../sampleData.json');

describe('data', () => {
  it('initialize should import the data from the sampleData file', (done) => {
    data.initialize();

    data.connection.serialize(() => {
      data.connection.all('SELECT * FROM meter_reads ORDER BY cumulative', (error, selectResult) => {
        expect(error).to.be.null;
        expect(selectResult).to.have.length(sampleData.electricity.length);
        selectResult.forEach((row, index) => {
          expect(row.cumulative).to.equal(sampleData.electricity[index].cumulative);
        });
        done();
      });
    });
  });

  it('get all meter readings', (done) => {
    let meterData = data.getAllMeterReadings().then((result) => result);
    let i = 0;
    for (i = 1; i < meterData.length; i += 1){
      expect(meterData.length[i]).to.equal(sampleData.electricity[i]);
    }
    done();
  });
});

