// 画面の大枠用コンポーネント
var main = new Vue({
  el: '#main',
  data: {
    // 現在開いているタブの番号
    currentTab: 0,
    // ダイアログを表示しているか否か(ダイアログを表示中はtrue)
    isShowDialog: false
  },
  methods: {
    /**
     * ダイアログを表示
     * @param {Event} event optional. 商品画像をクリックした時などのイベント
     */
    openDialog: function(event) {
      this.isShowDialog = true;
    },
    /**
     * ダイアログを隠す
     * @param {Event} event optional. ダイアログのxや黒い部分をクリックしたときのイベント
     */
    closeDialog: function(event) {
      this.isShowDialog = false;
      // ダイアログのに表示する値を入れていたコンポーネント間の共有ストア(public/js/store.js)を空にする
      if (store && store.state && store.state.currentItem) {
        store.setCurrentItem({});
      }
    }
  }
});

