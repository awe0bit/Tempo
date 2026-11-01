import { defineConfig } from 'vitepress'

const repository = 'https://github.com/awe0bit/Tempo'
const downloads = `${repository}/releases/latest`

const sharedTheme = {
  logo: '/mark.svg',
  socialLinks: [{ icon: 'github' as const, link: repository }]
}

export default defineConfig({
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['link', { rel: 'icon', href: '/mark.svg', type: 'image/svg+xml' }]
  ],
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '没有找到相关内容',
                resetButtonTitle: '清除搜索',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Tempo 文档',
      description: 'Tempo 使用指南、安装帮助与自托管同步',
      themeConfig: {
        ...sharedTheme,
        siteTitle: 'Tempo 文档',
        nav: [
          { text: '使用指南', link: '/CONFIGURATION' },
          { text: '自托管同步', link: '/DEPLOYMENT' },
          { text: '开发资料', items: [
            { text: '开发指南', link: '/DEVELOPMENT' },
            { text: '系统架构', link: '/ARCHITECTURE' },
            { text: '设计规范', link: '/DESIGN' }
          ] },
          { text: '下载', link: downloads }
        ],
        sidebar: [
          {
            text: '开始使用',
            items: [
              { text: '欢迎使用 Tempo', link: '/' },
              { text: '使用与设置', link: '/CONFIGURATION' },
              { text: '扫码配对', link: '/PAIRING' },
              { text: 'iOS 安装与签名', link: '/IOS_PRIVATE_SIGNING' }
            ]
          },
          {
            text: '自托管',
            items: [
              { text: '部署、备份与维护', link: '/DEPLOYMENT' }
            ]
          },
          {
            text: '开发资料',
            collapsed: true,
            items: [
              { text: '开发指南', link: '/DEVELOPMENT' },
              { text: '产品范围', link: '/PRODUCT' },
              { text: '系统架构', link: '/ARCHITECTURE' },
              { text: 'iOS OTA 架构', link: '/architecture/ios-ota' },
              { text: '安全与性能审计', link: '/SECURITY_PERFORMANCE' },
              { text: '同步协议', link: '/SYNC_PROTOCOL' },
              { text: '跨端设计规范', link: '/DESIGN' }
            ]
          }
        ],
        outline: { level: 2, label: '本页内容' },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        footer: {
          message: '个人、本地优先、自托管同步',
          copyright: 'Tempo'
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'Tempo Documentation',
      description: 'Using Tempo, installing clients, and self-hosted sync',
      themeConfig: {
        ...sharedTheme,
        siteTitle: 'Tempo Docs',
        nav: [
          { text: 'User guide', link: '/en/CONFIGURATION' },
          { text: 'Self-hosted sync', link: '/en/DEPLOYMENT' },
          { text: 'Develop', link: '/en/DEVELOPMENT' },
          { text: 'Download', link: downloads }
        ],
        sidebar: [
          {
            text: 'Get started',
            items: [
              { text: 'Overview', link: '/en/' },
              { text: 'Usage and settings', link: '/en/CONFIGURATION' },
              { text: 'QR pairing', link: '/en/PAIRING' },
              { text: 'Self-hosted sync', link: '/en/DEPLOYMENT' }
            ]
          },
          {
            text: 'Development',
            collapsed: true,
            items: [
              { text: 'Development guide', link: '/en/DEVELOPMENT' },
              { text: 'iOS signing (中文)', link: '/IOS_PRIVATE_SIGNING' },
              { text: 'Architecture (中文)', link: '/ARCHITECTURE' }
            ]
          }
        ],
        outline: { level: 2, label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
        footer: {
          message: 'Personal, local-first, self-hosted sync',
          copyright: 'Tempo'
        }
      }
    }
  }
})
