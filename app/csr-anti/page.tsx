'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function CSRAntiPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ❌ アンチパターン: useEffectでのデータフェッチ
  useEffect(() => {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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
        <h1>❌ CSR Anti-Pattern</h1>
        <p style={{ marginTop: '0.5rem', color: '#856404' }}>
          <strong>⚠️ これは意図的なアンチパターン実装です</strong>
        </p>
      </div>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>問題点:</h2>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>初回レンダリング時にコンテンツなし（SEO非対応）</li>
          <li>useEffectによるウォーターフォールリクエスト</li>
          <li>ローディング状態管理の複雑化</li>
          <li>不十分なエラーハンドリング</li>
        </ul>
      </section>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
        <h2>商品一覧</h2>
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ marginTop: '1rem' }}>読み込み中...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            background: '#f8d7da', 
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '1rem', 
            borderRadius: '8px' 
          }}>
            エラー: {error}
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              注: APIエンドポイントがまだ実装されていない可能性があります
            </p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            商品データがありません。APIエンドポイント（/api/products）を実装してください。
          </p>
        )}

        {!loading && !error && products.length > 0 && (
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
              }}>
                <h3>{product.name}</h3>
                <p style={{ color: '#666', margin: '0.5rem 0' }}>{product.category}</p>
                <p style={{ fontWeight: 'bold', color: '#28a745' }}>${product.price}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
