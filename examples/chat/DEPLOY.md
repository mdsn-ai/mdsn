# Chat Demo 部署方案（用于 Agent 黑盒验收）

目标：把 `examples/chat` 部署到一个固定公网地址，避免本地/沙箱网络差异导致的 `CONNECT_FAIL`。

## 1. 部署目标与原则

1. 只部署 chat demo，不改协议层。
2. 提供稳定的 HTTPS 地址（例如 `https://chat-demo.your-domain.com`）。
3. 用这个地址做后续所有 fresh agent 黑盒测试。

## 2. 服务器前置条件

推荐最小配置：

1. Ubuntu 22.04+
2. 2C2G
3. Node.js 20+
4. 已有可用域名（A 记录指向服务器）

## 3. 首次部署（单机）

```bash
# 1) 登录服务器
ssh <user>@<server_ip>

# 2) 安装 Node 20（如果还没有）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 3) 拉代码
git clone <your-repo-url> /opt/mdsn
cd /opt/mdsn

# 4) 安装依赖
npm install

# 5) 启动 chat demo（先前台验证）
PORT=4124 npm run -w @mdsn/examples chat:start
```

前台看到以下日志说明服务已起来：

`Vue chat demo listening on http://localhost:4124`

## 4. 守护进程（systemd）

创建服务文件：

```bash
sudo tee /etc/systemd/system/mdsn-chat.service >/dev/null <<'EOF'
[Unit]
Description=MDSN Chat Demo
After=network.target

[Service]
Type=simple
User=<user>
WorkingDirectory=/opt/mdsn
Environment=NODE_ENV=production
Environment=PORT=4124
ExecStart=/usr/bin/npm run -w @mdsn/examples chat:start
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable mdsn-chat
sudo systemctl start mdsn-chat
sudo systemctl status mdsn-chat --no-pager
```

查看日志：

```bash
sudo journalctl -u mdsn-chat -f
```

## 5. Nginx 反向代理 + HTTPS

安装：

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

站点配置：

```bash
sudo tee /etc/nginx/sites-available/mdsn-chat >/dev/null <<'EOF'
server {
  listen 80;
  server_name chat-demo.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:4124;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/mdsn-chat /etc/nginx/sites-enabled/mdsn-chat
sudo nginx -t
sudo systemctl reload nginx
```

申请证书：

```bash
sudo certbot --nginx -d chat-demo.your-domain.com
```

## 6. 部署后验收（必须做）

```bash
# 1) 首页是否可达
curl -sS -i https://chat-demo.your-domain.com/ | head -n 20

# 2) 是否 md-only（当前 chat demo 目标）
curl -sS -i -H 'Accept: */*' https://chat-demo.your-domain.com/ | grep -i 'content-type'

# 3) 黑盒主流程脚本（本仓库内）
cd /opt/mdsn
CHAT_BLACKBOX_PORT=443 npm run chat:onboarding:test
```

注：如果你走 HTTPS 域名，不要直接复用脚本里的 `127.0.0.1`，建议按域名再做一次 curl 主流程验证。

## 7. 给 Agent 的测试入口建议

后续统一给 agent 的唯一入口：

`https://chat-demo.your-domain.com`

并固定约束：

1. 只允许 HTTP 文本交互
2. 不允许浏览器
3. 不允许读源码
4. 只统计完整通关样本

## 8. 常见故障排查

1. `CONNECT_FAIL`
   - 先看 `curl -I https://chat-demo.your-domain.com/`
   - 再看 `systemctl status mdsn-chat` 和 `nginx -t`

2. 服务在本机正常，公网不通
   - 检查安全组/防火墙 80/443 是否开放
   - 检查域名 A 记录是否生效

3. 返回非预期内容
   - 先看 Nginx 是否有旧缓存/错误 upstream
   - 再看 `journalctl -u mdsn-chat -f`
