import Link from 'next/link';
import { Suspense } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

// 🚀 ISR: Incremental Static Regeneration
async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch('http://localhost:3000/api/products', {
      next: { 
        revalidate: 60, // 60秒キャッシュ
        tags: ['products'] // タグベース再検証用
      }
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

// 🚀 React Server Component
async function ProductList() {
  const products = await getProducts();
  
  if (products.length === 0) {
    return (
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
    );
  }
  
  return (
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
  );
}

// Loading component
function ProductListSkeleton() {
  const skeletonStyle = {
    border: '1px solid #e0e0e0',
    padding: '1rem',
    borderRadius: '8px',
    background: '#f8f9fa',
    height: '150px'
  };

  const lineStyle1 = {
    background: '#e0e0e0',
    height: '20px',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  const lineStyle2 = {
    background: '#e0e0e0',
    height: '16px',
    borderRadius: '4px',
    marginBottom: '0.5rem',
    width: '60%',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  const lineStyle3 = {
    background: '#e0e0e0',
    height: '16px',
    borderRadius: '4px',
    width: '40%',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={skeletonStyle}>
            <div style={lineStyle1} />
            <div style={lineStyle2} />
            <div style={lineStyle3} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function RSCOptimalPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#0070f3', marginBottom: '1rem', display: 'inline-block' }}>
        ← ホームに戻る
      </Link>
      
      <div style={{ 
        background: '#d4edda', 
        border: '1px solid #28a745',
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h1>🚀 RSC Optimal</h1>
        <p style={{ marginTop: '0.5rem', color: '#155724' }}>
          <strong>React Server Componentsによる最適化実装</strong>
        </p>
      </div>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>最適化ポイント:</h2>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>🚀 並列データフェッチ（ウォーターフォール回避）</li>
          <li>🚀 ISR（Incremental Static Regeneration）で高速配信</li>
          <li>🚀 Streaming SSRで段階的レンダリング</li>
          <li>🚀 最小限のJavaScriptバンドル</li>
          <li>🚀 キャッシュ戦略の細かい制御</li>
        </ul>
      </section>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
        <h2>商品一覧</h2>
        
        {/* 🚀 Suspense境界でStreaming SSR */}
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList />
        </Suspense>
      </section>

      <section style={{ 
        background: '#cce5ff',
        border: '1px solid #b8daff',
        padding: '1.5rem',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3 style={{ color: '#004085', marginBottom: '0.5rem' }}>💡 技術的特徴</h3>
        <div style={{ color: '#004085' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>ISR（60秒キャッシュ）:</strong> 初回アクセス後、60秒間はキャッシュから高速配信
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Streaming SSR:</strong> データ取得完了前でもページ表示開始
          </p>
          <p>
            <strong>タグベース再検証:</strong> 商品更新時に即座にキャッシュ無効化可能
          </p>
        </div>
      </section>
    </main>
  );
}

// 🚀 メタデータ生成
export const metadata = {
  title: 'RSC Optimal - Performance Observatory',
  description: 'React Server Components最適化実装パターン',
};
