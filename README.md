<p align="center"><img src="apps/flutter/assets/branding/tempo-icon-master-black.png" width="112" alt="Tempo 应用图标"></p>

<h1 align="center">Tempo</h1>

<p align="center">记录待办，安排今天，专注当下。</p>

<p align="center"><strong>简体中文</strong> · <a href="README.en.md">English</a></p>

<p align="center">
  <a href="https://github.com/awe0bit/Tempo/releases">下载应用</a> ·
  <a href="https://todo.darker.one">使用指南</a> ·
  <a href="https://github.com/awe0bit/Tempo/issues">反馈问题</a>
</p>

Tempo 把待办、日历、专注计时和 RSS 阅读放在一起，支持 iOS、macOS、Android 和 Windows。

**不需要注册账号，也不必先搭服务器。** 可以先在本机使用，需要多设备同步时，再连接自己的同步服务。

## 可以做什么

- **随手记录**：把想到的事情放进收集箱，再安排日期、补充备注或标记完成。
- **安排今天**：结合日历查看当天任务，在周视图与月视图之间切换。
- **专注计时**：使用番茄钟或正计时，调整专注时长和每日目标，查看专注记录。
- **集中阅读**：订阅 RSS 来源，筛选、搜索和阅读文章；配置 AI 后可生成摘要、翻译正文。
- **多端同步**：通过自己的服务器同步任务、专注状态和 RSS 阅读状态。
- **按习惯使用**：切换浅色或深色外观；iOS 支持简体中文和英语，并可通过小组件、锁屏实时活动和灵动岛查看专注状态。

各平台的布局和可用功能有所不同，以对应客户端为准。

## 下载与安装

前往 [GitHub Releases](https://github.com/awe0bit/Tempo/releases)，选择名称中带有自己平台的文件。

| 平台 | 下载文件 | 安装方式 |
| --- | --- | --- |
| iPhone / iPad（iOS 17+） | 以 `iOS-unsigned.ipa` 结尾 | 使用自己的签名方式安装，见 [iOS 安装说明](docs/IOS_PRIVATE_SIGNING.md) |
| Mac（macOS 15+） | `macOS` 的 `.dmg` 或便携 `.zip` | 打开磁盘映像或解压后安装 |
| Android | 以 `Android.apk` 结尾 | 在系统中确认安装 |
| Windows | `Windows-Setup.exe` 或 `Windows-Portable.zip` | 运行安装程序，或解压完整便携包 |

不同平台可能分批更新。如果最新发布页没有你的平台，请在发布列表中查找最近一次包含它的版本。

## 开始使用

1. **先记下来**：在收集箱新增待办，不必立即整理。
2. **安排日期**：把要做的事情安排到某一天，在“今天”中查看。
3. **开始专注**：iOS 从“工具 → 番茄钟”进入计时；阅读订阅则进入“工具 → RSS”。
4. **按需设置**：在设置中调整外观、日历和专注参数。

任务记录和计时可离线使用；获取新的 RSS 文章、AI 处理和跨设备同步需要联网。更多操作见 [使用指南](docs/CONFIGURATION.md)。

## 在多个设备上使用

同步是可选的。在自己的服务器上 [部署同步服务](docs/DEPLOYMENT.md)，再按 [扫码配对说明](docs/PAIRING.md) 连接 iOS。二维码只从服务器生成，应用不再要求手动输入服务器地址和密钥。

数据默认保存在本机；开启同步后，同步范围内的数据也会保存到你的服务器。同步不能代替备份，请保管好密钥和备份文件。

## 获取更新

在“设置 → 关于 Tempo”检查适合当前平台的新版本。iOS 的兼容页面更新会自动下载，并在下次重新启动应用时生效；原生功能更新仍需安装新版 IPA。

覆盖安装前请保留原来的签名方式和本地数据，不要为了更新先卸载应用。

## 帮助与反馈

- [使用与设置](docs/CONFIGURATION.md)
- [自托管同步](docs/DEPLOYMENT.md)
- [iOS 安装与签名](docs/IOS_PRIVATE_SIGNING.md)
- [报告问题或提出建议](https://github.com/awe0bit/Tempo/issues)

反馈时请附上平台、应用版本、复现步骤和必要截图，不要上传同步密钥、API 密钥或私人任务内容。

## 许可

Tempo 采用 [GNU GPL v3](LICENSE)。第三方组件及 Android 所基于的 Flowtime 项目保留各自许可，详见 [第三方软件声明](THIRD_PARTY_NOTICES.md)。
