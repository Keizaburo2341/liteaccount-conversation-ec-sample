'use strict';

// 使用モジュールの読み込み
let Cloudant = require('cloudant');
let config = require('./config');

// db名やCloudantのユーザー名をconfigから取り出す
let dbName = config.getDBName();
let credentials = config.getServices()['cloudantNoSQLDB'][0]['credentials'];

// Cloudantへの接続用オブジェクトを生成する
let cloudant = Cloudant({account:credentials.username, password:credentials.password});
let db = cloudant.db.use(dbName);

/**
 * queryによる文書の検索
 * @param {object} selector optional. 絞り込み検索条件(Cloudant query用)
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let find = (selector) => {
  return new Promise((resolve, reject) => {
    db.find(selector, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 特定IDの文書を取得
 * @param {string} docId 文書ID
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let get = (docId) => {
  return new Promise((resolve, reject) => {
    db.get(docId, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 全文検索による文書の検索
 * @param {string} designDocName index用文書名(文書ID_design/xxxxのxxxx部分)
 * @param {string} indexName indexの名前
 * @param {object} parameter 検索キーワードを含むオブジェクト e.g. {q: '青 ブラウス'}
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let search = (designDocName, indexName, parameter) => {
  return new Promise((resolve, reject) => {
    db.search(designDocName, indexName, parameter, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 文書の追加および更新
 * @param {object} doc 文書の内容
 *  既存文書の更新の場合、_revを最新の値にすること
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let insert = (doc) => {
  return new Promise((resolve, reject) => {
    db.insert(doc, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 文書の削除
 * @param {object} doc 削除する文書のIDおよびバージョン
 *  - {string} _id 削除する文書のID
 *  - {string} _rev 削除する文書の最新バージョン
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let destroy = (doc) => {
  return new Promise((resolve, reject) => {
    db.destroy(doc._id, doc._rev, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 特定IDの文書の削除(最新_revの取得も含む)
 * @param {string} docId 削除する文書のID
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let deleteDocById = (docId) => {
  return get(docId)
    .then((doc) => {
      return destroy(doc);
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 指定したIDの文書の内容を取得する
 * @param {string[]} docIds 取得したい文書のIDの配列
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let fetch = (docIds) => {
  return new Promise((resolve, reject) => {
    db.fetch({keys: docIds}, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * 複数文書をバルクで処理
 * @param {object[]} docs バルク処理したい文書の配列
 * @return {Promise.<object>} Cloudantからの応答(Promiseオブジェクトに含まれる)
 */
let bulk = (docs) => {
  return new Promise((resolve, reject) => {
    db.bulk({docs: docs}, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  });
};

//関数をモジュールとしてエクスポート
module.exports = {
  find: find,
  get: get,
  search: search,
  insert: insert,
  deleteDocById: deleteDocById,
  fetch: fetch,
  bulk: bulk,
};

