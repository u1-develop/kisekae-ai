# Node.js の軽量イメージを使用
FROM node:20-slim

# アプリ用の作業ディレクトリ作成
WORKDIR /app

# package.json と package-lock.json を先にコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm install --production

# アプリのソースコードをすべてコピー
COPY . .

# Cloud Run のデフォルトポートは 8080
ENV PORT=8080
EXPOSE 8080

# アプリの起動
CMD ["node", "index.js"]
