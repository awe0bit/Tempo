# 开发指南

本页面向修改源码、构建客户端或维护发布流程的开发者。安装和日常使用请看 [使用指南](CONFIGURATION.md)，自托管用户请看 [部署指南](DEPLOYMENT.md)。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `apps/apple` | SwiftUI iOS 容器、macOS 客户端与 Apple 共享数据层 |
| `apps/ios-runtime` | iOS 的 React Native / TypeScript 页面与 Expo OTA |
| `apps/android` | 独立 Flutter Android 客户端 |
| `apps/flutter` | Flutter Windows 客户端，另保留 Apple 工程复用的资源和扩展源码 |
| `services/sync` | Go 同步服务与可选 AI 代理 |
| `deploy/tempo-services` | 1Panel 服务器编排 |
| `docs` | 使用、部署、设计与开发文档 |

平台最低系统、签名要求和构建参数以各工程配置为准。

## iOS 内容层

需要 Node.js 和 npm；CI 使用 Node.js 24。

```bash
cd apps/ios-runtime
npm ci
node --test tests/tool-navigation.test.mjs
npm run typecheck
npm run export:ios
```

Swift 是数据与凭据的唯一来源。页面通过桥接读取快照、提交业务动作，不另建一份任务数据库。参见 [iOS 架构与 OTA](architecture/ios-ota.md)。

## Apple 客户端

需要 macOS、Xcode 和 XcodeGen。生成 Brownfield 包后再生成 Apple 工程：

```bash
brew install xcodegen
cd apps/ios-runtime
npm ci
npm run prebuild:ios
npm run build:brownfield:ios
cd ../apple
xcodegen generate
open TempoApple.xcodeproj
```

选择 `TempoiOS` 或 `TempomacOS` scheme。工程配置修改 `apps/apple/project.yml`，不要仅修改生成的 Xcode 工程。真机签名参见 [iOS 签名](IOS_PRIVATE_SIGNING.md)。

## Android 与 Windows

Android 使用 `apps/android`，Windows 使用 `apps/flutter`。分别进入对应目录执行：

```bash
flutter pub get
flutter analyze
flutter test
```

运行 Android 使用 `flutter run` 并选择设备；运行 Windows 使用 `flutter run -d windows`。Windows 构建还需要 Visual Studio 的 C++ 桌面开发工作负载。

## 同步服务

Go 版本以 `services/sync/go.mod` 为准。

```bash
cd services/sync
go test ./...
go vet ./...
go build ./cmd/sync-server
```

本地环境变量和接口说明见 [同步服务 README](https://github.com/awe0bit/Tempo/blob/main/services/sync/README.md)，协议见 [同步协议](SYNC_PROTOCOL.md)。

## 文档

```bash
cd docs
npm ci
npm run dev
```

提交前运行 `npm run build`，检查 Markdown 链接和站点构建。中文与英文入口、使用指南应同步更新；没有翻译的技术页面要明确标注语言。

## 发布与更新边界

- `build-release.yml`：按改动路径选择平台构建；公开安装包使用数字版本，成功发布后回写版本元数据。
- `ios-ota.yml`：验证并发布兼容的 iOS 内容更新；纯 OTA 不改变安装包版本号。
- `docs.yml`：独立构建、部署文档站。
- `ota-signal.yml`：历史文件名，当前维护的是服务器编排部署，不是应用更新通知。

纯 TypeScript 改动可使用提交标记 `[ota-only]`。新增原生 API、原生依赖或更改系统能力时不能借此跳过 IPA 构建；兼容性以 `apps/ios-runtime/runtime-version.txt` 为边界，而不是应用显示版本。

## 提交前检查

1. 只改动任务范围内的文件，保留已有用户修改。
2. 运行受影响工程的测试和检查。
3. 更新用户操作发生变化的文档，不把开发细节塞回 README。
4. 不提交密钥、证书、描述文件、真实同步数据或生成的构建产物。
5. 区分本地检查、CI 构建、发布成功和真机验证，不把它们混为同一步。
