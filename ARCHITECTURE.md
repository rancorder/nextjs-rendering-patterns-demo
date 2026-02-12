# Performance Observatory - アーキテクチャ設計書

## プロジェクトコンセプト
**"Performance Observatory"** - 商品カタログ + ユーザーダッシュボードを3つのレンダリング戦略で実装し、設計判断を可視化

設計目的：Next.js/React経験5年以上の設計力を証明するデモ

---

## 1. 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  CSR Pattern  │  │  SSR Pattern  │  │ RSC Pattern │ │
│  │  (Anti)       │  │  (Standard)   │  │ (Optimal)   │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬──────┘ │
│          │                  │                   │        │
│          └──────────────────┴───────────────────┘        │
│                          │                               │
│                  ┌───────▼────────┐                      │
│                  │  Shared Logic  │                      │
│                  │  - Types       │                      │
│                  │  - Validators  │                      │
│                  │  - Utils       │                      │
│                  └───────┬────────┘                      │
│                          │                               │
│          ┌───────────────┼───────────────┐              │
│          │               │               │              │
│    ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐        │
│    │   Mock    │  │  Metrics  │  │  Feature  │        │
│    │   API     │  │  Tracker  │  │  Flags    │        │
│    └───────────┘  └───────────┘  └───────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 各実装方式の詳細

### 🔴 CSR-Anti（意図的な失敗例）

**ファイル**: `app/(patterns)/csr-anti/page.tsx`

```tsx
'use client';

export default function CSRAntiPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ❌ アンチパターン: useEffect地獄
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  // ❌ 問題点:
  // 1. 初回レンダリング時にデータなし（SEO×）
  // 2. ウォーターフォールリクエスト
  // 3. ローディング状態管理の複雑化
  // 4. エラーハンドリングなし
  
  return loading ? <Spinner /> : <ProductList data={products} />;
}
```

**測定指標:**
- FCP (First Contentful Paint): 遅い (2000-3000ms)
- LCP (Largest Contentful Paint): 遅い (3000-4000ms)
- TTI (Time to Interactive): 非常に遅い (3500-5000ms)
- Bundle Size: 大きい (~200KB)

**学習ポイント:**
このパターンがなぜダメなのかを定量的に示すための実装。
実際のメトリクスで証明することが重要。

---

### 🟡 SSR-Standard（標準的な実装）

**ファイル**: `app/(patterns)/ssr-standard/page.tsx`

```tsx
import { Suspense } from 'react';

async function getProducts() {
  // ✅ サーバーサイドでデータ取得
  const res = await fetch('http://localhost:3000/api/products', {
    cache: 'no-store' // 常に最新データ
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return res.json();
}

export default async function SSRStandardPage() {
  const products = await getProducts();
  
  // ✅ 改善点:
  // 1. SEO対応（HTML内にデータ含まれる）
  // 2. 初回表示が速い
  // 3. サーバーで認証チェック可能
  
  // ⚠️ トレードオフ:
  // - リクエスト毎にサーバー処理
  // - TTFB (Time to First Byte)が増加
  // - サーバー負荷が高い
  
  return (
    <div>
      <h1>SSR Standard Implementation</h1>
      <ProductList data={products} />
    </div>
  );
}
```

**測定指標:**
- FCP: 中程度 (1000-1500ms、サーバー処理時間に依存)
- LCP: 速い (1500-2000ms)
- TTFB: やや遅い (500-800ms)
- SEO: 完全対応 ✅
- Bundle Size: 中程度 (~150KB)

**適用シーン:**
- ユーザーダッシュボード
- 認証が必要なページ
- リアルタイム性が重要なデータ

---

### 🟢 RSC-Optimal（最適化実装）

**ファイル**: `app/(patterns)/rsc-optimal/page.tsx`

