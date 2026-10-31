const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/riane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../../../..');
const phase = process.argv[2] || 'after';
let browser;
const appBridge = `let preferences = null;
export async function getAppInfo(){return {name:'MudMaker',version:'0.1.0',buildId:'8dd5bf6',platform:'windows',arch:'x86_64',profile:'debug',launchId:'browser-visual-evidence'};}
export async function getEngineStatus(){return {installed:false,reason:'Engine sidecar absent in browser capture'};}
export async function readPreferences(){return preferences;}
export async function writePreferences(document){preferences=document;}
export async function writeDiagnostic(record){}
export async function quitApp(){}
`;
const windowBridge = `export const tauriWindowShell={minimize:async()=>{},toggleMaximize:async()=>{},isMaximized:async()=>false,onStateChange:async()=>()=>{}};`;
async function themeMenu(page) {
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('menuitem',{name:'Appearance',exact:true}).click();
  if (await page.getByRole('menuitem',{name:'Theme',exact:true}).count()) await page.getByRole('menuitem',{name:'Theme',exact:true}).click();
}
async function settle(page) { await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)))); }
async function selectedFill(page, selector) {
 return page.evaluate(selector => {
  const element=document.querySelector(selector), root=document.querySelector('.theme-scope');
  const hex=getComputedStyle(root).getPropertyValue('--color-interaction-selection').trim();
  const expected='rgb('+[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16)).join(', ')+')';
  return {actual:getComputedStyle(element).backgroundColor,expected,checked:element.getAttribute('aria-checked'),selected:element.getAttribute('aria-selected'),pressed:element.getAttribute('aria-pressed')};
 },selector);
}
async function measure(page) {
  return page.evaluate(() => {
    const one = (selector) => {
      const element = document.querySelector(selector); if(!element)return null;
      const r=element.getBoundingClientRect(), s=getComputedStyle(element);
      return {width:r.width,height:r.height,paddingBlock:s.paddingBlock,paddingInline:s.paddingInline,radius:s.borderRadius,gap:s.gap,fontSize:s.fontSize,lineHeight:s.lineHeight,background:s.backgroundColor,borderWidth:s.borderWidth,borderBottom:s.borderBottomWidth,borderStyle:s.borderStyle,pressed:element.getAttribute('aria-pressed'),selected:element.getAttribute('aria-selected')};
    };
    return {viewport:{width:innerWidth,height:innerHeight},save:one('[data-control-id="editor.shell.01"]'),paint:one('[data-control-id="editor.map.04"]'),output:one('[role="tab"][aria-selected="true"]'),menu:one('[role="menu"]'),menuRow:one('[role="menuitemradio"]'),menus:[...document.querySelectorAll('[role="menu"]')].map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute('aria-label'),left:r.left,top:r.top,right:r.right,bottom:r.bottom};})};
  });
}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'C:/Users/riane/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'}); const results=[];
 for(const preset of ['Neon Lights','Neon Dark Mode'])for(const width of [1280,800]){
  const context=await browser.newContext({viewport:{width,height:760},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.route('**/src/appInfo.ts',route=>route.fulfill({contentType:'application/javascript',body:appBridge}));
  await page.route('**/src/frame/windowShell.ts',route=>route.fulfill({contentType:'application/javascript',body:windowBridge}));
  await page.goto('http://localhost:1420/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Create',exact:true}).click();
  await themeMenu(page);await page.getByRole('menuitemradio',{name:preset,exact:true}).click();
  await page.getByRole('button',{name:'View',exact:true}).click();await page.locator('[data-control-id="editor.shell.17"]').click();
  await page.getByRole('tab',{name:'Execution Trace',exact:true}).click();
  await page.getByRole('button',{name:'Paint',exact:true}).click();
  let momentary;
  if(phase==='after') {
   await page.waitForFunction(()=>document.querySelector('[data-control-id="editor.map.04"]').getAttribute('aria-pressed')==='true');
   const save=page.getByRole('button',{name:'Save',exact:true});
   await save.hover();await page.mouse.down();await settle(page);
   const pointer=await save.evaluate(e=>({active:e.matches(':active'),background:getComputedStyle(e).backgroundColor,sticky:e.getAttribute('aria-pressed')}));
   await page.mouse.up();await save.focus();await page.keyboard.down('Space');await settle(page);
   const keyboard=await save.evaluate(e=>({active:e.matches(':active'),background:getComputedStyle(e).backgroundColor,sticky:e.getAttribute('aria-pressed')}));
   await page.keyboard.up('Space');assert.equal(pointer.active,true);assert.equal(keyboard.active,true);assert.equal(pointer.sticky,null);assert.equal(keyboard.sticky,null);assert.equal(pointer.background,keyboard.background);
   momentary={pointer,keyboard};
  }
  await themeMenu(page);await settle(page);
  const name=`${phase}-${preset.toLowerCase().replaceAll(' ','-')}-${width}-create`;
  await page.screenshot({path:path.join(__dirname,name+'.png'),animations:'disabled'});
  const metrics=await measure(page);
  if(phase==='after') {
   assert.equal(metrics.save.height,24);assert.equal(metrics.menuRow.height,24);assert.equal(metrics.save.radius,'0px');assert.equal(metrics.menuRow.borderWidth,'0px');assert.equal(metrics.menu.gap,'0px');assert.equal(metrics.paint.pressed,'true');assert.equal(metrics.output.selected,'true');assert.equal(metrics.output.borderBottom,metrics.output.borderWidth);assert.equal(metrics.menus.length,3);
   for(let i=0;i<metrics.menus.length;i++){const m=metrics.menus[i];assert(m.left>=0&&m.top>=0&&m.right<=width&&m.bottom<=760);if(i){const p=metrics.menus[i-1];assert(Math.round(m.right)<=Math.round(p.left)||Math.round(m.left)>=Math.round(p.right));}}
   for(const selector of ['[data-control-id="editor.map.04"]','[role="tab"][aria-selected="true"]']) {const color=await selectedFill(page,selector);assert.equal(color.actual,color.expected);}
  }
  results.push({name,errors,metrics,momentary});
  if(phase==='after'){
   for(const unused of await page.getByRole('menu').count()? [1,2,3]:[]) await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Go To',exact:true}).click();await page.getByRole('menuitem',{name:'Host',exact:true}).click();
   await page.getByRole('radio',{name:'Logs',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('[data-control-id="host.dashboard.10"]').getAttribute('aria-checked')==='true');await page.getByRole('region',{name:'Logs',exact:true}).waitFor();await page.mouse.move(0,0);await settle(page);
   const host=await selectedFill(page,'[data-control-id="host.dashboard.10"]');assert.equal(host.checked,'true');assert.equal(host.actual,host.expected);
   const selectedNames=await page.getByRole('radio',{checked:true}).allTextContents();assert.deepEqual(selectedNames,['Logs']);
   const hostName=`${phase}-${preset.toLowerCase().replaceAll(' ','-')}-${width}-host`;
   await page.screenshot({path:path.join(__dirname,hostName+'.png'),animations:'disabled'});results.push({name:hostName,errors,metrics:{host,selectedNames,content:'Logs'}});
  }
  await context.close();
 }
 fs.writeFileSync(path.join(__dirname,phase+'-metrics.json'),JSON.stringify({fixture:'Browser-only; only native appInfo/windowShell module bridges replaced. Production App, catalogs, ThemeManager, preferences, input, router and workspace components run unchanged.',results},null,2)+'\n');
 await browser.close();console.log(JSON.stringify(results.map(x=>({name:x.name,errors:x.errors,save:x.metrics.save,menuRow:x.metrics.menuRow}))));
})().catch(async e=>{await browser?.close();console.error(e);process.exitCode=1});
