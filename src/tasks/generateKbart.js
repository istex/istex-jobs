const { exchange, toKbart } = require('@istex/istex-exchange');
const isExchangeGenerationNeeded = require('../isExchangeGenerationNeeded');
const { findDocumentsBy, count } = require('../../helpers/reviewManager/reviewManager');
const { writeKbart } = require('../../helpers/writeKbart');
const { saveExchangeLastGenerationDate, saveReviewLastDocCount } = require('../../helpers/fileManager/fileManager');
const { exchange: { outputPath: exchangeOutputPath } } = require('@istex/config-component').get(module);
const path = require('path');
const EventEmitter = require('events');

module.exports = async function generateKbart ({
  corpus,
  type,
  reviewBaseUrl,
  apiBaseUrl,
  parallel,
  providerName = 'ISTEX',
  collectionName,
  outputPath = exchangeOutputPath,
  force = false,
} = {}) {
  collectionName = collectionName ?? `${corpus ?? 'AllTitle'}${type ? '_' + type : ''}`;
  outputPath = path.join(outputPath, 'kbart', `${providerName}_${collectionName}`);
  if (!await isExchangeGenerationNeeded({ outputPath, apiBaseUrl, reviewBaseUrl }) && !force) {
    if (this instanceof EventEmitter) this.emit('runNotNeeded');
    return;
  }

  return count({ corpus, type, reviewBaseUrl })
    .then((totalCount) => {
      return new Promise((resolve, reject) => {
        return findDocumentsBy({ corpus, type, maxSize: totalCount, reviewBaseUrl })
          .through(exchange({ reviewUrl: reviewBaseUrl, apiUrl: apiBaseUrl, parallel, doWarn: true }))
          .through(toKbart())
          .through(writeKbart({ providerName, collectionName, outputPath }))
          .stopOnError(reject)
          .done(() => {
            saveExchangeLastGenerationDate(outputPath)
              .then(() => count({ reviewBaseUrl }))
              .then((totalCount) => saveReviewLastDocCount(totalCount, outputPath))
              .then(resolve)
              .catch(reject);
          });
      });
    });
};
