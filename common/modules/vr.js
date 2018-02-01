'use strict';

// 使用モジュールの読み込み
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
let watson = require('watson-developer-cloud');
let config = require('./config');
let logger = require('./logger');

// サービスの資格情報をconfigから取得
let credentials = config.getServices()['watson_vision_combined'][0]['credentials'];
// Visual Recognition接続用オブジェクトを生成
let visualRecognition = watson.visual_recognition({
  api_key: credentials.api_key,
  version: 'v3',
  version_date: '2016-05-20'
});

// Visual Recognitionへは画像をファイルとして送信する必要がある。
// ここでは、IMAGE_TMPに指定したディレクトリにブラウザからの画像データを一時的に画像ファイルとして書き出し、
// リクエスト完了後に削除させる。
const IMAGE_TMP = path.resolve('./imageTmp');
logger.debug(`IMAGE_TMP is ${IMAGE_TMP}`);

/**
 * 画像ファイル名生成関数
 * @param {string} ext ファイル拡張子('.zip', '.jpeg')
 * @return {string} ファイル名 e.g. '1515989289480.jpeg'
 */
let generateFileName = (ext) => {
  return (new Date()).valueOf() + ext;
};

/**
 *  指定したディレクトリにある.jpegファイルを${directory_name}.zipに圧縮する
 *  @param {string} targetDir ディレクトリ e.g. '../imageTemp/yyyy'
 *  @return {Promise} 空のPromiseオブジェクト
 */
let archiveImagesInDirectory = (targetDir) => {
  return new Promise((resolve, reject) => {
    let archive = archiver('zip');
    let output = fs.createWriteStream(targetDir + '.zip');
    output.on('close', () => {
      resolve();
    });
    archive.on('error', (err) => {
      reject(err);
    });
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        logger.warn(err);
        resolve();
      } else {
        reject(err);
      }
    });
    archive.pipe(output);
    // 指定したディレクトリの全ファイルを取得する
    fs.readdir(targetDir, (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      files.filter((file) => {
        // 指定したディレクトリのファイルのうち、.jpegを取り出す
        return fs.statSync(targetDir + "/" + file).isFile() && /.*\.jpeg$/.test(file);
      }).forEach(function(file) {
        // files.filterで.jpegファイルの配列ができるので、forEachにより１個１個zipの対象に加える(繰り返し処理)
        archive.append(fs.createReadStream(targetDir + "/" + file), {
          name: file
        })
      });
      archive.finalize();
    });
  });
};

/**
 * base64文字列にした画像をjpegファイルとして保存する
 * @param {string} path e.g. '../imageTemp/xxxx.jpeg'
 * @param {string} base64img base64文字列にした画像 e.g. 'data:image/jpeg+;base64,xxxx...'
 * @param {boolean} useSync optional. trueにすると非同期で処理(Promiseオブジェクトを返す)
 * @return {null|Promise.<null>} useSync=trueの場合は空のPromiseオブジェクトを返す
 */
