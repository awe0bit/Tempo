# Tempo iOS OTA Runtime

这是 Tempo iOS 的可更新内容层，不是第二个独立客户端。

- SwiftUI 保留 App 生命周期、系统导航、搜索、选项按钮、液态玻璃、权限、Keychain、App Group、小组件和 Live Activity。
- React Native + TypeScript 承载收集箱、今天、工具和设置四个一级页面；番茄钟和 RSS 从工具页进入。
- `expo-updates` 只发布与当前原生 runtime 兼容的 JavaScript、样式和静态资源；客户端在启动、回到前台和打开开发者工具时检查，自动下载，下次自然启动时生效，不强制重启。
- Swift 数据层是唯一事实来源；TypeScript 通过 `TempoNativeBridge` 读取快照、订阅变化并提交动作。
- 原有 Swift 数据文件继续直接使用；迁移不会清空任务、专注记录、RSS 订阅或同步配置。

## 本地验证

```bash
npm ci
node --test tests/tool-navigation.test.mjs
npm run typecheck
npm run export:ios
```

Swift Package 只能在 macOS/Xcode 环境构建：

```bash
npm run prebuild:ios
npm run build:brownfield:ios
```

输出位于 `artifacts/TempoRuntimePackage-release`。正式 IPA 接入前，GitHub Actions 会先验证这个隔离运行包能完整构建。

## GitHub OTA 发布

1. 登录 Expo 后在 <https://expo.dev/settings/access-tokens> 创建专用于 CI 的令牌。
2. 在 GitHub 仓库 `Settings → Secrets and variables → Actions` 新建仓库 Secret。
3. 名称必须为 `EXPO_TOKEN`，值只粘贴到 GitHub，不写入源码、日志或聊天。
4. 运行 `iOS OTA Runtime` 工作流，选择与安装包一致的更新通道；正式安装包使用 `production`。

OTA 工作流完成 TypeScript 检查和 iOS 导出后，向对应 EAS Channel 发布 Update。Brownfield Swift Package 由原生构建工作流处理，不在每次内容发布时重建。正式安装包使用 `production` 通道，更新必须与该通道和原生兼容版本匹配。

## 发布约束

`runtime-version.txt` 是原生兼容边界，不跟随 App 版本自动变化。纯 TypeScript、样式和资源更新保持该值不变。原生实现改动需要新 IPA；只有不兼容的原生依赖或必需 API 变化才需要调整该值，可选桥接扩展通过 `capabilities` 保持旧包可用。

参见 [开发指南](../../docs/DEVELOPMENT.md) 和 [iOS 架构与 OTA](../../docs/architecture/ios-ota.md)。
