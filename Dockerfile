FROM node:20-slim

WORKDIR /app

# ★ package.json を最初にコピー（必須）
COPY package.json package-lock.json* ./

# ★ キャッシュを使わず依存関係を入れる
RUN npm install --omit=dev

# ★ 残りのソース
COPY . .

ENV PORT=8080
EXPOSE 8080

# ★ npm start 経由で起動（安全）
CMD ["npm", "start"]