```tsx
import { Suspense } from 'react';
import ProductList from '@/components/patterns/server/ProductListRSC';
import RecommendationsRSC from '@/components/patterns/server/RecommendationsRSC';
import InteractiveFilters from '@/components/patterns/client/InteractiveFilters';

async function getProducts() {
  const res = await fetch('http://localhost:3000/api/products', {
    next: { 
      revalidate: 60, // ISR: 60秒キャッシュ
      tags: ['products'] // タグベース再検証
    }
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function getRecommendations() {
  const res = await fetch('http://localhost:3000/api/recommendations', {
    next: { revalidate: 300 } // 5分キャッシュ
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default async function RSCOptimalPage() {
  // 🚀 並列データフェッチ（ウォーターフォール回避）
  const productsPromise = getProducts();
  const recommendationsPromise = getRecommendations();
  
  return (
    <div>
      <h1>RSC Optimal Implementation</h1>
      
      {/* ✅ Streaming SSR: 各セクション独立してレンダリング */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList promise={productsPromise} />
      </Suspense>
      
      <Suspense fallback={<RecommendationsSkeleton />}>
        <RecommendationsRSC promise={recommendationsPromise} />
      </Suspense>
      
      {/* ✅ クライアントコンポーネントは必要な部分のみ */}
      <InteractiveFilters />
    </div>
  );
}

// ✅ 静的生成の活用（Build時に生成）
export async function generateStaticParams() {
  const products = await getProducts();
  
  // 人気上位20商品を事前生成
  return products.slice(0, 20).map(p => ({ 
    id: p.id.toString() 
  }));
}

// ✅ メタデータ生成
export async function generateMetadata({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  
  return {
    title: `${product.name} - Performance Observatory`,
    description: product.description,
  };
}
```

**測定指標:**
- FCP: 非常に速い (300-500ms、ストリーミング)
- LCP: 速い (800-1200ms)
- TTFB: 非常に速い (50-200ms、キャッシュ活用時)
- SEO: 完全対応 ✅
- Bundle Size: 最小 (~100KB)
- JavaScript実行時間: 短い

**技術的優位性:**
1. **並列データフェッチ**: ウォーターフォールリクエスト回避
2. **Streaming SSR**: 段階的なコンテンツ表示
3. **Selective Hydration**: 必要な部分のみクライアント化
4. **ISR**: 静的生成の速度 + 動的データの鮮度
5. **タグベース再検証**: 細かいキャッシュ制御

---

## 3. トレードオフ分析表

| 項目 | CSR-Anti | SSR-Standard | RSC-Optimal |
|------|----------|--------------|-------------|
| **初回表示速度** | ❌ 遅い（JS実行待ち） | ✅ 速い | 🚀 非常に速い |
| **SEO** | ❌ 困難 | ✅ 完全対応 | ✅ 完全対応 |
| **サーバー負荷** | ✅ 低い | ⚠️ リクエスト毎 | ✅ キャッシュで低減 |
| **インタラクティブ性** | ✅ 高い | ⚠️ Hydration後 | ✅ 部分的に高い |
| **Bundle Size** | ❌ 大きい (200KB) | ⚠️ 中程度 (150KB) | 🚀 最小 (100KB) |
| **開発体験** | ⚠️ 状態管理複雑 | ✅ シンプル | 🚀 非常にシンプル |
| **リアルタイム性** | ✅ 高い | ⚠️ 低い | ⚠️ ISR間隔依存 |
| **認証データ扱い** | ❌ クライアント露出 | ✅ サーバーで保護 | 🚀 完全保護 |
| **エラーハンドリング** | ❌ 複雑 | ✅ 標準 | 🚀 境界で分離 |
| **キャッシュ制御** | ❌ 困難 | ⚠️ CDNレベル | 🚀 細かく制御可能 |

---

## 4. 想定スケール増加時の課題と対策

### フェーズ1: 初期（〜1万PV/日）
**現状設計で対応可能**
- モックAPIで十分
- ISRで大半をカバー
- 単一サーバーで運用可

**構成:**
```
Vercel (Next.js) → Mock API (Same Server)
```

---

### フェーズ2: 成長期（1万〜10万PV/日）
**課題:**
1. ISRキャッシュの肥大化
2. データベースコネクション枯渇
3. APIレスポンス遅延

**対策:**

#### 4.1 タグベース再検証の導入

```typescript
// lib/fetchers/server-fetcher.ts
export async function getProduct(id: string) {
  const res = await fetch(`${API_URL}/products/${id}`, {
    next: { 
      tags: [`product-${id}`, 'products', 'catalog'],
      revalidate: 3600 
    }
  });
  return res.json();
}

// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { type, id } = await request.json();
  
  switch(type) {
    case 'product':
      revalidateTag(`product-${id}`);
      break;
    case 'all-products':
      revalidateTag('products');
      break;
    case 'catalog':
      revalidateTag('catalog');
      break;
  }
  
  return Response.json({ revalidated: true });
}
```

#### 4.2 データベースコネクションプーリング

