const { exchange } = require('@istex/config-component').get(module);
const { getExchangeLastGenerationDate, getReviewLastDocCount } = require('../helpers/fileManager/fileManager');
const { getCorpusLastUpdate } = require('../helpers/apiManager/apiManager');
const { getReviewLastUpdate, count } = require('../helpers/reviewManager/reviewManager');

module.exports = async function isExchangeGenerationNeeded ({
  outputPath = exchange.outputPath,
  apiBaseUrl,
  reviewBaseUrl,
} = {}) {
  return Promise.all([
    getExchangeLastGenerationDate(outputPath),
    getCorpusLastUpdate({ apiBaseUrl }),
    getReviewLastUpdate({ reviewBaseUrl }),
    count({ reviewBaseUrl }),
    getReviewLastDocCount(outputPath),
  ])
    .then(([
      exchangeLastGenerationDate,
      apiLastUpdate,
      reviewLastUpdate,
      reviewDocCount,
      reviewLastDocCount,
    ] = []) => {
      if (exchangeLastGenerationDate < apiLastUpdate ||
          exchangeLastGenerationDate < reviewLastUpdate ||
          reviewLastDocCount !== reviewDocCount
      ) {
        return true;
      }

      return false;
    });
};
