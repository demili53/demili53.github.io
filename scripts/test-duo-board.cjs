// NODE_PATH must include Playwright. Firebase is mocked; run test-duo-rules.cjs for server rules.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const server = createServer((req,res) => {
  const file = path.resolve(root,'.'+(req.url === '/' ? '/index.html' : req.url));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
const fixture = `
const stamp = ms => ({ms,toMillis:()=>ms});
const base = {tier:'골드',division:'II',positions:['정글'],wantedPositions:['미드'],mode:'솔로/듀오 랭크',note:'편하게 같이해요',mic:'가능',style:'즐겜',availability:'지금 가능',duration:'1~2판',status:'open'};
let data = Array.from({length:53},(_,i)=>({id:'player'+i,...base,riotId:i===52?'older#KR1':'player'+i+'#KR1',updatedAt:stamp(Date.now()-(i+1)*10000)}));
data.push({id:'expired',...base,riotId:'expired#KR1',updatedAt:stamp(Date.now()-8000000)});
data.push({id:'closed',...base,riotId:'closed#KR1',status:'closed',updatedAt:stamp(Date.now()-9000000)});
let ownNext, authNext;
export function watchUser(next){authNext=next;window.login=()=>next({uid:'owner'});window.logout=()=>next(null);next(null)}
export function watchOwnPost(user,next){ownNext=next;next(data.find(p=>p.id===user.uid)||null);return ()=>{ownNext=null}}
export async function fetchPosts(cursor){if(window.failRead)throw Error('offline');const start=cursor||0;return {items:data.slice(start,start+50),cursor:start+50,hasMore:data.length>start+50}}
function emit(post){data=data.filter(p=>p.id!=='owner');data.unshift(post);ownNext?.(post)}
export async function savePost(user,post){if(window.failWrite)throw {code:'permission-denied'};const old=data.find(p=>p.id===user.uid);window.saved=post;emit({id:user.uid,...post,status:old?.status||'open',updatedAt:old?.updatedAt||stamp(Date.now())})}
export async function closePost(user){const old=data.find(p=>p.id===user.uid);emit({...old,status:'closed'})}
export async function bumpPost(user){const old=data.find(p=>p.id===user.uid);emit({...old,status:'open',updatedAt:stamp(Date.now())})}
export async function removePost(){emit({id:'owner',status:'deleted',updatedAt:stamp(Date.now())})}
export async function reportPost(user,target,reason,details){window.report={target:target.id,reason,details}}
window.ageOwn=()=>{const old=data.find(p=>p.id==='owner');emit({...old,updatedAt:stamp(Date.now()-310000)})};
`;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(!url.startsWith('http://127.0.0.1:'))return route.abort();
      if(url.endsWith('/duo-store.js'))return route.fulfill({contentType:'text/javascript',body:fixture});
      return route.continue();
    });
    const url='http://127.0.0.1:'+server.address().port+'/';await page.goto(url);
    await page.waitForFunction(()=>document.getElementById('filterSummary').textContent.includes('50'));
    assert.equal(await page.locator('main > section').first().getAttribute('id'),'duoBoard');
    assert(await page.locator('#publishParty').isDisabled());
    await page.locator('#searchRiotId').fill('older');
    assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#searchAll').click();
    await page.waitForFunction(()=>document.getElementById('filterSummary').textContent.includes('전체 확인 완료'));
    assert.equal(await page.locator('.duo-post').count(),1);
    await page.getByRole('button',{name:'조건 초기화'}).click();
    assert.equal(await page.locator('.duo-post').count(),53,'expired and closed hidden');
    await page.locator('#filterState').selectOption('expired');assert.equal(await page.locator('.duo-post').count(),1);
    await page.locator('#filterState').selectOption('closed');assert.equal(await page.locator('.duo-post').count(),1);
    await page.getByRole('button',{name:'조건 초기화'}).click();
    await page.locator('#filterMinTier').selectOption('실버');await page.locator('#filterMaxTier').selectOption('플래티넘');
    assert.equal(await page.locator('.duo-post').count(),53);
    await page.locator('#filterMinTier').selectOption('다이아몬드');assert.equal(await page.locator('.duo-post').count(),0);
    assert((await page.locator('#filterSummary').textContent()).includes('범위'));
    await page.getByRole('button',{name:'조건 초기화'}).click();
    await page.locator('#searchRiotId').fill('player0#');
    await page.getByRole('button',{name:'차단',exact:true}).click();assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#manageBlocks').click();await page.getByRole('button',{name:'차단 해제'}).click();await page.locator('#closeBlocks').click();
    assert.equal(await page.locator('.duo-post').count(),1);
    await page.evaluate(()=>window.login());
    await page.getByRole('button',{name:'신고',exact:true}).click();await page.locator('#reportReason').selectOption('허위 정보');
    await page.locator('#reportDetails').fill('테스트 신고 내용');await page.locator('#sendReport').click();
    assert.equal((await page.evaluate(()=>window.report)).reason,'허위 정보');await page.locator('#closeReport').click();
    await page.locator('#riotId').fill('내아이디#KR1');await page.locator('#tier').selectOption('실버');
    const box=(name,value)=>page.locator('input[name="'+name+'"][value="'+value+'"]').locator('..');
    await box('positions','탑').click();await box('positions','미드').click();
    await box('wantedPositions','정글').click();await box('wantedPositions','서포터').click();
    await page.locator('#mic').selectOption('가능');await page.locator('#style').selectOption('랭크 집중');
    await page.locator('#partyNote').fill('<img src=x onerror=alert(1)>');await page.locator('#publishParty').click();
    await page.waitForFunction(()=>!!window.saved);
    assert.deepEqual((await page.evaluate(()=>window.saved)).positions,['탑','미드']);
    await page.getByRole('button',{name:'조건 초기화'}).click();await page.locator('#searchRiotId').fill('내아이디');
    assert.equal(await page.locator('.duo-post').count(),1);assert.equal(await page.locator('.duo-post img').count(),0);
    await page.getByRole('button',{name:'내 글 수정'}).click();assert.equal(await page.locator('#riotId').inputValue(),'내아이디#KR1');
    assert(await page.getByRole('button',{name:/다시 모집까지/}).isDisabled());
    await page.getByRole('button',{name:'모집 완료',exact:true}).click();assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#filterState').selectOption('closed');assert.equal(await page.locator('.duo-post').count(),1);
    await page.evaluate(()=>window.ageOwn());await page.getByRole('button',{name:'다시 모집',exact:true}).click();
    await page.locator('#filterState').selectOption('open');assert.equal(await page.locator('.duo-post').count(),1);
    await box('positions','상관없음').click();await page.locator('#publishParty').click();
    await box('filterPositions','원딜').click();assert.equal(await page.locator('.duo-post').count(),1);
    await page.locator('#includeAny').uncheck();assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#includeAny').check();await box('filterWantedPositions','정글').click();assert.equal(await page.locator('.duo-post').count(),1);
    await page.locator('.advanced-filters summary').click();await page.locator('#filterMic').selectOption('불가');assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#filterMic').selectOption('가능');assert.equal(await page.locator('.duo-post').count(),1);
    await page.locator('#partyNote').fill('같이 차분하게 두 판 해요.');await page.locator('#publishParty').click();
    await page.getByRole('button',{name:'조건 초기화'}).click();await page.locator('#searchRiotId').fill('내아이디');
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    await page.locator('#duoBoard').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(root,'test-results/duo-board-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(root,'test-results/duo-board-mobile.png'),fullPage:true});
    await page.evaluate(()=>window.failWrite=true);await page.locator('#publishParty').click();
    await page.waitForFunction(()=>document.getElementById('partyStatus').textContent.includes('못했습니다'));
    assert(!(await page.locator('#publishParty').isDisabled()));await page.evaluate(()=>window.failWrite=false);
    await page.getByRole('button',{name:'모집글 삭제'}).click();assert.equal(await page.locator('.duo-post').count(),0);
    await page.locator('#riotId').fill('저장된초안#KR1');
    await page.reload();await page.waitForFunction(()=>typeof window.login==='function');
    assert.equal(await page.locator('#searchRiotId').inputValue(),'내아이디');
    assert.equal(await page.locator('#riotId').inputValue(),'','guest cannot see account draft');
    await page.evaluate(()=>window.login());assert.equal(await page.locator('#riotId').inputValue(),'저장된초안#KR1');
    await page.evaluate(()=>window.logout());assert.equal(await page.locator('#riotId').inputValue(),'');
    await page.evaluate(()=>window.failRead=true);await page.locator('#refreshBoard').click();
    await page.waitForFunction(()=>document.getElementById('boardStatus').textContent.includes('불러오지 못했습니다'));
    await page.evaluate(()=>window.failRead=false);await page.locator('#refreshBoard').click();
    await page.waitForFunction(()=>document.getElementById('filterSummary').textContent.includes('50'));
    assert.deepEqual(errors,[]);
    console.log('PASS: pagination/full search, filters, expiry/completion, edit/bump cooldown UI, reports/blocks, scoped drafts, error recovery, XSS, mobile layout.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
