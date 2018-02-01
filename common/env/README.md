#各種設定ファイル

##default.json
ConversationのワークスペースIDやCloudantのDB名を記入します。

```json
{
  "CONVERSATION_WS_ID": "ConversationのワークスペースID",
  "VISUAL_RECOGNITION_CLASSIFIERS": {
    "CLOTH_TYPE": "服のタイプ検出用ClassifierのID",
    "CLOTH_COLOR": "服の色検出用ClassifierのID"
  },
  "DB_NAME": "アプリ用DB名(ecsitedb)",
  "DB_INDEX": {
    "SEARCH_ITEM": {
      "designDocName": "商品検索インデックス用文書の名前(item)",
      "indexName": "商品検索インデックス用の名前(itemSearch)"
    }
  },
  "LOG_LEVEL": "ログレベル(info)"
}
```

##VCAP_SERVICES.json
ご自分のPCでアプリを起動する場合、VCAP_SERVICES環境変数の代わりに利用します。
IBM Cloud上でアプリを稼働させる場合は不要です。

下記のいずれかをコピーしてVCAP_SERVICES.jsonに貼り付けて下さい
- IBM CloudダッシュボードのNode.jsアプリの環境変数画面にあるVCAP_SERVICESのjson(VCAP_SERVICES.jsonの内容をダッシュボードの値に置き換えて下さい)
- 各サービスの資格情報(conversation等、該当する部分のみ置換して下さい)

**ローカルPCでのテスト目的に利用するファイルです。ご自分のVCAP_SERVICESを貼り付けたファイルは公開しないようにしてください。**

※VCAP_SERVICES環境変数
  IBM Cloud上で稼働しているNodejsアプリでは、
  VCAP_SERVICES環境変数でアプリにバインドしたサービスへの資格情報が確認できるようになっています。
  普通のPCでアプリを稼働する際にはVCAP_SERVICES環境変数が設定されていないので、
  代わりにこちらのJSONを使います。

```
// VCAP_SERVICESの内容(抜粋)
{
  "watson_vision_combined": [
    {
      "credentials": {
        "url": "https://gateway-a.watsonplatform.net/visual-recognition/api",
        "note": "アカウントに関するお知らせ",
        "api_key": "Visual RecongitionのAPIキー"
      },
      "name": "Visual Recongitionサービスの名前"
    }
  ],
  "conversation": [
    {
      "credentials": {
        "url": "https://gateway.watsonplatform.net/conversation/api",
        "username": "Conversationサービスのユーザー名",
        "password": "Conversationサービスのパスワード"
      },
      "name": "Conversationサービスの名前"
    }
  ],
  "cloudantNoSQLDB": [
    {
      "credentials": {
        "username": "Cloudantサービスのユーザー名",
        "password": "Cloudantサービスのパスワード",
        "host": "Cloudantサービスのホスト名",
        "port": 443,
        "url": "https://ユーザー名:パスワード@Cloudantサービスのホスト名"
      },
      "name": "Cloudantサービスの名前"
    }
  ]
}
```