import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import config from '../config.mts'

const docs = fileURLToPath(new URL('../../', import.meta.url))

function markdownPages(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'public'].includes(entry.name)) return []
    const path = `${prefix}${entry.name}`
    return entry.isDirectory()
      ? markdownPages(resolve(directory, entry.name), `${path}/`)
      : path.endsWith('.md') ? [path] : []
  })
}

const pages = markdownPages(docs)
const chinese = pages.filter(path => !path.startsWith('en/'))
const english = pages.filter(path => path.startsWith('en/'))

test('every published Chinese and English page has a matching translation', () => {
  assert.deepEqual(english.map(path => path.slice(3)).sort(), chinese.sort())
  for (const path of pages) {
    assert.doesNotThrow(() => config.transformPageData(
      { relativePath: path }, { siteConfig: { pages } }
    ))
  }
})

test('the build rejects a missing translation in either direction', () => {
  for (const path of ['new-guide.md', 'en/new-guide.md']) {
    assert.throws(() => config.transformPageData(
      { relativePath: path }, { siteConfig: { pages: [path] } }
    ), /Missing documentation translation/)
  }
})

test('generated 404 pages do not require a translation source', () => {
  assert.doesNotThrow(() => config.transformPageData(
    { relativePath: '404.md' }, { siteConfig: { pages } }
  ))
})

function internalLinks(items) {
  return items.flatMap(item => [
    ...(item.link?.startsWith('/') ? [item.link] : []),
    ...internalLinks(item.items ?? [])
  ])
}

test('both navigation menus expose the same translated destinations', () => {
  const root = config.locales.root.themeConfig
  const en = config.locales.en.themeConfig
  for (const area of ['nav', 'sidebar']) {
    assert.deepEqual(
      internalLinks(en[area]).map(link => link.replace(/^\/en\//, '/')).sort(),
      internalLinks(root[area]).sort()
    )
  }
})

test('the header keeps downloads without duplicating sidebar navigation', () => {
  for (const locale of Object.values(config.locales)) {
    const nav = locale.themeConfig.nav
    assert.equal(nav.length, 1)
    assert.equal(nav[0].link, 'https://github.com/awe0bit/Tempo/releases/latest')
  }
})

test('English documentation links stay in English and target existing pages', () => {
  for (const path of english) {
    const source = readFileSync(resolve(docs, path), 'utf8')
      .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    for (const [, href] of source.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = href.split('#')[0]
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target) || !target.endsWith('.md')) continue
      const resolved = relative(docs, resolve(dirname(resolve(docs, path)), target))
        .replaceAll('\\', '/')
      assert.ok(resolved.startsWith('en/'), `${path} links outside English: ${href}`)
      assert.ok(pages.includes(resolved), `${path} links to a missing page: ${href}`)
    }
  }
})
