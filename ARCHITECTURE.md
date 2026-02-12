# アーキテクチャ図（Mermaid版）

このファイルには、Performance Observatoryプロジェクトの主要なアーキテクチャ図をMermaid形式で記載しています。

---

## 目次

1. [全体アーキテクチャ](#1-全体アーキテクチャ)
2. [レンダリングパターンの比較](#2-レンダリングパターンの比較)
3. [データフロー図](#3-データフロー図)
4. [パターン選択フローチャート](#4-パターン選択フローチャート)
5. [スケールアップアーキテクチャ](#5-スケールアップアーキテクチャ)
6. [キャッシュ戦略](#6-キャッシュ戦略)
7. [エラーハンドリング階層](#7-エラーハンドリング階層)

---

## 1. 全体アーキテクチャ

### システム全体構成

```mermaid
graph TB
    subgraph "Next.js App Router"
        subgraph "Patterns Layer"
            CSR[CSR Pattern<br/>❌ Anti-Pattern]
            SSR[SSR Pattern<br/>✅ Standard]
            RSC[RSC Pattern<br/>🚀 Optimal]
        end
        
        subgraph "Shared Logic Layer"
            Types[Types]
            Validators[Validators]
            Utils[Utils]
        end
        
        subgraph "Infrastructure Layer"
            MockAPI[Mock API]
            Metrics[Metrics Tracker]
            Features[Feature Flags]
        end
        
        CSR --> Types
        SSR --> Types
        RSC --> Types
        
        Types --> MockAPI
        Types --> Metrics
        Types --> Features
    end
    
    Client[Browser Client] --> CSR
    Client --> SSR
    Client --> RSC
    
    style CSR fill:#ff9999
    style SSR fill:#99ccff
    style RSC fill:#99ff99
```

### コンポーネント階層

```mermaid
graph LR
    subgraph "App Directory"
        Layout[layout.tsx<br/>Root Layout]
        Page[page.tsx<br/>Home]
        Patterns[/patterns/<br/>Route Group]
    end
    
    subgraph "Pattern Implementations"
        CSRPage[csr-anti/page.tsx]
        SSRPage[ssr-standard/page.tsx]
        RSCPage[rsc-optimal/page.tsx]
    end
    
    subgraph "Components"
        ServerComp[Server Components]
        ClientComp[Client Components<br/>'use client']
        HybridComp[Hybrid Components]
    end
    
    Layout --> Page
    Layout --> Patterns
    Patterns --> CSRPage
    Patterns --> SSRPage
    Patterns --> RSCPage
    
    CSRPage --> ClientComp
    SSRPage --> ServerComp
    SSRPage --> ClientComp
    RSCPage --> ServerComp
    RSCPage --> HybridComp
    
    style CSRPage fill:#ff9999
    style SSRPage fill:#99ccff
    style RSCPage fill:#99ff99
```

---

## 2. レンダリングパターンの比較

### リクエストフロー比較

```mermaid
sequenceDiagram
    participant Browser
    participant NextServer as Next.js Server
    participant API
    
    Note over Browser,API: ❌ CSR Pattern (遅い)
    Browser->>NextServer: GET /csr-anti
    NextServer-->>Browser: HTML (空のShell)
    Browser->>Browser: JavaScript実行
    Browser->>API: GET /api/products
    API-->>Browser: JSON Data
    Browser->>Browser: レンダリング
    Note right of Browser: Total: ~2500ms
    
    Note over Browser,API: ✅ SSR Pattern (標準)
    Browser->>NextServer: GET /ssr-standard
    NextServer->>API: GET /api/products
    API-->>NextServer: JSON Data
    NextServer->>NextServer: HTML生成
    NextServer-->>Browser: 完全なHTML
    Browser->>Browser: Hydration
    Note right of Browser: Total: ~1200ms
    
    Note over Browser,API: 🚀 RSC Pattern (最速)
    Browser->>NextServer: GET /rsc-optimal
    NextServer->>API: GET /api/products (cached)
    API-->>NextServer: JSON Data
    NextServer->>NextServer: Streaming SSR
    NextServer-->>Browser: HTML (部分的)
    Browser->>Browser: Partial Hydration
    Note right of Browser: Total: ~400ms
```

### パフォーマンス比較

```mermaid
graph LR
    subgraph "CSR Anti-Pattern"
        CSR_FCP[FCP: 2800ms]
        CSR_LCP[LCP: 3500ms]
        CSR_TTI[TTI: 4200ms]
        CSR_Bundle[Bundle: 210KB]
    end
    
    subgraph "SSR Standard"
        SSR_FCP[FCP: 1200ms]
        SSR_LCP[LCP: 1800ms]
        SSR_TTI[TTI: 2500ms]
        SSR_Bundle[Bundle: 155KB]
    end
    
    subgraph "RSC Optimal"
        RSC_FCP[FCP: 400ms]
        RSC_LCP[LCP: 1000ms]
        RSC_TTI[TTI: 1500ms]
        RSC_Bundle[Bundle: 98KB]
    end
    
    style CSR_FCP fill:#ff6666
    style CSR_LCP fill:#ff6666
    style CSR_TTI fill:#ff6666
    style CSR_Bundle fill:#ff6666
    
    style SSR_FCP fill:#ffcc66
    style SSR_LCP fill:#ffcc66
    style SSR_TTI fill:#ffcc66
    style SSR_Bundle fill:#ffcc66
    
    style RSC_FCP fill:#66ff66
    style RSC_LCP fill:#66ff66
    style RSC_TTI fill:#66ff66
    style RSC_Bundle fill:#66ff66
```

---

## 3. データフロー図

### CSR パターンのデータフロー

```mermaid
flowchart TD
    Start[ブラウザリクエスト] --> HTML[空のHTMLシェル受信]
    HTML --> JS[JavaScriptダウンロード]
    JS --> Execute[JavaScript実行]
    Execute --> Mount[Reactマウント]
    Mount --> Effect[useEffect実行]
    Effect --> Fetch1[API呼び出し 1]
    Fetch1 --> Wait1[データ待機...]
    Wait1 --> Fetch2[API呼び出し 2]
    Fetch2 --> Wait2[データ待機...]
    Wait2 --> Render[コンテンツレンダリング]
    Render --> Display[表示完了]
    
    style Start fill:#e1f5ff
    style Display fill:#c8e6c9
    style Wait1 fill:#ffcccc
    style Wait2 fill:#ffcccc
```

### SSR パターンのデータフロー

```mermaid
flowchart TD
    Start[ブラウザリクエスト] --> Server[サーバー受信]
    Server --> Fetch[サーバーでAPI呼び出し]
    Fetch --> Wait[データ待機]
    Wait --> Generate[HTML生成]
    Generate --> Send[HTMLを送信]
    Send --> Browser[ブラウザで受信]
    Browser --> Display[即座に表示]
    Display --> Hydrate[Hydration]
    Hydrate --> Interactive[インタラクティブ化]
    
    style Start fill:#e1f5ff
    style Interactive fill:#c8e6c9
    style Wait fill:#fff9c4
```

### RSC パターンのデータフロー（最適）

```mermaid
flowchart TD
    Start[ブラウザリクエスト] --> Server[サーバー受信]
    Server --> CheckCache{キャッシュ確認}
    CheckCache -->|Hit| UseCached[キャッシュ使用]
    CheckCache -->|Miss| FetchData[データ取得]
    
    FetchData --> Parallel[並列データフェッチ]
    Parallel --> Fetch1[Products API]
    Parallel --> Fetch2[Recommendations API]
    
    Fetch1 --> Merge[データ統合]
    Fetch2 --> Merge
    UseCached --> Generate
    Merge --> Generate[HTML生成]
    
    Generate --> Stream[Streaming SSR]
    Stream --> Send1[部分HTML送信 1]
    Stream --> Send2[部分HTML送信 2]
    Stream --> Send3[部分HTML送信 3]
    
    Send1 --> Display1[段階的表示 1]
    Send2 --> Display2[段階的表示 2]
    Send3 --> Display3[段階的表示 3]
    
    Display3 --> Hydrate[部分的Hydration]
    Hydrate --> Interactive[インタラクティブ化]
    
    style Start fill:#e1f5ff
    style Interactive fill:#c8e6c9
    style UseCached fill:#c8e6c9
    style Parallel fill:#c8e6c9
```

---

## 4. パターン選択フローチャート

```mermaid
flowchart TD
    Start{データ取得が<br/>必要か?}
    
    Start -->|No| Static[静的ページ<br/>通常のReactコンポーネント]
    Start -->|Yes| SEO{SEOが<br/>重要か?}
    
    SEO -->|No| CSR[CSR<br/>Client-Side Rendering]
    CSR --> CSRNote[例: 管理画面<br/>ダッシュボード<br/>認証後のページ]
    
    SEO -->|Yes| Freshness{データの<br/>鮮度要件は?}
    
    Freshness -->|リアルタイム必須| SSRReal[SSR<br/>cache: 'no-store']
    SSRReal --> SSRNote[例: ユーザーダッシュボード<br/>ライブデータ<br/>個人情報]
    
    Freshness -->|数秒〜数分OK| RSCISR[RSC + ISR<br/>revalidate: 60-300]
    RSCISR --> RSCISRNote[例: 商品一覧<br/>ブログ記事<br/>ニュース]
    
    Freshness -->|更新頻度低い| RSCStatic[RSC + 静的生成<br/>generateStaticParams]
    RSCStatic --> RSCStaticNote[例: ドキュメント<br/>Aboutページ<br/>利用規約]
    
    SEO -->|Yes| Interactive{インタラクティブ性<br/>必要?}
    
    Interactive -->|高い| Hybrid[RSC + クライアント境界<br/>部分的にクライアント化]
    Hybrid --> HybridNote[例: 検索フィルター<br/>カートボタン<br/>フォーム]
    
    Interactive -->|低い| PureRSC[完全RSC<br/>サーバーコンポーネントのみ]
    PureRSC --> PureRSCNote[例: 記事詳細<br/>商品詳細<br/>静的コンテンツ]
    
    style CSR fill:#ff9999
    style SSRReal fill:#99ccff
    style RSCISR fill:#99ff99
    style RSCStatic fill:#99ff99
    style Hybrid fill:#99ff99
    style PureRSC fill:#99ff99
```

### ユースケース別推奨パターン

```mermaid
graph LR
    subgraph "Public Pages"
        ProductList[商品一覧] -->|RSC + ISR| RSC1[🚀]
        ProductDetail[商品詳細] -->|RSC + Static| RSC2[🚀]
        Blog[ブログ記事] -->|RSC + Static| RSC3[🚀]
        Search[検索結果] -->|RSC + Client| RSC4[🚀]
    end
    
    subgraph "Authenticated Pages"
        Dashboard[ダッシュボード] -->|SSR| SSR1[✅]
        Profile[プロフィール] -->|SSR + Client| SSR2[✅]
        Orders[注文履歴] -->|SSR| SSR3[✅]
    end
    
    subgraph "Admin Pages"
        AdminPanel[管理画面] -->|CSR許容| CSR1[⚠️]
        Analytics[分析画面] -->|CSR許容| CSR2[⚠️]
    end
    
    style RSC1 fill:#66ff66
    style RSC2 fill:#66ff66
    style RSC3 fill:#66ff66
    style RSC4 fill:#66ff66
    style SSR1 fill:#99ccff
    style SSR2 fill:#99ccff
    style SSR3 fill:#99ccff
    style CSR1 fill:#ffcc99
    style CSR2 fill:#ffcc99
```

---

## 5. スケールアップアーキテクチャ

### フェーズ1: 初期（〜1万PV/日）

```mermaid
graph TB
    Client[Browser Client] --> Vercel[Vercel<br/>Next.js App]
    Vercel --> MockAPI[Mock API<br/>同一サーバー]
    
    style Vercel fill:#99ff99
```

### フェーズ2: 成長期（1万〜10万PV/日）

```mermaid
graph TB
    Client[Browser Client] --> Vercel[Vercel<br/>Next.js App]
    
    Vercel --> Primary[Primary DB<br/>PostgreSQL]
    Vercel --> Replica[Read Replica<br/>PostgreSQL]
    
    subgraph "Database Layer"
        Primary -.->|Replication| Replica
    end
    
    style Vercel fill:#99ff99
    style Primary fill:#ff9999
    style Replica fill:#99ccff
```

### フェーズ3: 拡張期（10万〜100万PV/日）

```mermaid
graph TB
    Client[Browser Client] --> CDN[CDN<br/>CloudFlare]
    
    CDN --> Vercel[Vercel Edge<br/>Next.js App]
    
    Vercel --> Cache[Redis<br/>Cache Layer]
    Cache --> Primary[Primary DB]
    Cache --> Replica[Read Replica]
    
    Vercel --> S3[S3 + CloudFront<br/>Static Assets]
    
    Primary -.->|Replication| Replica
    
    style CDN fill:#9966ff
    style Vercel fill:#99ff99
    style Cache fill:#ff9966
    style S3 fill:#6699ff
```

### フェーズ4: スケール期（100万PV/日〜）

```mermaid
graph TB
    Client[Browser Client] --> CDN[CDN<br/>CloudFlare]
    
    CDN --> Edge[Edge Runtime<br/>Multiple Regions]
    
    Edge --> API[API Gateway<br/>Load Balancer]
    
    API --> Service1[Product Service]
    API --> Service2[User Service]
    API --> Service3[Recommendation Service]
    
    Service1 --> DB1[Product DB<br/>Primary + Replicas]
    Service2 --> DB2[User DB<br/>Primary + Replicas]
    Service3 --> DB3[Analytics DB]
    
    Service1 --> Redis[Redis Cluster<br/>Distributed Cache]
    Service2 --> Redis
    Service3 --> Redis
    
    style CDN fill:#9966ff
    style Edge fill:#99ff99
    style API fill:#ff9966
    style Redis fill:#ff6666
```

---

## 6. キャッシュ戦略

### キャッシュ階層

```mermaid
graph TD
    Request[リクエスト] --> L1{CDN Cache}
    
    L1 -->|Hit| Return1[即座に返却<br/>TTFB: 50ms]
    L1 -->|Miss| L2{Edge Cache}
    
    L2 -->|Hit| Return2[Edge返却<br/>TTFB: 100ms]
    L2 -->|Miss| L3{ISR Cache}
    
    L3 -->|Hit| Return3[ISR返却<br/>TTFB: 150ms]
    L3 -->|Miss| L4{Redis Cache}
    
    L4 -->|Hit| Return4[Redis返却<br/>TTFB: 250ms]
    L4 -->|Miss| DB[Database Query<br/>TTFB: 400ms]
    
    DB --> Store[キャッシュに保存]
    Store --> Return5[返却]
    
    style Return1 fill:#66ff66
    style Return2 fill:#99ff66
    style Return3 fill:#ccff66
    style Return4 fill:#ffff66
    style DB fill:#ff9966
```

### キャッシュ戦略マトリックス

```mermaid
quadrantChart
    title キャッシュ戦略選択
    x-axis 低頻度更新 --> 高頻度更新
    y-axis 低重要度 --> 高重要度
    quadrant-1 短期キャッシュ + タグ
    quadrant-2 no-cache (SSR)
    quadrant-3 長期キャッシュ (静的生成)
    quadrant-4 中期キャッシュ (ISR)
    
    商品画像: [0.8, 0.3]
    商品一覧: [0.6, 0.7]
    商品詳細: [0.7, 0.6]
    ユーザー情報: [0.3, 0.9]
    在庫数: [0.2, 0.8]
    おすすめ: [0.5, 0.5]
    ブログ記事: [0.9, 0.6]
    利用規約: [0.95, 0.4]
```

---

## 7. エラーハンドリング階層

### エラー境界の構造

```mermaid
graph TD
    Root[Root Error Boundary<br/>app/error.tsx] --> Pattern[Pattern Error Boundary<br/>app/patterns/error.tsx]
    
    Pattern --> CSRError[CSR Error Boundary<br/>csr-anti/error.tsx]
    Pattern --> SSRError[SSR Error Boundary<br/>ssr-standard/error.tsx]
    Pattern --> RSCError[RSC Error Boundary<br/>rsc-optimal/error.tsx]
    
    RSCError --> ProductError[Product Error Boundary<br/>products/[id]/error.tsx]
    
    ProductError --> Component[Component Level<br/>try/catch]
    
    style Root fill:#ff6666
    style Pattern fill:#ff9966
    style RSCError fill:#ffcc66
    style ProductError fill:#ffff66
    style Component fill:#ccff66
```

### エラーフロー

```mermaid
sequenceDiagram
    participant Component
    participant ErrorBoundary
    participant Logger
    participant User
    
    Component->>Component: データ取得試行
    Component->>Component: エラー発生
    Component->>ErrorBoundary: エラーをスロー
    
    ErrorBoundary->>ErrorBoundary: エラーをキャッチ
    ErrorBoundary->>Logger: ログ送信
    Logger->>Logger: Sentry/Datadog
    
    ErrorBoundary->>User: Fallback UI表示
    User->>ErrorBoundary: 再試行ボタンクリック
    ErrorBoundary->>Component: リセット
    Component->>Component: 再度データ取得
```

---

## 8. デプロイメントフロー

### CI/CDパイプライン

```mermaid
graph LR
    subgraph "Development"
        Dev[開発者] --> Commit[Git Commit]
        Commit --> Push[Git Push]
    end
    
    subgraph "CI Pipeline"
        Push --> Trigger[GitHub Actions Trigger]
        Trigger --> Lint[Lint Check]
        Lint --> TypeCheck[Type Check]
        TypeCheck --> Test[Unit Tests]
        Test --> Build[Build]
    end
    
    subgraph "Deployment"
        Build --> Preview[Preview Deploy<br/>Vercel]
        Preview --> Review[Code Review]
        Review -->|Approve| Merge[Merge to Main]
        Merge --> Production[Production Deploy]
    end
    
    subgraph "Monitoring"
        Production --> Metrics[Performance Metrics]
        Production --> Errors[Error Tracking]
        Production --> Logs[Logging]
    end
    
    style Dev fill:#e1f5ff
    style Production fill:#c8e6c9
    style Metrics fill:#fff9c4
```

### カナリアデプロイメント

```mermaid
graph TD
    Deploy[新バージョンデプロイ] --> Split{トラフィック分割}
    
    Split -->|90%| Stable[安定版<br/>v1.0]
    Split -->|10%| Canary[カナリア版<br/>v1.1]
    
    Canary --> Monitor{メトリクス監視}
    
    Monitor -->|正常| Increase[カナリア比率増加]
    Monitor -->|異常| Rollback[ロールバック]
    
    Increase --> Split2{トラフィック分割}
    Split2 -->|50%| Stable
    Split2 -->|50%| Canary
    
    Split2 --> Monitor2{メトリクス監視}
    Monitor2 -->|正常| Complete[完全移行]
    Monitor2 -->|異常| Rollback
    
    style Complete fill:#66ff66
    style Rollback fill:#ff6666
```

---

## 使用方法

これらのMermaid図は、以下の場所で使用できます：

1. **GitHub**: README.mdやドキュメントに直接埋め込み
2. **Notion**: Mermaid対応のコードブロック
3. **VS Code**: Mermaid Preview拡張機能
4. **Mermaid Live Editor**: https://mermaid.live/

### 埋め込み例

````markdown
```mermaid
graph TD
    Start[開始] --> Process[処理]
    Process --> End[終了]
```
````

これでアーキテクチャの可視化が完成です！
