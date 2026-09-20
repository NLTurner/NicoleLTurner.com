const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content', 'articles');
const OUT = path.join(ROOT, 'articles');

function esc(s='') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function inline(s='') {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a target="_blank" rel="noopener noreferrer" href="$2">$1</a>');
}
function parseFile(file) {
  const raw = fs.readFileSync(path.join(CONTENT,file),'utf8');
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) throw new Error('Missing frontmatter: '+file);
  const meta = {};
  m[1].split('\n').forEach(line => {
    const p=line.indexOf(':'); if(p<0)return;
    let v=line.slice(p+1).trim();
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    if(v==='true')v=true; if(v==='false')v=false;
    meta[line.slice(0,p).trim()]=v;
  });
  meta.slug=file.replace(/\.md$/,'');
  meta.body=m[2].trim();
  return meta;
}
function markdown(md) {
  const lines=md.split(/\r?\n/); let out=[], para=[];
  const flush=()=>{if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}};
  for(const line of lines){
    if(!line.trim()){flush();continue;}
    if(line.startsWith('## ')){flush();out.push('<h2>'+inline(line.slice(3))+'</h2>');continue;}
    para.push(line.trim());
  }
  flush(); return out.join('\n');
}
const articleCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap');
:root{--cream:#fbf4e9;--ink:#171511;--orange:#ef593a;--plum:#6e2347;--white:#fffdf9}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--ink);font-family:'DM Sans',Arial,sans-serif}a{color:inherit}.wrap{width:min(1120px,calc(100% - 48px));margin:auto}
header{padding:26px 0;border-bottom:1px solid rgba(23,21,17,.16)}header .wrap{display:flex;justify-content:space-between;align-items:center}.name{font-weight:800;letter-spacing:.06em;text-decoration:none}.back{text-decoration:none;font-size:14px;font-weight:700}
.article-hero{padding:82px 0 48px}.category{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px}h1{font-family:'Libre Baskerville',Georgia,serif;font-size:clamp(48px,7vw,86px);line-height:.98;letter-spacing:-.045em;max-width:940px;margin:0}
.article{padding:10px 0 90px}.article-inner{max-width:760px;margin:auto;font-size:18px;line-height:1.78}.article-inner h2{font-family:'Libre Baskerville',Georgia,serif;font-size:31px;line-height:1.15;margin:54px 0 16px}.article-inner p{margin:0 0 24px}.article-inner strong{font-weight:700}.article-inner em{font-family:'Libre Baskerville',Georgia,serif}
.promo{margin-top:58px;padding:28px 30px;background:var(--white);border-left:7px solid var(--orange)}.promo h3{font-family:'Libre Baskerville',Georgia,serif;font-size:25px;margin:0 0 10px}.promo p{margin:0 0 14px}.promo a{font-weight:800}
footer{background:var(--plum);color:white;padding:34px 0}.footerlinks{display:flex;gap:18px;flex-wrap:wrap;font-size:13px}@media(max-width:700px){.wrap{width:min(100% - 30px,1120px)}.article-hero{padding-top:55px}.article-inner{font-size:17px}}
`;
function articlePage(a){
 const promo=a.cta_title ? `<div class="promo"><h3>${esc(a.cta_title)}</h3>${a.cta_text?'<p>'+esc(a.cta_text)+'</p>':''}${a.cta_url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(a.cta_url)+'">'+esc(a.cta_label||'Read more →')+'</a>':''}</div>` : '';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)} | Nicole L. Turner</title><meta name="description" content="${esc(a.excerpt)}"><style>${articleCss}</style></head><body>
<header><div class="wrap"><a class="name" href="../index.html">NICOLE L. TURNER</a><a class="back" href="../index.html#thinking">← BACK TO WRITING</a></div></header>
<main><section class="article-hero"><div class="wrap"><div class="category">${esc(a.category)}</div><h1>${esc(a.title)}</h1></div></section><section class="article"><div class="wrap"><div class="article-inner">${markdown(a.body)}${promo}</div></div></section></main>
<footer><div class="wrap"><div class="footerlinks"><a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/theculturepro/">LinkedIn</a><a target="_blank" rel="noopener noreferrer" href="https://themanualnobodygaveus.substack.com/">Substack</a><a target="_blank" rel="noopener noreferrer" href="https://theculturepro.com/">The Culture Pro®</a><a target="_blank" rel="noopener noreferrer" href="https://turnertraininginstitute.com/">Turner Training Institute™</a><a target="_blank" rel="noopener noreferrer" href="https://detoxforyourlife.com/">Detox For Your Life®</a></div></div></footer></body></html>`;
}
const categoryOrder={Career:0,Leadership:1,Life:2};
const articles=fs.readdirSync(CONTENT).filter(f=>f.endsWith('.md')).map(parseFile).sort((a,b)=>{
  const byDate=String(b.date).localeCompare(String(a.date));
  if(byDate) return byDate;
  return (categoryOrder[a.category]??99)-(categoryOrder[b.category]??99);
});
fs.mkdirSync(OUT,{recursive:true});
for(const a of articles) fs.writeFileSync(path.join(OUT,a.slug+'.html'),articlePage(a));
let index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const featured=articles.filter(a=>a.featured!==false).slice(0,3);
const cards=featured.map(a=>`<article class="note"><small>${esc(a.category)}</small><h3>${esc(a.title)}</h3><p>${esc(a.excerpt)}</p><a target="_blank" rel="noopener noreferrer" href="articles/${a.slug}.html"><b>Read more →</b></a></article>`).join('\n');
index=index.replace(/<div class="notes">[\s\S]*?<\/div><\/div><\/section>/, '<div class="notes">\n'+cards+'\n</div></div></section>');
fs.writeFileSync(path.join(ROOT,'index.html'),index);
console.log('Built '+articles.length+' articles and refreshed homepage.');
