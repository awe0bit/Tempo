# iOS 本机签名与扩展

公开 Release 提供包含 Widget/Live Activity 扩展的未签名 IPA。要在真机安装，必须在本机使用自己的 Apple 身份签名。仓库不会在 GitHub Actions 中读取、保存或使用个人签名私钥。

返回：[文档首页](index.md) · [自托管部署](DEPLOYMENT.md)

## 必须保持的标识

| 目标 | 标识 |
| --- | --- |
| 主应用 Bundle ID | `one.darker.qingxu` |
| Widget/Live Activity 扩展 Bundle ID | `one.darker.qingxu.widgets` |
| App Group | `group.one.darker.qingxu` |

主应用和扩展必须属于同一个 Apple Developer Team。两份描述文件都必须授权 App Group，并覆盖目标设备的 UDID（若分发类型需要设备列表）。

## 为什么应用能打开，灵动岛却没有

灵动岛和锁屏实时活动由 `TEMPOWidgets.appex` 提供，而不是主应用中的普通页面。以下任一情况都会让系统扩展失效：

- 签名工具只签了 `TEMPO.app`，没有递归签名 `PlugIns/TEMPOWidgets.appex`。
- 重签时删除了扩展目录。
- 主应用或扩展 Bundle ID 被随机修改。
- 两者使用不同 Team，或 App Group 权限没有同时保留。
- 描述文件没有授权扩展 App ID、App Group 或当前设备。
- 安装新包时身份与旧包不同，导致覆盖安装失败或共享容器变化。

这些能力不要求应用已经上架 App Store。决定是否可用的是设备系统版本、扩展打包、签名身份和 entitlements。

## 本机 Apple ID 签名

适合个人设备调试：

1. 按 [Apple 客户端说明](https://github.com/awe0bit/Tempo/blob/main/apps/apple/README.md) 先生成 Expo Brownfield 包和 `apps/apple/TempoApple.xcodeproj`。
2. 在 Xcode 中为 `TempoiOS` 和 `TempoWidgets` 选择同一个 Team。
3. 确认两个 Bundle ID 和 App Group 未被改成随机值。
4. 选择真机运行，或 Archive 后导出适合自己账号的安装包。

免费个人 Team、付费开发者账号和不同自签工具的权限能力并不完全相同。若工具无法同时创建扩展 App ID 和 App Group，应改用支持这些权限的开发者账号/描述文件，而不是删除扩展。

## 覆盖安装与更新

要覆盖旧版本并保留数据，至少保持：

- 主应用 Bundle ID 不变。
- 签名 Team/身份兼容。
- App Group 不变。
- 新包版本号或构建号高于旧包。

自签版不能像 App Store 应用一样静默替换自身。应用内“检查更新”会跳转最新版下载，之后仍需使用同一签名方式安装新版 IPA。

## 安装前检查

在 macOS 上解压 IPA 后，可确认扩展是否存在：

```bash
unzip -q TEMPO-*.ipa -d tempo-ipa-check
test -d tempo-ipa-check/Payload/TEMPO.app/PlugIns/TEMPOWidgets.appex
codesign --verify --deep --strict --verbose=2 tempo-ipa-check/Payload/TEMPO.app
codesign -d --entitlements :- tempo-ipa-check/Payload/TEMPO.app
codesign -d --entitlements :- tempo-ipa-check/Payload/TEMPO.app/PlugIns/TEMPOWidgets.appex
```

主应用和扩展的 entitlements 中都应出现 `group.one.darker.qingxu`。

如果应用内显示“App Group 签名未授权”，含义是源码虽然声明了该组，但当前安装包的描述文件或重签过程没有保留这项 entitlement。此时主应用仍可能正常打开，但任务小组件、锁屏组件和灵动岛无法读取主应用写入的实时数据。修复点在签名材料和重签流程，不是把代码中的 App Group 改名。

## 签名材料安全

- 不要把 `.p12`、密码、描述文件或解密后的签名 IPA 提交到仓库。
- 不要把签名材料上传到 GitHub Actions Secrets；本项目没有云端私钥签名流程。
- 证书疑似泄漏时，应在 Apple Developer 后台撤销并重新生成，而不是只删除聊天或仓库文件。
