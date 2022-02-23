'use strict';

const reviewClient = require('./reviewClient').getReviewClient();
const { istex, app } = require('@istex/config-component').get(module);
const { model } = require('../reviewModel');
const { URL, URLSearchParams } = require('url');
const { pickBy, isEmpty, get, chain } = require('lodash');
const hl = require('highland');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { pick } = require('stream-json/filters/Pick');
const VError = require('verror');

module.exports.paginatedFindDocumentsBy = paginatedFindDocumentsBy;
module.exports.findDocumentsBy = findDocumentsBy;
module.exports.count = count;
module.exports.getReviewLastUpdate = getReviewLastUpdate;

/*
 * @return {Object} return highland stream
 */
function paginatedFindDocumentsBy ({
  uri,
  type,
  corpus,
  title,
  limit,
  pageSize,
  reviewBaseUrl = istex.review.url,
} = {}) {
  const reviewUrl = new URL('api/run/all-documents', reviewBaseUrl);
  const searchParams = new URLSearchParams(
    pickBy(
      {
        [model.uri]: uri,
        [model.type]: type,
        [model.corpus]: corpus,
        [model.title]: title,
        maxSize: String(pageSize) || '10',
        sid: app.sid,
      }, _isNotAnEmptyString));

  return paginateStream(reviewUrl, { searchParams, pageSize, limit })
    .stopOnError((error, push) => {
      const requestUrl = decodeURIComponent(reviewUrl.toString());
      const verror = VError(
        { cause: error, name: 'ReviewRequestError', info: { reviewUrl } },
        'Error requesting: %s',
        requestUrl);
      push(verror);
    })
    .reject(isEmpty); // Hack coz the route all-document return one empty Object if no result.
}

function paginateStream (url, { searchParams = {}, pageSize, limit = 10 }) {
  const iterator = reviewClient.paginate(
    url,
    {
      searchParams,
      pagination: {
        countLimit: limit,
        stackAllItems: false,
        transform: (response) => {
          return (JSON.parse(response.body)?.data) || [];
        },
        paginate: function (response, allItems, currentItems) {
          if (currentItems.length === 0 || pageSize == null) {
            return false;
          }
          const previousSkip = response.request.options?.searchParams.get('skip') ?? 0;
          return {
            searchParams: {
              skip: Number(previousSkip) + pageSize,
            },
          };
        },
      },
    });

  return hl(async (push, next) => {
    let value;
    try {
      value = (await iterator.next()).value;
    } catch (err) {
      push(err);
      push(null, hl.nil);
      return;
    }

    if (value == null) {
      return push(null, hl.nil);
    }

    push(null, value);
    next();
  });
}

/*
 * @return {Object} return highland stream
 */
function findDocumentsBy ({ uri, type, corpus, title, maxSize, reviewBaseUrl = istex.review.url } = {}) {
  maxSize = typeof maxSize === 'number' ? maxSize.toString() : maxSize;
  const reviewUrl = new URL('api/run/all-documents', reviewBaseUrl);
  reviewUrl.search = new URLSearchParams(
    pickBy(
      {
        [model.uri]: uri,
        [model.type]: type,
        [model.corpus]: corpus,
        [model.title]: title,
        maxSize: maxSize,
        sid: app.sid,
      }, _isNotAnEmptyString));

  return hl(reviewClient.stream(reviewUrl))
    .through(parser())
    .through(pick({ filter: 'data' }))
    .through(streamArray())
    .stopOnError((error, push) => {
      const requestUrl = decodeURIComponent(reviewUrl.toString());
      const verror = VError(
        { cause: error, name: 'ReviewRequestError', info: { reviewUrl } },
        'Error requesting: %s',
        requestUrl);
      push(verror);
    })
    .pluck('value')
    .reject(isEmpty); // Hack coz the route all-document return one empty Object if no result.
}

function count ({ type, corpus, title, reviewBaseUrl = istex.review.url } = {}) {
  const reviewUrl = new URL('api/run/all-documents', reviewBaseUrl);

  reviewUrl.search = new URLSearchParams(pickBy({
    [model.type]: type,
    [model.corpus]: corpus,
    [model.title]: title,
    sid: app.sid,
  }, _isNotAnEmptyString));

  return reviewClient(reviewUrl, { responseType: 'json' })
    .then((response) => {
      return get(response, 'body.total', 0);// Hack coz the route all-document return the "total" key if no result.
    });
}

function getReviewLastUpdate ({ reviewBaseUrl = istex.review.url } = {}) {
  const reviewUrl = new URL('api/run/all-documents', reviewBaseUrl);

  reviewUrl.search = new URLSearchParams(pickBy({
    sort: 'publicationDate/desc',
    sid: app.sid,
  }, _isNotAnEmptyString));

  return reviewClient(reviewUrl, { responseType: 'json' })
    .then((response) => {
      const lastPublicationDate = chain(response).get('body.data').first().get('publicationDate', 0).value();

      return +new Date(lastPublicationDate);
    });
}

function _isNotAnEmptyString (value) {
  return typeof value === 'string' && value.length > 1;
}
