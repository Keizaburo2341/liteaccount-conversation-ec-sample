'use strict';

// 使用モジュールの読み込み
let vr = require('../common/modules/vr');
let config = require('../common/modules/config');
let logger = require('../common/modules/logger');

// Visual Recognitionで作成したClassifierのIDをconfigから呼び出す
let CLASSIFIER_IDS = config.getVRClassifierIds();

/**
 * 顔認識用関数
 * @param {string} image 画像をBase64文字列にエンコードしたもの(画像1個分の文字列)
 * @return {Promise.<DetectedFaces>} Visual Recognitionからの応答(Promiseオブジェクトに含まれる)
 */
let detectFacesInImage = (image) => {
  return vr.detectFacesInImage(image);
};

/**
 * Classifierによる画像認識
 * @param {string|string[]} image 画像をBase64文字列にエンコードしたもの(画像1個分の文字列か、複数の画像の文字列を配列にしたもの)
 * @param {object} options ClassifierのIDなど、画像認識のオプション
 * @return {Promise.<ClassifiedImages>} Visual Recognitionからの応答(Promiseオブジェクトに含まれる)
 */
let classifyImage = (image, options) => {
  return vr.classifyImage(image, options);
};

/**
 * Visual Recognitionの顔認識結果をConversation用に'性別 年齢'の文字列に整形する e.g. 'MALE 10'
 * @param {object} vrResult 顔認識の結果
 * @return {object} 整形した文字列を含むオブジェクト e.g. {generatedText: 'MALE 10'}
 *  - {string} generatedText
 */
let findUserAttribute = (vrResult) => {
  // vrResult = {
  // "images": [{
  //   "faces": [{
  //     "age": {"max": 24, "min": 18, "score": 0.502411},
  //     "face_location": {"height": 183, "left": 175, "top": 136, "width": 150},
  //     "gender": {"gender": "MALE", "score": 0.880797}
  //   }]
  // }]
  // }
  if(vrResult && Array.isArray(vrResult.images) && vrResult.images[0] && Array.isArray(vrResult.images[0].faces)) {
    let face = vrResult.images[0].faces[0];
    if (!face) {
      throw new Error('no face returned');
    }
    // 年齢は最小と最大で帰ってくるので、平均をとる
    let approxAge = (face.age.min + face.age.max)/2;
    return {generatedText: face.gender.gender + ' ' + approxAge};
  } else {
    throw new Error('invalid return: '+ JSON.stringify(vrResult));
  }
};

/**
 * 画像認識で検出されたクラスをスコアの大きい順に整列させる (10 -> 0)
 * @param {object[]} array スコアを含むオブジェクトの配列 e.g.[{score: 0.5, a: 'xx'}]
 */
let sortByScore = (array) => {
  array.sort((a, b) => {
    return b.score - a.score;
  });
  return array;
};

/**
 * 画像認識の結果から、１番スコアの高い服の種類および服の色を取り出す
 * @param {object} vrResult 画像認識の結果
 * @return {object} 服の種類および色を結合させた文字列を含むオブジェクト e.g. {generatedText: 'skirt blue'}
 *  - {string} generatedText String of clothType and clothColor e.g. 'skirt blue'
 */
let findClothAttribute = (vrResult) => {
  //  vrResult = {
  //    "images": [{
  //      "classifiers": [{
  //          "classifier_id": "default",
  //          "name": "default",
  //          "classes": [{
  //                "class": "breeches",
  //                "score": 0.781,
  //                "type_hierarchy": "/garment/trouser/breeches"
  //          }]
  //      }]
  //    }]
  //  }
  if(!vrResult || !Array.isArray(vrResult.images) || !vrResult.images.length) {
    throw new Error('invalid return: '+ JSON.stringify(vrResult));
  }

  // Classifier毎に各クラスのスコアを集計する
  let resultMap = {
  //    classifierName: {
  //      classname: score,
  //    },
  };
  vrResult.images.forEach((imageResult) => {
    if (imageResult && Array.isArray(imageResult.classifiers)) {
      imageResult.classifiers.forEach((classifier) => {
        let targetClassifier;
        if (classifier && classifier.name) {
          targetClassifier = classifier.name;
          classifier.classes.forEach((classResult) => {
            if (!resultMap[targetClassifier]) {
              resultMap[targetClassifier] = {};
            }
            if (!resultMap[targetClassifier][classResult.class]) {
              resultMap[targetClassifier][classResult.class] = 0;
            }
            resultMap[targetClassifier][classResult.class] += classResult.score;
          });
        }
      });
    }
  });

  // Classifier毎に検知されたクラスをスコアの高い順に並べた配列を作成する
  let arrayResults = {
    //    classifierName: [
    //      {class: className, score: score},
    //    ],
  };
  for(let classifierName in resultMap) {
    let results = [];
    for(let className in resultMap[classifierName]) {
      results.push({class: className, score: resultMap[classifierName][className]});
    }
    // クラスをスコアの高い順に並び替え
    arrayResults[classifierName] = sortByScore(results);
  }
  // 各Classifierのうち、一番スコアの高いクラス名を取り出す
  let topClassNames = [];
  for(let classifierName in arrayResults) {
    if (arrayResults[classifierName].length > 1) {
      topClassNames.push(arrayResults[classifierName][0].class);
    }
  }
  // 取り出したクラス名の配列(ここでは"色_形"となっているクラスが1つだけ入る)をつなげ、"_"を" "に置換した文字列を作成
  return {generatedText: topClassNames.join(' ').replace(/_/g,' ')};
};

/**
 * 画像からユーザーの性別および年齢を判定する関数
 * @param {string} image 画像をBase64文字列にエンコードしたもの(画像1個分の文字列)
 * @return {Promise.<object>} 性別および年齢を結合させた文字列を含むオブジェクト(Promiseオブジェクトに含まれる)
 *  - {string} generatedText e.g. 'MALE 10'
 */
let getUserAttribute = (image) => {
  return detectFacesInImage(image)
    .then((result) => {
      logger.debug(result);
      let attribute;
      try {
        attribute = findUserAttribute(result);
      } catch(e) {
        throw e;
      }
      return attribute;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 画像から服の種類および色を検出する関数
 * @param {string|string[]} image 画像をBase64文字列にエンコードしたもの(画像1個分の文字列か、複数の画像の文字列を配列にしたもの)
 * @return {Promise.<object>} 服の種類および色を結合させた文字列を含むオブジェクト(Promiseオブジェクトに含まれる)
 *  - {string} generatedText e.g. 'skirt blue'
 */
let getClothAttribute = (image) => {
  let options = {
    classifier_ids: [CLASSIFIER_IDS.CLOTH_COLOR_TYPE],
    threshold: 0.0
  };
  return classifyImage(image, options)
    .then((result) => {
      logger.debug(result);
      let attribute;
      try {
        attribute = findClothAttribute(result);
      } catch(e) {
        throw e;
      }
      return attribute;
    })
    .catch((e) => {
      throw e;
    });
};

// 関数をモジュールとしてエクスポート
module.exports = {
  detectFacesInImage: detectFacesInImage,
  classifyImage: classifyImage,
  findUserAttribute: findUserAttribute,
  findClothAttribute: findClothAttribute,
  getUserAttribute: getUserAttribute,
  getClothAttribute: getClothAttribute,
};
