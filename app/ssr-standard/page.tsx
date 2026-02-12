import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

// ✅ サーバーコンポーネント（デフォルト）
async function getProducts(): Promise<Product[]> {
  try {
    // 実際のAPIエンドポイントを呼び出し
    const res = await fetch('http://localhost:3000/api/products', {
      cache: 'no-store', // 常に最新データ
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    
    const data = await res.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function SSRStandardPage() {
  const products = await getProducts();
  
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#0070f3', marginBottom: '1rem', display: 'inline-block' }}>
        ← ホームに戻る
      </Link>
      
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffc107',
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h1>✅ SSR Standard</h1>
        <p style={{ marginTop: '0.5rem', color: '#856404' }}>
          <strong>サーバーサイドレンダリングの標準実装</strong>
        </p>
      </div>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>特徴:</h2>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>✅ サーバーでデータ取得（SEO完全対応）</li>
          <li>✅ 初回表示が速い</li>
          <li>✅ 認証チェックが容易</li>
          <li>⚠️ リクエスト毎にサーバー処理（負荷高）</li>
          <li>⚠️ TTFB（Time to First Byte）が増加</li>
        </ul>
      </section>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
        <h2>商品一覧</h2>
        
        {products.length === 0 ? (
          <div style={{ 
            background: '#d1ecf1',
            border: '1px solid #bee5eb',
            color: '#0c5460',
            padding: '1rem', 
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <p>商品データがありません。</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              APIエンドポイント（/api/products）を実装してください。
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '1.5rem'
          }}>
            {products.map(product => (
              <div key={product.id} style={{ 
                border: '1px solid #e0e0e0',
                padding: '1rem',
                borderRadius: '8px',
                transition: 'transform 0.2s',
                background: 'white'
              }}>
                <h3>{product.name}</h3>
                <p style={{ color: '#666', margin: '0.5rem 0' }}>{product.category}</p>
                <p style={{ fontWeight: 'bold', color: '#28a745' }}>${product.price}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ 
        background: '#d4edda',
        border: '1px solid #c3e6cb',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3 style={{ color: '#155724', marginBottom: '0.5rem' }}>💡 実装のポイント</h3>
        <p style={{ color: '#155724' }}>
          このページはサーバーで完全にレンダリングされているため、
          ブラウザでJavaScriptを無効にしても表示されます（SEO対応）。
        </p>
      </section>
    </main>
  );
}

// ✅ メタデータ生成
export const metadata = {
  title: 'SSR Standard - Performance Observatory',
  description: 'Server-Side Rendering標準実装パターン',
};
