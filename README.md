# Teyvat Elegance - Dialogue Maker

一個用於創建視覺小說對話場景的網頁應用程式。

## 技術棧

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **資料庫**: Turso (libSQL)
- **圖床**: Catbox.moe
- **部署**: Vercel

## 功能

- 對話場景編輯器 (角色名稱、對話文字、角色立繪、背景圖片)
- 章節選單編輯器
- 圖片上傳至 Catbox 圖床
- 資料儲存至 Turso 雲端資料庫
- JSON 匯入/匯出功能
- 管理員權限驗證

## 開始使用

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local`:

```bash
cp .env.example .env.local
```

編輯 `.env.local` 並填入你的 Turso 憑證:

```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

### 3. 初始化資料庫

```bash
npm run init-db
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

## Turso 設定

1. 前往 [Turso](https://turso.tech) 註冊帳號
2. 建立新的資料庫
3. 在 Turso Dashboard 取得:
   - Database URL (格式: `libsql://your-db.turso.io`)
   - Auth Token

## 部署到 Vercel

### 方法一: 透過 Vercel CLI

```bash
npm i -g vercel
vercel
```

### 方法二: 透過 GitHub

1. 將專案推送到 GitHub
2. 在 [Vercel](https://vercel.com) 匯入專案
3. 設定環境變數:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. 部署

## 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── dialogues/route.ts    # 對話 CRUD API
│   │   ├── chapters/route.ts     # 章節 CRUD API
│   │   ├── chapter-items/route.ts # 章節項目 API
│   │   └── upload/route.ts       # 圖床上傳 API
│   ├── chapters/page.tsx         # 章節選擇頁面
│   ├── layout.tsx                # 根佈局
│   ├── page.tsx                  # 對話編輯器頁面
│   └── globals.css               # 全域樣式
└── lib/
    ├── catbox.ts                 # Catbox 圖床功能
    └── db.ts                     # Turso 資料庫配置
```

## 授權

MIT