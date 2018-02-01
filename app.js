
//モジュールの呼び出し
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const session = require('cookie-session');

const logger = require('./common/modules/logger');

// catchされなかったエラーが発生した場合の処理
process.on('uncaughtException', function(err) {
  console.error(err);
  console.trace();
});

// ローカルPCで稼働しているか否かのフラグ(trueであればローカル)
let ISLOCAL = true;
// IBM Cloud で稼働している場合(VCAP_APPLICATION 環境変数が設定されている状態), ISLOCALフラグをfalseにする
if (process.env.VCAP_APPLICATION) {
  ISLOCAL = false;
}
// Basic認証利用フラグ
// VALID_USERID 環境変数およびVALID_PASSWORD環境変数が設定されていれば
// アプリにBasic認証をかける(ユーザー名はVALID_USERID の値、パスワードはVALID_PASSWORDの値)
let USEAUTH = false;
if (process.env.VALID_USERID && process.env.VALID_PASSWORD) {
  USEAUTH = true;
}
let app = express();
let server = http.createServer(app);

let routes = require('./routes');

app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({limit:'50mb', extended: false }));
app.use(cookieParser());

app.use(session({resave: 'true', saveUninitialized: 'true',
  secret: 'keyboard cat', cookie: { expire: 0}}));

// Basic認証を使う場合の処理(USEAUTH=falseの場合はスキップされる)
if (USEAUTH) {
  let VALID_USERID = process.env.VALID_USERID;
  let VALID_PASSWORD = process.env.VALID_PASSWORD;
  // Basic認証の場合、'${ユーザー名}:${パスワード}'がbase64エンコードされた文字列が送られてくる。
  // ここでは正しいユーザー名とパスワードで上記のような文字列を作成しておき、ユーザー確認に使う
  let ENCODED_CREDENTIAL = (new Buffer(VALID_USERID + ':' + VALID_PASSWORD)).toString('base64');

  // Basic認証で送られてきたユーザー名およびパスワードが合っているか確認する関数
  let checkUser = (cred) => {
    return cred.substring(6) == ENCODED_CREDENTIAL;
  };
  // ユーザー確認関数
  let ensureAuthenticated = (req, res, next) => {
    let credential = req.headers["authorization"]||"";
    if (!credential.startsWith("Basic ") || !checkUser(credential)) {
      res.set({
        'WWW-Authenticate': 'Basic realm="/"'
      }).status(401).end();
    } else {
      // Basic認証を通ればルーティング等次の処理に進む
      next();
    }
  };
  // ユーザー確認を全リクエストで実施する
  app.use(ensureAuthenticated);
}
// end of auth setting

// publicフォルダ内のファイルを公開する
// public/images/logo.pngの場合、http://xxx.mybluemix.net/images/logo.pngでアクセスできるようになる
app.use(express.static(__dirname + '/public'));
// routesフォルダ内に定義したルーティングを呼び出す
app.use('/', routes);

// Cloudantに商品情報を準備する
// serviceSetup/cloudant/cloudantSetup.js に準備のためのモジュールを定義しているので呼び出す
// 商品情報用のCloudant文書の内容をserviceSetup/cloudant/itemDoc/item_list.jsonに記入しているのでCloudantに送信する。
let dbSetup = require('./serviceSetup/cloudant/cloudantSetup');

// 既にIDが同じ文書が存在する場合に上書きするか否かのフラグ。keepExistingDocs = trueであれば上書きしない
const keepExistingDocs = true;
dbSetup.prepareItems(keepExistingDocs)
  .then((result) => {
    logger.debug(result);
    logger.info('item doc prepared.');
  })
  .catch((e) => {
    logger.error(e);
  });

// リクエストを待ち受けるポートの定義
// IBM CloudであればPORT等の環境変数に定義されているのでそちらを使うが、
// ローカルPCの場合は相当する環境変数が無いので3000とする
let port = process.env.PORT || process.env.CF_INSTANCE_PORT || process.env.VCAP_APP_PORT || 3000;

// リクエストを待ち受けるホスト名の定義
// ローカルPCの場合はlocalhost、IBM Cloudの場合は0.0.0.0とする
let host = ISLOCAL ? 'localhost' : '0.0.0.0';

server.listen(port, host, ()=>{
  // Node.jsサーバーがリクエスト待ち受けできる状態になったときの処理
  // ここではURLおよびポートをコンソールに表示させる
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'http://' + addr.address + ':' + addr.port;
  logger.info('Server starting on ' + bind);
});
