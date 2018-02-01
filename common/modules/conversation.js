'use strict';

// 使用モジュールの読み込み
let watson = require('watson-developer-cloud');
let config = require('./config');

// Conversation用資格情報をconfigから取り出す
let credentials = config.getServices()['conversation'][0]['credentials'];

// Conversation接続用オブジェクトを生成
let conversation = watson.conversation({
  username: credentials.username,
  password: credentials.password,
  version: 'v1',
  version_date: '2017-05-26'
});

// ワークスペースIDをconfigから取り出す
const CONVERSATION_WS_ID = config.getConversationWSId();

/**
 * Conversationにメッセージを送信する
 * @param {string|object} input Conversationに送信するテキスト(string)またはConversation用パラメータを含むobject
 *  Conversation用パラメーター:
 *  - {string} workspace_id 指定されていなければCONVERSATION_WS_IDを割り当てる
 *  - {object} input {text: 'message'}
 *  - {boolean} alternate_intents *default is false (return only 1 intent)
 *  - {object} context
 *  - {object[]} entities
 *  - {object[]} intents
 *  - {object} output
 * @return {Promise.<object>} Conversationからの応答(Promiseオブジェクトに含まれる)
 */
let message = (input) => {
  return new Promise((resolve, reject) => {
    // inputは文字列の場合とオブジェクトの場合の両方あるので、整形したものをpayloadに格納する
    let payload;
    if (typeof input == 'string') {
      // inputが文字列の場合、最低限のパラメーターを設定する
      payload = {
        workspace_id: CONVERSATION_WS_ID,
        alternate_intents: true,
        input: {
          text: input,
        },
      };
    } else {
      // inputがConversation用オブジェクトの場合の処理
      payload = input;
      if(!payload.workspace_id) {
        // ワークスペースIDが指定されていない場合、configから取得したものを記入する
        payload.workspace_id = CONVERSATION_WS_ID;
      }
    }
    conversation.message(payload, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

// 関数をモジュールとしてエクスポート
module.exports = {
  message: message,
};
