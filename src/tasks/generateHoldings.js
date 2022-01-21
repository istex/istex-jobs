const { exchange, toXmlHoldings, writeXmlHoldings } = require('@istex/istex-exchange');
const { corpusTypes } = require('./reviewModel');
const isExchangeGenerationNeeded = require('../isExchangeGenerationNeeded');
const { findDocumentsBy, count } = require('../../helpers/reviewManager/reviewManager');
const { saveExchangeLastGenerationDate, saveReviewLastDocCount } = require('../../helpers/fileManager/fileManager');
const { exchange: { outputPath: defaultOutputPath } } = require('@istex/config-component').get(module);
const path = require('path');
const _ = require('lodash');

module.exports = async function generateHoldings ({
  reviewBaseUrl,
  apiBaseUrl,
  parallel = 2, // we need to limit the parallel coz all findCorpus are launch at the same time
  outputPath = defaultOutputPath,
  force = false,
} = {}) {
  outputPath = path.join(outputPath, 'holdings');
  if (!await isExchangeGenerationNeeded({ outputPath, apiBaseUrl, reviewBaseUrl }) && !force) {
    this?.emit?.('abort', 'There is no new data since the last job run.');
    return;
  }
  const holdingsPromises = _.chain(corpusTypes)
    .keys()
    .map((corpusName) => findCorpus.call(
      this,
      corpusName,
      { reviewBaseUrl, apiBaseUrl, parallel, outputPath, doWarn: true },
    ),
    )
    .value();

  return Promise
    .allSettled(holdingsPromises)
    .then(() => {
      return saveExchangeLastGenerationDate(outputPath)
        .then(() => count({ reviewBaseUrl }))
        .then((totalCount) => saveReviewLastDocCount(totalCount, outputPath));
    });
};

function findCorpus (corpus, { reviewBaseUrl, apiBaseUrl, parallel, outputPath, doWarn } = {}) {
  return count({ corpus, reviewBaseUrl })
    .then((totalCount) => {
      return new Promise((resolve, reject) => {
        if (totalCount === 0) {
          this?.emit?.('abort',
            `No results for corpus: ${corpus}, reviewBaseUrl: ${reviewBaseUrl ?? 'Not specified'}`);
          return resolve();
        }
        return findDocumentsBy({ corpus, maxSize: totalCount, reviewBaseUrl })
          .through(exchange({ reviewUrl: reviewBaseUrl, apiUrl: apiBaseUrl, parallel, doWarn }))
          .through(toXmlHoldings())
          .through(writeXmlHoldings({ corpusName: corpus, type: corpusTypes.corpus, outputPath }))
          .stopOnError(reject)
          .done(resolve);
      });
    });
}