```typescript
// lib/db/pool.ts
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,                    // 最大接続数
  idleTimeoutMillis: 30000,   // アイドルタイムアウト
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    // スロークエリログ
    if (duration > 1000) {
      console.warn('Slow query detected:', { text, duration });
    }
    
    return result;
  } finally {
    client.release();
  }
}
```

#### 4.3 Read/Write分離

```typescript
// lib/db/connections.ts
const PRIMARY_POOL = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  // Write専用
});

const REPLICA_POOL = new Pool({
  host: process.env.DB_REPLICA_HOST,
  // Read専用（負荷分散）
});

export async function queryRead(text: string, params?: any[]) {
  const client = await REPLICA_POOL.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function queryWrite(text: string, params?: any[]) {
  const client = await PRIMARY_POOL.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

---

### フェーズ3: 拡張期（10万〜100万PV/日）
**課題:**
1. エッジロケーション最適化
2. 画像配信の高速化
3. APIの地理的分散

**対策:**

#### 4.4 エッジキャッシング導入

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/api/products/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 静的コンテンツは長期キャッシュ
  if (request.nextUrl.pathname.startsWith('/api/products')) {
    response.headers.set(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=86400'
    );
  }
  
  // A/Bテスト用のヘッダー
  const variant = request.cookies.get('ab-test-variant')?.value || 'A';
  response.headers.set('X-Variant', variant);
  
  return response;
}
```

#### 4.5 画像最適化戦略

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1年
    
    // 外部CDN使用時
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
};

// lib/image-loader.ts
export default function cloudflareLoader({ src, width, quality }) {
  const params = [`width=${width}`];
  if (quality) params.push(`quality=${quality}`);
  
  return `https://cdn.example.com/${src}?${params.join('&')}`;
}
```

#### 4.6 APIの分散化

```typescript
// lib/api/client.ts
export class APIClient {
  private baseUrl: string;
  
  constructor() {
    // 地域ごとに最適なエンドポイント選択
    this.baseUrl = this.selectOptimalEndpoint();
  }
  
  private selectOptimalEndpoint(): string {
    const region = process.env.VERCEL_REGION || 'us-east-1';
    
    const endpoints: Record<string, string> = {
      'us-east-1': 'https://api-us-east.example.com',
      'eu-west-1': 'https://api-eu-west.example.com',
      'ap-northeast-1': 'https://api-ap-northeast.example.com',
    };
    
    return endpoints[region] || endpoints['us-east-1'];
  }
  
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': process.env.INTERNAL_API_KEY!,
        ...options?.headers,
      },
    });
    
    if (!res.ok) {
      throw new APIError(res.status, await res.text());
    }
    
    return res.json();
  }
}
```

---

### フェーズ4: スケール期（100万PV/日〜）
**アーキテクチャ変更が必要**

```
                     ┌──────────────┐
                     │  CloudFlare  │
                     │     CDN      │
                     └──────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
      ┌───────▼────────┐         ┌───────▼────────┐
      │   Vercel Edge  │         │   Static S3    │
      │   (Next.js)    │         │  + CloudFront  │
      └───────┬────────┘         └────────────────┘
              │
      ┌───────┴────────┐
      │                │
┌─────▼─────┐   ┌─────▼─────┐
│ Primary DB│   │Read Replica│
└───────────┘   └────────────┘
      │
┌─────▼──────────┐
│  Redis Cluster │
│   (Cache)      │
└────────────────┘
```

**必要な技術導入:**
1. **GraphQL** - Over-fetching削減
2. **Redis** - セッション・キャッシュ管理
3. **WebAssembly** - 重い計算処理
4. **Service Worker** - オフライン対応

---

## 5. 拡張余地

### 5.1 機能拡張ロードマップ

```typescript
// config/features.ts
export const features = {
  // フェーズ1: 基本機能
  enableMetrics: true,              // パフォーマンス計測
  enableErrorTracking: true,        // エラートラッキング
  
  // フェーズ2: ユーザー体験向上
  enableRealTimeUpdates: false,     // WebSocket統合
  enableOfflineMode: false,         // PWA対応
  enablePushNotifications: false,   // プッシュ通知
  
  // フェーズ3: パーソナライゼーション
  enablePersonalization: false,     // ユーザー別最適化
  enableABTesting: false,          // A/Bテスト
  enableRecommendations: false,     // ML推薦エンジン
  
  // フェーズ4: グローバル展開
  enableI18n: false,               // 多言語対応
  enableGeoTargeting: false,       // 地域別最適化
  
  // 常時有効
  enableA11y: true,                // アクセシビリティ
  enableSecurity: true,            // セキュリティヘッダー
} as const;

