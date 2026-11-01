import { defineConfig } from 'vitepress'

const repository = 'https://github.com/awe0bit/Tempo'
const downloads = `${repository}/releases/latest`

const sharedTheme = {
  logo: { light: '/tempo-icon-light.png', dark: '/tempo-icon-dark.png', alt: 'Tempo' },
  socialLinks: [{ icon: 'github' as const, link: repository }]
}

export default defineConfig({
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
    ['link', { rel: 'icon', href: '/tempo-icon-dark.png', type: 'image/png' }]
  ],
  markdown: {
    config(md) {
      md.renderer.rules.table_open = (_tokens, _index, _options, env) => {
        const label = env.localeIndex === 'en' ? 'Scrollable table' : '可横向滚动的表格'
        return `<div class="tempo-table-scroll" role="region" aria-label="${label}" tabindex="0"><table>\n`
      }
      md.renderer.rules.table_close = () => '</table></div>\n'
    }
  },
  transformPageData(pageData, { siteConfig }) {
    const path = pageData.relativePath
    const counterpart = path.startsWith('en/') ? path.slice(3) : `en/${path}`
    // Every published page must support same-page language switching.
    if (path !== '404.md' && !siteConfig.pages.includes(counterpart)) {
      throw new Error(`Missing documentation translation: ${counterpart} (for ${path})`)
    }
  },
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
        sidebarMenuLabel: '目录',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到正文',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换浅色模式',
        darkModeSwitchTitle: '切换深色模式',
        notFound: {
          title: '页面未找到',
          quote: '这个页面可能已移动，或暂时没有对应语言的内容。',
          linkLabel: '返回中文文档首页',
          linkText: '返回首页'
        },
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
          { text: 'Develop', items: [
            { text: 'Development guide', link: '/en/DEVELOPMENT' },
            { text: 'Architecture', link: '/en/ARCHITECTURE' },
            { text: 'Design guidelines', link: '/en/DESIGN' }
          ] },
          { text: 'Download', link: downloads }
        ],
        sidebar: [
          {
            text: 'Get started',
            items: [
              { text: 'Overview', link: '/en/' },
              { text: 'Usage and settings', link: '/en/CONFIGURATION' },
              { text: 'QR pairing', link: '/en/PAIRING' },
              { text: 'iOS installation and signing', link: '/en/IOS_PRIVATE_SIGNING' }
            ]
          },
          {
            text: 'Self-hosting',
            items: [
              { text: 'Self-hosted sync', link: '/en/DEPLOYMENT' }
            ]
          },
          {
            text: 'Development',
            collapsed: true,
            items: [
              { text: 'Development guide', link: '/en/DEVELOPMENT' },
              { text: 'Product scope', link: '/en/PRODUCT' },
              { text: 'Architecture', link: '/en/ARCHITECTURE' },
              { text: 'iOS architecture and OTA', link: '/en/architecture/ios-ota' },
              { text: 'Security and performance', link: '/en/SECURITY_PERFORMANCE' },
              { text: 'Sync protocol', link: '/en/SYNC_PROTOCOL' },
              { text: 'Design guidelines', link: '/en/DESIGN' }
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
