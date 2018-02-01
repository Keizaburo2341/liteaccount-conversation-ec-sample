'use strict';

// 使用モジュールの読み込み
let conversation = require('../common/modules/conversation');

/**
 * Conversation用関数
 * @param {string|object} input Conversationに送信するテキスト(string)またはConversation用パラメータを含むobject
 *  Conversation用パラメーターは下記:
 *  - {string} workspace_id
 *  - {object} input e.g. {text: 'message'}
 *  - {boolean} alternate_intents *default is false (return only 1 intent)
 *  - {object} context
 *  - {object[]} entities
 *  - {object[]} intents
 *  - {object} output
 *  @return {Promise.<object>} Conversationの応答(Promiseオブジェクトに含まれる)
 */
let message = (input) => {
  return conversation.message(input);
};

// 関数をモジュールとしてエクスポート
module.exports = {
  message: message,
};
