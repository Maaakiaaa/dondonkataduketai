

Next.js、Spotify API、Gemini AIを使用したプレイリスト自動生成アプリケーション

## 機能

- Spotifyアカウントでログイン
- ユーザーの保存済み楽曲、トップトラック、最近再生した楽曲を取得
- Gemini AIを使用してパーソナライズされたプレイリストを生成
- 指定した時間に合わせたプレイリストを作成

## 開発環境のセットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. Spotify Developer Appの設定

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)にアクセス
2. 新しいアプリを作成
3. Redirect URIに `http://127.0.0.1:3000/api/auth/callback/spotify` を追加
   - **重要**: `localhost`は使用できません。必ず`127.0.0.1`を使用してください
4. Client IDとClient Secretをコピー

### 3. Gemini APIキーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. APIキーを作成

### 4. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定:

```bash
# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# NextAuth
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=your_nextauth_secret_here  # openssl rand -base64 32 で生成

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで [http://127.0.0.1:3000](http://127.0.0.1:3000) を開きます。

## コード品質管理

- **保存時**: Biome拡張機能が自動フォーマット（拡張機能インストール時）
- **コミット時**: lefthookが自動でlint & フォーマット（必須）

### コマンド
```bash
npm run lint          # チェックのみ
npm run lint:fix      # 自動修正
npm run format        # フォーマットのみ
```

## プロジェクト構造

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/       # NextAuth設定
│   │   └── play/                     # Play機能のAPI routes
│   │       ├── tracks/route.ts       # 楽曲情報取得API
│   │       └── user/route.ts         # ユーザー情報取得API
│   ├── play/                         # Play機能のページ
│   │   └── page.tsx                  # プレイリスト生成画面
│   ├── layout.tsx                    # ルートレイアウト
│   └── page.tsx                      # ホームページ
├── components/
│   └── providers/
│       └── auth-session-provider.tsx # NextAuth Session Provider
├── lib/
│   └── spotify-api.ts                # Spotify API ユーティリティ
├── types/
│   └── next-auth.d.ts                # NextAuth型定義
└── .env.local                        # 環境変数（git管理外）
```

## 使用技術

- **Next.js 16** - Reactフレームワーク
- **NextAuth.js** - 認証
- **Spotify Web API** - 音楽データ取得
- **Gemini AI** - プレイリスト生成
- **Tailwind CSS** - スタイリング
- **TypeScript** - 型安全性
