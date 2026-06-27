# Docker + GHCR 部署

这个项目以单个容器镜像部署：

- Next.js standalone 服务监听 `0.0.0.0:3000`。
- FastAPI 只在容器内部监听 `127.0.0.1:8000`。
- Next.js 会把 `/site/*`、`/project/model-test/*` 和 `/health` 重写到容器内部的 FastAPI 服务。
- SQLite 数据库通过 Docker volume 持久化到 `/data`。

服务器只映射 Web 端口，API 端口不会暴露到宿主机。

## 1. 发布 GHCR 镜像

`.github/workflows/publish-ghcr.yml` 会构建并推送镜像：

```text
ghcr.io/<owner>/xecho
```

工作流会发布这些标签：

- 默认分支上的 `latest`
- 分支名，例如 `main` 或 `master`
- Git 标签，例如 `v1.0.0`
- 提交 SHA 标签，例如 `sha-abc1234`

推送到默认分支，或者在 GitHub Actions 页面手动运行工作流即可触发构建。

如果 GitHub Package 是私有的，需要在服务器上准备一个带 `read:packages` 权限的 GitHub Personal Access Token。

## 2. 准备服务器

先安装 Docker 和 Docker Compose 插件，然后创建应用目录：

```bash
sudo mkdir -p /opt/xecho
sudo chown -R "$USER":"$USER" /opt/xecho
cd /opt/xecho
```

把仓库 `deploy/` 目录里的文件复制到 `/opt/xecho`，让服务器目录包含：

```text
docker-compose.yml
.env.example
```

创建服务器环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
IMAGE=ghcr.io/OWNER/xecho
IMAGE_TAG=latest
WEB_PORT=3000
CORS_ALLOW_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:////data/model_test.db
```

把 `OWNER` 换成你的 GitHub 用户名或组织名。如果宿主机需要暴露其他端口，修改 `WEB_PORT`。

## 3. 登录 GHCR

如果镜像是私有的，在服务器上登录 GHCR：

```bash
echo "<github-token>" | docker login ghcr.io -u <github-username> --password-stdin
```

公开镜像不需要登录。

## 4. 启动服务

在包含 `docker-compose.yml` 的目录中运行：

```bash
docker compose pull
docker compose up -d
```

查看状态：

```bash
docker compose ps
docker compose logs -f xecho
```

健康检查：

```bash
curl http://127.0.0.1:3000/health
```

如果修改了 `WEB_PORT`，健康检查里的端口也要同步替换。

## 5. 更新服务

发布新镜像后，在服务器上运行：

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

如果要部署某个精确提交，把 `IMAGE_TAG` 改成工作流生成的 `sha-...` 标签，然后运行同样的命令。

## 注意事项

- 服务器防火墙只需要开放选定的 `WEB_PORT`。
- SQLite 数据保存在 `xecho-data` Docker volume 中。
- API 只在容器内部可访问，浏览器请求会通过 Next.js rewrite 转发。
- 模型测试控制台中填写的 API key 会持久化到 SQLite。公开访问前建议先加登录鉴权。
