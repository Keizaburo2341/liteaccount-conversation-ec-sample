'use strict';
// モジュールの読み込み
let winston = require('winston');
let config = require('./config');

// ログレベルをconfigから取得(debug,info,warn,errorのいずれか、指定が無い場合はinfoを設定)
let LOG_LEVEL = config.getLogLevel() || 'info';

// ログ用オブジェクトの生成
let logger = new (winston.Logger)({
  level: LOG_LEVEL,
  transports: [
    // コンソールに表示する際の設定を指定
    new (winston.transports.Console)({
      timestamp: true, // タイムスタンプを表示
      stderrLevels: ['error'], // エラー出力で表示するログを指定
    }),
  ]
});

// 関数をモジュールとしてエクスポート
module.exports = {
  debug: logger.debug, // リクエストの内容など、開発中だけ表示したい時に使う
  info: logger.info, // アプリの起動完了時の表示など、通常運用で表示したい時に使う
  warn: logger.warn, // アプリの動作に影響はないが、注意を促したい時に使う
  error: logger.error, // エラーを表示する時に使う
};