// 使用例
export default async function Page() {
  return (
    <>
      <ProductList />
      {features.enableRealTimeUpdates && <LivePriceUpdater />}
      {features.enablePersonalization && <PersonalizedRecommendations />}
    </>
  );
}
```

### 5.2 監視・観測性の進化

```typescript
// lib/metrics/observability.ts
export class ObservabilityStack {
  // フェーズ1: 基本ログ
  static logBasic(message: string, data?: any) {
    console.log(`[${new Date().toISOString()}]`, message, data);
  }
  
  // フェーズ2: 構造化ログ
  static logStructured(level: 'info' | 'warn' | 'error', data: LogData) {
    const log = {
      timestamp: Date.now(),
      level,
      environment: process.env.NODE_ENV,
      ...data,
    };
    
    if (process.env.NODE_ENV === 'production') {
      // 外部サービスへ送信（例: Datadog, Sentry）
      this.sendToLoggingService(log);
    } else {
      console.log(log);
    }
  }
  
  // フェーズ3: APM統合
  static async trace<T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.logMetric('operation.duration', duration, {
        operation: operationName,
        status: 'success',
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.logMetric('operation.duration', duration, {
        operation: operationName,
        status: 'error',
      });
      
      throw error;
    }
  }
  
  // フェーズ4: 分散トレーシング
  static createSpan(name: string, parentSpanId?: string) {
    // OpenTelemetry統合
    // ...
  }
}
```

### 5.3 テスト戦略の進化

```
tests/
├── unit/                         # フェーズ1
│   ├── components/               # React Testing Library
│   ├── lib/                      # Jest
│   └── utils/
│
├── integration/                  # フェーズ2
│   ├── api/                      # APIテスト
│   └── database/                 # DBテスト
│
├── e2e/                          # フェーズ3
│   ├── critical-paths/           # Playwright
│   │   ├── checkout.spec.ts
│   │   └── authentication.spec.ts
│   └── visual-regression/        # Percy / Chromatic
│       └── snapshots/
│
├── performance/                  # フェーズ4
│   ├── lighthouse-ci/            # 自動化パフォーマンステスト
│   ├── load-testing/             # k6 / Artillery
│   └── benchmarks/
│
└── contract/                     # フェーズ5
    └── api-contracts/            # Pact
```

---

## 6. 面接時の説明ポイント

### 6.1 「なぜこの設計か？」を語る

**例文:**
```
「CSR実装をあえて残している理由は、なぜそれがアンチパターンなのかを
コード上で証明するためです。useEffectチェーンによるウォーターフォール
リクエストが、実際のメトリクスでどれだけLCPを悪化させるかを測定可能に
しています。

面接官の方がコードを見れば、『この人は失敗パターンを理解している』と
判断できる設計になっています。」
```

### 6.2 トレードオフの定量的説明

**例文:**
```
「SSRとRSCの選択は『データの新鮮さ要件』と『サーバー負荷』のトレード
オフです。

商品一覧: ISRで60秒キャッシュ（価格変動が少ない）
在庫数: クライアントフェッチ（リアルタイム性必須）
ユーザー情報: SSR（毎回最新、認証必須）

この判断基準は config/cache-strategies.ts に明文化してあります。」
```

### 6.3 スケーラビリティの具体的数値

**例文:**
```
「現在の設計は1万PV/日を想定していますが:

- 10万PV/日: Read Replica追加で対応可能（DB分離のみ）
- 100万PV/日: CDN + Edge最適化が必要
- 1000万PV/日: マイクロサービス化を検討

各段階での投資対効果を docs/SCALING.md に記載しています。」
```

### 6.4 保守性への配慮

**例文:**
```
「ディレクトリ構造で意図を表現しています:

app/(patterns)/ ← 括弧でルートグループ化（URLに影響しない）
  csr-anti/     ← 命名で『アンチパターン』と明示
  ssr-standard/ ← 『標準実装』
  rsc-optimal/  ← 『最適解』

