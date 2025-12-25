# 同窓会サポートWebアプリケーション セットアップ手順書

## 概要

この手順書では、同窓会サポートWebアプリケーションの開発環境および本番環境のセットアップ方法について説明します。

## 前提条件

- Node.js 18.x以上
- npm または yarn
- Git
- PostgreSQLデータベース（開発環境ではDockerを使用可能）

## 目次

1. [リポジトリのクローン](#1-リポジトリのクローン)
2. [依存関係のインストール](#2-依存関係のインストール)
3. [Supabaseデータベース設定](#3-supabaseデータベース設定)
4. [Cloudflare R2設定](#4-cloudflare-r2設定)
5. [SendGridメール設定](#5-sendgridメール設定)
6. [Twilio SMS設定（オプション）](#6-twilio-sms設定オプション)
7. [Vercelデプロイ設定](#7-vercelデプロイ設定)
8. [Renderデプロイ設定](#8-renderデプロイ設定)
9. [環境変数の設定](#9-環境変数の設定)
10. [データベース初期化](#10-データベース初期化)
11. [アプリケーション起動](#11-アプリケーション起動)
12. [動作確認](#12-動作確認)

---

## 1. リポジトリのクローン

```bash
git clone https://github.com/your-username/reunion-app.git
cd reunion-app
```

## 2. 依存関係のインストール

```bash
# ルートディレクトリで依存関係をインストール
npm install

# 共有パッケージをビルド
npm run build --workspace=packages/shared
```

## 3. Supabaseデータベース設定

### 3.1 Supabaseアカウント作成

1. [Supabase](https://supabase.com/) にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでログイン、または新規アカウント作成
4. プロジェクト名を入力（例: `reunion-app`）
5. データベースのパスワードを設定（後で使用）

### 3.2 データベースURLの取得

1. Supabaseダッシュボードでプロジェクトを選択
2. 「Settings」→「Database」をクリック
3. 「Connection string」の「URI」をコピー
4. 以下のような形式になっていることを確認:
   ```
   postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
   ```

### 3.3 Row Level Security (RLS)の確認

SupabaseではデフォルトでRLSが有効になっています。プロジェクト設定で確認してください。

## 4. Cloudflare R2設定

### 4.1 Cloudflareアカウント作成

1. [Cloudflare](https://cloudflare.com/) にアクセス
2. 無料アカウントを作成
3. ログイン後、ダッシュボードに移動

### 4.2 R2バケット作成

1. ダッシュボードの「R2」をクリック
2. 「Create bucket」をクリック
3. バケット名を入力（例: `reunion-documents`）
4. ロケーションは任意（例: `APAC`）

### 4.3 APIトークン作成

1. R2ダッシュボードで「Manage R2 API tokens」をクリック
2. 「Create API token」をクリック
3. トークン名を入力（例: `reunion-app-token`）
4. 権限: 読み取り/書き込み
5. トークンを作成し、以下の情報を保存:
   - Access Key ID
   - Secret Access Key
   - Account ID（URLから取得: `https://dash.cloudflare.com/{account-id}`）

## 5. SendGridメール設定

### 5.1 SendGridアカウント作成

1. [SendGrid](https://sendgrid.com/) にアクセス
2. 無料アカウントを作成（月100通まで無料）
3. メールアドレスを認証

### 5.2 APIキー作成

1. SendGridダッシュボードにログイン
2. 左メニューから「Settings」→「API Keys」をクリック
3. 「Create API Key」をクリック
4. API Key名を入力（例: `reunion-app-key`）
5. 権限: 「Full Access」または「Restricted Access」でMail Sendを選択
6. APIキーを作成し、保存（後で使用できないので注意）

### 5.3 ドメイン認証（本番環境）

1. SendGridダッシュボードの「Settings」→「Sender Authentication」
2. 「Verify a Sender」をクリック
3. 送信元メールアドレスを認証
4. SPF/DKIM/DMARCレコードをDNSに設定

## 6. Twilio SMS設定（オプション）

### 6.1 Twilioアカウント作成

1. [Twilio](https://twilio.com/) にアクセス
2. 無料トライアルアカウントを作成
3. 電話番号を購入（SMS送信用）

### 6.2 API認証情報取得

1. Twilioコンソールにログイン
2. ダッシュボードから以下の情報を取得:
   - Account SID
   - Auth Token
   - Phone Number（購入した番号）

## 7. Vercelデプロイ設定

### 7.1 Vercelアカウント作成

1. [Vercel](https://vercel.com/) にアクセス
2. GitHubアカウントでログイン

### 7.2 プロジェクトインポート

1. Vercelダッシュボードで「Import Project」をクリック
3. GitHubリポジトリを選択
4. 設定:
   - Root Directory: `apps/frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 7.3 環境変数設定

Vercelダッシュボードのプロジェクト設定で以下の環境変数を設定:

```bash
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
```

## 8. Renderデプロイ設定

### 8.1 Renderアカウント作成

1. [Render](https://render.com/) にアクセス
2. GitHubアカウントでログイン

### 8.2 Web Service作成

1. Renderダッシュボードで「New」→「Web Service」をクリック
2. GitHubリポジトリを接続
3. 設定:
   - Name: `reunion-backend`
   - Root Directory: `apps/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### 8.3 環境変数設定

Renderダッシュボードのサービス設定で環境変数を設定（後述）。

## 9. 環境変数の設定

### 9.1 バックエンド環境変数

`apps/backend/.env` ファイルを作成し、以下の変数を設定:

```bash
# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# JWT
JWT_SECRET_KEY=[32文字以上のランダム文字列]
JWT_REFRESH_SECRET_KEY=[32文字以上のランダム文字列]
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=[64文字の16進数]
ENCRYPTION_IV=[32文字の16進数]

# Email (SendGrid)
SENDGRID_API_KEY=[SendGrid APIキー]
FROM_EMAIL=noreply@yourdomain.com

# SMS (Twilio - オプション)
TWILIO_ACCOUNT_SID=[Twilio Account SID]
TWILIO_AUTH_TOKEN=[Twilio Auth Token]
TWILIO_PHONE_NUMBER=+1234567890

# Cloudflare R2
CLOUDFLARE_R2_ACCESS_KEY_ID=[R2 Access Key ID]
CLOUDFLARE_R2_SECRET_ACCESS_KEY=[R2 Secret Access Key]
CLOUDFLARE_R2_ACCOUNT_ID=[Cloudflare Account ID]
CLOUDFLARE_R2_BUCKET_NAME=reunion-documents

# App Config
NODE_ENV=production
PORT=3001
API_URL=https://your-render-app.onrender.com
FRONTEND_URL=https://your-vercel-app.vercel.app

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg
```

### 9.2 フロントエンド環境変数

Vercelのプロジェクト設定で以下の環境変数を設定:

```bash
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
NEXT_PUBLIC_APP_ENV=production
```

### 9.3 環境変数生成スクリプト

暗号化キーなどを生成するためのスクリプト:

```bash
# 暗号化キー生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWTシークレット生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 10. データベース初期化

### 10.1 Prisma設定

```bash
# データベースマイグレーション
npm run db:migrate

# Prismaクライアント生成
npm run db:generate

# 初期データ投入
npm run db:seed
```

### 10.2 初期データ確認

Supabaseダッシュボードで以下のテーブルが作成されていることを確認:
- users
- profiles
- roles
- audit_logs
- verification_documents
- contact_access_requests
- events
- messages

## 11. アプリケーション起動

### 11.1 開発環境

```bash
# バックエンド・フロントエンド同時起動
npm run dev

# 個別起動
npm run dev --workspace=apps/backend
npm run dev --workspace=apps/frontend
```

### 11.2 本番環境

- Vercel: 自動デプロイ
- Render: 自動デプロイ

## 12. 動作確認

### 12.1 基本機能テスト

1. **ユーザー登録・ログイン**
   - フロントエンドの登録ページでユーザーを作成
   - ログインできることを確認

2. **身分証明書アップロード**
   - ログイン後、プロフィールページで身分証明書をアップロード
   - ファイルが正常に保存されることを確認

3. **連絡先開示申請**
   - 他のユーザーに対して連絡先開示を申請
   - 承認・拒否が正常に動作することを確認

4. **イベント管理**
   - 幹事権限でイベントを作成
   - 出欠登録が正常に動作することを確認

5. **メッセージ機能**
   - 他のユーザーとのメッセージ交換
   - 一斉メッセージ送信

### 12.2 管理者機能テスト

1. **システム管理者アカウント**
   - 初期データで作成されたadminユーザーでログイン
   - すべての機能にアクセスできることを確認

2. **監査ログ確認**
   - すべての操作が監査ログに記録されていることを確認

3. **バックアップ機能**
   - 定期バックアップが実行されていることを確認

### 12.3 セキュリティテスト

1. **アクセス制御**
   - 一般ユーザーが管理者機能にアクセスできないことを確認
   - 適切な権限がない操作がブロックされることを確認

2. **データ暗号化**
   - データベース内の機密情報が暗号化されていることを確認

## トラブルシューティング

### よくある問題と解決方法

#### データベース接続エラー
```
Error: P1001: Can't reach database server
```
- DATABASE_URLが正しいことを確認
- Supabaseのファイアウォール設定を確認

#### ファイルアップロードエラー
```
Error: Upload failed
```
- Cloudflare R2のAPIキーが正しいことを確認
- バケット名が一致していることを確認

#### メール送信エラー
```
Error: Unauthorized
```
- SendGrid APIキーが正しいことを確認
- 送信元アドレスが認証されていることを確認

#### JWTエラー
```
Error: Invalid token
```
- JWT_SECRET_KEYが環境変数に設定されていることを確認
- キーが32文字以上であることを確認

## 運用開始後のタスク

1. **SSL証明書の設定**
   - Vercel/Renderで自動設定されることを確認

2. **ドメイン設定**
   - カスタムドメインを設定（オプション）

3. **監視設定**
   - エラーログの監視
   - パフォーマンス監視

4. **定期メンテナンス**
   - 依存関係の更新
   - セキュリティパッチの適用
   - バックアップの確認

## サポート

セットアップで問題が発生した場合:
1. この手順書を再確認
2. エラーログを確認
3. GitHub Issuesで報告

---

**注意**: このアプリケーションには個人情報が含まれるため、セキュリティを最優先に運用してください。本番環境では必ず適切なアクセス制御と暗号化設定を行ってください。
