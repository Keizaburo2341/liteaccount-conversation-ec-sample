// 商品検索タブ用コンポーネント
Vue.component('itemdiv',{
  template: '#itemTab',
  data: function() {
    return {
      // 商品リストを格納
      items: [],
      // 検索フォームの入力値(フォームと連動)
      searchText: '',
      // リクエスト中か否かのフラグ(リクエスト中はtrue)
      isRequesting: false,
      // エラーが発生した場合にエラーを格納して表示
      currentError: null,
    }
  },
  methods: {
    /**
     * 商品リストの商品情報を入れ替える
     * @param {object[]} newArray 商品情報
     */
    setItems: function(newArray) {
      // この時点ではコンポーネントがthisとして入るので、変数に格納しておく(関数の入れ子になるとthisが指すものが変化するため)
      var itemDiv = this;
      // itemsの配列への参照を保持するため、
      // Array.prototype.spliceで配列の各要素を削除してから商品情報を格納する
      itemDiv.items.splice(0);
      newArray.forEach(function(newElement) {
        itemDiv.items.push(newElement);
      });
    },
    /**
     * 商品検索リクエスト送信
     * @param {string} searchText optional. 検索キーワード e.g. '青 スカート'
     * @return {Promise.<object[]>} 検索結果(商品文書の配列)
     */
    getItems: function(searchText) {
      return apiAc.searchItems(searchText);
    },
    /**
     * 商品検索および画面更新(検索ボタンをクリックした時に実行)
     * @param {Event} event optional. 検索ボタンクリック時のイベント
     */
    updateItemListView: function(event) {
      var itemDiv = this;
      // リクエスト中フラグをtrueにする(検索ボタンを無効にする)
      itemDiv.isRequesting = true;
      // 前回発生したエラーを削除する
      itemDiv.clearError();
      return itemDiv.getItems(itemDiv.searchText)
        .then(function(newItems) {
          // 商品検索が完了した場合の処理
          // リクエスト中フラグをfalesにする(検索ボタンを有効にする)
          itemDiv.isRequesting = false;
          itemDiv.setItems(newItems);
        })
        .catch(function(e) {
          // エラーが発生した場合の処理
          itemDiv.isRequesting = false;
          itemDiv.showError(e);
          console.error(e);
        });
    },
    /**
     * エラーを表示
     * @param {Error} error エラーオブジェクト
     */
    showError: function(error) {
      this.currentError = error;
    },
    /**
     * currentErrorを空にする
     */
    clearError: function() {
      this.currentError = null;
    },
    /**
     * フォームを空にする
     */
    clearForms: function() {
      this.searchText = '';
    },
    /**
     * 商品プレビューダイアログを表示(商品リストの商品をクリックした時に実行)
     * @param {Event} event optional. クリックイベント
     * @param {object} targetItem プレビューを見せる商品の情報
     */
    openItemPreview: function(event, targetItem) {
      // コンポーネント間の共有ストア(public/js/store.js)に商品情報を格納する
      store.setCurrentItem(targetItem);
      // ダイアログ表示処理はmainコンポーネントの方で実行するため、処理のトリガーとなるopendialogイベントを発生させる
      this.$emit('opendialog', event);
    },
  },
  mounted: function() {
    // コンポーネントのインスタンスが画面にマウントされた後の処理
  },
});
