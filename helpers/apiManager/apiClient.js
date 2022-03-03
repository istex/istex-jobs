const { istex } = require('@istex/config-component').get(module);
const got = require('got');
const _ = require('lodash');
const VError = require('verror');
const CacheableLookup = require('cacheable-lookup');

module.exports.getApiClient = getApiClient;

/* public */
function getApiClient ({ useDnsCache = istex.api.useCacheLookup } = {}) {
  const cacheable = useDnsCache ? new CacheableLookup() : false;
  return got.extend(_getSearchOptions()).extend({ timeout: istex.api.timeout, dnsCache: cacheable });
}

/* private helpers */
function _getSearchOptions () {
  return {
    retry: {
      limit: istex.api.retry,
    },
    hooks: {
      beforeError: [
        error => {
          const requestUrl = decodeURIComponent(_.get(error, 'options.url'));
          return new VError({ cause: error, name: 'RequestError', info: { requestUrl } },
            'Error %s requesting: %s',
            _.get(error, 'response.statusCode', 'N/A'),
            requestUrl);
        },
      ],
    },
  };
}
