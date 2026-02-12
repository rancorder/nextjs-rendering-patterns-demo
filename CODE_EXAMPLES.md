# 主要コード実装例

このファイルには、プロジェクトの核となるコンポーネントとAPIの実装例を記載しています。

---

## 目次

1. [API Routes実装](#1-api-routes実装)
2. [サーバーコンポーネント](#2-サーバーコンポーネント)
3. [クライアントコンポーネント](#3-クライアントコンポーネント)
4. [型定義](#4-型定義)
5. [ユーティリティ関数](#5-ユーティリティ関数)
6. [パフォーマンス計測](#6-パフォーマンス計測)

---

## 1. API Routes実装

### app/api/products/route.ts

```typescript
import { NextRequest } from 'next/server';
import { products } from '@/lib/data/products';
import { simulateDelay } from '@/lib/utils/delay';

// GET /api/products
export async function GET(request: NextRequest) {
  // URLパラメータ取得
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // 意図的な遅延（デモ用）
  await simulateDelay(300);
  
  // フィルタリング
  let filteredProducts = [...products];
  
  if (category) {
    filteredProducts = filteredProducts.filter(
      p => p.category === category
    );
  }
  
  // ページネーション
  const paginatedProducts = filteredProducts.slice(offset, offset + limit);
  
  return Response.json({
    data: paginatedProducts,
    total: filteredProducts.length,
    limit,
    offset,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

// POST /api/products（管理者用）
export async function POST(request: NextRequest) {
  // 認証チェック（簡易版）
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const body = await request.json();
  
  // バリデーション
  if (!body.name || !body.price) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }
  
  // 新規商品追加（モック）
  const newProduct = {
    id: Date.now().toString(),
    ...body,
    createdAt: new Date().toISOString(),
  };
  
  // 実際のDBへの保存処理はここ
  
  return Response.json(newProduct, { status: 201 });
}
```

### app/api/products/[id]/route.ts

```typescript
import { NextRequest } from 'next/server';
import { products } from '@/lib/data/products';
import { simulateDelay } from '@/lib/utils/delay';

interface Props {
  params: { id: string };
}

// GET /api/products/:id
export async function GET(
  request: NextRequest,
  { params }: Props
) {
  await simulateDelay(200);
  
  const product = products.find(p => p.id === params.id);
  
  if (!product) {
    return Response.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }
  
  return Response.json(product, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

// PUT /api/products/:id
export async function PUT(
  request: NextRequest,
  { params }: Props
) {
  const body = await request.json();
  
  // 更新処理（モック）
  const updatedProduct = {
    id: params.id,
    ...body,
    updatedAt: new Date().toISOString(),
  };
  
  return Response.json(updatedProduct);
}

// DELETE /api/products/:id
export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  // 削除処理（モック）
  
  return Response.json({ 
    success: true,
    message: `Product ${params.id} deleted` 
  });
}
```

### app/api/metrics/route.ts

```typescript
import { NextRequest } from 'next/server';

// POST /api/metrics（パフォーマンスログ収集）
export async function POST(request: NextRequest) {
  const metrics = await request.json();
  
  // 本番環境では外部サービス（Datadog, Sentryなど）へ送信
  if (process.env.NODE_ENV === 'production') {
    // await sendToMonitoringService(metrics);
    console.log('[Production Metrics]', metrics);
  } else {
    console.log('[Dev Metrics]', {
      pattern: metrics.pattern,
      FCP: metrics.FCP,
      LCP: metrics.LCP,
      TTI: metrics.TTI,
      timestamp: new Date().toISOString(),
    });
  }
  
  return Response.json({ 
    received: true,
    timestamp: Date.now() 
  });
}

// GET /api/metrics（集計結果取得）
export async function GET(request: NextRequest) {
  // 本番環境では集計データを返す
  const mockMetrics = {
    'csr-anti': {
      avgFCP: 2800,
      avgLCP: 3500,
      avgTTI: 4200,
      samples: 150,
    },
    'ssr-standard': {
      avgFCP: 1200,
      avgLCP: 1800,
      avgTTI: 2500,
      samples: 200,
    },
    'rsc-optimal': {
      avgFCP: 400,
      avgLCP: 1000,
      avgTTI: 1500,
      samples: 250,
    },
  };
  
  return Response.json(mockMetrics);
}
```

---

## 2. サーバーコンポーネント

### components/patterns/server/ProductListRSC.tsx

```typescript
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface Props {
  promise: Promise<Product[]>;
}

// React Server Component（async function）
export default async function ProductListRSC({ promise }: Props) {
  // Promise unwrapping
  const products = await promise;
  
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p>商品が見つかりませんでした</p>
      </div>
    );
  }
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### components/patterns/server/ProductCard.tsx

```typescript
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';

interface Props {
  product: Product;
}

// Pure Server Component（インタラクティブ性なし）
export function ProductCard({ product }: Props) {
  return (
    <Link 
      href={`/rsc-optimal/products/${product.id}`}
      className="product-card"
    >
      <div className="product-image">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={300}
          height={300}
          loading="lazy"
        />
      </div>
      
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="category">{product.category}</p>
        <p className="price">${product.price.toFixed(2)}</p>
        
        {product.rating && (
          <div className="rating">
            {'★'.repeat(Math.floor(product.rating))}
            {'☆'.repeat(5 - Math.floor(product.rating))}
            <span>({product.reviewCount})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
```

### components/patterns/server/RecommendationsRSC.tsx

```typescript
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';

interface Props {
  promise: Promise<Product[]>;
}

export default async function RecommendationsRSC({ promise }: Props) {
  const recommendations = await promise;
  
  return (
    <section className="recommendations">
      <h2>あなたにおすすめ</h2>
      
      <div className="product-grid">
        {recommendations.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
```

---

## 3. クライアントコンポーネント

### components/patterns/client/InteractiveFilters.tsx

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function InteractiveFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [category, setCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [priceRange, setPriceRange] = useState([0, 1000]);
  
  const handleFilterChange = () => {
    const params = new URLSearchParams();
    
    if (category !== 'all') {
      params.set('category', category);
    }
    
    params.set('minPrice', priceRange[0].toString());
    params.set('maxPrice', priceRange[1].toString());
    
    // クライアント側でナビゲーション
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };
  
  return (
    <div className="filters">
      <h3>フィルター</h3>
      
      <div className="filter-group">
        <label>カテゴリ</label>
        <select 
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">すべて</option>
          <option value="electronics">電子機器</option>
          <option value="clothing">衣類</option>
          <option value="books">書籍</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>価格帯</label>
        <input
          type="range"
          min="0"
          max="1000"
          value={priceRange[1]}
          onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
        />
        <span>${priceRange[0]} - ${priceRange[1]}</span>
      </div>
      
      <button 
        onClick={handleFilterChange}
        disabled={isPending}
      >
        {isPending ? '適用中...' : 'フィルターを適用'}
      </button>
    </div>
  );
}
```

### components/patterns/client/AddToCartButton.tsx

```typescript
'use client';

import { useState } from 'react';

interface Props {
  productId: string;
}

export function AddToCartButton({ productId }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  
  const handleAddToCart = async () => {
    setIsAdding(true);
    
    try {
      // API呼び出し
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      
      setAdded(true);
      
      // 2秒後にリセット
      setTimeout(() => setAdded(false), 2000);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('カートへの追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };
  
  return (
    <button
      onClick={handleAddToCart}
      disabled={isAdding || added}
      className={`add-to-cart-btn ${added ? 'added' : ''}`}
    >
      {added ? '✓ カートに追加済み' : isAdding ? '追加中...' : 'カートに追加'}
    </button>
  );
}
```

### components/patterns/client/LoadingSpinner.tsx

```typescript
'use client';

export function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <p>読み込み中...</p>
    </div>
  );
}
```

---

## 4. 型定義

### types/product.ts

```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: 'price-asc' | 'price-desc' | 'rating' | 'newest';
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### types/metrics.ts

```typescript
export interface WebVitals {
  // Core Web Vitals
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  
  // その他の指標
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  TTI?: number; // Time to Interactive
  TBT?: number; // Total Blocking Time
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  pattern: 'csr-anti' | 'ssr-standard' | 'rsc-optimal';
  timestamp: number;
}

export interface ComparisonResult {
  pattern: string;
  metrics: WebVitals;
  bundleSize: number;
  requestCount: number;
  totalTransferSize: number;
}

export interface PerformanceBudget {
  LCP: number;
  FID: number;
  CLS: number;
  bundleSize: number;
}
```

### types/api.ts

```typescript
export interface APIResponse<T> {
  data: T;
  message?: string;
  timestamp: number;
}

export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

---

## 5. ユーティリティ関数

### lib/utils/delay.ts

```typescript
/**
 * 意図的な遅延を追加（デモ用）
 * 本番環境では使用しない
 */
export function simulateDelay(ms: number): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return Promise.resolve();
  }
  
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ランダムな遅延を追加
 */
export function simulateRandomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return simulateDelay(delay);
}
```

### lib/utils/error-simulator.ts

```typescript
/**
 * ランダムにエラーを発生させる（デモ用）
 */
export function maybeThrowError(probability: number = 0.1): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  if (Math.random() < probability) {
    throw new Error('Simulated error for demonstration');
  }
}

/**
 * 特定の条件でエラーを発生させる
 */
export function throwErrorIf(condition: boolean, message: string): void {
  if (condition) {
    throw new Error(message);
  }
}
```

### lib/fetchers/server-fetcher.ts

```typescript
import { Product } from '@/types/product';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
  revalidate?: number;
  tags?: string[];
}

/**
 * サーバーサイド用のfetchラッパー
 */
export async function serverFetch<T>(
  path: string,
  options?: FetchOptions
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  
  const { revalidate, tags, ...fetchOptions } = options || {};
  
  const res = await fetch(url, {
    ...fetchOptions,
    next: {
      revalidate: revalidate,
      tags: tags,
    },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

/**
 * 商品一覧を取得
 */
export async function getProducts(filters?: {
  category?: string;
  limit?: number;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  
  if (filters?.category) {
    params.set('category', filters.category);
  }
  
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  
  const query = params.toString();
  const path = `/api/products${query ? `?${query}` : ''}`;
  
  const response = await serverFetch<{ data: Product[] }>(path, {
    revalidate: 60,
    tags: ['products'],
  });
  
  return response.data;
}

/**
 * 商品詳細を取得
 */
export async function getProduct(id: string): Promise<Product> {
  return serverFetch<Product>(`/api/products/${id}`, {
    revalidate: 3600,
    tags: [`product-${id}`, 'products'],
  });
}
```

### lib/fetchers/client-fetcher.ts

```typescript
/**
 * クライアントサイド用のfetchラッパー
 */
export async function clientFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

/**
 * SWR風のデータ取得（簡易版）
 */
export function useClientFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    clientFetch<T>(path)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [path]);
  
  return { data, error, loading };
}
```

---

## 6. パフォーマンス計測

### lib/metrics/web-vitals.ts

```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Web Vitalsを計測して送信
 */
export function reportWebVitals(
  pattern: string,
  onMetric?: (metric: WebVitalsMetric) => void
) {
  const sendMetric = (metric: WebVitalsMetric) => {
    // コールバック実行
    onMetric?.(metric);
    
    // APIに送信
    if (typeof window !== 'undefined') {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          [metric.name]: metric.value,
          rating: metric.rating,
          timestamp: Date.now(),
        }),
      }).catch(console.error);
    }
  };
  
  onCLS(sendMetric);
  onFID(sendMetric);
  onLCP(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}

/**
 * パフォーマンスバジェットチェック
 */
export function checkPerformanceBudget(metrics: {
  LCP?: number;
  FID?: number;
  CLS?: number;
}) {
  const budgets = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
  };
  
  const violations: string[] = [];
  
  if (metrics.LCP && metrics.LCP > budgets.LCP) {
    violations.push(`LCP: ${metrics.LCP}ms > ${budgets.LCP}ms`);
  }
  
  if (metrics.FID && metrics.FID > budgets.FID) {
    violations.push(`FID: ${metrics.FID}ms > ${budgets.FID}ms`);
  }
  
  if (metrics.CLS && metrics.CLS > budgets.CLS) {
    violations.push(`CLS: ${metrics.CLS} > ${budgets.CLS}`);
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}
```

### components/metrics/PerformanceMonitor.tsx

```typescript
'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/metrics/web-vitals';

interface Props {
  pattern: 'csr-anti' | 'ssr-standard' | 'rsc-optimal';
}

export function PerformanceMonitor({ pattern }: Props) {
  useEffect(() => {
    reportWebVitals(pattern, (metric) => {
      console.log(`[${pattern}] ${metric.name}:`, metric.value, metric.rating);
    });
  }, [pattern]);
  
  return null; // UIなし、バックグラウンドで動作
}
```

---

## 7. モックデータ

### lib/data/products.ts

```typescript
import { Product } from '@/types/product';

export const products: Product[] = [
  {
    id: '1',
    name: 'ワイヤレスイヤホン Pro',
    description: '高音質なワイヤレスイヤホン。ノイズキャンセリング機能搭載。',
    price: 29.99,
    category: 'electronics',
    imageUrl: '/images/products/earbuds.jpg',
    rating: 4.5,
    reviewCount: 234,
    inStock: true,
    tags: ['audio', 'wireless', 'noise-cancelling'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'スマートウォッチ X1',
    description: 'フィットネストラッキング機能付きスマートウォッチ。',
    price: 199.99,
    category: 'electronics',
    imageUrl: '/images/products/smartwatch.jpg',
    rating: 4.2,
    reviewCount: 156,
    inStock: true,
    tags: ['wearable', 'fitness', 'smart'],
    createdAt: '2024-02-01T10:00:00Z',
  },
  // ... 更に98件のモックデータ
];

/**
 * カテゴリ別に商品を取得
 */
export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}

/**
 * 商品を検索
 */
export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
```

---

## まとめ

このコード実装例により、以下が実現できます:

1. ✅ **3つのパターンの完全な実装**
2. ✅ **型安全なAPI設計**
3. ✅ **パフォーマンス計測の自動化**
4. ✅ **エラーハンドリングの実装**
5. ✅ **クライアント/サーバー境界の明確化**

各ファイルをコピーして使用し、プロジェクトの要件に合わせてカスタマイズしてください。
