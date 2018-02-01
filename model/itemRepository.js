'use strict';

// 使用モジュールの読み込み
const db = require('../common/modules/cloudant');

// 全文検索用のindexの文書名および名前が必要なのでconfigから取得する
let config = require('../common/modules/config');
const INDEX = config.getDBIndex();

/**
 * 商品検索関数
 * @param {object} queryOption optional. color等の絞り込み条件
 *   - {string} color optional. 服の色
 *   - {string} type optional. 服のタイプ
 *   - {Number} age optional. 対象年齢
 * @return {Promise.<object[]>} 条件に合致した商品文書の配列(Promiseオブジェクトに含まれる)
 */
let getItems = (queryOption) => {
  // Cloudantのquery用セレクタの雛形
  let param = {
    'selector': {
      '_id': {'$gt': '0'},
      'docType': {'$eq': 'ITEM'} // 商品用文書のみを検索対象とする
    },
    'sort': [{'_id': 'asc'}]
  };
  // queryOptionに何もなければ空オブジェクトを入れる
  if (!queryOption) {
    queryOption = {};
  }
  // 以下、queryOptionに入っている条件をparamに設定していく
  if(queryOption.color) {
    param.selector.color = {
      '$eq': queryOption.color
    };
  }
  if(queryOption.type) {
    param.selector.type = {
      '$eq': queryOption.type
    };
  }
  if(queryOption.age) {
    // 商品用文書では対象年齢の上限(maxAge)および下限(minAge)を記載しているので、
    // queryOptionで指定した値が対象年齢の範囲になっている文書を検索できるようにする
    param.selector.maxAge = {
      '$gte': queryOption.age
    };
    param.selector.minAge = {
      '$lte': queryOption.age
    };
  }
  return db.find(param)
    .then((result) => {
      return result.docs;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 商品全文検索関数
 * @param {string} searchText "青 ブラウス"等検索テキスト
 * @return {Promise.<object[]>} 条件に合致した商品文書の配列
 */
let searchItems = (searchText) => {
  // configから取得したindex設定のうち、商品全文検索用のindexのものを取り出す
  let index = INDEX.SEARCH_ITEM;
  return db.search(index.designDocName, index.indexName, {q: searchText})
    .then((result) => {
      //    全文検索の場合、resultは下記のようになるので整形する
      //    {
      //      "total_rows": 2,
      //      "bookmark": "xxx",
      //      "rows": [{
      //        "id": "item_00000002",
      //        "order": [0.1,0],
      //        "fields": {"name": "yyyy"}
      //      }]
      //    }

      // rowsに格納されている文書の内容を
      // 元の文書のような{"_id": "xxx",...}に整形する
      let docs = [];
      result.rows.forEach((row) => {
        let doc = Object.assign({_id: row.id}, row.fields);
        docs.push(doc);
      });
      return docs;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 商品削除関数
 * @param {string} itemId 削除対象の商品文書ID
 * @return {Promise.<object>} Cloudnatからの応答(Promiseオブジェクトに含まれる)
 */
let deleteItem = (itemId) => {
  return db.deleteDocById(itemId);
};

/**
 * 商品追加関数
 * @param {object[]} items 追加したい商品用文書の配列
 * @param {boolean} keepExistingDoc 既に同じIDの文書が合った場合に上書きするか否か(trueで上書きしない)
 * @return {Promise.<object>} Cloudnatからの応答(Promiseオブジェクトに含まれる)
 */
let addItems = (items, keepExistingDoc) => {
  let newIds = [];
  let fetchedDocsMap = {
    // doc_id: { doc contents }
  };
  // fetch用に追加したい商品用文書のIDを集めた配列を作る
  items.forEach((item) => {
    newIds.push('' + item._id);
  });
  // fetch(調べたい文書IDの配列)で既存文書があるか否かを調べる
  return db.fetch(newIds)
    .then((fetchedDocs) => {
      if (!fetchedDocs.rows) {
        throw new Error('Invalid response: ' + JSON.stringify(fetchedDocs));
      }
      // 同じIDの文書が存在する場合、最新の_revを指定していないとinsertがエラーになる。
      // そのため、fetchで既存文書の有無を調べ、keepExistingDocがfalseであれば上書きさせる。

      // 追加する商品文書を入れるプレースホルダー
      let stagedDocs = [];
      fetchedDocs.rows.forEach((doc) => {
        fetchedDocsMap[doc.id] = doc;
      });
      // 追加予定の商品文書１個１個に対し既存文書があるか否かを調べてstagedDocsに入れる
      items.forEach((item) => {
        let itemCopy = Object.assign(item);
        if (fetchedDocsMap[item._id] && fetchedDocsMap[item._id].value && (fetchedDocsMap[item._id].value.deleted !== true)) {
          // 既存文書がある場合の処理
          if (keepExistingDoc) {
            // 既存文書があり、 keepExistingDoc が trueであればstagedDocsには入れない
          } else {
            // 既存文書があり、keepExistingDoc が falseであれば
            // 最新の_revを追加予定の商品文書の内容に追加し、stagetdDocに入れる
            itemCopy._rev = fetchedDocsMap[item._id].value.rev;
            stagedDocs.push(itemCopy);
          }
        } else {
          // 既存文書が無い場合はそのままstagetdDocに入れる
          stagedDocs.push(itemCopy);
        }
      });
      if (stagedDocs.length < 1) {
        return {message: 'No item document to be added.'};
      }
      return db.bulk(stagedDocs);
    })
    .catch((e) => {
      throw e;
    });
};

// 関数をモジュールとしてエクスポート
module.exports = {
  getItems: getItems,
  searchItems: searchItems,
  deleteItem: deleteItem,
  addItems: addItems,
};
