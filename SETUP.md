# セットアップガイド

このガイドに従って、Performance Observatoryプロジェクトをローカル環境でセットアップします。

---

## 📋 前提条件

以下がインストールされていることを確認してください：

- **Node.js**: 18.17.0 以上
- **npm**: 9.0.0 以上
- **Git**: 最新版

確認方法：
```bash
node --version  # v18.17.0以上
npm --version   # 9.0.0以上
git --version
```

---

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/[your-username]/nextjs-rendering-patterns-demo.git
cd nextjs-rendering-patterns-demo
```

### 2. 依存関係のインストール

```bash
npm install
```

インストール時間：約1-2分

### 3. 環境変数の設定

```bash
# .env.exampleをコピー
cp .env.example .env.local

# 必要に応じて編集
# デフォルト設定で動作します
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. ブラウザで確認

http://localhost:3000 にアクセス

✅ 成功すると比較ダッシュボードが表示されます

---

## 📁 初期ファイル構造の作成

現時点では設定ファイルのみが存在します。以下のコマンドで基本的なディレクトリ構造を作成してください：

### Windows (PowerShell):

```powershell
# ディレクトリ作成
New-Item -ItemType Directory -Path app, components, lib, types, config, public, docs -Force

# app配下
New-Item -ItemType Directory -Path "app\(patterns)\csr-anti", "app\(patterns)\ssr-standard", "app\(patterns)\rsc-optimal", "app\api\products", "app\api\metrics" -Force

# components配下
New-Item -ItemType Directory -Path "components\patterns\client", "components\patterns\server", "components\ui", "components\metrics" -Force

# lib配下
New-Item -ItemType Directory -Path "lib\data", "lib\fetchers", "lib\metrics", "lib\utils" -Force

# types配下は空でOK

# 基本ファイル作成
New-Item -ItemType File -Path "app\layout.tsx", "app\page.tsx", "app\globals.css" -Force
```

### macOS / Linux:

```bash
# ディレクトリ作成
mkdir -p app/\(patterns\)/{csr-anti,ssr-standard,rsc-optimal} \
         app/api/{products,metrics} \
         components/patterns/{client,server} \
         components/{ui,metrics} \
         lib/{data,fetchers,metrics,utils} \
         types \
         config \
         public/images \
         docs

# 基本ファイル作成
touch app/layout.tsx app/page.tsx app/globals.css
```

---

## 🔧 基本ファイルの作成

### app/layout.tsx

最小限のルートレイアウトを作成：

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Performance Observatory',
  description: 'Next.js rendering patterns comparison',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
```

### app/page.tsx

シンプルなホームページ：

```tsx
export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Performance Observatory</h1>
      <p>Next.js App Router レンダリングパターン比較デモ</p>
      
      <nav style={{ marginTop: '2rem' }}>
        <h2>実装パターン:</h2>
        <ul>
          <li>
            <a href="/csr-anti">❌ CSR Anti-Pattern</a>
          </li>
          <li>
            <a href="/ssr-standard">✅ SSR Standard</a>
          </li>
          <li>
            <a href="/rsc-optimal">🚀 RSC Optimal</a>
          </li>
        </ul>
      </nav>
      
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0' }}>
        <h3>セットアップ完了！</h3>
        <p>プロジェクトが正常に動作しています。</p>
        <p>次のステップ: 各パターンの実装を進めてください。</p>
      </div>
    </main>
  )
}
```

### app/globals.css

基本的なスタイル：

```css
* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: #0070f3;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

---

## ✅ 動作確認

### 1. TypeScript型チェック

```bash
npm run type-check
```

エラーがないことを確認

### 2. Lint実行

```bash
npm run lint
```

警告・エラーがないことを確認

### 3. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセスして、ホームページが表示されることを確認

---

## 🎯 次のステップ

1. **モックデータの作成**
   - `lib/data/products.ts` に商品データを追加

2. **APIルートの実装**
   - `app/api/products/route.ts` を作成

3. **各パターンの実装**
   - CSR-Anti パターン
   - SSR-Standard パターン
   - RSC-Optimal パターン

4. **コンポーネントの実装**
   - サーバーコンポーネント
   - クライアントコンポーネント

詳細な実装例は `CODE_EXAMPLES.md` を参照してください。

---

## 🐛 トラブルシューティング

### ポート3000が使用中の場合

```bash
# 別のポートで起動
PORT=3001 npm run dev
```

### node_modulesの再インストール

```bash
# 既存の削除
rm -rf node_modules package-lock.json

# 再インストール
npm install
```

### TypeScriptエラーが出る場合

```bash
# 型定義の更新
npm install --save-dev @types/node @types/react @types/react-dom
```

### キャッシュのクリア

```bash
# Next.jsキャッシュクリア
npm run clean
```

---

## 📚 参考リンク

- [Next.js ドキュメント](https://nextjs.org/docs)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [プロジェクトドキュメント](./README.md)

---

## 🤝 サポート

問題が発生した場合：

1. [Issues](https://github.com/[your-username]/nextjs-rendering-patterns-demo/issues)を確認
2. 新しいIssueを作成
3. ドキュメントを参照

---

**セットアップ完了！** 🎉

実装を始めましょう！
