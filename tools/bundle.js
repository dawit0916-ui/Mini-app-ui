// tools/bundle.js — run by the GitHub Action.
// Builds js/app.bundle.json (all components + all scripts, ONE request)
// and css/app.bundle.css. loader.js lists stay the single source of truth.
const fs = require('fs');
const { execFileSync } = require('child_process');

const stripComments = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const loader = stripComments(fs.readFileSync('js/loader.js', 'utf8'));

const comps = [...loader.matchAll(/\{\s*url:\s*'([^']+)'\s*,\s*mount:\s*'([^']+)'\s*\}/g)]
    .map(m => ({ url: m[1], mount: m[2] }));
const block = (loader.match(/const SCRIPTS = \[([\s\S]*?)\];/) || [])[1] || '';
const scripts = [...block.matchAll(/'(js\/[^']+)'/g)].map(m => m[1]);
if (!comps.length || !scripts.length) throw new Error('Could not read COMPONENTS / SCRIPTS from js/loader.js');

// Fail the build if any script has a syntax error (the old loader skipped a bad file; a bundle must not ship one).
for (const s of scripts) execFileSync('node', ['--check', s], { stdio: 'inherit' });

const bundle = {
    components: comps.map(c => ({ mount: c.mount, html: fs.readFileSync(c.url, 'utf8') })),
    scripts: scripts.map(s => ({ src: s, code: fs.readFileSync(s, 'utf8') }))
};
fs.writeFileSync('js/app.bundle.json', JSON.stringify(bundle));

const idx = fs.readFileSync('index.html', 'utf8');
const listSrc = (idx.match(/var files = \[([\s\S]*?)\]/) || [])[1] || '';
const files = [...listSrc.matchAll(/'([^']+)'/g)].map(m => m[1]);
if (!files.length) throw new Error('Could not read the stylesheet list from index.html');
fs.writeFileSync('css/app.bundle.css',
    files.map(n => `/* ${n} */\n` + fs.readFileSync(`css/${n}.css`, 'utf8')).join('\n'));

console.log(`bundle: ${comps.length} components, ${scripts.length} scripts, ${files.length} stylesheets`);
