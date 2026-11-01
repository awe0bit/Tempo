# iOS 架构与 OTA

本页面向开发者。用户只需阅读 [使用指南中的更新说明](../CONFIGURATION.md#更新应用)。

Tempo iOS 使用 SwiftUI 原生壳和 Expo Brownfield 嵌入的 React Native / TypeScript 内容层，macOS 仍使用独立 SwiftUI 界面。

## 所有权边界

| 原生层 | 内容层 |
| --- | --- |
| 生命周期、启动动画、底部 UITabBar | 收集箱、今天、工具、设置页面 |
| 顶部液态玻璃按钮、搜索和菜单 | 通过已有 React Navigation 原生栈组织页面转场 |
| Keychain、App Group、通知、后台任务 | 设置表单、任务编辑与阅读操作内容 |
| WidgetKit、Live Activity、灵动岛 | 番茄钟页面和专注统计 |
| 数据持久化、同步和网络业务动作 | 布局、文案、样式和兼容业务逻辑 |

使用已经存在的原生组件可以通过 OTA 调整页面；修改原生组件本身的 Swift 实现仍需新 IPA。不要把“使用原生栈”和“每次调整导航都必须重装”混为一谈。

## 启动与数据

原生开屏独立于业务数据加载，应用服务和内容运行时延后挂载。内容准备好后再淡入主界面，保留运行时超时后的恢复入口。

Swift 数据层是唯一事实来源：

1. 内容层请求 `tempo.bootstrap` 获取快照。
2. 通过 `tempo.snapshot` 接收后续状态。
3. 通过 `tempo.perform` 提交动作，由 Swift 校验、持久化并同步。
4. 原生通过 `tempo.command` 发送导航、搜索等指令。

原生能力使用快照中的 `capabilities` 协商。新增可选能力时，旧安装包必须能忽略相关内容路径，不能让 OTA 调用不存在的接口。

## 页面与按钮动效

工具页通过 React Navigation 原生栈进入番茄钟和 RSS。页面转场与顶部 SwiftUI 按钮是不同层，按钮透明度使用实际页面进度驱动；退出时保留按钮到淡出结束，返回手势取消时恢复。

工具按钮进度使用 `tempo.navigation-progress` 的 `toolChrome` scope，与设置二级页面的底栏进度分开，避免互相覆盖。该桥接能力需要对应原生包支持。

## 更新策略

- 原生兼容版本位于 `apps/ios-runtime/runtime-version.txt`，不跟随安装包版本自动变化。
- 正式通道为 `production`；手动验证可使用 `preview`。
- 应用启动、从后台回到前台，以及打开开发者工具时检查更新。
- 没有服务器发布信号连接，也没有周期性 OTA 轮询。
- 可用更新自动下载，下次自然启动时应用；不在 React 根节点强制重启应用。
- 下载失败继续使用已有内容，由 `expo-updates` 管理已下载更新及恢复路径。

纯 TypeScript、样式和资源变更保持兼容版本不变。原生依赖、必需桥接协议或系统能力不兼容时，调整兼容版本并发布 IPA；可选桥接扩展也需要新 IPA，但旧包应通过能力判断继续工作。

## 开发者工具

连续点击底部“设置”四次，或长按约 0.65 秒打开。当前面板由 TypeScript 承载，系统 Sheet 负责呈现。

面板可查看 OTA 检查、下载、待重启状态，以及运行时、通道、更新标识、应用和同步诊断。打开面板会发起一次更新检查；具体可见字段以 `DeveloperToolsScreen.tsx` 为准。

不要在诊断信息中输出同步密钥、AI 密钥、证书或私人任务内容。

## 本地检查与发布

```bash
cd apps/ios-runtime
npm ci
node --test tests/tool-navigation.test.mjs
npm run typecheck
npm run export:ios
```

`ios-ota.yml` 执行检查与导出，然后发布 EAS Update。它不构建新的 Brownfield Swift Package；原生包由 `build-release.yml` 的 Apple 作业构建。

完整构建步骤与提交约定见 [开发指南](../DEVELOPMENT.md)。CI 成功不等于真机通过，发布后仍需分别验证冷启动、前台恢复、页面进入、返回完成和手势取消。
