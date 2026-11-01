# TEMPO同步服务

`services/sync` 是TEMPO的单用户自托管后台，负责合并任务、番茄钟和 RSS 阅读状态，并可选代理 RSS 摘要、翻译和任务规划请求。

返回：[项目首页](../../README.md) · [部署说明](../../docs/DEPLOYMENT.md) · [同步协议](../../docs/SYNC_PROTOCOL.md)

## 特点

- 同步与鉴权使用 Go 标准库，二维码使用固定版本的 `go-qrcode`；无数据库和额外运行时。
- 本地 JSON 持久化，临时文件写入、`fsync`、原子替换。
- Bearer Token 鉴权，密钥必须是 64 位十六进制值。
- 任务使用带删除墓碑的 last-write-wins 合并。
- 25 秒变更等待接口，避免高频全量轮询。
- 可选 OpenAI Chat Completions 兼容 AI 代理。
- 容器默认非 root、只读根文件系统、64 MiB 内存上限。

## 推荐运行方式

使用本目录的 Compose 文件从源码构建。完整 HTTPS 与备份步骤见部署指南：

```bash
cd Tempo/services/sync
cp .env.example .env
TOKEN=$(openssl rand -hex 32)
sed -i "s/^SYNC_TOKEN=.*/SYNC_TOKEN=$TOKEN/" .env
chmod 600 .env
sudo install -d -m 700 -o 65532 -g 65532 data
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/health
```

HTTPS、客户端连接、更新和备份步骤见 [部署说明](../../docs/DEPLOYMENT.md)。

## 服务器扫码配对

在运行同步服务的编排目录执行：

```bash
docker compose exec sync /tempo-sync pair --server https://你的同步域名
```

程序使用容器已有的凭据向本机服务申请一次性邀请，并直接在终端显示标准二维码，不打印长期密钥。邀请 5 分钟内有效，生成新码使旧码失效，每台新设备单独生成。当前 iOS 从“设置 → 自托管同步 → 扫码配对”连接，不提供手动填写。

服务端创建接口只接受本机回环连接，经过反向代理的请求被拒绝；兑换接口供设备在确认服务器后通过 HTTPS 使用。更多操作见 [扫码配对](../../docs/PAIRING.md)。

## 本地开发

需要 Go 1.23 或更高版本。

Linux/macOS：

```bash
cd services/sync
export SYNC_TOKEN="$(openssl rand -hex 32)"
export SYNC_ADDR="127.0.0.1:8080"
export SYNC_DATA_FILE="./data/store.json"
go run ./cmd/sync-server
```

PowerShell：

```powershell
cd services/sync
$env:SYNC_TOKEN = -join ((1..32 | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) }))
$env:SYNC_ADDR = '127.0.0.1:8080'
$env:SYNC_DATA_FILE = './data/store.json'
go run ./cmd/sync-server
```

上述 PowerShell 随机值只适合本地开发；生产密钥请使用可信密码学随机源，例如服务器上的 `openssl rand -hex 32`。

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SYNC_TOKEN` | 无 | 必填；64 位十六进制密钥 |
| `SYNC_ADDR` | `:8080` | 容器/进程内部监听地址 |
| `SYNC_DATA_FILE` | `./data/store.json` | 数据文件路径 |
| `SYNC_MAX_BODY_BYTES` | `2097152` | 同步请求体上限 |
| `SYNC_CORS_ORIGINS` | 空 | 可选浏览器 Origin，多个值用逗号分隔 |
| `AI_BASE_URL` | OpenAI Chat Completions | 可选 AI 上游地址 |
| `AI_API_KEY` | 空 | 留空时 `/v1/ai` 返回未配置 |
| `AI_MODEL` | `gpt-5.6-terra` | AI 模型名称 |

本目录的 Compose 会把主机 `SYNC_LISTEN` 映射到容器 8080，并将 `SYNC_DATA_DIR` 挂载为容器 `/data`；不要混淆主机变量与进程内部的 `SYNC_ADDR`、`SYNC_DATA_FILE`。

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 无鉴权健康检查，同时验证数据目录可写 |
| `GET` | `/v1/ping` | 验证 Bearer Token |
| `POST` | `/v1/sync` | 双向合并完整同步状态 |
| `GET` | `/v1/changes?since=<revision>` | 最长等待 25 秒的修订号通知 |
| `POST` | `/v1/ai` | 可选 AI 摘要、翻译与任务规划 |

请求和合并规则见 [同步协议 v1](../../docs/SYNC_PROTOCOL.md)。

## 测试

```bash
cd services/sync
go test ./...
go vet ./...
go build ./cmd/sync-server
```

服务端代码提交到 `main` 后，GitHub Actions 执行测试与 `vet`，构建容器并发布当前仓库所有者命名空间下的 `tempo-sync` 镜像；旧的 `qingxu-sync` 标签仅用于兼容既有部署。文档改动不触发服务器发布。

## 存储边界

- 单次最多 10,000 个任务。
- 服务端最多保存 20,000 个任务（包含墓碑）。
- 任务 JSON 总量最多 8 MiB，磁盘状态文件最多 10 MiB。
- 单实例写入；多个进程不能共享同一个数据文件。
- RSS 正文和 AI 密钥都不会写入同步状态。
