# Tempo 服务器编排

该编排把 Tempo 同步服务放在 1Panel Compose 项目中：

- `sync`：任务、番茄钟和 RSS 阅读状态同步，监听 `127.0.0.1:8080`。

生产服务器由 `.github/workflows/ota-signal.yml` 自动部署到：

```text
/opt/1panel/docker/compose/tempo-services
```

`sync.env` 和 `/opt/qingxu/sync/data` 不进入 Git。工作流会从仓库源码构建同步服务；首次迁移时从正在运行的旧同步容器保留配置和数据，然后把它注册为 1Panel 中的 `tempo-services` 编排，不依赖旧的私有 GHCR 镜像。

日常管理只需在 1Panel 的“容器 → 编排”中操作 `tempo-services`。不要删除 `sync.env` 或 `/opt/qingxu/sync/data`。

## 生成配对二维码

在服务器主机终端执行，不需要进入容器 shell：

```bash
cd /opt/1panel/docker/compose/tempo-services
docker compose exec sync /tempo-sync pair --server https://你的同步域名
```

当前 iOS 通过“设置 → 自托管同步 → 扫码配对”扫描并确认，不再手动输入地址和密钥。二维码只能在服务器生成，5 分钟有效且只能兑换一次；生成新码立即撤销上一张未使用的码，不影响已配对设备。不要公开分享二维码或截图。
