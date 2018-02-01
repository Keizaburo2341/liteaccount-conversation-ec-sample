// チャットタブ用コンポーネント
Vue.component('chatdiv',{
  template: '#chatTab',
  data: function() {
    return {
      // 会話を格納
      talks: [],
      // 入力したメッセージ(テキストフォームの入力値と連動)
      message: '',
      // フォームで読み込んだ画像の一時保存先(圧縮等処理していない状態)
      currentImage: '',
      // 送信予定のconversation用オブジェクト(メッセージも含む)
      stagedConversation: {
        input: {text: ''}
      },
      // 送信予定の画像
      stagedImages: [],
      // フォームを描画するか否かのフラグ(フォームを再描画してリセットさせるために利用)
      keepFileInput: true,
      // 送信中か否かのフラグ(送信中はtrue)
      isRequesting: false
    }
  },
  methods: {
    /**
     * 画面の会話履歴を追加し、画面に表示させる
     * @param {object} data ユーザーの入力またはConversationの戻り値
     * @param {boolean} isClient optional. ユーザーが入力した場合はtrue
     * @param {boolean} isError optional. Conversationでエラーが発生した場合はtrue
     * @param {boolean} isHide optional. 画面に表示しない場合はtrue(商品検索の際にこちらから空データを送信するため)
     * @return {Promise.<null>} 空のPromiseオブジェクト
     */
    addMessage: function(data, isClient, isError, isHide) {
      // この時点ではコンポーネントがthisとして入るので、変数に格納しておく(関数の入れ子になるとthisが指すものが変化するため)
      var chatDiv = this;
      // 会話にIDを付与
      // ユーザーが入力したものはsend+タイムスタンプ、Conversationからの戻りはresponse+タイムスタンプのようになる
      var mIdPrefix = isClient ? 'send' : 'response';
      var messageId = mIdPrefix + (new Date()).valueOf();
      var newTalk = {
        messageId: messageId,
        isClient: isClient,
        isHide: isHide
      };
      // エラー、ユーザー入力、Conversationからの戻りを整形する
      if (isError) {
        // エラーの場合
        newTalk.text = 'エラーが発生しました。もう一度送信するか、ブラウザ画面を更新して最初からやり直してください。';
        newTalk.error = data;
        chatDiv.talks.push(newTalk);
      } else if (isClient) {
        // ユーザーの入力の場合
        newTalk.text = data.conversation.input.text;
        newTalk.conversation = data.conversation;
        newTalk.images = data.image;
        chatDiv.talks.push(newTalk);
      } else if (data.conversation && data.conversation.output.text) {
        // Conversationからの戻りの場合
        // メッセージは配列のため、配列の分だけふきだしを作成する
        // メッセージが複数来るのはDialogの終点のみの想定(「ご利用ありがとうございました」->「こんにちは」)
        data.conversation.output.text.forEach(function(text, index) {
          // 会話用オブジェクトをコピーする
          var tempTalk = Object.assign({},newTalk);
          tempTalk.conversation = data.conversation;
          if (!text && text !== '') {
            text = '(返答がありませんでした。)';
          }
          tempTalk.text = text;
          if (index == 0 && data.items && data.items.length) {
            tempTalk.items = data.items;
          } else {
            tempTalk.items = [];
          }
          chatDiv.talks.push(tempTalk);
        });
      } else {
        // 上記にあてはまらないものの場合
        newTalk.texts = ['不正な返答です。ブラウザ画面を更新して最初からやり直してください。'];
        newTalk.error = data;
        chatDiv.talks.push(newTalk);
      }
      // この時点では画面には反映されていないので、
      // 画面に反映された後の処理は$nextTickを利用して定義する
      return chatDiv.$nextTick()
        .then(function() {
          // 画面を最新の吹き出し(リクエスト中の'...'吹き出しを除く)までスクロールさせる
          chatDiv.scrollTimeline();
          // Promiseを利用してここまでの処理が完了するまで待機させる
          return Promise.resolve();
        });
    },
    /**
     * ユーザーの入力を送信および入力値やConversationの戻りの表示(送信ボタンをクリックした時に実行される)
     * @param {Event} event optional. ボタンをクリックした時のEventオブジェクト
     * @param {boolean} hideClientInput optional. 送信はするがユーザーの入力を表示させない場合はtrue
     */
    sendMessage: function(event, hideClientInput) {
      var chatDiv = this;
      // 送信中フラグをtrueにする(送信ボタンが無効になる)
      chatDiv.isRequesting = true;
      // chatDiv.messageがテキストフォームの入力値と連動しているので、stagedConversation.input.textにコピーする
      chatDiv.stagedConversation.input = {
        text: chatDiv.message + ""
      };
      // ふきだし表示用にオブジェクトを作成
      // 画像のほうはフォームに格納されている画像のコピーを作成する
      var newMessage = {
        conversation: chatDiv.stagedConversation,
        image: chatDiv.stagedImages.concat()
      };
      // addMessageで入力内容をふきだしに表示させる
      chatDiv.addMessage(newMessage, true, null, hideClientInput)
        .then(function() {
          // ふきだしへの表示が完了した後にサーバーに入力値を送信する
          return apiAc.sendMessage(chatDiv.stagedConversation,chatDiv.stagedImages);
        })
        .then(function(data) {
          // 会話を続行させるため、Conversationから帰って来たcontextを保管して次の会話に使う
          chatDiv.stagedConversation = {
            context: data.conversation.context
          };
          return chatDiv.addMessage(data, false);
        })
        .then(function() {
          // フォームの入力値を削除する
          chatDiv.clearForms();
          // リクエスト中を示すisRequestingをfalseにする(送信ボタンが有効になる)
          chatDiv.isRequesting = false;
          // contextのisWaitingForItemSearchフラグがtrueの場合は服検索待ちなので、バックグラウンドで空メッセージを送信する
          if(chatDiv.stagedConversation.context.isWaitingForItemSearch) {
            chatDiv.sendMessage(null, true);
          }
        })
        .catch(function(e) {
          // エラー発生の場合
          // 送信ボタンの有効化
          chatDiv.isRequesting = false;
          // ふきだしにエラーメッセージを表示
          chatDiv.addMessage(e, false, true);
          // デバッグコンソールにエラーを表示
          console.error(e);
        });
    },
    /**
     * 特定のふきだしが見えるように画面をスクロールさせる
     * @param {string} target optional. ふきだしのID(talksに格納されている会話のID)
     *    無い場合は最新のふきだし(送信中の'...'ふきだしは除く)までスクロールさせる
     */
    scrollTimeline: function(target) {
      // target is null or xxxx in .timeline>div[data-msg-id=xxxx]
      var chatDiv = this;
      // ふきだし用要素を指定するためのセレクタを格納する変数
      var targetSelector;
      if(!target) {
        // targetの指定が無い場合、送信中の'...'ふきだしは除いた最新のふきだしを指定できるようにする
        targetSelector = '.chat-timeline-callout:nth-last-child(2)';
      } else {
        targetSelector = ('[data-msg-id="' + target + '"]');
      }
      // ふきだし用要素を取得する
      var scrollEl = chatDiv.$el.querySelector('.chat-timeline').querySelector(targetSelector);
      if(scrollEl) {
        // 見つかったふきだし用要素が見えるようスクロールさせる
        scrollEl.scrollIntoView();
      }
    },
    /**
     * フォーム(テキスト、画像)を空にする
     */
    clearForms: function() {
      var chatDiv = this;
      chatDiv.message = '';
      chatDiv.stagedImages = [];
    },
    /**
     * 画像の読み込み(画像フォームで画像ファイルを選択した後に実行)
     * @param {Event} event optional. フォームが変化した際のEventオブジェクト
     */
    readImage: function(event) {
      var chatDiv = this;
      var files = event.target.files || event.dataTransfer.files;
      if (!files || files.length < 1) {
        // ファイルが選択されていなければここで終了
        return;
      }
      // ファイルをdataURLに変換する
      chatDiv.readFileAsDataURL(files[0])
        .then(function(base64String) {
          // 送信予定画像としてstagedImagesに追加する
          chatDiv.stagedImages.push(base64String);
          // 画像選択フォームを空にする
          return chatDiv.resetFileInput();
        })
        .catch(function(e) {
          // ファイル読み込みに失敗した場合の処理
          chatDiv.resetFileInput();
          console.error(e);
          alert('画像の読み込みに失敗しました。再度お試しください。');
        });
    },
    /**
     * ファイルをDataURLに変換する
     * @param {File} file Fileオブジェクト
     * @return {Promise.<string>} 画像のDataURL(Promiseオブジェクトに含まれる)
     */
    readFileAsDataURL: function(file) {
      var chatDiv = this;
      return new Promise(function(resolve, reject) {
        // ファイルサイズが大きいと画像認識に時間がかかるので圧縮する
        // 元の画像のファイルサイズを取得
        var currentFileSize = file.size;
        // サイズ上限を定義(このサイズより大きい場合は圧縮させる)
        var maxFileSize = 1048576; // 1 MB

        // ファイル読み取りのためのFileReaderオブジェクトを作成
        var reader = new FileReader();
        // 読み取りエラーの場合の処理を定義
        reader.onerror = function(e) {
          reject(e);
        }
        // 読み取り成功の場合の処理を定義
        reader.onload = function(event) {
          if (currentFileSize > maxFileSize) {
            // ファイルのサイズが上限を超えていた場合は圧縮処理に入る
            chatDiv.compressImage(reader.result, maxFileSize/currentFileSize)
              .then(function(compressedImage) {
                // 圧縮した画像のdataURLを返す
                resolve(compressedImage);
              })
              .catch(function(e) {
                reject(e);
              });
          } else {
            // ファイルサイズが上限を超えなかった場合はそのままdataURLを返す
            resolve(reader.result);
          }
        }
        // ファイル読み込みの開始
        reader.readAsDataURL(file);
      });
    },
    /**
     * ファイル選択フォームを空にする
     */
    resetFileInput: function() {
      // ファイル選択フォームは入力値の書き換えができないため、Vue.jsのv-ifを利用してフォームを再描画させる
      var chatDiv = this;
      chatDiv.keepFileInput = false;
      return chatDiv.$nextTick()
        .then(function() {
          chatDiv.keepFileInput = true;
        });
    },
    /**
     * 商品プレビューダイアログを表示させる(ふきだし内の商品画像をクリックした時に実行)
     * @param {Event} event optional. クリックイベント
     * @param {object} targetItem プレビューを見せる商品の情報
     */
    openItemPreview: function(event, targetItem) {
      // ダイアログは別コンポーネントなので、コンポーネント間の共有ストア(public/js/store.js)に商品情報を格納する
      store.setCurrentItem(targetItem);
      // ダイアログ表示処理はmainコンポーネントの方で実行するため、処理のトリガーとなるopendialogイベントを発生させる
      // (index.htmlで<chatdiv v-on:opendialog="openDialog($event)">で定義している)
      this.$emit('opendialog', event);
    },
    /**
     * 送信画像プレビューダイアログを表示させる(ふきだし内の商品画像をクリックした時に実行)
     * @param {Event} event optional. クリックイベント
     * @param {string} base64Image プレビューを見せる画像
     */
    openImagePreview: function(event, base64Image) {
      // 商品プレビューダイアログを流用するため、コンポーネント間の共有ストアに商品情報と同様の形式になるよう画像を格納する
      store.setCurrentItem({
        image: base64Image,
        isOnlyImage: true,
      });
      this.$emit('opendialog', event);
    },
    /**
     * 画像圧縮
     * @param {string} dataURL dataURL化した画像
     * @param {Number} compRatio 圧縮率
     * @return {Promise,<string>} 圧縮した画像のdataURL(Promiseオブジェクトに含まれる)
     */
    compressImage: function(dataURL, compRatio) {
      return new Promise(function (resolve, reject) {
        // Canvasオブジェクトが画像を圧縮してdataURLに変換する関数を持っているため、
        // dataURLからCanvasオブジェクトを作成して圧縮させる

        // 画像の縦・横の大きさを取得するため、一旦dataURLから画像を非表示の状態で描画する
        var img = new Image();
        img.src = dataURL;
         // 画像描画後でないと縦・横の大きさが取得できないので、描画完了まで待機する
        img.onload = function () {
          var width = img.width;
          var height = img.height;
          // Canvasオブジェクトの作成
          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          // Canvasオブジェクトを描画
          ctx.drawImage(img, 0, 0, width, height);
          // 描画したCanvasをdataURLに変換
          resolve(canvas.toDataURL('image/jpeg', compRatio));
        };
      });
    },
  },
  mounted: function() {
    // コンポーネントのインスタンスが画面にマウントされた後の処理
    // ここでは、「ようこそ」メッセージを取得するため、描画完了後($nextTickの処理)Conversationに空メッセージを送る
    var chatDiv = this;
    chatDiv.$nextTick(function() {
      chatDiv.sendMessage(null, true);
    })
  }
});
