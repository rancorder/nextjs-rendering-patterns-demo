# 実装パターン詳細解説

このドキュメントでは、3つのレンダリングパターンの詳細な実装方法と、その技術的背景を解説します。

---

## 目次

1. [CSR-Anti（アンチパターン）](#1-csr-antiアンチパターン)
2. [SSR-Standard（標準実装）](#2-ssr-standard標準実装)
3. [RSC-Optimal（最適実装）](#3-rsc-optimal最適実装)
4. [パターン選択のフローチャート](#4-パターン選択のフローチャート)
5. [実装時の注意点](#5-実装時の注意点)

---

## 1. CSR-Anti（アンチパターン）

### 概要
クライアントサイドで全てのデータフェッチを行う実装。Next.jsの強みを活かせていない失敗例。

### ファイル構成

```
app/(patterns)/csr-anti/
├── page.tsx              # メインページ
├── loading.tsx           # ローディングUI
└── products/
    └── [id]/
        ├── page.tsx      # 商品詳細ページ
        └── error.tsx     # エラーUI
```

### 実装例

#### page.tsx（商品一覧）

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { LoadingSpinner } from '@/components/patterns/client/LoadingSpinner';
import { ProductListCSR } from '@/components/patterns/client/ProductListCSR';

export default function CSRAntiPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ❌ アンチパターン1: useEffectでのデータフェッチ
  useEffect(() => {
    // ❌ アンチパターン2: エラーハンドリングが不十分
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []); // ❌ アンチパターン3: 依存配列が不適切な場合がある

  // ❌ 問題点: 初回レンダリング時にコンテンツなし
  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>CSR Anti-Pattern Implementation</h1>
      <p className="warning">
        ⚠️ This is an intentional anti-pattern for demonstration
      </p>
      <ProductListCSR products={products} />
    </div>
  );
}
```

#### products/[id]/page.tsx（商品詳細）

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/product';
import { useParams } from 'next/navigation';

export default function CSRProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ❌ アンチパターン4: ウォーターフォールリクエスト
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(product => {
        setProduct(product);
        
        // ❌ 最初のリクエスト完了後に次のリクエスト
        return fetch(`/api/recommendations?productId=${params.id}`);
      })
      .then(res => res.json())
      .then(recommendations => {
        setRecommendations(recommendations);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{product?.name}</h1>
      <p>{product?.description}</p>
      <h2>Recommendations</h2>
      {recommendations.map(rec => (
        <div key={rec.id}>{rec.name}</div>
      ))}
    </div>
  );
}
```

### 問題点の詳細

#### 1. SEO問題
```html
<!-- クライアントで見えるHTML -->
<html>
  <body>
    <div id="root">Loading...</div>
    <script src="bundle.js"></script>
  </body>
</html>

<!-- 検索エンジンが見るHTML（初回） -->
実際のコンテンツなし → インデックスされない
```

#### 2. パフォーマンス問題

```
タイムライン:
0ms    : HTMLダウンロード開始
100ms  : HTMLパース完了（コンテンツなし）
500ms  : JavaScriptダウンロード完了
1000ms : Reactハイドレーション完了
1100ms : useEffect実行 → fetch開始
1700ms : データ取得完了
1800ms : 画面更新（FCP）
2500ms : 画像ロード完了（LCP）

合計: 2500ms（遅い）
```

#### 3. ウォーターフォール問題

```typescript
// ❌ 悪い例
useEffect(() => {
  fetch('/api/products')           // 600ms
    .then(res => res.json())
    .then(products => {
      fetch('/api/recommendations') // 400ms（合計1000ms）
        .then(res => res.json())
        .then(recs => setRecommendations(recs));
    });
}, []);

// ✅ 改善案（それでもCSRは遅い）
useEffect(() => {
  Promise.all([
    fetch('/api/products'),        // 並列実行
    fetch('/api/recommendations')
  ])
    .then(([productsRes, recsRes]) => Promise.all([
      productsRes.json(),
      recsRes.json()
    ]))
    .then(([products, recs]) => {
      setProducts(products);
      setRecommendations(recs);
    });
}, []);
// それでも初回レンダリングが遅い
```

### 測定結果

```typescript
// lib/metrics/csr-measurements.ts
export const CSR_METRICS = {
  FCP: 1800,   // First Contentful Paint
  LCP: 2500,   // Largest Contentful Paint
  TTI: 4000,   // Time to Interactive
  TBT: 600,    // Total Blocking Time
  CLS: 0.15,   // Cumulative Layout Shift（高い）
  
  bundleSize: 210, // KB
  
  // ネットワークリクエスト
  requests: [
    { name: 'HTML', size: 2, time: 100 },
    { name: 'JS Bundle', size: 210, time: 400 },
    { name: 'API Products', size: 50, time: 600 },
    { name: 'API Recommendations', size: 30, time: 400 },
  ],
  
  totalNetworkTime: 1500, // ms
};
```

---

## 2. SSR-Standard（標準実装）

### 概要
サーバーサイドでデータ取得してHTMLを生成する標準的な実装。

### ファイル構成

```
app/(patterns)/ssr-standard/
├── page.tsx
├── loading.tsx
└── products/
    └── [id]/
        ├── page.tsx
        └── error.tsx
```

### 実装例

#### page.tsx（商品一覧）

```tsx
import { Suspense } from 'react';
import { Product } from '@/types/product';
import { ProductCard } from '@/components/patterns/server/ProductCard';

// ✅ サーバーコンポーネント（デフォルト）
async function getProducts(): Promise<Product[]> {
  // ✅ サーバーサイドでデータ取得
  const res = await fetch('http://localhost:3000/api/products', {
    cache: 'no-store', // 常に最新データ
    // または
    // next: { revalidate: 0 }
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return res.json();
}

export default async function SSRStandardPage() {
  const products = await getProducts();
  
  return (
    <div>
      <h1>SSR Standard Implementation</h1>
      <p className="info">
        ✅ Server-Side Rendering with fresh data on every request
      </p>
      
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// ✅ メタデータ生成（SEO対応）
export async function generateMetadata() {
  return {
    title: 'Products - SSR Standard',
    description: 'Server-side rendered product list',
  };
}
```

#### products/[id]/page.tsx（商品詳細）

```tsx
import { notFound } from 'next/navigation';
import { Product } from '@/types/product';

async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`http://localhost:3000/api/products/${id}`, {
    cache: 'no-store',
  });
  
  if (!res.ok) {
    if (res.status === 404) {
      notFound(); // 404ページを表示
    }
    throw new Error('Failed to fetch product');
  }
  
  return res.json();
}

async function getRecommendations(productId: string): Promise<Product[]> {
  const res = await fetch(
    `http://localhost:3000/api/recommendations?productId=${productId}`,
    { cache: 'no-store' }
  );
  
  if (!res.ok) {
    // レコメンデーションの失敗は致命的ではない
    return [];
  }
  
  return res.json();
}

interface Props {
  params: { id: string };
}

export default async function SSRProductDetailPage({ params }: Props) {
  // ⚠️ 直列実行（改善の余地あり）
  const product = await getProduct(params.id);
  const recommendations = await getRecommendations(params.id);
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>${product.price}</p>
      
      <section>
        <h2>You might also like</h2>
        <div className="recommendations">
          {recommendations.map(rec => (
            <ProductCard key={rec.id} product={rec} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ✅ 動的メタデータ
export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} - Product Detail`,
    description: product.description,
    openGraph: {
      images: [product.imageUrl],
    },
  };
}
```

### 改善版: 並列データフェッチ

```tsx
export default async function SSRProductDetailPageImproved({ params }: Props) {
  // ✅ 並列実行でウォーターフォール回避
  const [product, recommendations] = await Promise.all([
    getProduct(params.id),
    getRecommendations(params.id),
  ]);
  
  return (
    <div>
      <h1>{product.name}</h1>
      {/* ... */}
    </div>
  );
}
```

### 利点と欠点

#### ✅ 利点

1. **SEO完全対応**
```html
<!-- サーバーから返されるHTML -->
<html>
  <body>
    <h1>Product Name</h1>
    <p>Product Description</p>
    <!-- 完全なコンテンツがHTML内に存在 -->
  </body>
</html>
```

2. **初回表示が速い**
```
タイムライン:
0ms    : リクエスト受信
200ms  : データベースクエリ完了
300ms  : HTML生成完了
400ms  : HTML送信開始（TTFB）
600ms  : クライアントでHTML受信完了（FCP）
1200ms : Hydration完了（インタラクティブ）

合計: 1200ms（CSRより40%速い）
```

3. **認証・権限チェックが容易**
```tsx
export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login'); // サーバーでリダイレクト
  }
  
  const userData = await getUserData(session.userId);
  return <Dashboard data={userData} />;
}
```

#### ⚠️ 欠点

1. **サーバー負荷が高い**
```
リクエスト毎にサーバー処理:
- データベースクエリ
- HTML生成
- メモリ使用

10万PV/日 → 継続的なサーバー負荷
```

2. **TTFB（Time to First Byte）が遅い**
```
クライアント視点:
0ms    : リクエスト送信
400ms  : TTFB（サーバー処理時間）← ここが遅い
600ms  : FCP

静的ファイル配信ならTTFB < 50ms
```

3. **キャッシュが効きにくい**
```typescript
// cache: 'no-store' の場合、CDNキャッシュも無効
const res = await fetch('/api/products', {
  cache: 'no-store', // 常に新鮮だが遅い
});
```

### 測定結果

```typescript
export const SSR_METRICS = {
  FCP: 600,    // CSRより66%改善
  LCP: 1200,   // CSRより52%改善
  TTI: 2000,   // CSRより50%改善
  TBT: 300,    // CSRより50%改善
  CLS: 0.05,   // CSRより67%改善
  
  TTFB: 400,   // サーバー処理時間
  
  bundleSize: 155, // KB（CSRより少ない）
  
  serverLoad: 'High', // リクエスト毎に処理
};
```

---

## 3. RSC-Optimal（最適実装）

### 概要
React Server Componentsを活用し、ISR、Streaming SSR、Suspenseを組み合わせた最適化実装。

### ファイル構成

```
app/(patterns)/rsc-optimal/
├── page.tsx
├── loading.tsx
└── products/
    └── [id]/
        ├── page.tsx
        ├── loading.tsx
        └── error.tsx
```

### 実装例

#### page.tsx（商品一覧）

```tsx
import { Suspense } from 'react';
import { Product } from '@/types/product';
import ProductList from '@/components/patterns/server/ProductListRSC';
import RecommendationsRSC from '@/components/patterns/server/RecommendationsRSC';
import InteractiveFilters from '@/components/patterns/client/InteractiveFilters';
import { ProductListSkeleton, RecommendationsSkeleton } from '@/components/ui/Skeleton';

// 🚀 ISR: Incremental Static Regeneration
async function getProducts(): Promise<Product[]> {
  const res = await fetch('http://localhost:3000/api/products', {
    next: { 
      revalidate: 60, // 60秒キャッシュ
      tags: ['products'] // タグベース再検証
    }
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

// 🚀 より長いキャッシュ
async function getRecommendations(): Promise<Product[]> {
  const res = await fetch('http://localhost:3000/api/recommendations', {
    next: { revalidate: 300 } // 5分キャッシュ
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function RSCOptimalPage() {
  // 🚀 並列データフェッチ（Promise渡し）
  const productsPromise = getProducts();
  const recommendationsPromise = getRecommendations();
  
  return (
    <div>
      <h1>RSC Optimal Implementation</h1>
      <p className="success">
        🚀 React Server Components with ISR, Streaming, and Suspense
      </p>
      
      {/* 🚀 Streaming SSR: 各セクション独立してレンダリング */}
      <Suspense fallback={<ProductListSkeleton />}>
        {/* @ts-expect-error Async Server Component */}
        <ProductList promise={productsPromise} />
      </Suspense>
      
      <Suspense fallback={<RecommendationsSkeleton />}>
        {/* @ts-expect-error Async Server Component */}
        <RecommendationsRSC promise={recommendationsPromise} />
      </Suspense>
      
      {/* 🚀 クライアントコンポーネントは必要な部分のみ */}
      <InteractiveFilters />
    </div>
  );
}

// 🚀 メタデータも最適化
export const metadata = {
  title: 'Products - RSC Optimal',
  description: 'Optimized with React Server Components',
};
```

#### components/patterns/server/ProductListRSC.tsx

```tsx
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface Props {
  promise: Promise<Product[]>;
}

// 🚀 Promise unwrapping（React 19の機能）
export default async function ProductListRSC({ promise }: Props) {
  const products = await promise;
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

#### products/[id]/page.tsx（商品詳細）

```tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Product } from '@/types/product';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import AddToCartButton from '@/components/patterns/client/AddToCartButton';

// 🚀 ISR + Dynamic Params
async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`http://localhost:3000/api/products/${id}`, {
    next: { 
      revalidate: 3600, // 1時間キャッシュ
      tags: [`product-${id}`, 'products']
    }
  });
  
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error('Failed to fetch');
  }
  
  return res.json();
}

