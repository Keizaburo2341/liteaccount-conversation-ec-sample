#各サービスのセットアップ用ファイル

Watson ConversationおよびCloudantのセットアップ用ファイルです。
アプリを起動する前に両者のセットアップを実施してください。

##Conversation

./conversation/workspace-conversation.json: ワークスペース用JSON

##Cloudant

./coudant/cloudant_index.json: Cloudantの全文検索用インデックスの設定用JSON
./cloudant/itemDoc/itemlist.json: ECサイトの商品情報用JSON
./cloudant/cloudantSetup.js: 上記itemlist.jsonの内容をDBに書き込むスクリプト(アプリ起動時に実行されます)

インデックス設定用JSONは
ダッシュボード>ecsitedb>All Documentsの+アイコン>New Search Index の
インデックス作成フォームで作成したものです。

フォームには下記のように入力しています。

save to design document
`_design/item`

index name
`itemSearch`

search index function

```javascript
function (doc) {
  if (doc.docType == 'ITEM') {
    var searchTargetKey = [doc.name, doc.description];
    index("default", searchTargetKey.join(' '));
    for(var key in doc) {
      if(key !== '_id' && key !== '_rev') {
        index(key, doc[key], {store: 'yes'});
      }
    }
  }
}
```

Analyzer
`Multiple`

  - Default: `Japanese`
  
  - Fieldname : `default` Analyzer: `Standard`