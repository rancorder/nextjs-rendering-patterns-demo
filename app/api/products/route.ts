import { NextResponse } from 'next/server';

// モックデータ
const mockProducts = [
  {
    id: '1',
    name: 'ワイヤレスイヤホン Pro',
    price: 29.99,
    category: 'Electronics',
    description: '高音質なワイヤレスイヤホン',
    inStock: true,
  },
  {
    id: '2',
    name: 'スマートウォッチ X1',
    price: 199.99,
    category: 'Electronics',
    description: 'フィットネストラッキング機能付き',
    inStock: true,
  },
  {
    id: '3',
    name: 'ノートパソコン Ultra',
    price: 1299.99,
    category: 'Electronics',
    description: '高性能ノートPC',
    inStock: true,
  },
  {
    id: '4',
    name: 'Bluetoothスピーカー',
    price: 79.99,
    category: 'Electronics',
    description: 'ポータブルスピーカー',
    inStock: true,
  },
  {
    id: '5',
    name: 'ワイヤレスマウス',
    price: 24.99,
    category: 'Accessories',
    description: 'エルゴノミックデザイン',
    inStock: true,
  },
  {
    id: '6',
    name: 'USBメモリ 128GB',
    price: 19.99,
    category: 'Accessories',
    description: '高速データ転送',
    inStock: true,
  },
  {
    id: '7',
    name: 'ゲーミングキーボード',
    price: 89.99,
    category: 'Gaming',
    description: 'メカニカルキーボード',
    inStock: true,
  },
  {
    id: '8',
    name: 'モニター 27インチ',
    price: 349.99,
    category: 'Electronics',
    description: '4K解像度対応',
    inStock: true,
  },
];

// 意図的な遅延を追加（デモ用）
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// GET /api/products
export async function GET(request: Request) {
  // デモ用に少し遅延を入れる（300ms）
  await delay(300);
  
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // カテゴリフィルタ
  let filteredProducts = [...mockProducts];
  if (category && category !== 'all') {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // ページネーション
  const paginatedProducts = filteredProducts.slice(offset, offset + limit);
  
  return NextResponse.json({
    products: paginatedProducts,
    total: filteredProducts.length,
    limit,
    offset,
    hasMore: offset + limit < filteredProducts.length,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

// POST /api/products（管理者用 - デモなので実装は簡易）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // バリデーション
    if (!body.name || !body.price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price' },
        { status: 400 }
      );
    }
    
    // 新規商品作成（モック）
    const newProduct = {
      id: Date.now().toString(),
      name: body.name,
      price: body.price,
      category: body.category || 'Uncategorized',
      description: body.description || '',
      inStock: body.inStock ?? true,
      createdAt: new Date().toISOString(),
    };
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
