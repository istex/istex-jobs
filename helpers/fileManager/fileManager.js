const fs = require('fs-extra');
const { join } = require('path');

const KBART_FILE = 'kbart.json';
const REVIEW_FILE = 'review.json';

module.exports.getExchangeLastGenerationDate = getExchangeLastGenerationDate;
module.exports.saveExchangeLastGenerationDate = saveExchangeLastGenerationDate;
module.exports.getReviewLastDocCount = getReviewLastDocCount;
module.exports.saveReviewLastDocCount = saveReviewLastDocCount;

function getExchangeLastGenerationDate (path = './') {
  return new Promise((resolve, reject) => {
    fs.readJson(join(path, KBART_FILE))
      .then(({ lastGenerationDate }) => resolve(lastGenerationDate))
      .catch((reason) => {
        if (reason.code === 'ENOENT') return resolve(0);
        reject(reason);
      })
    ;
  });
}

function saveExchangeLastGenerationDate (path = './') {
  return fs.outputJson(join(path, KBART_FILE), { lastGenerationDate: Date.now() });
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
