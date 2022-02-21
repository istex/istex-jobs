const { exchange, toKbart } = require('@istex/istex-exchange');
const isExchangeGenerationNeeded = require('../isExchangeGenerationNeeded');
const { findDocumentsBy, count } = require('../../helpers/reviewManager/reviewManager');
const { writeKbart } = require('../../helpers/writeKbart');
const { saveExchangeLastGenerationDate, saveReviewLastDocCount } = require('../../helpers/fileManager/fileManager');
const { exchange: { outputPath: defaultOutputPath }, istex } = require('@istex/config-component').get(module);
const path = require('path');

/**
 * Task that generate KBART file by crossing information from Istex review and Istex API
 * KBART file can be generated one corpus at a time or all corpuses at the same time.
 * @param {string} corpus Filter by corpus name
 * @param {string} type Filter by type serial/monograph
 * @param {string} reviewBaseUrl Base URl of Istex review
 * @param {string} apiBaseUrl Base URl of Istex API
 * @param {number} parallel Number of parallel request to ISTEX API.
 * @param {string} titleBaseUrl Url for building the title_url value, may be handy if reviewBaseUrl is different than titleBaseUrl
 * @param {string} providerName Provider name for the KBART file
 * @param {string} collectionName Collection name for the KBART file
 * @param {string} outputPath Where to generate files
 * @param {boolean} force  Does the task must run even if not needed
 * @param {boolean} doWarn Does Exchange warn about failed request
 * @returns {Promise<*>}
 */
module.exports = async function generateKbart ({
  corpus,
  type,
  reviewBaseUrl = istex.review.url,
  apiBaseUrl = istex.api.url,
  parallel = 15,
  titleBaseUrl = istex.review.url,
  providerName = 'ISTEX',
  collectionName,
  outputPath = defaultOutputPath,
  force = false,
  doWarn = false,
} = {}) {
  collectionName = collectionName ?? `${corpus ?? 'AllTitle'}${type ? '_' + type : ''}`;
  outputPath = path.join(outputPath, 'kbart', `${providerName}_${collectionName}`);

  if (!await isExchangeGenerationNeeded({ outputPath, apiBaseUrl, reviewBaseUrl }) && !force) {
    this?.emit?.('abort', `There is no new data since the last job run for: ${collectionName}`);
    return;
  }

  return await count({ corpus, type, reviewBaseUrl })
    .then((totalCount) => {
      return new Promise((resolve, reject) => {
        if (totalCount === 0) {
          this?.emit?.('abort',
            `No results for corpus: ${corpus}, reviewBaseUrl: ${reviewBaseUrl ?? 'Not specified'}`);
          return resolve();
        }
        return findDocumentsBy({ corpus, type, maxSize: totalCount, reviewBaseUrl })
          .through(exchange({ reviewUrl: titleBaseUrl, apiUrl: apiBaseUrl, parallel, doWarn }))
          .through(toKbart())
          .through(writeKbart({ providerName, collectionName, outputPath }))
          .stopOnError(reject)
          .done(resolve);
      });
    }).then(() => {
      return saveExchangeLastGenerationDate(outputPath)
        .then(() => count({ reviewBaseUrl }))
        .then((totalCount) => saveReviewLastDocCount(totalCount, outputPath));
    });
};