新しいメンバーが参加しても、3分でプロジェクト構造を理解できる
設計を意識しています。」
```

---

## 7. パフォーマンスバジェット

```typescript
// config/performance-budgets.ts
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals
  LCP: 2500,        // ms - Largest Contentful Paint
  FID: 100,         // ms - First Input Delay
  CLS: 0.1,         // score - Cumulative Layout Shift
  
  // その他指標
  FCP: 1800,        // ms - First Contentful Paint
  TTFB: 600,        // ms - Time to First Byte
  TTI: 3500,        // ms - Time to Interactive
  
  // リソース
  bundleSize: 150,  // KB - First Load JS
  imageSize: 200,   // KB - 最大画像サイズ
  fontSize: 50,     // KB - フォント合計
  
  // API
  apiResponseTime: 500, // ms
  
  // 警告閾値（バジェットの80%）
  warningThreshold: 0.8,
} as const;

// 使用例
export function checkPerformanceBudget(metrics: WebVitals) {
  const violations: string[] = [];
  
  if (metrics.LCP > PERFORMANCE_BUDGETS.LCP) {
    violations.push(`LCP exceeded: ${metrics.LCP}ms`);
  }
  
  if (metrics.FID > PERFORMANCE_BUDGETS.FID) {
    violations.push(`FID exceeded: ${metrics.FID}ms`);
  }
  
  if (violations.length > 0) {
    logger.warn('Performance budget violations', { violations });
  }
  
  return violations;
}
```

---

## 8. エラーハンドリング戦略

### 8.1 エラー境界の階層化

```tsx
// app/(patterns)/rsc-optimal/error.tsx
'use client';

import { useEffect } from 'react';
import { logErrorToService } from '@/lib/metrics/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラー監視サービスへ送信
    logErrorToService({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }, [error]);

  return (
    <div className="error-container">
      <h2>データ取得に失敗しました</h2>
      <p>
        エラーID: <code>{error.digest}</code>
      </p>
      <button onClick={reset}>再試行</button>
      <a href="/">ホームに戻る</a>
    </div>
  );
}
```

### 8.2 段階的なフォールバック

```tsx
// components/patterns/hybrid/ProductCardWithFallback.tsx
import { Suspense } from 'react';

// レイヤー1: データ取得エラー
async function ProductData({ id }: { id: string }) {
  try {
    const product = await getProduct(id);
    return <ProductDetails product={product} />;
  } catch (error) {
    return <ProductErrorState error={error} />;
  }
}

// レイヤー2: ローディング状態
export default function ProductCardWithFallback({ id }: { id: string }) {
  return (
    <ErrorBoundary fallback={<ProductErrorCard />}>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductData id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 9. セキュリティ考慮事項

### 9.1 認証フロー

```typescript
// lib/auth/session.ts
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('session-token');
  
  if (!token) return null;
  
  try {
    const payload = verify(token.value, process.env.JWT_SECRET!);
    return payload as Session;
  } catch {
    return null;
  }
}

// app/dashboard/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return <div>{children}</div>;
}
```

### 9.2 CSRFトークン

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // POSTリクエストにCSRFチェック
  if (request.method === 'POST') {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const sessionToken = request.cookies.get('csrf-token')?.value;
    
    if (!csrfToken || csrfToken !== sessionToken) {
      return new Response('Invalid CSRF token', { status: 403 });
    }
  }
  
  return NextResponse.next();
}
```

---

## 10. デプロイメント戦略

### 10.1 環境分離

```
Development → Staging → Production
    ↓            ↓          ↓
 feature    preview     main
 branches    branch     branch
```

### 10.2 段階的ロールアウト

```typescript
// middleware.ts - カナリアデプロイメント
export function middleware(request: NextRequest) {
  const isCanaryUser = Math.random() < 0.1; // 10%のユーザー
  
  if (isCanaryUser) {
    request.headers.set('X-Deployment-Version', 'canary');
  }
  
  return NextResponse.next();
}
```

---

## まとめ

このアーキテクチャは以下を証明することを目的としています:

1. ✅ **技術選択の根拠を説明できる**
   - なぜCSR/SSR/RSCを使い分けるか
   - 各パターンのトレードオフを理解

2. ✅ **測定可能な形で設計判断を示せる**
   - Web Vitalsでの定量評価
   - パフォーマンスバジェット設定

3. ✅ **スケーラビリティを考慮できる**
   - フェーズごとの課題と対策を提示
   - 段階的な拡張パスを明示

4. ✅ **保守性の高いコードを書ける**
   - 自己説明的なディレクトリ構造
   - 明確な責務分離

5. ✅ **実務を意識した設計ができる**
   - エラーハンドリング
   - セキュリティ配慮
   - デプロイメント戦略

**想定レビュー時間**: 3分で構造理解 / 30分で詳細評価
