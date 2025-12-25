# 同窓会サポートWebアプリケーション <<！注意! これは開発試験用であり、実運用を目的としたものではありません。>>

## 概要

このプロジェクトは、同窓会の運営を効率化し、卒業生同士のつながりを維持・強化するためのWebアプリケーションです。個人情報保護法（APPI）に完全準拠し、無料枠中心の技術スタックで実装されています。

## 技術スタック

### バックエンド
- **Node.js** + **Express.js** - RESTful APIサーバー
- **TypeScript** - 型安全な開発
- **Prisma** - データベースORM
- **PostgreSQL** - データベース（Supabase）
- **JWT** - 認証・認可
- **bcrypt** - パスワードハッシュ化
- **AES-256-GCM** - データ暗号化

### フロントエンド
- **Next.js** - Reactフレームワーク
- **TypeScript** - 型安全な開発
- **Chakra UI** - UIコンポーネントライブラリ
- **React Query** - データフェッチング
- **Recoil** - 状態管理

### インフラ・サービス
- **Vercel** - フロントエンドホスティング
- **Render** - バックエンドホスティング
- **Supabase** - データベース・認証
- **Cloudflare R2** - ファイルストレージ
- **SendGrid** - メール送信

## 機能概要

### ユーザー管理
- ユーザー登録・ログイン
- 多要素認証（オプション）
- パスワードリセット
- プロフィール管理

### 会員検索・連絡先共有
- 同学年会員検索
- 連絡先開示リクエスト・承認フロー
- 個人情報保護を考慮したアクセス制御

### イベント管理
- 同窓会イベントの作成・管理
- 出欠管理
- 通知機能

### メッセージ機能
- 個別メッセージ
- 一斉メッセージ（幹事・役員・教員向け）

### 管理機能
- 幹事：担当学年の会員管理
- 役員：全体管理・承認フロー
- 監査ログ：すべての操作の追跡

### セキュリティ機能
- データ暗号化（AES-256-GCM）
- 監査ログ
- ロールベースアクセス制御（RBAC）
- 属性ベースアクセス制御（ABAC）

## プロジェクト構造

```
/
├── apps/
│   ├── backend/          # Express.js APIサーバー
│   └── frontend/         # Next.js フロントエンド
├── packages/
│   └── shared/           # 共通型定義・ユーティリティ
├── prisma/               # データベーススキーマ・マイグレーション
└── docs/                 # ドキュメント
```

## セットアップ

### 前提条件
- Node.js 18.x以上
- npm または yarn
- PostgreSQLデータベース

### インストール

```bash
# 依存関係のインストール
npm install

# 共有パッケージのビルド
npm run build --workspace=packages/shared
```

### データベース設定

```bash
# 環境変数の設定
cp apps/backend/.env.example apps/backend/.env
# DATABASE_URLなどの環境変数を設定

# Prismaクライアントの生成
npm run db:generate

# データベースマイグレーション
npm run db:migrate

# 初期データの投入
npm run db:seed
```

### 開発サーバーの起動

```bash
# バックエンド・フロントエンドを同時に起動
npm run dev

# または個別に起動
npm run dev --workspace=apps/backend
npm run dev --workspace=apps/frontend
```

## テスト

```bash
# バックエンドテスト
npm run test --workspace=apps/backend

# フロントエンドテスト
npm run test --workspace=apps/frontend

# カバレッジレポート
npm run test:coverage --workspace=apps/backend
npm run test:coverage --workspace=apps/frontend
```

## APIドキュメント

### 認証API
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `POST /api/auth/refresh` - トークンリフレッシュ
- `GET /api/auth/me` - 現在のユーザー情報取得

### その他のAPI
詳細なAPI仕様は各コントローラーの実装を参照してください。

## セキュリティ

### データ保護
- 機密情報はAES-256-GCMで暗号化
- パスワードはbcryptでハッシュ化
- HTTPS強制（TLS 1.2以上）

### アクセス制御
- JWTベースの認証
- ロールベースアクセス制御（RBAC）
- 監査ログによる操作追跡

### 個人情報保護
- 個人情報保護法（APPI）準拠
- データ主体の権利対応（利用停止・消除請求）
- 同意ベースのデータ処理

## デプロイ

### 本番環境デプロイ
1. 環境変数の設定
2. データベースマイグレーション
3. バックエンド・フロントエンドのビルド
4. Render/Vercelへのデプロイ

### CI/CD
GitHub Actionsによる自動デプロイを推奨。

### GitHub Secrets設定
CI/CDワークフローを使用するには、以下のGitHub Secretsを設定してください:

```
RENDER_API_KEY          # Render APIキー
RENDER_SERVICE_ID       # RenderサービスID
VERCEL_TOKEN           # Vercel APIトークン
VERCEL_ORG_ID          # Vercel組織ID
VERCEL_PROJECT_ID      # VercelプロジェクトID
```

### 環境変数設定
各プラットフォームで以下の環境変数を設定してください:

**Render (Backend):**
```bash
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your-jwt-secret
JWT_REFRESH_SECRET_KEY=your-refresh-secret
ENCRYPTION_KEY=your-encryption-key
SENDGRID_API_KEY=your-sendgrid-key
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret
# その他の設定...
```

**Vercel (Frontend):**
```bash
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
```

## ライセンス

このプロジェクトは非商用・学習目的での使用に限定されます。

## GitHubへのアップロード

プロジェクトをGitHubにアップロードするには、以下の手順を実行してください:

```bash
# Gitリポジトリの初期化
git init

# 全ファイルをステージング
git add .

# 最初のコミット
git commit -m "Initial commit: 同窓会サポートWebアプリケーション"

# リモートリポジトリの追加
git remote add origin https://github.com/sohiko/Reunion.git

# ブランチ名をmainに変更
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成
3. 変更をコミット
4. プルリクエストを作成

## サポート

技術的な質問や問題については、Issueを作成してください。