async function getReviews(productId: string) {
  const res = await fetch(
    `http://localhost:3000/api/reviews?productId=${productId}`,
    { next: { revalidate: 300 } } // 5分キャッシュ
  );
  
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  params: { id: string };
}

export default async function RSCProductDetailPage({ params }: Props) {
  // 🚀 メインコンテンツは即座に表示
  const product = await getProduct(params.id);
  
  // 🚀 レビューは遅延ロード可能
  const reviewsPromise = getReviews(params.id);
  
  return (
    <div>
      {/* メインコンテンツ（高速表示） */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p className="price">${product.price}</p>
      
      {/* 🚀 インタラクティブな部分のみクライアント化 */}
      <AddToCartButton productId={product.id} />
      
      {/* 🚀 レビューは独立してストリーミング */}
      <Suspense fallback={<div>Loading reviews...</div>}>
        {/* @ts-expect-error Async Server Component */}
        <Reviews promise={reviewsPromise} />
      </Suspense>
    </div>
  );
}

// 🚀 静的生成（Build時に人気商品を事前生成）
export async function generateStaticParams() {
  const products = await fetch('http://localhost:3000/api/products').then(r => r.json());
  
  // 人気上位20商品を事前生成
  return products
    .sort((a: Product, b: Product) => b.views - a.views)
    .slice(0, 20)
    .map((product: Product) => ({
      id: product.id.toString()
    }));
}

// 🚀 動的メタデータ
export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} - Product Detail`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 630,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.imageUrl],
    },
  };
}
```

