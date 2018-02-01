'use strict';

// 使用モジュールの読み込み
let item = require('../../model/itemRepository');

/**
 * 商品文書用JSONを読み込んでCloudantに保存させる関数
 * @param {boolean} keepExistingDocs 既に同一IDの文書が合った場合上書きするか否か(trueで上書きしない)
 * @return {Promise.<object>} Cloudantから帰ってきた保存処理の結果(Promise)
 */
let prepareItems = (keepExistingDocs) => {
  const itemList = require('./itemDoc/item_list.json');
  return item.addItems(itemList, keepExistingDocs);
};

// モジュールのエクスポート
module.exports = {
  prepareItems: prepareItems,
};
