const should = require('should');
const generateKbart = require('../src/tasks/generateKbart');
const { generateHoldings } = require('../src/tasks');

const logEmitter = {
  emit: function () { console.info(arguments); },
};
describe('generateKbart()', function () {
  it('Should write a Kbart file', function () {
    this.timeout(30000);
    return generateKbart({ corpus: 'bmj' });
  });
});

describe.only('generateHoldings()', function () {
  it('Should write a Kbart file', function () {
    this.timeout(30000);
    return generateHoldings.call(logEmitter, { force: false });
  });
});
