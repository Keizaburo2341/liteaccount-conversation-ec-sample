'use strict';

/**
 * 各種設定をロードするモジュール
 */

// db名等の設定はcommon/env/default.jsonに記入しているので読み込む
const config = require('../env/default.json');

// IBM Cloudのサービスの資格情報を読み込む
// IBM CloudでNode.jsが稼働している場合はVCAP_SERVICES環境変数に記載されているが、
// ローカルの場合は相当する環境変数がないため、common/env/VCAP_SERVICES.jsonに資格情報を貼り付けておき読み込む
let services;
if (process.env.VCAP_SERVICES) {
  services = JSON.parse(process.env.VCAP_SERVICES);
} else {
  services = require('../env/VCAP_SERVICES.json');
}

/**
 * サービスの資格情報を取得する関数
 * @return {object} サービス資格情報
 */
let getServices = () => {
  return services;
};

/**
 * ConversationのワークスペースのIDを取得する関数
 * @return {string} ConversationのワークスペースID
 */
let getConversationWSId = () => {
  return config.CONVERSATION_WS_ID;
};

/**
 * Visual RecognitionのClassifierIDを取得する関数
 * @return {object} Visual RecognitionのClassifierID
 *  - {string} CLOTH_TYPE 服のタイプ用ClassifierのID
 *  - {string} CLOTH_COLOR 服の色用ClassifierのID
 */
let getVRClassifierIds = () => {
  return config.VISUAL_RECOGNITION_CLASSIFIERS;
};

/**
 * CloudantのDB名を取得する関数
 * @return {string} DB名
 */
let getDBName = () => {
  return config.DB_NAME;
};

/**
 * Cloudantのindex文書名およびindex名を取得する関数
 * @return {object} 目的毎のimdex文書名およびindex名(目的がキー名になっている)
 *  {
 *    "SEARCH_ITEM": {
 *      "designDocName": "item",
 *     "indexName": "itemSearch"
 *    }
 *  }
 */
let getDBIndex = () => {
  return config.DB_INDEX;
};

/**
 * ログレベルを取得する関数
 * @return {string} ログレベル(debug,info,warn,errorのいずれか)
 */
let getLogLevel = () => {
  return config.LOG_LEVEL;
};

// 関数をモジュールとしてエクスポート
module.exports = {
  getServices: getServices,
  getConversationWSId: getConversationWSId,
  getVRClassifierIds: getVRClassifierIds,
  getDBName: getDBName,
  getDBIndex: getDBIndex,
  getLogLevel: getLogLevel,
};
