# 時間割LINE Bot (Koyeb 24/7 稼働対応)

このリポジトリは、Koyebの無料枠で24時間365日稼働し続けるように最適化された時間割確認用のLINE Botです。

## Koyebでのデプロイ方法

1. **GitHubリポジトリの作成**: このコードを自分のGitHubリポジトリにプッシュします。
2. **Koyebにログイン**: [Koyeb Console](https://app.koyeb.com/)にアクセスします。
3. **新しいサービスの作成**:
   - `Web Service` を選択。
   - 自分のGitHubリポジトリを選択。
   - `Instance Type` は `Nano` (無料枠) を選択。
   - `Region` は `Washington, D.C.` または `Frankfurt` を選択。
4. **環境変数の設定**:
   - `CHANNEL_ACCESS_TOKEN`: LINE Developersコンソールで発行したアクセストークン。
   - `CHANNEL_SECRET`: LINE Developersコンソールにあるチャンネルシークレット。
   - `SITE_URL`: Koyebで割り当てられるアプリのURL (例: `https://myapp.koyeb.app`)。**自分自身をピンしてスリープを防ぐために必要です。**
   - `NEXT_PUBLIC_GOOGLE_CALENDAR_ID`: (任意) GoogleカレンダーのID。カンマ区切りで複数指定可能。
5. **デプロイ**: 「Deploy」ボタンを押して完了。

## 24時間稼働の仕組み

- **セルフピン機能**: `index.js` 内で10分おきに `SITE_URL` へHTTPリクエストを送信し、インスタンスが「Deep Sleep」に入るのを防ぎます。
- **startスクリプト**: `package.json` に `node index.js` を実行する `start` スクリプトを追加済み。

## さらなる安定性のために

Koyebの無料枠は非常に強力ですが、内部からのピンだけでは稀にスリープしてしまうことがあります。100%の稼働率を確保したい場合は、[UptimeRobot](https://uptimerobot.com/) などの外部サービスから `SITE_URL` を5分おきに監視することをお勧めします。

## ライセンス
MIT
