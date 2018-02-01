/**
 * 商品一覧用APIの定義
 */
'use strict';

// 使用モジュールの読み込み
let express = require('express');
let item = require('../model/itemRepository');
let logger = require('../common/modules/logger');
// ルーターの作成
let router = express.Router();


/**
 * 商品一覧取得API (GET /api/shop/items)
 * クエリパラメーターに search=検索キーワード を付加すると全文検索、
 * クエリパラメーターに color=blue 等絞り込み条件を付加すると条件に一致した商品を検索する(全文検索との併用は不可)
 */
router.get('/items', function(req , res) {
  // クエリパラメーターによって呼び出す関数が異なるため、
  // いずれの関数の処理もgetPromiseで呼び出せるようにする
  let getPromise;
  if(req.query.search) {
    // クエリパラメーターが search=検索キーワード の場合の処理
    getPromise = item.searchItems(req.query.search);
  } else {
    // クエリパラメーターに絞り込み条件があるか、何も指定されていない場合の処理
    getPromise = item.getItems(req.query);
  }
  getPromise
    .then((result) => {
      res.json(result);
    })
    .catch((e) => {
      logger.error(e);
      res.status(500).json({error:e.message || e.error || 'undefined error'});
    });
});

// モジュールのエクスポート
module.exports = router;
