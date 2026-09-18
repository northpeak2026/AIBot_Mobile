# WillBet AI Assistant Client Prototype

本项目是原生 HTML / CSS / JavaScript 的 Mobile H5 交互原型，不包含真实接口或真实账户数据。

## 本地运行

```bash
cd /Users/apple/Documents/ChatGPT/AIBot/willbet-ai-client-demo
python3 -m http.server 4173 --bind 127.0.0.1
```

浏览器访问：<http://127.0.0.1:4173/>

## 文件

- `index.html` — 页面入口
- `styles.css` — WillBet 深色移动端样式
- `app.js` — 路由、状态、Mock Data、AI Conversation、History 与 Demo Controls

会话、登录模拟状态、AI Shortcut 与浮钮位置均使用 `localStorage` 保存。