let saveImage = (filePath, base64img, useSync) => {
  base64img = base64img.replace(/^data:image\/jpeg+;base64,/, "");
  base64img = base64img.replace(/ /g, '+');
  if (useSync) {
    try {
      fs.writeFileSync(filePath, base64img, 'base64');
    } catch(e) {
      throw e;
    }
    return;
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, base64img, 'base64', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * base64文字列にした画像(複数)をzipファイルとして保存する
 * @param {string} filePath 保存先zipファイル e.g. '../imageTemp/xxx.zip'
 * @param {string[]} base64imgs base64文字列にした画像の配列 e.g. ['data:image/jpeg+;base64,xxxx...']
 * @return {Promise.<null>} 空のPromiseオブジェクト
 */
let saveImages = (filePath, base64imgs) => {
  // filePathから拡張子無しのファイル名部分を取り出す ('../imageTemp/xxx.zip' => 'xxx')
  let tempFilePrefix = filePath.split(/[¥/\\]/).pop().match(/(.+)\.[a-zA-Z0-9_]+$/)[1];

  // base64imgsを一時的に画像として書き出し、その後zipにする

  // まずmkdirPromiseで画像を格納するディレクトリを作成する。
  // ディレクトリ名はfilePathのディレクトリ〜ファイル名部分とする ('../imageTemp/xxx.zip' => '../imageTemp/xxx')
  let tempDirPath = filePath.match(/(.+)\.[a-zA-Z0-9_]+$/)[1];
  return mkdirPromise(tempDirPath)
    .then(() => {
      let max = base64imgs.length;
      if(!max && max === 0) {
        throw new Error('invalid images');
      }
      for (let i = 0; i < max; i++) {
        // 各画像を../imageTemp/xxx/xxx_0.jpegに保存する
        let imagePath = tempDirPath + '/' + tempFilePrefix + '_' + i + '.jpeg';
        try {
          saveImage(imagePath, base64imgs[i], true);
        } catch(e) {
          throw e;
        }
      }
      // ../imageTemp/xxxディレクトリ内の画像をzipに圧縮する
      return archiveImagesInDirectory(tempDirPath) ;
    })
    .then(() => {
      // 一時的に作成した../imageTemp/xxxを削除する(削除完了は待たない)
      deleteDirectory(tempDirPath)
        .then(() => {
          // no actions
        })
        .catch((e) => {
          logger.error(e);
        });
      return;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 指定したディレクトリを作成する
 * @param {string} filedir ディレクトリのパス
 * @return {Promise.<null>} 空のPromiseオブジェクト
 */
var mkdirPromise = function(filedir) {
  //try create new directory
  return new Promise(function(resolve,reject) {
    fs.mkdir(filedir,function(error,result) {
      if (error) {
        if (error.code == 'EEXIST') {
          // ディレクトリが既に存在する場合は正常処理とする
          resolve();
          return;
        }
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * ファイルを削除する
 * @param {string} filePath ファイルのパス
 * @return {Promise.<null>} 空のPromiseオブジェクト
 */
let deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (e) => {
      if (e) {
        reject(e);
      } else {
        logger.debug(`${filePath} is deleted`);
        resolve();
      }
    });
  });
};

/**
 * ディレクトリを削除する
 * @param {string} targetDir ディレクトリのパス
 * @return {Promise.<null>} 空のPromiseオブジェクト
 */
let deleteDirectory = (targetDir) => {
  // ディレクトリ削除の前に、格納されているファイルを削除する
  return cleanupDirectory(targetDir)
    .then(() => {
      try {
        fs.rmdirSync(targetDir);
      } catch(e) {
        throw e;
      }
      logger.debug(`${targetDir} is deleted`);
      return null;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * 指定したディレクトリ内のファイルを削除する
 * @param {string} targetDir ディレクトリのパス
 * @return {Promise.<null>} 空のPromiseオブジェクト
 */
let cleanupDirectory = (targetDir) => {
  let filedir = targetDir+ '/';
  return new Promise((resolve, reject) => {
    // ディレクトリ内のファイルおよびフォルダを取得
    fs.readdir(filedir, (err, files) => {
      if(err) {
        reject(err);
        return;
      }
      files.filter((file) => {
        // ディレクトリ内のファイルを取り出す
        // 今回は対象となるディレクトリにファイルのみが入っている想定
        return fs.statSync(filedir + file).isFile();
      }).forEach((file) => {
        try {
          // 各ファイルを削除していく
          fs.unlinkSync(filedir + file);
          logger.debug(`${filedir + file} is deleted`);
        } catch(e) {
          logger.error(e);
        }
      });
      resolve();
    });
  });
};

/**
 * 画像ファイルを画像認識で処理させる
 * @param {string} imagefile 画像ファイル(.jpegまたは.zip)のパス
 * @param {object} options ClassifierIDなどのオプション
 * @return {Promise.<object>} Visual Redcognitionからの応答
 */
let classify = (imagefile, options) => {
  return new Promise((resolve,reject) => {
    let formData = {};
    formData.images_file = fs.createReadStream(imagefile);
    if (options) {
      formData.parameters = options;
    }
    visualRecognition.classify(formData, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * 画像ファイルを顔認識で処理させる
 * @param {string} imagefile 画像ファイル(.jpegまたは.zip)のパス
 * @return {Promise.<object>} Visual Redcognitionからの応答
 */
let detectFaces = (imagefile) => {
  return new Promise((resolve,reject) => {
    let formData = {
      images_file: fs.createReadStream(imagefile),
    };
    visualRecognition.detectFaces(formData, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * base64文字列にした画像を画像認識で処理する (一時的に画像ファイルを生成して削除)
 * @param {string|string[]} base64imgs base64文字列にした画像(１枚分の文字列または複数枚分の配列)
 * @param {object} options ClassifierIDなどのオプション
 * @return {Promise.<object>} Visual Redcognitionからの応答
 */
let classifyImage = (base64imgs, options) => {
  let isImageArray = Array.isArray(base64imgs);
  // reject empty images
  if (!base64imgs || (isImageArray && base64imgs.length < 1)) {
    return Promise.reject(new Error('empty image'));
  }
  // if base64imgs is array but contains only 1 image, convert string[] => string
  if (isImageArray && base64imgs.length == 1) {
    base64imgs = base64imgs[0];
    isImageArray = false;
  }
  let ext;
  let savePromise;
  let tempImageFile;
  if(isImageArray) {
    ext = '.zip';
    tempImageFile = IMAGE_TMP + '/' + generateFileName(ext);
    savePromise = saveImages(tempImageFile, base64imgs);
  } else {
    ext = '.jpeg';
    tempImageFile = IMAGE_TMP + '/' + generateFileName(ext);
    savePromise = saveImage(tempImageFile, base64imgs);
  }
  return savePromise
    .then(() => {
      return classify(tempImageFile, options);
    })
    .then((result) => {
      // delete temp file (not wait for complete)
      deleteFile(tempImageFile)
        .then(() => {
          // no action
        })
        .catch((deleteError) => {
          logger.error(deleteError);
        });
      return result;
    })
    .catch((e) => {
      throw e;
    });
};

/**
 * base64文字列にした画像を顔認識で処理する (一時的に画像ファイルを生成して削除)
 * @param {string} base64img base64文字列にした画像(１枚分の文字列)
 * @return {Promise.<object>} Visual Redcognitionからの応答
 */
let detectFacesInImage = (base64img) => {
  let tempImageFile = IMAGE_TMP + '/' + generateFileName('.jpeg');
  return saveImage(tempImageFile, base64img)
    .then(() => {
      return detectFaces(tempImageFile);
    })
    .then((result) => {
      // delete temp file (not wait for complete)
      deleteFile(tempImageFile)
        .then(() => {
          // no action
        })
        .catch((deleteError) => {
          logger.error(deleteError);
        });
      return result;
    })
    .catch((e) => {
      throw e;
    });
};

// 関数をモジュールとしてエクスポート
module.exports = {
  classifyImage: classifyImage,
  detectFacesInImage: detectFacesInImage,
};
