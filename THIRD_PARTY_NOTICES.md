# 第三方软件声明

TEMPO 的当前依赖与版本以各客户端的锁文件为准。Android 客户端以 FelixZoe/flowtime 的 MIT 许可源码为基础进行完整替换与品牌重构，许可原文保存在 `apps/android/FLOWTIME_LICENSE`。此前用于服务器连接功能的 SwiftTerm、Citadel、swift-nio-ssh、VVTerm 与 Termini 已随该功能完整移除，不再参与构建或分发。

各依赖版权归原作者所有，具体条款以对应仓库与锁文件中的许可信息为准。

## 服务器配对二维码

使用 [skip2/go-qrcode](https://github.com/skip2/go-qrcode)，MIT 许可，Copyright (c) 2014 Tom Harwood；版本固定在 `services/sync/go.mod` / `go.sum`。该组件用于生成标准二维码，配对凭据和有效期由 Tempo 同步服务管理。
