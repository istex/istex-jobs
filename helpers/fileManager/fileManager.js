const fs = require('fs-extra');
const { join } = require('path');

const EXCHANGE_FILE = 'exchange.json';
const REVIEW_FILE = 'review.json';
const LATEST_FILE = 'latest.json';

module.exports.getExchangeLastGenerationDate = getExchangeLastGenerationDate;
module.exports.saveExchangeLastGenerationDate = saveExchangeLastGenerationDate;
module.exports.getReviewLastDocCount = getReviewLastDocCount;
module.exports.saveReviewLastDocCount = saveReviewLastDocCount;
module.exports.createKbartReferenceFile = createKbartReferenceFile;

function getExchangeLastGenerationDate (path = './') {
  return new Promise((resolve, reject) => {
    fs.readJson(join(path, EXCHANGE_FILE))
      .then(({ lastGenerationDate }) => resolve(lastGenerationDate))
      .catch((reason) => {
        if (reason.code === 'ENOENT') return resolve(0);
        reject(reason);
      })
    ;
  });
}

function saveExchangeLastGenerationDate (path = './') {
  return fs.outputJson(join(path, EXCHANGE_FILE), { lastGenerationDate: Date.now() });
}

function getReviewLastDocCount (path = './') {
  return new Promise((resolve, reject) => {
    fs.readJson(join(path, REVIEW_FILE))
      .then(({ lastDocCount }) => resolve(lastDocCount))
      .catch((reason) => {
        if (reason.code === 'ENOENT') return resolve(0);
        reject(reason);
      });
  });
}

function saveReviewLastDocCount (lastDocCount = 0, path = './') {
  return fs.outputJson(join(path, REVIEW_FILE), { lastDocCount });
}

function createKbartReferenceFile (latestKbartFilename, path) {
  return fs.copy(join(path, latestKbartFilename), join(path, 'latest.txt'))
    .then(() => fs.outputJson(join(path, LATEST_FILE), { latestKbartFilename }));
}
