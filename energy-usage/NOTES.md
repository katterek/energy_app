Candidate Name: Kat Terek

Tasks: 2 and 3

Notes:
I created endpoints for each of the requests.
.get for /getMeterReading, /estimateMeterReadings and /calculateMeterReadings
and .post for /setMeterReading.

/setMeterReading requires following parameters cumulative, reading_date and unit

I added verifyMeterReadingFormat function to make sure that the formatting of
the data sent through post will not break the data base. The formatting check
is pretty basic, naturally it could be more comprehensive, but that's just an
example.

For handling database requests I created the following functions:
getAllMeterReadings, setNewMeterReadings, estimateMonthlyMeterReadings, 
calculateMonthlyMeterReadings and linearInterpolation

getAllMeterReadings - is asynchronously fetching the entries in the database and it resolves the 
    promise with the database object or rejects it, if there's an error. This function takes no
    parameters and it's called from /getMeterReading end point as well as it is used to prefetch data 
    for the other funtions like setNewMeterReadings, estimateMonthlyMeterReadings and
    calculateMonthlyMeterReadings

setNewMeterReadings - is called from /setMeterReading and expects an Object containg following values
    cumulative, reading_date and unit. The function is expecting the formatting to be in validated.
    It first asynchronously enters those values into the database and then asynchronously checks 
    if the last entry in the database is equal to the new entry we just attempted to set-up.
    THe promise resolves with true and the success message if the operation was successful or
    rejects with false and an error message.

estimateMonthlyMeterReadings - is called from /estimateMeterReadings and takes meterReadings as a
    parameter, which is earlier retrieved with getAllMeterReadings. It takes two nearest readings
    and based on those two, calculates an estimated monthly usage value for every entry in the
    database apart from the first and the last one. It returns an object containing estimated
    monthly usages, for a each month of the year in the database with exception for the first and
    the last.

linearInterpolation - is a helper function which calculates a value based on the surrounding values.

calculateMonthlyMeterReadings - is called by /estimateMeterReadings and takes meterReadings as a
    parameter, which is earlier retrieved with getAllMeterReadings. It uses linear interpolation
    to estimate the readings at the end of the month. It creates an Object containing the estimated
    readings for each end of the month date. Then it feeds those meter readings to 
    estimateMonthlyMeterReadings and returns the estimates based on the end of the of the month 
    reading. The function returns those values as an object containing estimated monthly usages, 
    for a each month of the year in the database with exception for the first and the last. 

    PS. Sorry, I didn't have time to do the full test coverage, I've dont one quick test for 
    'get all meter readings' in data unit testing file to show you at least some example that 
    I know what unit tests are and how to write test cases.