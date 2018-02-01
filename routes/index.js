/**
 * routes/index.js
 */

'use strict';

// 使用モジュールの読み込み
let express = require('express');
let talkRoutes = require('./talkRoutes');
let shopRoutes = require('./shopRoutes');

// ルーターの作成
let router = express.Router();

/**
 * Routes for API
 */

// '/'(https://xxxx.mybluemix.net/)にリクエストした場合、
// 自動でpublic/index.htmlが送られるので定義不要

// 会話用 API
// /api/talk/xxでアクセスされた場合はtalkRoutes.jsで定義した処理を実行させる
router.use('/api/talk', talkRoutes);

// 商品一覧用 API
router.use('/api/shop', shopRoutes);

// モジュールのエクスポート
module.exports = router;
