export const SCHEMA = 1;
export const STORAGE_KEY = 'action-os.v1';
export const RESPONSE = {yes:'反応あり',no:'反応なし',unknown:'わからない'};
export const BREATH = {normal:'普段どおり',abnormal:'呼吸なし・普段どおりでない',unknown:'わからない'};
export const CPR = {none:'未開始',compressing:'胸骨圧迫中',paused:'解析・ショックに伴う一時中断',resume:'胸骨圧迫の再開が必要',recheck:'回復の兆候を再確認中',observing:'観察を継続中',handed:'処置を引き継いだ',unable:'実施できない'};
export const TRANSPORT = {none:'未手配',requested:'依頼済み',carrying:'搬送中',arrived:'到着'};
export const TYPES = {
  medical:{name:'急病・けが',icon:'heart',subtitle:'成人の救命対応',verified:true},
  fire:{name:'火災',icon:'flame',subtitle:'通報・初期消火・避難',verified:true},
  earthquake:{name:'地震',icon:'quake',subtitle:'身の安全・危険確認・避難',verified:true},
  flood:{name:'大雨・浸水',icon:'rain',subtitle:'情報確認・早めの避難',verified:true},
  intruder:{name:'不審者',icon:'shield',subtitle:'記録用・手順未確認',verified:false},
  missing:{name:'行方不明',icon:'person',subtitle:'記録用・手順未確認',verified:false},
  outage:{name:'停電',icon:'power',subtitle:'記録用・手順未確認',verified:false},
  other:{name:'その他',icon:'more',subtitle:'自由記録',verified:false}
};
export const ADULT_TEMPLATE = {
  id:'adult-bls-2020-20261020-v1',
  name:'成人の救命対応',
  edition:'救急蘇生法の指針2020（市民用）・通常時／実装版1',
  checkedAt:'2026-10-20',
  scope:'成人のみ。感染症流行期の特例は採用していない。',
  sources:[
    {name:'消防庁｜主に市民が行う一次救命処置（別紙1）',edition:'2022年6月3日通知・救急蘇生法の指針2020対応',url:'https://www.fdma.go.jp/laws/tutatsu/items/1435f659281c3ff8fcbaf3ad14b16b5ad1e97683.pdf'},
    {name:'東京消防庁｜倒れている人をみたら 心肺蘇生の手順',edition:'2022年12月1日改正の通常時の手順',url:'https://www.tfd.metro.tokyo.lg.jp/lfe/kyuu_adv/life01-2.html'},
    {name:'日本赤十字社｜AEDを用いた電気ショック',edition:'Web公開資料（版番号なし）',url:'https://www.jrc.or.jp/study/safety/aed/'},
    {name:'日本赤十字社｜傷病者の観察',edition:'Web公開資料（版番号なし）',url:'https://www.jrc.or.jp/study/safety/observe/'}
  ]
};
export const clone = x => JSON.parse(JSON.stringify(x));
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const iso = () => new Date().toISOString();
export function blankDb() { return {schema:SCHEMA,revision:0,activeId:null,incidents:[],profile:{facility:'',address:'',aedLocation:'',entrance:''}}; }
export function newIncident(kind='medical',mode='real',profile={},template=ADULT_TEMPLATE) {
  return {id:uid(),kind,mode,startedAt:iso(),closedAt:null,subject:'',location:profile.address||'',fields:{aedLocation:profile.aedLocation||'',entrance:profile.entrance||''},open:{},scroll:0,events:[],branches:[],template:clone(template)};
}
export function addEvent(incident,type,value,label,extra={}) {
  const event={id:uid(),type,value,label,recordedAt:iso(),occurredAt:iso(),...extra};
  incident.events.push(event); return event;
}
export function effectiveEvents(incident) {
  const amendments=new Map();
  for(const e of incident.events) if(e.type==='correction') amendments.set(e.targetId,e);
  return incident.events.filter(e=>e.type!=='correction').map(e=>{
    const c=amendments.get(e.id);
    return c?{...e,...c.patch,correctionId:c.id}:e;
  });
}
export function derive(incident) {
  const s={response:null,breath:null,safety:null,cpr:'none',aed:'idle',transport:'none',call:'none',arrived:false,handed:false,recheck:false,actions:{},observations:{},obstacles:{}};
  for(const e of effectiveEvents(incident)) {
    if(e.historical) continue;
    switch(e.type){
      case 'safety':s.safety=e.value;break;
      case 'response':
        s.response=e.value;
        if(e.value==='yes' && !s.handed) {s.cpr='observing';s.aed='idle';s.recheck=false;}
        else if(!s.handed && s.cpr==='observing') {s.breath=null;s.cpr='none';}
        break;
      case 'breath':
        s.breath=e.value;s.recheck=false;
        if(!s.handed && !['analyzing','shock'].includes(s.aed)){
          if(e.value==='normal') s.cpr='observing';
          else if(s.cpr!=='compressing') s.cpr='none';
        }
        break;
      case 'cpr':
        s.cpr=e.value;
        if(e.value==='compressing'){s.aed='cpr';s.recheck=false;s.handed=false;}
        break;
      case 'transport':s.transport=e.value;break;
      case 'call':s.call=e.value;break;
      case 'aed-power':s.actions.power=true;break;
      case 'pads':s.actions.pads=true;break;
      case 'analysis':s.aed='analyzing';s.cpr='paused';s.handed=false;break;
      case 'aed-instruction':
        s.aed=e.value==='shock'?'shock':'resume';
        s.cpr=e.value==='shock'?'paused':'resume';break;
      case 'shock':s.aed='resume';s.cpr='resume';break;
      case 'recovery':s.cpr='recheck';s.recheck=true;s.aed='idle';s.breath=null;break;
      case 'arrival':s.arrived=true;break;
      case 'handover':s.handed=true;s.cpr='handed';s.aed='idle';break;
      case 'obstacle':
        s.obstacles[e.card]=e.value;
        if(e.card==='cpr'&&e.value==='unable'&&!s.handed)s.cpr='unable';
        break;
      case 'hazard-observation':s.observations[e.card]=e.value;break;
      case 'action':s.actions[e.card||e.value]=true;break;
    }
  }
  return s;
}
export function needsCpr(s) { return s.response!=='yes' && ['abnormal','unknown'].includes(s.breath) && !s.handed && !s.recheck; }
export function currentAction(s,restored=false) {
  if(s.handed) return {title:'処置の引き継ぎを記録',detail:'確認した状態・実施した処置・時刻を伝える。',tone:'blue'};
  if(restored && ['analyzing','shock','resume'].includes(s.aed)) return {title:'現場とAEDの最新の音声を確認',detail:'前回の解析・ショック記録は、現在の機器指示ではありません。',tone:'red'};
  if(['analyzing','shock'].includes(s.aed)) return {title:'全員離れる',detail:'傷病者に触れない。AEDの音声・機器の指示に従う。',tone:'red'};
  if(s.recheck) return {title:'胸骨圧迫を止め、呼吸を再確認',detail:'普段どおりの呼吸／目的のある動きが戻った場合の再確認。',tone:'blue'};
  if(s.cpr==='resume') return {title:'直ちに胸骨圧迫から再開',detail:'ショック実施後も、不要の指示でも、心肺蘇生を継続する。',tone:'red'};
  if(s.cpr==='compressing') return {title:'胸骨圧迫を続ける',detail:'胸の真ん中 · 100〜120回/分 · 成人：深さ約5cm',tone:'red'};
  if(s.response==='yes') return {title:'状態に応じた手当・必要な通報・観察',detail:'反応があっても重症の場合があります。反応と呼吸の変化を確認。',tone:'blue'};
  if(s.breath==='normal') return {title:'様子を見ながら救急隊等を待つ',detail:'普段どおりの呼吸が続いているか、繰り返し確認する。',tone:'blue'};
  if(needsCpr(s)) return {title:s.cpr==='unable'?'胸骨圧迫が必要・協力を求める':'胸骨圧迫を開始・継続',detail:'AEDの到着を待たずに開始。入力は後からできます。',tone:'red'};
  if(s.response==='no'||s.response==='unknown') return {title:'大声で応援を呼び、呼吸を確認',detail:'119番通報・AED手配と並行。胸とお腹の動きを10秒以内で確認。',tone:'blue'};
  return {title:'周囲の安全と反応を確認',detail:'肩をやさしくたたき、呼びかける。入力より実際の対応を優先。',tone:'blue'};
}
export function saveDb(storage,db,expectedRevision) {
  try {
    const prior=storage.getItem(STORAGE_KEY);
    if(prior && JSON.parse(prior).revision!==expectedRevision) return {ok:false,conflict:true,error:'別の画面で記録が更新されました。書き出して退避し、最新の記録を読み込み直してください。'};
    const next={...db,revision:expectedRevision+1};
    storage.setItem(STORAGE_KEY,JSON.stringify(next));
    return {ok:true,db:next};
  } catch { return {ok:false,error:'この端末への保存に失敗しました。記録を書き出して保管してください。'}; }
}
export function validateBackup(data) {
  if(!data||data.schema!==SCHEMA||!Array.isArray(data.incidents)||typeof data.profile!=='object'||!data.profile) throw Error('対応していない記録形式です。');
  const isRecord=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const validTemplate=t=>isRecord(t)&&typeof t.name==='string'&&Array.isArray(t.sources)&&t.sources.every(s=>isRecord(s)&&typeof s.name==='string'&&typeof s.url==='string')&&(!t.nodes||(Array.isArray(t.nodes)&&t.nodes.every(n=>isRecord(n)&&typeof n.id==='string'&&typeof n.title==='string'&&(!n.branches||(Array.isArray(n.branches)&&n.branches.every(b=>typeof b.condition==='string'&&typeof b.action==='string'))))&&Array.isArray(t.parallel)));
  if(!Object.values(data.profile).every(v=>typeof v==='string'))throw Error('施設情報の形式が正しくありません。');
  const ids=new Set();
  for(const i of data.incidents) {
    if(!i||typeof i.id!=='string'||ids.has(i.id)||!Object.hasOwn(TYPES,i.kind)||!['real','training'].includes(i.mode)||!Array.isArray(i.events)||!Array.isArray(i.branches)||!isRecord(i.fields)||!isRecord(i.open)||!validTemplate(i.template)||!Number.isFinite(Date.parse(i.startedAt))) throw Error('事案の形式を確認してください。');
    if(!Object.values(i.fields).every(v=>typeof v==='string')||!Object.values(i.open).every(v=>typeof v==='boolean'))throw Error('入力・展開状態の形式が正しくありません。');
    if(i.branches.some(b=>!isRecord(b)||!Object.hasOwn(TYPES,b.kind)||!validTemplate(b.template)||typeof b.scope!=='string')||new Set([i.kind,...i.branches.map(b=>b.kind)]).size!==i.branches.length+1)throw Error('複合事象の形式が正しくありません。');
    ids.add(i.id);
    for(const e of i.events) if(!e||typeof e.id!=='string'||typeof e.type!=='string'||typeof e.label!=='string'||!Number.isFinite(Date.parse(e.occurredAt))||!Number.isFinite(Date.parse(e.recordedAt))) throw Error('記録または時刻の形式が正しくありません。');
    const eventIds = new Set(i.events.map(e=>e.id));
    if(eventIds.size!==i.events.length) throw Error('記録IDが重複しています。');
    for(const e of i.events) if(e.type==='correction' && (!eventIds.has(e.targetId)||!e.patch||Object.keys(e.patch).some(k=>!['value','occurredAt','label','note'].includes(k))||!Number.isFinite(Date.parse(e.patch.occurredAt)))) throw Error('訂正記録の形式が正しくありません。');
  }
  return clone(data);
}
export function mergeBackup(existing,incoming) {
  const out=clone(existing);
  let count=0,skipped=0;
  for(const item of incoming.incidents) {
    const found=out.incidents.find(i=>i.id===item.id);
    if(found && JSON.stringify(found)===JSON.stringify(item)){skipped++;continue;}
    const copy=clone(item);
    if(found){copy.restoredFrom=copy.id;copy.id=uid();copy.subject=`${copy.subject||'対象者・場所未記入'}（復元コピー）`;}
    out.incidents.push(copy);count++;
  }
  // Profile information is never silently overwritten by a restore.
  return {db:out,count,skipped};
}
