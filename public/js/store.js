
// コンポーネント間(chatタブ-itemダイアログ など)で値を受けわたすための共有ストア
var store = {
  state: {
    // 商品プレビュー用の画像などを格納するオブジェクト
    currentItem: {},
  },
  // currentItemのgetterおよびsetterを定義
  getCurrentItem: function() {
    return this.state.currentItem;
  },
  setCurrentItem: function(newItem) {
    this.state.currentItem = newItem;
  },
};
