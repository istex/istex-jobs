'use strict';

const apiClient = require('./apiClient').getApiClient();
const { istex, app } = require('@istex/config-component').get(module);
const { URL, URLSearchParams } = require('url');
const { omitBy, isNil, chain } = require('lodash');
const hl = require('highland');

module.exports.findDocumentsBy = findDocumentsBy;
module.exports.findCorpus = findCorpus;
module.exports.getCorpusLastUpdate = getCorpusLastUpdate;

function findDocumentsBy ({ apiBaseUrl = istex.api.url, apiQuery = '*', size, output, facet } = {}) {
  const istexApiUrl = new URL('document', apiBaseUrl);
  istexApiUrl.search = new URLSearchParams(omitBy({
    q: apiQuery,
    size,
    output,
    facet,
    sid: app.sid,
  }, isNil));

  return hl(apiClient.get(istexApiUrl).json());
}

function findCorpus ({ apiBaseUrl = istex.api.url } = {}) {
  const istexApiUrl = new URL('corpus', apiBaseUrl);
  return apiClient.get(istexApiUrl).json();
}

function getCorpusLastUpdate ({ apiBaseUrl = istex.api.url } = {}) {
  return findCorpus({ apiBaseUrl })
    .then((corpora) => {
      return chain(corpora)
        .filter('lastUpdate')
        .sortBy('lastUpdate')
        .last()
        .get('lastUpdate', 0)
        .value();
    });
}
