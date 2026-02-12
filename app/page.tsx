import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>🎯 Performance Observatory</h1>
        <p className="subtitle">
          Next.js App Router レンダリングパターン比較デモ
        </p>
      </header>

      <section className="intro">
        <p>
          このプロジェクトは、Next.js App Routerの3つの異なるレンダリング戦略を実装・比較し、
          設計判断を可視化するデモです。
        </p>
      </section>

      <section className="patterns">
        <h2>📊 実装パターン</h2>
        
        <div className="pattern-grid">
          <div className="pattern-card anti">
            <h3>❌ CSR Anti-Pattern</h3>
            <p>クライアントサイドレンダリングのアンチパターン実装</p>
            <ul>
              <li>useEffectでのデータフェッチ</li>
              <li>ウォーターフォールリクエスト</li>
              <li>SEO非対応</li>
            </ul>
            <Link href="/csr-anti" className="btn btn-anti">
              実装を見る →
            </Link>
          </div>

          <div className="pattern-card standard">
            <h3>✅ SSR Standard</h3>
            <p>サーバーサイドレンダリングの標準実装</p>
            <ul>
              <li>サーバーでデータ取得</li>
              <li>SEO完全対応</li>
              <li>リクエスト毎に処理</li>
            </ul>
            <Link href="/ssr-standard" className="btn btn-standard">
              実装を見る →
            </Link>
          </div>

          <div className="pattern-card optimal">
            <h3>🚀 RSC Optimal</h3>
            <p>React Server Componentsによる最適化実装</p>
            <ul>
              <li>並列データフェッチ</li>
              <li>ISR + Streaming SSR</li>
              <li>最小バンドルサイズ</li>
            </ul>
            <Link href="/rsc-optimal" className="btn btn-optimal">
              実装を見る →
            </Link>
          </div>
        </div>
      </section>

      <section className="status">
        <div className="status-box">
          <h3>✅ セットアップ完了！</h3>
          <p>プロジェクトが正常に動作しています。</p>
          <p className="next-step">
            次のステップ: 各パターンの実装ページを確認してください
          </p>
        </div>
      </section>

      <footer className="footer">
        <p>
          詳細な実装は <code>CODE_EXAMPLES.md</code> と{' '}
          <code>PATTERNS.md</code> を参照
        </p>
      </footer>
    </main>
  )
}
