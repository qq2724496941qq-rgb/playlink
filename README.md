# PlayLink - 在线棋牌游戏

麻将 + 斗地主多人实时对战

## 项目结构

```
playlink/
├── frontend/          # Vue3 + Vite 前端
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/           # Node.js + Socket.io 后端
│   ├── server.js
│   ├── db.js
│   └── ...
└── README.md
```

## 本地开发

### 启动后端
```bash
cd backend
cp .env.example .env
npm install
npm start
```

### 启动前端
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 部署

- 前端: Vercel / Netlify
- 后端: 腾讯云 / Railway / Render
