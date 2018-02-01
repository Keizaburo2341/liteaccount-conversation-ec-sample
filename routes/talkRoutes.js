/**
 * チャット用APIの定義
 */
'use strict';

// 使用モジュールの読み込み
const express = require('express');
// let talkCtrl = require('../controller/talkController');

let conversation = require('../model/conversationRepository');
let vr = require('../model/vrRepository');
let item = require('../model/itemRepository');
let logger = require('../common/modules/logger');
// ルーターの作成
let router = express.Router();

/**
 * 会話用API(POST /api/talk)
 * リクエストBodyは下記を想定
 * {
 *    conversation: conversationに送るもの,
 *    image: base64文字列に変換した画像
 * }
 */
router.post('/', function(req , res) {
  // クライアントに返すデータ用プレースホルダー
  let responseData = {};
  // Conversationに接続する前の処理(画像認識や商品検索)を入れる変数
  let prePromise;
  // Conversation用contextのプレースホルダー
  // contextには会話の進捗を表すデータや条件分岐に使うフラグが含まれる
  let context = {};
  // リクエストBodyからConversationに送るものを取り出す
  let convInput = req.body.conversation;
  // リクエストBodyから画像を取り出す
  let imageInput = req.body.image;

  // Conversationに送るデータがあればcontext変数に格納する
  if (typeof convInput !== 'string' && convInput && convInput.context) {
    context = convInput.context;
  }
  // 画像が送られて来たか否かのフラグ(送られていないならtrue)
  let isImageEmpty = true;
  if (imageInput) {
    // 画像がbase64文字列かその配列であればisImageEmptyをfalseにする
    if(typeof imageInput === 'string') {
      isImageEmpty = false;
    } else if (Array.isArray(imageInput) && imageInput.length) {
      isImageEmpty = false;
    }
  }
  // contextを確認し、Conversationが画像認識や商品検索結果を待っているか否かを確認する
  if (context.isWaitForFace && !isImageEmpty) {
    // Conversationが顔情報待ち状態でブラウザから画像が送られていれば、顔認識を実行させる
    // Conversationで画像認識を使ったか否かで分岐があるのでcontextに反映する
    convInput.context.useVR = true;
    if (Array.isArray(imageInput)) {
      imageInput = imageInput[0];
    }
    // prePromise変数に顔認識処理を格納する
    prePromise = vr.getUserAttribute(imageInput)
      .then((result) => {
        // 顔認識の結果は{generatedText: 'female 20'}のように性別と年齢をあわせた文字列が含まれるので
        // concersationに送る
        if (result.generatedText) {
          convInput.input.text = result.generatedText;
          // 画像認識が成功したフラグをcontextに設定する
          convInput.context.successVR = true;
        }
        return;
      })
      .catch((e) => {
        // 顔認識が失敗した場合の処理
        logger.error(e);
        convInput.context.successVR = false;
        return;
      });
  } else if (context.isWaitForClothes && !isImageEmpty) {
    // Conversationが服画像待ち状態でブラウザから画像が送られていれば、服認識を実行させる
    // Conversationで画像認識を使ったか否かで分岐があるのでcontextに反映する
    convInput.context.useVR = true;
    // prePromise変数に服認識処理を格納する
    prePromise = vr.getClothAttribute(imageInput)
      .then((result) => {
        // 服認識の結果は{generatedText: 'blue skirt'}のように色とタイプをあわせた文字列が含まれるので
        // conversationに送る
        if (result.generatedText) {
          convInput.input.text = result.generatedText;
          convInput.context.successVR = true;
        }
        return;
      })
      .catch((e) => {
        logger.error(e);
        convInput.context.successVR = false;
        return;
      });
  } else if (context.isWaitingForItemSearch) {
    // Conversationが商品検索待ちの場合の処理
    // この場合、contextに服の色とタイプが書かれているので検索に利用する
    let queryParam = {
      type: context.clothType,
      color: context.clothColor,
      age: context.age,
      gender: context.gender,
    };
    // prePromise変数に商品検索処理を格納する
    prePromise = item.getItems(queryParam)
      .then((result) => {
        if(result.length) {
          // 商品検索の結果があれば最初にヒットした商品の名前などをcontextに入れる
          convInput.context.isExistItems = true;
          convInput.context.recommendItemName = result[0].name;
          responseData.items = result;
        }
        return;
      })
      .catch((e) => {
        logger.error(e);
        convInput.context.isExistItems = false;
        return;
      });
  } else {
    // Conversation接続前に処理が不要であれば空の処理
    prePromise = Promise.resolve();
  }
  // prePromiseの後に何をするかを定義
  prePromise
    .then(() => {
      logger.debug(convInput);
      // conversationにメッセージを送信
      return conversation.message(convInput);
    })
    .then((result) => {
      responseData.conversation = result;
      res.json(responseData);
    })
    .catch((e) => {
      logger.error(e);
      let errorRes = {
        message: e.message || e.error || 'undefined error',
      };
      res.status(500).json(errorRes);
    });
});

// モジュールのエクスポート
module.exports = router;
