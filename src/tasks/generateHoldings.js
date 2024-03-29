const { exchange, toXmlHoldings, writeXmlHoldings, buildInstitutionalLinks } = require('@istex/istex-exchange');
const { corpusType } = require('../../helpers/reviewModel');
const isExchangeGenerationNeeded = require('../isExchangeGenerationNeeded');
const { paginatedFindDocumentsBy, count, getCorpuses } = require('../../helpers/reviewManager/reviewManager');
const { saveExchangeLastGenerationDate, saveReviewLastDocCount } = require('../../helpers/fileManager/fileManager');
const { exchange: { outputPath: defaultOutputPath }, istex, tasks } = require('@istex/config-component').get(module);
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const { PromisePool } = require('@supercharge/promise-pool');
/**
 * Task to generate all title institutional holdings and links files
 * @param {string} reviewBaseUrl Url of the data review
 * @param {string} apiBaseUrl Url of istex API
 * @param {number} concurency Number of concurent Corpus processed AKA number of concurent request to ISTEX review.
 * @param {number} parallel Number of parallel request to ISTEX API. The total number of request is parallel * concurency
 * @param {string} outputPath Path where to store generated files
 * @param {string} titleBaseUrl Url for building the title_url value, may be handy if reviewBaseUrl is different than titleBaseUrl
 * @param {Array.<string>} contacts contacts emails listed in the institutional_links file
 * @param {boolean} force Does the task must run even if not needed
 * @param {boolean} doWarn Does Exchange warn about failed request
 * @returns {Promise<TResult1>}
 */
module.exports = async function generateHoldings ({
  titleBaseUrl = istex.review.url,
  contacts = [],
  corpusBlackList = tasks.generateHoldings.corpusBlackList ?? [],
  reviewBaseUrl = istex.review.url,
  apiBaseUrl = istex.api.url,
  concurency = 2,
  parallel = 7,
  outputPath = defaultOutputPath,
  force = false,
  doWarn = false,
} = {}) {
  const holdingsOutputPath = path.join(outputPath, 'holdings');
  const tmpOutputPath = path.join(outputPath, 'tmp', 'holdings');

  if (!await isExchangeGenerationNeeded({ outputPath: holdingsOutputPath, apiBaseUrl, reviewBaseUrl }) && !force) {
    this?.emit?.('abort', 'There is no new data since the last job run.');
    return;
  }
  const corpuses = await getCorpuses({ reviewBaseUrl });
  const corpusNames = _(corpuses).keys().without(...corpusBlackList).value();

  if (corpusNames.length === 0) {
    this?.emit?.('abort', 'No corpus selected.');
    return;
  }

  await fs.emptydir(tmpOutputPath);

  return await PromisePool
    .for(corpusNames)
    .withConcurrency(concurency)
    .handleError(async (error, i, pool) => {
      pool.hasError = true;
      throw error;
    })
    .process(async (corpusName, index, pool) => {
      return await _generateAndWriteHoldings.call(
        this,
        corpusName,
        { titleBaseUrl, reviewBaseUrl, apiBaseUrl, parallel, outputPath: tmpOutputPath, doWarn, pool },
      );
    })
    .then(() => {
      return fs.readdir(tmpOutputPath)
        .then((files) => {
          const holdingsFiles = _.chain(files)
            .filter((file) => file.startsWith('institutional_holdings'))
            .value()
          ;
          const xml = buildInstitutionalLinks({ contacts, holdingsFiles });

          return fs.outputFile(
            path.join(tmpOutputPath, tasks.generateHoldings.institutionalLinksPath),
            xml,
            { flag: 'w', encoding: 'utf-8' },
          );
        });
    })
    .then(() => {
      return saveExchangeLastGenerationDate(tmpOutputPath)
        .then(() => count({ reviewBaseUrl }))
        .then((totalCount) => saveReviewLastDocCount(totalCount, tmpOutputPath))
        .then(async () => {
          await fs.emptydir(holdingsOutputPath);
          await fs.copy(tmpOutputPath, holdingsOutputPath);
        });
    });
};

function _generateAndWriteHoldings (corpus, {
  titleBaseUrl,
  reviewBaseUrl,
  apiBaseUrl,
  parallel,
  outputPath,
  doWarn,
  pool,
} = {}) {
  return count({ corpus, reviewBaseUrl })
    .then((totalCount) => {
      return new Promise((resolve, reject) => {
        if (totalCount === 0) {
          this?.emit?.('abort',
            `No results for corpus: ${corpus}, reviewBaseUrl: ${reviewBaseUrl ?? 'Not specified'}`);
          return resolve();
        }
        return paginatedFindDocumentsBy({ corpus, pageSize: 250, limit: totalCount, reviewBaseUrl })
          .tap(() => { if (pool.hasError === true) { throw new Error('End the stream'); } })
          .through(exchange({ reviewUrl: titleBaseUrl, apiUrl: apiBaseUrl, parallel, doWarn }))
          .through(toXmlHoldings())
          .through(writeXmlHoldings({ corpusName: corpus, type: corpusType[corpus] ?? '', outputPath }))
          .stopOnError(reject)
          .done(resolve);
      });
    });
}
