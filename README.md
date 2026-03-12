# GECO2 Object Counter — フロントエンド

画像内のオブジェクトを自動/半自動でカウントする Web アプリ。  
バックエンドの GECO2 API サーバー (`localhost:7860`) と連携して動作します。

## セットアップ

```bash
npm install
```

## 開発サーバー起動

```bash
npm run dev
```

`http://localhost:5173` でアクセスできます。  
LAN 内の他端末からアクセスする場合：

```bash
npx vite --host
```

表示される Network URL (例: `http://192.168.x.x:5173`) を使用。

## 本番ビルド

```bash
npm run build
```

`dist/` に静的ファイルが生成されます。Nginx 等で配信できます。

## ビルド結果のプレビュー

```bash
npm run preview
```

## API プロキシ設定

開発サーバーは `/predict*`, `/health` へのリクエストを `http://localhost:7860` に転送します。  
API サーバーが別ホストにある場合は `vite.config.js` の `proxy` を編集してください。
