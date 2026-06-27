# xEcho

xEcho 是一个基于 Next.js 构建的现代个人网站和项目实验室。它包含白色科技感首页、粒子射线 Hero 动画、项目和工具展示区，以及一个用于 OpenAI 兼容接口的模型测试控制台。

## 功能

- 现代白色科技风格个人主页
- Canvas 粒子射线 Hero 动画
- shadcn 风格 UI 工具和响应式布局
- 基于 Motion 的进入动画
- Magic UI globe 视觉组件
- `/projects` 项目索引页
- `/projects/model-test` 模型测试控制台
- 使用 SQLModel 和 SQLite 持久化的 FastAPI 后端
- 用于延迟、状态和 token 用量展示的 ECharts 仪表图

## 技术栈

- 前端：Next.js 16、React 19、TypeScript
- 样式：Tailwind CSS v4、CSS Modules、shadcn、Magic UI
- 动效和视觉：`motion`、ECharts、canvas
- 后端：FastAPI、SQLModel、SQLite、httpx
- Python 运行时：`uv`

## 路由

- `/` - 个人主页
- `/projects` - 项目索引
- `/projects/model-test` - 模型测试控制台

## 模型测试控制台

模型测试控制台支持：

- 添加、编辑、启用、停用和删除 OpenAI 兼容 API 配置
- 在后端 SQLite 数据库中保存 API base URL 和 API key
- 从 OpenAI 兼容的 `/models` 端点拉取模型列表
- 手动添加模型
- 启用或停用模型
- 配置测试输入、max tokens、temperature、全局并发和单 API 并发限制
- 对启用的模型运行批量测试
- 将测试结果持久化到数据库
- 查看延迟、状态和 token 图表
- 打开每条结果的请求和响应详情

前端不会内置默认 API、模型或测试结果数据。它会通过后端数据库读取状态：

```text
GET /project/model-test/state
```

## 本地启动

安装前端依赖：

```bash
npm install
```

运行 Next.js 应用：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 后端启动

后端位于 `backend/`，使用 `uv` 管理运行环境。

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

健康检查：

```text
http://localhost:8000/health
```

SQLite 数据库会自动创建在：

```text
backend/data/model_test.db
```

本地数据库文件已被 git 忽略。

## 环境变量

开发环境下，前端默认请求后端地址：

```text
http://localhost:8000
```

可以通过下面的变量覆盖：

```bash
NEXT_PUBLIC_MODEL_TEST_API=http://localhost:8000
```

Docker 部署中，前端 API 请求使用同源路径，并由 Next.js 服务代理到同一个容器内的 FastAPI 进程。

## 后端 API

模型测试 API 前缀：

```text
/project/model-test
```

接口列表：

- `GET /project/model-test/state`
- `POST /project/model-test/apis`
- `PATCH /project/model-test/apis/{api_id}`
- `DELETE /project/model-test/apis/{api_id}`
- `POST /project/model-test/apis/{api_id}/fetch-models`
- `POST /project/model-test/models`
- `PATCH /project/model-test/models/{model_id}`
- `DELETE /project/model-test/models/{model_id}`
- `POST /project/model-test/tests/batch`
- `DELETE /project/model-test/results`

## OpenAI 兼容 API 说明

Base URL 推荐填写根地址，例如：

```text
https://api.openai.com/v1
```

不要填写完整的 models 端点：

```text
https://api.openai.com/v1/models
```

后端会尽量兼容误填 `/models` 后缀的情况，但仍建议使用 `/v1` 这类根地址。

## 脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 部署

Docker + GHCR 部署说明见 [DEPLOY.md](DEPLOY.md)。

后端校验：

```bash
cd backend
uv run python -m compileall main.py project
```

## 项目结构

```text
app/
  page.tsx
  projects/
    page.tsx
    model-test/
      page.tsx
    _components/
      model-tester.tsx
      model-tester.module.css
backend/
  main.py
  project/
    model_test/
      database.py
      models.py
      router.py
      schemas.py
components/
  ui/
lib/
```

## 说明

- 全局顶部导航由 `app/layout.tsx` 共享。
- 模型测试实现放在 `backend/project/model_test`，因为 Python 包名不能包含连字符。
- HTTP 路由仍然保持为 `/project/model-test`。