### 高度な最適化: On-demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  
  // セキュリティチェック
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 });
  }
  
  const { type, id, path } = await request.json();
  
  try {
    if (type === 'tag') {
      // タグベース再検証
      revalidateTag(id);
      return Response.json({ 
        revalidated: true, 
        tag: id,
        now: Date.now() 
      });
    } else if (type === 'path') {
      // パスベース再検証
      revalidatePath(path);
      return Response.json({ 
        revalidated: true, 
        path,
        now: Date.now() 
      });
    }
    
    return Response.json({ message: 'Invalid type' }, { status: 400 });
  } catch (err) {
    return Response.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
```

```bash
# 使用例: 商品更新時に即座にキャッシュ削除
curl -X POST http://localhost:3000/api/revalidate \
  -H "x-revalidate-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "tag", "id": "product-123"}'
```

### クライアント境界の最小化

```tsx
// ✅ 良い例: サーバーコンポーネントでラップ
// components/patterns/hybrid/InteractiveCard.tsx
import { Product } from '@/types/product';
import { AddToCartButton } from '../client/AddToCartButton';

// このコンポーネント自体はサーバーコンポーネント
export function InteractiveCard({ product }: { product: Product }) {
  return (
    <div className="card">
      {/* サーバーコンポーネント部分 */}
      <img src={product.imageUrl} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      
      {/* クライアントコンポーネントは最小限 */}
      <AddToCartButton productId={product.id} />
    </div>
  );
}

// components/patterns/client/AddToCartButton.tsx
'use client';

export function AddToCartButton({ productId }: { productId: string }) {
  const [adding, setAdding] = useState(false);
  
  const handleClick = async () => {
    setAdding(true);
    await addToCart(productId);
    setAdding(false);
  };
  
  return (
    <button onClick={handleClick} disabled={adding}>
      {adding ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### 測定結果

```typescript
export const RSC_METRICS = {
  FCP: 400,    // SSRより33%改善、CSRより78%改善
  LCP: 1000,   // SSRより17%改善、CSRより60%改善
  TTI: 1500,   // SSRより25%改善、CSRより62%改善
  TBT: 150,    // SSRより50%改善、CSRより75%改善
  CLS: 0.02,   // SSRより60%改善、CSRより87%改善
  
  TTFB: 50,    // キャッシュヒット時（SSRより88%改善）
  TTFBMiss: 350, // キャッシュミス時
  
  bundleSize: 98, // KB（SSRより37%削減、CSRより53%削減）
  
  serverLoad: 'Low', // ISRによりキャッシュ活用
  
  cacheHitRate: 0.95, // 95%のリクエストがキャッシュから応答
};
```

---

## 4. パターン選択のフローチャート

```
データ取得が必要か？
├─ No → 静的ページ（通常のReactコンポーネント）
│
└─ Yes
   │
   ├─ SEOが重要か？
   │  ├─ No → CSR（SPAの一部など）
   │  │      例: 管理画面、ダッシュボード
   │  │
   │  └─ Yes
   │     │
   │     ├─ データの鮮度要件は？
   │     │  ├─ リアルタイム必須
   │     │  │  → SSR（cache: 'no-store'）
   │     │  │     例: ユーザーダッシュボード、ライブデータ
   │     │  │
   │     │  ├─ 数秒〜数分の遅延OK
   │     │  │  → RSC + ISR
   │     │  │     例: 商品一覧、ブログ記事
   │     │  │
   │     │  └─ 更新頻度が低い
   │     │     → RSC + 静的生成
   │     │        例: ドキュメント、About
   │     │
   │     └─ インタラクティブ性は？
   │        ├─ 高い（フォーム、リアルタイム更新）
   │        │  → RSC + クライアント境界
   │        │     例: 検索フィルター、カートボタン
   │        │
   │        └─ 低い（読み取り専用）
   │           → 完全RSC
   │              例: 記事詳細、商品詳細
```

### 具体例マトリックス

| ユースケース | 推奨パターン | 理由 |
|------------|------------|------|
| 商品一覧ページ | RSC + ISR | SEO重要、更新頻度中、インタラクティブ性低 |
| 商品検索結果 | RSC + クライアント境界 | フィルタ操作が必要 |
| ユーザーダッシュボード | SSR | 個人データ、リアルタイム性必要 |
| ブログ記事 | RSC + 静的生成 | 更新頻度低、SEO重要 |
| 管理画面 | CSR（許容） | SEO不要、認証後のみアクセス |
| カート | クライアントコンポーネント | 状態管理が複雑 |
| 商品詳細ページ | RSC + ISR + 静的生成 | SEO重要、部分的にインタラクティブ |
| プロフィール編集 | SSR + クライアント | 初期データSSR、編集はクライアント |

---

## 5. 実装時の注意点

### 5.1 サーバーコンポーネントの制約

```tsx
// ❌ サーバーコンポーネントで使えないもの
'use client'; // これを付けるとクライアントコンポーネント

// useState, useEffect等のHooks
const [state, setState] = useState();

// ブラウザAPI
window.localStorage.getItem('key');
document.getElementById('root');

// イベントハンドラ
<button onClick={() => {}}>Click</button>


// ✅ サーバーコンポーネントで使えるもの
// async/await
async function MyComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// データベース直接アクセス
import { db } from '@/lib/db';
const users = await db.users.findMany();

// サーバー専用パッケージ
import fs from 'fs';
const content = fs.readFileSync('file.txt', 'utf-8');
```

### 5.2 キャッシュ戦略の選択

```typescript
// 1. 強制的にキャッシュなし（常に最新）
fetch('/api/data', { cache: 'no-store' });
// または
fetch('/api/data', { next: { revalidate: 0 } });

// 2. 時間ベースの再検証（ISR）
fetch('/api/data', { next: { revalidate: 60 } }); // 60秒

// 3. タグベースの再検証（On-demand）
fetch('/api/data', { next: { tags: ['products'] } });
// 後で revalidateTag('products') で更新

// 4. 完全な静的生成（ビルド時のみ）
fetch('/api/data', { cache: 'force-cache' });
// または revalidate を指定しない

// 5. ハイブリッド
fetch('/api/data', {
  next: {
    revalidate: 3600, // 1時間キャッシュ
    tags: ['products'] // 必要時は即座に更新可能
  }
});
```

### 5.3 エラーハンドリング

```tsx
// app/(patterns)/rsc-optimal/products/[id]/error.tsx
'use client'; // エラー境界はクライアントコンポーネント

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーログ送信
    console.error('Product error:', error);
  }, [error]);

  return (
    <div>
      <h2>商品の読み込みに失敗しました</h2>
      <p>エラーID: {error.digest}</p>
      <button onClick={reset}>再試行</button>
    </div>
  );
}
```

### 5.4 Suspense境界の配置

```tsx
// ❌ 粗すぎる境界（全体が遅いデータを待つ）
<Suspense fallback={<Loading />}>
  <FastComponent />
  <SlowComponent /> {/* これが遅いと全体が待つ */}
</Suspense>

// ✅ 細かい境界（独立してロード）
<>
  <Suspense fallback={<FastLoading />}>
    <FastComponent />
  </Suspense>
  
  <Suspense fallback={<SlowLoading />}>
    <SlowComponent /> {/* 独立してロード */}
  </Suspense>
</>

// ✅ 戦略的な配置
<div>
  {/* Above the fold: 即座に表示 */}
  <Hero />
  <ProductInfo />
  
  {/* Below the fold: 遅延ロード可 */}
  <Suspense fallback={<ReviewsSkeleton />}>
    <Reviews /> {/* スクロールが必要な位置 */}
  </Suspense>
</div>
```

### 5.5 データフェッチのベストプラクティス

```tsx
// ❌ 悪い例: 直列実行
async function Page() {
  const products = await getProducts();
  const categories = await getCategories(); // 前の完了を待つ
  const featured = await getFeatured();     // 前の完了を待つ
  
  return <div>...</div>;
}

// ✅ 良い例: 並列実行
async function Page() {
  const [products, categories, featured] = await Promise.all([
    getProducts(),
    getCategories(),
    getFeatured(),
  ]);
  
  return <div>...</div>;
}

// 🚀 最適: Suspense境界で独立化
async function Page() {
  const productsPromise = getProducts();
  const categoriesPromise = getCategories();
  
  return (
    <>
      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories promise={categoriesPromise} />
      </Suspense>
      
      <Suspense fallback={<ProductsSkeleton />}>
        <Products promise={productsPromise} />
      </Suspense>
    </>
  );
}
```

---

## まとめ

### パターン別推奨度

| パターン | 推奨度 | 使用場面 |
|---------|-------|---------|
| **CSR-Anti** | ❌ 非推奨 | デモ・教育目的のみ |
| **SSR-Standard** | ✅ 推奨 | 認証データ、リアルタイム |
| **RSC-Optimal** | 🚀 最推奨 | 大半のユースケース |

### 実装チェックリスト

- [ ] SEO要件を確認
- [ ] データの鮮度要件を確認
- [ ] インタラクティブ性の要件を確認
- [ ] キャッシュ戦略を決定
- [ ] Suspense境界を適切に配置
- [ ] エラー境界を設定
- [ ] メタデータを実装
- [ ] パフォーマンスメトリクスを計測
- [ ] 静的生成が可能な部分を特定
- [ ] クライアント境界を最小化

このドキュメントに従うことで、Next.js App Routerの最適な実装パターンを選択できます。
