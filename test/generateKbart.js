const should = require('should');
const generateKbart = require('../src/tasks/generateKbart');
const { generateHoldings } = require('../src/tasks');

const logEmitter = {
  emit: function () { console.info(arguments); },
};
describe('generateKbart()', function () {
  it.only('Should write a Kbart file', function () {
    this.timeout(30000);
    return generateKbart.call(logEmitter, { corpusBlackList: ['ecco', 'eebo', 'eeb2'], doWarn: true, force: true, parallel: 5 });
  });
});

describe('generateHoldings()', function () {
  it('Should write a Kbart file', function () {
    this.timeout(30000);
    return generateHoldings.call(logEmitter, { corpusBlackList: ['ecco', 'eebo', 'eeb2'], doWarn: true, force: true, parallel: 5 });
  });
});
