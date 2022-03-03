const { istex } = require('@istex/config-component').get(module);
const got = require('got');
const _ = require('lodash');
const VError = require('verror');

module.exports.getReviewClient = getReviewClient;

/* public */
function getReviewClient () {
  return got.extend(_getSearchOptions()).extend({ timeout: istex.review.timeout });
}

/* private helpers */
function _getSearchOptions () {
  return {
    retry: {
      limit: istex.review.retry,
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
