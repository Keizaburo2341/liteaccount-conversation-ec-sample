'use strict';
// サーバーにリクエストする関数
var apiAc = (function() {
  /**
   * Conversation用メッセージおよびVisual Recognition用画像を送信
   * @param {object} message Conversation用オブジェクト
   * @param {string|string[]} image DataURL化した画像(１個分の文字列または複数個分の配列)
   * @return {Promise.<object>} Conversationからの戻りおよびおすすめ商品
   */
  var sendMessage = function(message,image) {
    var body = {
      conversation: message,
      image: image,
    };
    return axios.post('/api/talk', body)
      .then(function(response) {
        return response.data;
      })
      .catch(function(e) {
        throw e;
      });
  };
  /**
   * 商品検索
   * @param {string} searchText optional. 商品検索キーワード(無い場合はすべての商品を検索)
   * @return {Promise.<object[]>} 検索された商品文書の配列
   */
  var searchItems = function(searchText) {
    var url = '/api/shop/items';
    if (searchText) {
      // 検索キーワードがあればクエリパラメーターに設定
      url = '/api/shop/items' + '?search=' + searchText;
    }
    return axios.get(url)
      .then(function(response) {
        return response.data;
      })
      .catch(function(e) {
        throw e;
      });
  };
  // 関数をapiAc.xxxxで呼び出せるようにする
  return {
    sendMessage: sendMessage,
    searchItems: searchItems,
  };
})();

