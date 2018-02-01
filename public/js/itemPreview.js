// 商品プレビュー用ダイアログの内容用コンポーネント
Vue.component('itempreview',{
  template: '#itemPreview',
  data: function() {
    return {
      // コンポーネント間の共有ストアを取得(chatタブやitemタブで商品画像を格納する)
      state: store.state
    }
  },
  methods: {
  }
});
