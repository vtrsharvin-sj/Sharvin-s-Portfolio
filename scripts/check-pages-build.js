import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Check the generated site under a repository path, not just at a domain root.
const root = resolve('dist')
const base = new URL('https://example.github.io/portfolio/')
const html = readFileSync(join(root, 'index.html'), 'utf8')
let checked = 0
for(const [, reference] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    if(/^(?:https?:|mailto:|tel:|data:|#)/.test(reference)) continue
    const url = new URL(reference, base)
    assert.ok(url.pathname.startsWith(base.pathname), `Asset escapes repository path: ${reference}`)
    const relative = decodeURIComponent(url.pathname.slice(base.pathname.length))
    assert.ok(existsSync(join(root, relative)), `Missing built asset: ${reference}`)
    checked++
}
assert.ok(existsSync(join(root, '.nojekyll')), 'Missing .nojekyll')
assert.ok(!existsSync(join(root, 'server')), 'Server files must not be published')
const manifest = JSON.parse(readFileSync(join(root, 'favicons/site.webmanifest'), 'utf8'))
for(const icon of manifest.icons) {
    const url = new URL(icon.src, new URL('favicons/site.webmanifest', base))
    assert.ok(url.pathname.startsWith(base.pathname), 'Manifest icon escapes repository path')
    assert.ok(existsSync(join(root, url.pathname.slice(base.pathname.length))), 'Missing manifest icon')
}
assert.ok(readdirSync(join(root, 'assets')).some(name => name.endsWith('.js')), 'Missing JavaScript bundle')
let cssChecked = 0
for(const name of readdirSync(join(root, 'assets')).filter(name => name.endsWith('.css'))) {
    const css = readFileSync(join(root, 'assets', name), 'utf8')
    for(const [, reference] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if(/^(?:data:|https?:)/.test(reference)) continue
        const url = new URL(reference, new URL(`assets/${name}`, base))
        assert.ok(url.pathname.startsWith(base.pathname), `CSS asset escapes repository path: ${reference}`)
        assert.ok(existsSync(join(root, decodeURIComponent(url.pathname.slice(base.pathname.length)))), `Missing CSS asset: ${reference}`)
        cssChecked++
    }
}
console.log(`GitHub Pages subpath checks passed (${checked} HTML assets, ${cssChecked} CSS assets, plus manifest).`)
