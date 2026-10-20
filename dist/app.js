import {SCHEMA,STORAGE_KEY,RESPONSE,BREATH,CPR,TRANSPORT,TYPES,ADULT_TEMPLATE,blankDb,newIncident,addEvent,effectiveEvents,derive,needsCpr,currentAction,saveDb,validateBackup,mergeBackup,iso,clone} from './model.js';
import {HAZARDS} from './templates.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8M2 12h5l2-4 4 8 2-4h7',
 pulse:'M2 12h5l3-8 5 16 3-8h4',
 phone:'M5 3h4l2 5-3 2a17 17 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z',
 aed:'M8 3h8v3H8zM5 6h14a1 1 0 0 1 1 1v14H4V7a1 1 0 0 1 1-1Zm8 3-4 6h4l-2 4 5-6h-4l1-4',
 lungs:'M10 3v7L6 7C3 9 2 13 2 18c0 3 6 3 8 0V9m4-6v7l4-3c3 2 4 6 4 11 0 3-6 3-8 0V9M10 6h4',
 hand:'M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 4-3 6-7 6h-2c-3 0-4-2-6-5l-3-4c-1-2 1-3 2-2l4 3',
 shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 9 3 3 5-6',
 person:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 22v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3',
 people:'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 1a3 3 0 0 1 0 6M2 21v-4a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v4m2-8a5 5 0 0 1 4 5v3',
 record:'M9 3h6v4H9zM8 5H5v17h14V5h-3M8 12h8M8 16h8',
 guide:'M12 3v19M4 6h12l4 4-4 4H4z',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6l4 2',
 flame:'M13 2c1 6-5 6-3 11-3-1-4-3-4-3-7 10 9 16 13 7 3-7-2-12-6-15Z',
 quake:'M3 10 12 3l9 7v11h-7l-1-5 3-3-5-3 1 6-3 3 1 2H3V10',
 rain:'M6 14a5 5 0 1 1 1-10 7 7 0 0 1 13 3 4 4 0 0 1 0 8M6 17l-1 4m7-4-1 4m7-4-1 4',
 power:'M12 2v10M6 5a9 9 0 1 0 12 0',
 more:'M5 12h.01M12 12h.01M19 12h.01',
 arrow:'M5 12h14m-5-5 5 5-5 5',
 info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v1m0 4v5'
};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
const time=d=>new Date(d).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const date=d=>new Date(d).toLocaleDateString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit'});
const localInput=d=>{const v=new Date(d);return new Date(v.getTime()-v.getTimezoneOffset()*60000).toISOString().slice(0,19);};
let db=blankDb(),storageAvailable=true,loadError='',expectedRevision=0;
try {
 const raw=localStorage.getItem(STORAGE_KEY);
 if(raw){db=validateBackup(JSON.parse(raw));expectedRevision=db.revision||0;}
} catch {storageAvailable=false;loadError='保存済みデータを読み込めませんでした。元のデータは上書きせず、新しい記録を一時的に保持します。書き出して保管してください。';}
let currentId=db.activeId,saveStatus='未保存',saveError=loadError,uiMessage='',offlineReady=false;
let restored=new Set(db.incidents.filter(i=>['analyzing','shock','resume'].includes(derive(i).aed)).map(i=>i.id));
let showClose=false,pendingCpr=false,pendingAed=false,editId=null,importDraft=null,homeOpen={},homeScroll=0,ignoreDetails=false;
let lastControl=null;
const incident=()=>db.incidents.find(i=>i.id===currentId);
const adult=i=>i.kind==='medical'||i.branches.some(b=>b.kind==='medical');
const editable=()=>!incident()?.closedAt;
function persist(){
 if(!storageAvailable){saveStatus='保存できていません';updateSaveLabel();return false;}
 const result=saveDb(localStorage,db,expectedRevision);
 if(result.ok){db=result.db;expectedRevision=db.revision;saveStatus='この端末に保存済み';saveError='';}
 else {saveStatus='保存できていません';saveError=result.error;if(result.conflict)storageAvailable=false;}
 updateSaveLabel();return result.ok;
}
function updateSaveLabel(){
 document.querySelectorAll('[data-save]').forEach(el=>{el.textContent=saveStatus;el.classList.toggle('error',!!saveError);});
 const box=$('#save-error');if(box){box.hidden=!saveError;box.innerHTML=saveError?`${esc(saveError)} <button class="btn compact" data-cmd="export">記録を書き出す</button>`:'';}
}
function btn(label,cmd,opts={}){return `<button type="button" class="btn ${opts.class||''}" data-cmd="${cmd}" ${opts.attrs||''} ${opts.disabled?'disabled':''}>${opts.icon?icon(opts.icon):''}${label}</button>`;}
function choice(label,type,value,selected,card=''){return btn(esc(label),'record',{class:selected===value?'selected':'',attrs:`data-type="${type}" data-value="${esc(value)}" data-label="${esc(label)}" data-card="${card}" aria-pressed="${selected===value}"`,disabled:!editable()});}
function action(label,type,value=type,opts={}){return btn(label,'record',{...opts,attrs:`data-type="${type}" data-value="${esc(value)}" data-label="${esc(opts.label||label)}" ${opts.attrs||''}`,disabled:!editable()||opts.disabled});}
function field(label,key,opts={}){
 const i=incident();const val=opts.profile?db.profile[key]:(['subject','location'].includes(key)?i?.[key]:i?.fields[key]);
 const attrs=`data-field="${key}" ${opts.profile?'data-profile="true"':''} ${i?.closedAt&&!opts.profile?'readonly':''}`;
 return `<label class="field">${label}${opts.textarea?`<textarea ${attrs} placeholder="${esc(opts.placeholder||'後から記入できます')}">${esc(val||'')}</textarea>`:`<input ${attrs} value="${esc(val||'')}" placeholder="${esc(opts.placeholder||'未記入')}" autocomplete="off">`}</label>`;
}
function details(key,label,body,common=true){
 const i=incident();const open=(i?i.open:homeOpen)[key];
 return `<details data-detail="${key}" ${open?'open':''}><summary>${label}</summary><div class="details-body">${body}${common&&i?`${field('担当者（任意）',`${key}-owner`)}${field('メモ',`${key}-note`,{textarea:true})}<label class="field">実施の制約・該当状況<select data-obstacle="${key}" ${i.closedAt?'disabled':''}><option value="">選択してください</option><option value="unable" ${derive(i).obstacles[key]==='unable'?'selected':''}>実施できない</option><option value="na" ${derive(i).obstacles[key]==='na'?'selected':''}>該当なし</option><option value="resolved" ${derive(i).obstacles[key]==='resolved'?'selected':''}>制約が解消した</option></select></label><p class="small subtle mt">「実施できない」「該当なし」は、処置の完了や正常を意味しません。</p>`:''}</div></details>`;
}
function card(key,title,body,opts={}){
 const obstruction=derive(incident()).obstacles[key];
 return `<article class="card ${opts.class||''}" id="${key}"><div class="card-heading">${opts.step?`<span class="step-number">${opts.step}</span>`:`<span class="icon-box">${icon(opts.icon||'info')}</span>`}<h3>${title}</h3></div><div class="card-body">${body}${obstruction&&obstruction!=='resolved'?`<div class="notice warn mt">${obstruction==='unable'?'実施できないと記録':'該当なしと記録'}。必要な対応の確認は続けてください。</div>`:''}</div>${opts.detail!==undefined?details(key,opts.detailLabel||'内容・担当・メモを開く',opts.detail):''}</article>`;
}
const arrow=(label='↓')=>`<div class="arrow" aria-hidden="true"><span>${label}</span></div>`;
function header(){return `<header class="topbar"><div class="topbar-inner"><button class="brand" data-cmd="home" aria-label="ACTION OS 事象を選ぶ"><span class="brand-mark">${icon('pulse')}</span>ACTION OS</button><div class="top-tools"><span class="save-status" data-save>${saveStatus}</span>${btn('平時の準備・記録','home',{class:'compact quiet'})}</div></div></header><div class="error-banner" id="save-error" role="alert" ${saveError?'':'hidden'}>${esc(saveError)}</div>`;}
function footer(){return `<footer class="footer"><span>ACTION OS <span aria-hidden="true">／</span> 必要な行動と、その記録。</span><span>${navigator.onLine?'オンライン':'オフライン'} · ${offlineReady?'オフライン準備済み':'オフライン準備を確認中'} · クラウド同期なし</span></footer>`;}
function eventButtons(mode='real'){
 return Object.entries(TYPES).map(([key,t])=>`<button class="event-btn ${key==='medical'?'main-event':''}" data-cmd="start" data-kind="${key}" data-mode="${mode}">${icon(t.icon)}<span class="event-name">${t.name}</span><small>${t.subtitle}</small><span class="chevron" aria-hidden="true">›</span></button>`).join('');
}
function homePage(){
 const active=db.incidents.filter(i=>!i.closedAt);
 const past=db.incidents.filter(i=>i.closedAt);
 return `<main id="main" class="layout"><div class="home"><div class="eyebrow">対応をはじめる</div><h1 class="home-title">何が起きていますか？</h1><p class="intro">事象を選ぶと、必要な行動と記録をひとつのページで確認できます。</p>
 ${active.length?`<section aria-label="継続中の事案"><div class="section-title"><h2>継続中の対応</h2><span class="small subtle">記録を引き継いで再開</span></div>${active.map(i=>`<article class="resume-card"><div><div class="row"><span class="badge ${i.mode==='training'?'training':'red'}">${i.mode==='training'?'訓練':'実対応'}</span><h3>${TYPES[i.kind].name}</h3></div><p>${esc(i.subject||'対象者・場所 未記入')} · ${date(i.startedAt)} ${time(i.startedAt)} 開始</p></div>${btn('対応を再開','resume',{class:'primary',icon:'arrow',attrs:`data-id="${i.id}"`})}</article>`).join('')}</section>`:''}
 <section aria-label="事象を選択"><div class="section-title"><h2>新しい事案</h2><span class="small subtle">登録・入力なしで開始</span></div><div class="event-grid">${eventButtons()}</div><p class="small subtle mt">急病・けがは成人用です。小児・乳児には成人の手順を適用しません。未確認の事象は記録機能のみ利用できます。</p></section>
 <section class="quiet-section" aria-label="平時の準備"><details data-home-detail="training" ${homeOpen.training?'open':''}><summary>訓練する <span class="badge training">実際には発信しません</span></summary><div class="quiet-body"><p class="subtle mb">訓練する事象を選んでください。実対応の記録とは区別して保存します。</p><div class="event-grid">${eventButtons('training')}</div><div class="notice mt">小児・乳児の専用テンプレートは未実装です。成人の手順を流用しないため、選択対象に含めていません。</div></div></details>
 <details data-home-detail="prepare" ${homeOpen.prepare?'open':''}><summary>端末と施設の準備</summary><div class="quiet-body"><h3>この端末の初期準備</h3><p class="small subtle mt">無料・アカウント不要。入力した情報はこのブラウザー内に保存します。</p><div class="field-grid mt">${field('施設名','facility',{profile:true})}${field('住所・通報する場所','address',{profile:true})}${field('AEDの設置場所','aedLocation',{profile:true,placeholder:'未確認'})}${field('救急隊の入口・経路','entrance',{profile:true,placeholder:'未確認'})}</div><div class="notice mt" id="offline-status">${offlineReady?'オフライン準備済み。この端末の同じブラウザーで、通信がなくても利用できます。':'必要なファイルを端末に準備しています。完了表示を確認してからオフラインで利用してください。'}</div><p class="small subtle mt">この版は端末保存のみです。会員登録、クラウド同期、組織認証は接続されていません。利用開始時のログインは不要です。</p></div></details>
 <details data-home-detail="history" ${homeOpen.history?'open':''}><summary>過去の事案・書き出し・復元</summary><div class="quiet-body"><div class="row">${btn('全記録を書き出す','export',{icon:'record'})}<label class="btn">記録ファイルを選ぶ<input id="import-file" type="file" accept=".json,application/json" hidden></label></div><p class="small subtle mt">JSON形式。復元は別の記録を削除せず追加します。同じIDで内容が異なる事案は、別の復元コピーになります。</p>${importDraft?`<div class="notice mt"><strong>${importDraft.incidents.length}件の事案を復元できます</strong><p>既存の施設情報は変更しません。</p><div class="button-group">${btn('この記録を復元','import-confirm',{class:'primary'})}${btn('キャンセル','import-cancel')}</div></div>`:''}${past.length?past.map(i=>`<article class="resume-card"><div><span class="badge ${i.mode==='training'?'training':''}">${i.mode==='training'?'訓練':'実対応'} · 記録終了</span><h3>${TYPES[i.kind].name}</h3><p>${date(i.startedAt)} ${time(i.startedAt)} · ${esc(i.subject||'対象者・場所 未記入')}</p></div>${btn('記録を開く','resume',{attrs:`data-id="${i.id}"`})}</article>`).join(''):'<p class="empty">終了した事案はありません。</p>'}</div></details></section><div id="toast" role="status">${esc(uiMessage)}</div>${footer()}</div></main>`;
}
function callButton(i){
 const police=i.kind==='intruder'||i.kind==='missing',number=police?'110':'119';
 return i.mode==='training'?btn(`${number} 通報を練習`,'practice-call',{class:'danger',icon:'phone'}):`<a class="btn danger" href="tel:${number}" data-call-link="${number}">${icon('phone')}${number}に電話</a>`;
}
function medicalTop(s){
 return card('safety','周囲の安全を確認',`<p>自分と傷病者の安全を確保する。</p><p class="caption">火・車・落下物など、二次事故の危険に注意。</p><div class="button-group">${choice('安全を確認','safety','safe',s.safety)}${choice('危険あり／未確保','safety','danger',s.safety)}</div>${s.safety==='danger'?'<div class="notice error mt">危険な場所へ無理に近づかず、専門機関に通報。安全を確保して手当を行ってください。</div>':''}`,{step:'1',detail:'<p>二次事故の危険を排除できない場合は、危険を排除できる専門機関に通報します。</p>'})+arrow()+
 card('response','反応（意識）を確認',`<p>肩をやさしくたたき、呼びかける。</p><div class="state-line"><span>観察結果</span><span class="badge ${s.response?'blue':''}">${RESPONSE[s.response]||'未回答'}</span></div><div class="button-group">${Object.entries(RESPONSE).map(([v,l])=>choice(l,'response',v,s.response)).join('')}</div><div class="branch-hint"><p><b>反応あり →</b> 状態に応じた手当・必要な通報・観察へ。</p><p><b>反応なし／わからない ↓</b> 大声で応援を呼ぶ。119番通報とAED手配を頼み、呼吸を確認。</p></div>${s.response==='yes'?'<div class="notice mt">反応ありでも「安全」「対応終了」ではありません。顔色・呼吸・症状を観察し、必要な通報と手当を行います。</div>':''}`,{step:'2',detail:'<p>何らかの応答や目的のある仕草があるかを確認します。結果が変わったら再度記録できます。前の記録は残ります。</p>'});
}
function callLane(s){
 return `<div class="lane-label">${icon('phone')}並行対応 · 119・応援</div>`+
 card('call','119番通報・応援を頼む',`<p>スピーカーで通信指令員の指示を受ける。</p><p class="caption mt">場所、反応、呼吸の状態を伝える。近くの人に協力を頼む。</p><div class="state-line"><span>通報の記録</span><span class="badge ${s.call!=='none'?'blue':''}">${{none:'未記録',requested:'依頼済み',connected:'通話中',reported:'通報内容を伝えた'}[s.call]}</span></div><div class="stack mt">${action('通報を依頼した','call','requested')}${action('通話中・指示を受けている','call','connected')}${action('通報内容を伝えた','call','reported')}</div><p class="side-note">通報の入力を待たず、呼吸確認と必要な処置を進めます。</p>`,{icon:'phone',detailLabel:'伝える内容を開く',detail:`<ul><li>「救急です」。場所・住所・建物・階</li><li>何が起きたか、成人であること</li><li>反応：${RESPONSE[s.response]||'未確認'}／呼吸：${BREATH[s.breath]||'未確認'}</li><li>胸骨圧迫やAEDなど、実施している処置</li></ul>${field('通報する場所','location')}${field('通報内容メモ','call-content',{textarea:true})}`})+
 `<div class="mt">${card('guide','救急隊の経路を確保',`<p>入口・経路を確保し、案内役を頼む。</p><div class="stack mt">${action(s.actions.entrance?'✓ 入口・経路の確保を記録済み':'入口・経路を確保した','action','entrance',{attrs:'data-card="entrance"'})}${action(s.actions.guide?'✓ 案内役の手配を記録済み':'案内役を手配した','action','guide',{attrs:'data-card="guide"'})}</div>`,{icon:'guide',detail:`${field('入口・経路','entrance',{placeholder:'未確認'})}<p class="mt">救急隊の到着後も、処置を実際に引き継ぐまでは必要な救命対応を続けます。</p>`})}</div>`;
}
function transportLane(s){
 const i=incident();
 return `<div class="lane-label">${icon('aed')}並行対応 · AEDの手配・搬送</div>`+
 card('transport','AEDを現場へ運ぶ',`<p>近くの人に、取りに行くよう依頼する。</p><div class="state-line"><span>搬送の状態</span><span class="badge ${s.transport!=='none'?'blue':''}">${TRANSPORT[s.transport]}</span></div><div class="stack mt">${Object.entries(TRANSPORT).filter(([k])=>k!=='none').map(([v,l])=>choice(l==='到着'?'AEDが現場に到着':l,'transport',v,s.transport)).join('')}</div><p class="side-note">設置場所：<strong>${esc(i.fields.aedLocation||'未確認')}</strong></p><div class="branch-hint"><b>到着 → 中央の「AEDを使用」へ</b><p>搬送と使用は別々に記録します。</p></div>`,{icon:'aed',detailLabel:'設置場所・担当を開く',detail:`${field('AEDの設置場所','aedLocation',{placeholder:'未確認'})}<p class="mt">場所や担当者が未入力でも、必要な胸骨圧迫を開始できます。搬送時間は推測しません。</p>`})+
 `<div class="solo"><h4 class="row">${icon('person')}一人で対応する場合</h4><p>自分で119番通報し、スピーカーで指示を受けながら対応します。</p><p class="mt">AEDがすぐ近くにあれば取りに行きます。遠くまで探しに行く前提にせず、通信指令員の指示に従ってください。</p></div>`;
}
function breathCard(s){
 return card('breath','普段どおりの呼吸は？',`<p><strong>胸とお腹の動きを10秒以内で確認。</strong></p><p class="caption mt">しゃくりあげるような途切れた呼吸は、普段どおりに含めません。</p><div class="state-line"><span>${s.recheck?'回復の兆候の再確認':'観察結果'}</span><span class="badge ${s.breath?'blue':''}">${BREATH[s.breath]||'未回答'}</span></div><div class="stack mt">${Object.entries(BREATH).map(([v,l])=>choice(l,'breath',v,s.breath)).join('')}</div><div class="branch-hint"><p><b>普段どおり →</b> 様子を見ながら救急隊等を待つ。呼吸の変化を再確認。</p></div><div class="branch-hint urgent"><b>呼吸なし・普段どおりでない／わからない ↓</b><p>反応なし／不明の場合、胸骨圧迫を開始。</p></div>${s.breath==='normal'?`<div class="notice mt"><strong>観察を継続</strong><p>普段どおりでなくなった場合は、その結果を記録して必要な胸骨圧迫へ。</p></div>`:''}`,{step:'3',class:(!s.breath&&s.response!=='yes')?'active':'',detail:'<p>10秒間待つ必要はありません。アプリは時間の経過で結果を選びません。反応がある場合は、状態に応じた手当と観察を続け、必要な通報を行います。</p>'});
}
function cprCard(s){
 const paused=['analyzing','shock'].includes(s.aed),stale=restored.has(incident().id)&&['analyzing','shock','resume'].includes(s.aed);
 let title=stale?'胸骨圧迫・現場を再確認':paused?'胸骨圧迫：一時中断':s.recheck?'回復の兆候を再確認':s.handed?'胸骨圧迫・引き継ぎ済み':'胸骨圧迫を開始・継続';
 const current=stale?'前回の記録：'+CPR[s.cpr]:CPR[s.cpr];
 const startLabel=s.cpr==='resume'?'胸骨圧迫を再開した':s.cpr==='compressing'?'胸骨圧迫中（継続）':'胸骨圧迫を開始した';
 return card('cpr',title,`<div class="condition">${icon('info')}反応なし／不明 ＋ 呼吸なし・普段どおりでない／不明の場合</div>${paused&&!stale?'<div class="notice error mt"><strong>現在：全員離れる</strong><p>解析・ショック中は傷病者に触れない。</p></div>':''}${stale?'<div class="notice warn mt">過去の記録を復元しました。AEDの最新の音声と実際の状態を確認してください。</div>':''}<div class="metrics"><div class="metric"><span>圧迫する位置</span><strong>胸の真ん中</strong></div><div class="metric"><span>テンポ</span><strong>100〜120</strong> <b>回/分</b></div><div class="metric"><span>成人の深さ</span><strong>約5cm</strong></div><div class="metric"><span>継続のポイント</span><strong>中断を短く</strong></div></div><div class="state-line"><span>処置の状態</span><span class="badge ${paused?'red':'blue'}">${current}</span></div><div class="button-group">${btn(startLabel,'cpr-start',{class:'primary',disabled:!editable()||(!stale&&paused)||s.cpr==='compressing'||s.handed})}${action('交代を記録','swap','swap',{disabled:s.cpr!=='compressing'})}</div>${pendingCpr?`<div class="notice warn mt"><strong>実際の状態を確認</strong><p>反応がなく、普段どおりの呼吸がない／判断できない状態で胸骨圧迫を開始していますか？ 前段の記録入力は不要です。</p><div class="button-group">${btn('該当する状態で開始した','cpr-confirm',{class:'primary'})}${btn('確認へ戻る','cpr-cancel')}</div></div>`:''}<p class="caption mt">交代できる人がいれば1〜2分を目安に交代し、中断を短くします。</p><div class="branch-hint"><strong>人工呼吸の訓練を受け、技術と意思がある場合</strong><p>胸骨圧迫30回 ＋ 人工呼吸2回（30：2）。難しい・ためらいがある場合は胸骨圧迫を続けます。</p></div>`,{step:'4',class:'critical',detailLabel:'圧迫・人工呼吸の方法と記録を開く',detail:'<p>手のひらの付け根を胸の真ん中に当て、もう一方の手を重ねます。両肘を伸ばし、真上から垂直に圧迫します。</p><p>人工呼吸を行う場合は、頭部後屈・あご先挙上で気道を確保。鼻をつまみ、口を覆い、約1秒かけて胸の上がりが見える程度に吹き込みます。吹き込みは2回まで行い、胸骨圧迫に戻ります。手元に感染防護具があれば使用します。</p><p>記録のために処置を止めず、時刻は後から補記・訂正できます。</p>'});
}
function aedCard(s){
 const stale=restored.has(incident().id)&&['analyzing','shock','resume'].includes(s.aed);
 return card('aed','AEDを使用',`<p class="caption">到着したら、次の流れで使用。前段の記録がなくても確認できます。</p>
 ${stale?`<div class="notice warn mt"><strong>前回のAED状態を復元しています</strong><p>記録は機器の現在の指示ではありません。下の「最新指示」の操作は、実際に音声を聞いてから使います。</p></div>`:''}
 <ol class="aed-steps mt">
 <li><div class="aed-step-title"><em>01</em>電源を入れる</div><p>機種により、ふたを開けると電源が入ります。音声に従います。</p>${action(s.actions.power?'✓ 電源を入れた記録あり':'電源を入れた','aed-power')}</li>
 <li><div class="aed-step-title"><em>02</em>パッドを素肌に貼る</div><p>胸を出し、パッドの図に従って貼ります。</p><p><strong>${['analyzing','shock'].includes(s.aed)&&!stale?'解析・ショック中は全員離れます。':'複数人で対応できるときは、準備・装着中も胸骨圧迫を続けます。'}</strong></p>${action(s.actions.pads?'✓ パッド装着の記録あり':'パッドを貼った','pads')}</li>
 <li><div class="aed-step-title"><em>03</em>解析が始まったら、全員離れる</div><p>傷病者に誰も触れていないことを確認。</p>${btn('AEDの最新指示で解析が始まった','analysis-request',{class:'danger-outline',disabled:!editable()})}
 ${pendingAed?`<div class="notice warn mt"><p>実際にAEDを装着し、現在の音声で解析が始まっていますか？ 記録が未入力でも、実際の状態に合わせて記録できます。</p><div class="button-group">${btn('今、解析中・全員離れた','analysis-confirm',{class:'danger'})}${btn('キャンセル','analysis-cancel')}</div></div>`:''}</li>
 <li><div class="aed-step-title"><em>04</em>AEDからショックの指示があるか</div><p>要否はAEDが判断します。アプリは判断しません。</p><div class="aed-branches"><div><strong>必要の指示 →</strong> 誰も触れていないことを確認し、音声・機器の指示に従ってショック。</div><div><strong>不要の指示 →</strong> ショックを行わず、直ちに胸骨圧迫から再開。</div></div><div class="button-group">${btn('AEDの指示：必要','aed-shock-required',{class:'danger-outline',disabled:!editable()||s.aed!=='analyzing'||stale})}${btn('AEDの指示：不要','aed-no-shock',{disabled:!editable()||s.aed!=='analyzing'||stale})}</div>
 ${s.aed==='shock'&&!stale?`<div class="notice error mt"><strong>全員離れる・誰も触れていないことを確認</strong><p>自動でショックする機種もあります。AEDの音声・機器の指示に従ってください。</p>${btn('離隔を確認し、機器の指示でショック実施','shock-done',{class:'danger full mt',disabled:!editable()})}</div>`:''}</li>
 <li><div class="aed-step-title"><em>05</em>直ちに胸骨圧迫から再開</div><p>ショック実施後も、不要と指示された場合も再開します。</p>${btn('胸骨圧迫を再開した','aed-resume',{class:'primary full',disabled:!editable()||(s.aed!=='resume'&&!stale)})}</li>
 </ol><div class="loop">↻ AEDの音声で再解析 → 03「全員離れる」へ。パッドを貼り直す手順には戻りません。</div>
 <p class="small subtle mt">入力のために処置を待つ必要はありません。実施時刻は「引き継ぎ・記録」から後で補記できます。</p>`,{step:'5',detailLabel:'パッドの位置・注意点を開く',detail:'<ul><li>成人は「小学生〜大人用」のパッド・モードを使います。未就学児用は使いません。</li><li>パッドの図に従い、胸の右上（鎖骨の下で胸骨の右）と胸の左下側（わきの下から5〜8cm、乳頭の斜め下）に貼ります。</li><li>胸が濡れているときは、乾いた布やタオルで拭き取ります。</li><li>貼付位置に貼り薬・湿布がある場合は、剥がして貼ります。</li><li>医療用の植込み機器がある場所を避け、離して貼ります。</li><li>衣服や下着の上には貼りません。人目への配慮をしながら適切な位置に貼ります。</li></ul><p>解析・ショック時は全員離れます。ボタン操作のないオートショックAEDもあるため、機器の指示に従ってください。</p>'});
}
function recoveryCard(s){
 return card('recovery','継続・再確認・引き継ぎ',`<p><strong>救急隊等が処置を引き継ぐまで、または普段どおりの呼吸や目的のある動きが認められるまで、心肺蘇生とAEDを継続。</strong></p><div class="branch-hint"><b>普段どおりの呼吸／目的のある動きが戻った →</b><p>胸骨圧迫を止めて再確認。確認した呼吸に応じて観察、または必要な胸骨圧迫へ。</p></div>${btn('普段どおりの呼吸／目的のある動きが戻った','recovery',{class:'full mt',disabled:!editable()||s.handed})}
 ${s.recheck?`<div class="notice mt"><strong>呼吸を10秒以内で再確認</strong><div class="stack mt">${Object.entries(BREATH).map(([v,l])=>choice(l,'breath',v,s.breath)).join('')}</div></div>`:''}
 <p class="caption mt"><strong>AEDの電源を切らず、パッドは貼ったままにします。</strong></p><div class="button-group">${action(s.arrived?'✓ 救急隊の到着を記録済み':'救急隊が到着した','arrival')}${btn(s.handed?'✓ 処置を引き継いだ':'実際に処置を引き継いだ','handover',{class:'primary',disabled:!editable()||s.handed})}</div><p class="caption mt">到着の記録だけでは処置を終了しません。</p>`,{step:'6',detail:'<p>実際の引き継ぎが済んだら、確認した状態、処置、主な時刻を下の「引き継ぎ・記録」で伝えます。呼吸が普段どおりでなくなったら、必要な胸骨圧迫へ戻ります。</p>'});
}
function medicalFlow(s){
 return `<div class="flow-heading"><h2>成人の救命対応</h2><p>行動を優先。記録は後からでも。</p></div><section class="flow-grid" aria-label="成人の救命フローチャート"><div class="central-top">${medicalTop(s)}</div><div class="parallel-rail"><div class="rail-label"><span aria-hidden="true">←</span>並行して進める<span aria-hidden="true">→</span><small>通報・AED搬送の完了を待たず、必要な処置へ</small><span class="mobile-parallel" style="padding:0"><a href="#call">119・応援</a><a href="#transport">AED手配・搬送</a></span></div></div><aside class="flow-left">${callLane(s)}</aside><div class="flow-main"><div class="lane-label">${icon('hand')}確認と処置</div>${breathCard(s)}${arrow()}${cprCard(s)}${arrow()}${aedCard(s)}${arrow()}${recoveryCard(s)}</div><div class="mobile-parallel"><strong>↕ 並行対応</strong><span>上の確認・処置と同時に進めます。</span></div><aside class="flow-right">${transportLane(s)}</aside></section>`;
}
function sourceBlock(template,key){
 return details(key,'採用した手順・版・参照資料を開く',`<p><strong>${esc(template.name)}</strong></p><p>${esc(template.edition)}<br>資料確認日：${esc(template.checkedAt)}</p><p class="small subtle">${esc(template.scope||'')}</p><ul class="sources-list">${template.sources.map(s=>`<li><a href="${esc(/^https:\/\//.test(s.url)?s.url:'#')}" rel="noreferrer">${esc(s.name)}</a><small>${esc(s.edition)}</small></li>`).join('')}</ul><p class="small subtle">採用した版の管理情報を事案ごとに保持します。外部資料のリンクはオンライン時に閲覧できます。</p>`,false);
}
function hazardFlow(kind,template){
 const s=derive(incident()),t=template||HAZARDS[kind];
 if(!t?.nodes) return `<div class="notice warn mt"><strong>${TYPES[kind].name}：手順未確認・記録用</strong><p>この版には本番用の確認済み手順がありません。所属施設の確認済み手順と関係機関の指示に従い、下のメモ・時刻の記録を利用できます。</p></div>`;
 return `<section class="hazard-flow" aria-label="${TYPES[kind].name}のフロー"><div class="flow-heading"><h2>${t.title}</h2><span class="badge">共通初動</span></div><p class="small subtle mb">施設固有の経路や避難場所は未確認です。入力より実際の安全確保を優先してください。</p>${t.nodes.map((n,index)=>`${index?arrow():''}${card(n.id,n.title,`${n.summary?`<p>${esc(n.summary)}</p>`:''}${n.branches?`<div class="hazard-branches">${n.branches.map((b,k)=>`<div class="hazard-branch ${s.observations[n.id]===String(k)?'selected':''}"><strong>${esc(b.condition)}</strong><p>→ ${esc(b.action)}</p>${choice('この状態を記録','hazard-observation',String(k),s.observations[n.id],n.id)}</div>`).join('')}</div>`:`<div class="button-group">${action(s.actions[n.id]?'✓ 実施の記録あり':'実施を記録','action',n.id,{attrs:`data-card="${n.id}"`,label:n.title+'：実施'})}</div>`}`,{step:index+1,detail:`<p>確認した状況・実施した内容を記録します。記録だけで危険の解消や対応終了とは扱いません。</p>`})}`).join('')}<div class="parallel-rail"><span class="rail-label">↔ 並行して進める</span></div>${t.parallel.map((p,k)=>card(`${kind}-parallel-${k}`,p.title,`<p>${esc(p.summary)}</p><div class="mt">${action('実施を記録','action',`${kind}-parallel-${k}`,{attrs:`data-card="${kind}-parallel-${k}"`,label:p.title+'：実施'})}</div>`,{icon:k?'people':'phone',detail:''})).join('')}<div class="card sources">${sourceBlock(t,'sources-'+kind)}</div></section>`;
}
function summaryAndLog(s){
 const i=incident(),events=effectiveEvents(i);
 const mapped=new Map(events.map(e=>[e.id,e]));
 return `<section class="handover-section" id="handover"><div class="row between"><h2 class="row">${icon('record')}引き継ぎ・記録</h2><span class="small subtle">時刻はこの端末の時刻・${Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div><div class="handover-grid">
 <div class="card"><div class="card-heading"><span class="icon-box">${icon('person')}</span><h3>この事案の情報</h3></div><div class="card-body">${field('対象者・場所の識別（任意）','subject',{placeholder:'例：対象者A／1階ホール'})}${field('発生場所・住所','location',{placeholder:'未確認'})}${field('引き継ぎ先・担当','handover-to')}${field('伝えること・全体メモ','general-note',{textarea:true})}<p class="small subtle mt">別の対象者や別の場所は、新しい事案として記録してください。</p></div></div>
 <div class="card"><div class="card-heading"><span class="icon-box">${icon('record')}</span><h3>確認した状態・処置</h3></div><div class="card-body"><dl class="summary-grid"><div class="summary-item"><dt>反応</dt><dd>${RESPONSE[s.response]||'未回答'}</dd></div><div class="summary-item"><dt>呼吸</dt><dd>${BREATH[s.breath]||'未回答'}</dd></div><div class="summary-item"><dt>処置の最終記録</dt><dd>${CPR[s.cpr]}</dd></div><div class="summary-item"><dt>AEDの搬送</dt><dd>${TRANSPORT[s.transport]}</dd></div><div class="summary-item"><dt>救急隊の到着</dt><dd>${s.arrived?'到着を記録':'未記録'}</dd></div><div class="summary-item"><dt>実際の引き継ぎ</dt><dd>${s.handed?'引き継いだ':'未記録'}</dd></div></dl><p class="small subtle">開始 ${date(i.startedAt)} ${time(i.startedAt)}${i.closedAt?` ／ 記録終了 ${time(i.closedAt)}`:''}</p><div class="row mt">${btn('この事案を書き出す','export-one',{icon:'record'})}${btn('印刷','print',{class:'quiet'})}</div></div></div></div>
 <div class="card mt"><div class="card-heading"><span class="icon-box">${icon('clock')}</span><h3>時刻と記録の履歴</h3></div><div class="card-body"><p class="caption">「訂正」では元の内容と記録時刻も保持します。補記は過去の実施記録として残し、現在の機器指示には反映しません。</p><div class="log">${i.events.length?i.events.map(e=>{
 const effective=mapped.get(e.id)||e;
 return `<div class="log-item ${e.type==='correction'?'correction':''}"><time datetime="${esc(e.occurredAt)}">${time(effective.occurredAt)}<small>${date(effective.occurredAt)}</small></time><div class="log-label"><strong>${esc(effective.label)}</strong>${e.historical?'<span class="badge">補記</span>':''}${effective.correctionId?'<span class="badge">訂正済み</span>':''}${effective.note?`<p>${esc(effective.note)}</p>`:''}<small>記録 ${date(e.recordedAt)} ${time(e.recordedAt)}${effective.correctionId?` ／ 訂正前：${esc(e.label)}・${time(e.occurredAt)}`:''}${e.type==='correction'?` ／ 理由：${esc(e.reason)}`:''}</small></div>${e.type!=='correction'?`<button class="text-button" data-cmd="edit-event" data-id="${e.id}">${i.closedAt?'内容を確認':'訂正'}</button>`:''}${editId===e.id?editForm(effective,i.closedAt):''}</div>`;
 }).join(''):'<p class="empty">実施や観察を記録すると、ここに時刻が残ります。</p>'}</div></div>${details('late-entry','過去の時刻・実施内容を補記する',`<label class="field">出来事<select id="late-type" ${i.closedAt?'disabled':''}><option value="note">メモ・実施内容</option><option value="cpr">胸骨圧迫開始／再開</option><option value="analysis">AED解析</option><option value="shock">AEDショック</option><option value="swap">交代</option><option value="transport">AED到着</option><option value="pads">パッド装着</option><option value="handover">実際の引き継ぎ</option></select></label><label class="field">実際の時刻<input type="datetime-local" step="1" id="late-time" value="${localInput(iso())}" ${i.closedAt?'disabled':''}></label><label class="field">内容・担当・メモ<textarea id="late-note" ${i.closedAt?'disabled':''}></textarea></label>${btn('過去の記録を追加','late-add',{class:'primary mt',disabled:!editable()})}`,false)}</div>
 <div class="add-event card">${details('add-branch','この事案に事象を追加する',`<p>同じ対象者・同じ場所で起きた複合事象に、必要な対応の枝を追加します。今の記録は保持します。</p><label class="field">追加する事象<select id="add-kind">${Object.entries(TYPES).filter(([k])=>k!==i.kind&&!i.branches.some(b=>b.kind===k)).map(([k,t])=>`<option value="${k}">${t.name}${k==='medical'?'（成人）':''}</option>`).join('')}</select></label><label class="field">同じ対象者・場所であることを確認<input id="branch-scope" placeholder="例：同じ対象者Aの場所で火災" ${i.closedAt?'disabled':''}></label>${btn('同じ事案に枝を追加','add-branch',{class:'primary mt',disabled:!editable()})}<p class="small subtle mt">別の対象者・場所の記録は統合しません。事象を選ぶ画面で新しい事案を開始してください。</p>`,false)}</div>
 <div class="end-section"><h3>${i.closedAt?'対応記録は終了しています':'対応記録を終了する'}</h3><p>記録を閉じる操作です。胸骨圧迫の中止指示ではありません。</p>${i.closedAt?`<p><strong>終了時刻 ${date(i.closedAt)} ${time(i.closedAt)}</strong></p>${btn('記録を再開して補記・訂正','reopen',{class:'quiet'})}`:btn('対応記録を終了','close-request',{class:'quiet'})}
 ${showClose&&!i.closedAt?`<div class="end-confirm"><h4>実際の対応と引き継ぎを確認</h4><p>処置の最終記録：<strong>${CPR[s.cpr]}</strong> ／ 引き継ぎ：<strong>${s.handed?'実施済み':'未記録'}</strong></p><p>実際の処置は記録の終了に関係なく継続してください。</p><label class="field">現在の状況<select id="close-disposition"><option value="">選択してください</option><option value="handed">実際に処置を引き継いだ</option><option value="continuing">対応・処置は続け、記録だけを閉じる</option><option value="other">その他（理由を記録）</option></select></label><label class="field">引き継ぎ先／理由（任意・その他は必須）<input id="close-note"></label><div class="button-group">${btn('状態を確認して記録を終了','close-confirm',{class:'primary'})}${btn('記録を続ける','close-cancel')}</div></div>`:''}</div></section>`;
}
function editForm(e,readonly=false){
 const options=e.type==='response'?RESPONSE:e.type==='breath'?BREATH:null;
 return `<div class="edit-form"><p class="small">元の記録を残して訂正します。時刻の訂正だけでは、現在の機器指示を変更しません。</p><div class="field-grid"><label class="field">実際の時刻<input type="datetime-local" step="1" id="edit-time" value="${localInput(e.occurredAt)}" ${readonly?'disabled':''}></label>${options?`<label class="field">観察結果<select id="edit-value" ${readonly?'disabled':''}>${Object.entries(options).map(([v,l])=>`<option value="${v}" ${e.value===v?'selected':''}>${l}</option>`).join('')}</select></label>`:''}</div><label class="field">訂正理由<input id="edit-reason" placeholder="確認し直したため／時刻の補記など" ${readonly?'disabled':''}></label><div class="button-group">${btn('訂正を保存','save-correction',{class:'primary',attrs:`data-id="${e.id}"`,disabled:readonly})}${btn('閉じる','edit-cancel')}</div></div>`;
}
function hazardCurrent(i){
 const templates=[i.template,...i.branches.map(b=>b.template)];
 const observation=[...effectiveEvents(i)].reverse().find(e=>!e.historical&&e.type==='hazard-observation');
 if(observation){
   const node=templates.flatMap(t=>t.nodes||[]).find(n=>n.id===observation.card);
   const branch=node?.branches?.[Number(observation.value)];
   if(branch)return {title:branch.action,detail:`確認した状況：${branch.condition}`,tone:'blue'};
 }
 return {title:i.template.nodes?.[0]?.title||'状態と実施した対応を記録',detail:i.template.nodes?'具体的な状況に応じた枝を確認し、必要な対応を続けます。':'確認済みの施設手順と関係機関の指示に従ってください。',tone:'blue'};
}
function incidentPage(){
 const i=incident(),s=derive(i),t=TYPES[i.kind],isAdult=adult(i);
 let a=isAdult?currentAction(s,restored.has(i.id)):hazardCurrent(i);
 return `<main id="main" class="layout"><nav class="breadcrumbs" aria-label="現在地"><button data-cmd="home">事象を選ぶ</button> <span aria-hidden="true"> / </span> ${t.name} <span aria-hidden="true"> / </span> 対応ページ</nav><div class="incident-title-row"><div class="incident-title"><span class="incident-symbol">${icon(t.icon)}</span><div><h1>${t.name}</h1><div class="incident-meta"><span class="badge ${i.mode==='training'?'training':'red'}">${i.mode==='training'?'訓練':'実対応'}</span><span>${isAdult?'成人の救命対応':t.subtitle}</span><span>開始 ${time(i.startedAt)}</span><span>${i.closedAt?'記録終了':'対応中'}</span></div></div></div><div class="call-area">${callButton(i)}<small>${i.mode==='training'?'訓練中 · 実際の電話は発信しません':'端末の発信画面を開きます'}</small></div></div>
 ${i.mode==='training'?'<div class="notice warn training-strip"><strong>訓練モード</strong>　このページの通報操作から実際の電話は発信されません。</div>':''}
 ${i.closedAt?`<div class="notice warn mb"><strong>対応記録を終了した事案です。</strong> 下の処置状態は最終記録です。記録終了は処置を止める指示ではありません。</div>`:''}
 <div class="current-action ${a.tone==='red'?'red':''}" role="status" aria-live="polite"><div class="current-label">${i.closedAt?'最終記録':'今すること'}</div><div><h2>${a.title}</h2><p>${a.detail}</p></div></div>
 <div id="toast" role="status">${esc(uiMessage)}</div>
 ${i.kind==='medical'?medicalFlow(s):hazardFlow(i.kind,i.template)}
 ${i.branches.map(b=>`<section class="added-branch"><div class="row"><span class="badge blue">複合事象</span><h2>${TYPES[b.kind].name}</h2></div><p class="small subtle mt">対象・場所：${esc(b.scope)}</p>${b.kind==='medical'?medicalFlow(s):hazardFlow(b.kind,b.template)}</section>`).join('')}
 <div class="continuity">${icon('info')}<p>入力やチェックを待たず、必要な行動を進めてください。各項目の説明は同時に開けます。担当者・結果・時刻は後から記録できます。</p></div>
 ${summaryAndLog(s)}${isAdult?`<div class="card sources">${sourceBlock(i.kind==='medical'?i.template:i.branches.find(b=>b.kind==='medical').template,'adult-sources')}</div>`:''}${footer()}</main>`;
}
function render(preserve=true){
 const y=window.scrollY,focus=document.activeElement,key=focus?.getAttribute?.('data-field');
 ignoreDetails=true;
 $('#app').innerHTML=header()+(incident()?incidentPage():homePage());
 if(preserve)window.scrollTo(0,y);
 if(key){const el=document.querySelector(`[data-field="${key}"]`);if(el)el.focus({preventScroll:true});}
 updateSaveLabel();queueMicrotask(()=>{ignoreDetails=false;});
}
function message(text){
 uiMessage=text;const el=$('#toast');if(el)el.textContent=text;
 const container=lastControl?.closest('.card-body,.details-body,.end-section');
 if(container?.isConnected){let feedback=container.querySelector('.action-feedback');if(!feedback){feedback=document.createElement('div');feedback.className='notice mt action-feedback';feedback.setAttribute('role','status');container.append(feedback);}feedback.textContent=text;}
}
function log(type,value,label,extra={}){
 const i=incident();if(!i||i.closedAt)return;
 addEvent(i,type,value,label,extra);persist();render();
}
function start(kind,mode){
 if(incident())incident().scroll=window.scrollY;else homeScroll=window.scrollY;
 const template=kind==='medical'?ADULT_TEMPLATE:HAZARDS[kind]||{id:kind+'-record-v1',name:TYPES[kind].name,edition:'記録用・手順未確認',checkedAt:'2026-10-20',sources:[]};
 const i=newIncident(kind,mode,db.profile,template);db.incidents.push(i);currentId=i.id;db.activeId=i.id;
 addEvent(i,'start',mode,mode==='training'?'訓練を開始':'対応を開始');
 uiMessage='';showClose=false;pendingCpr=false;pendingAed=false;editId=null;persist();render(false);window.scrollTo(0,0);
}
function goHome(){
 if(incident())incident().scroll=window.scrollY;
 currentId=null;db.activeId=null;showClose=false;pendingCpr=false;pendingAed=false;editId=null;uiMessage='';persist();render(false);window.scrollTo(0,homeScroll);
}
function resume(id){
 const i=db.incidents.find(x=>x.id===id);if(!i)return;
 homeScroll=window.scrollY;currentId=id;db.activeId=id;uiMessage='';persist();render(false);window.scrollTo(0,i.scroll||0);
 if(['analyzing','shock','resume'].includes(derive(i).aed)){restored.add(i.id);render();}
}
function backup(one=false){
 const data=one?{...blankDb(),profile:{...db.profile},incidents:[clone(incident())]}:clone(db);
 const file=new Blob([JSON.stringify({...data,exportedAt:iso()},null,2)],{type:'application/json'});
 const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=`ACTION-OS-${one?'incident':'backup'}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
 link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);message('記録ファイルの書き出しを開始しました。ダウンロード先を確認してください。');
}
document.addEventListener('click',event=>{
 const call=event.target.closest('[data-call-link]');
 if(call&&incident()){
   if(incident().mode==='training'){event.preventDefault();return;}
   if(editable())addEvent(incident(),'phone-open',call.dataset.callLink,`${call.dataset.callLink}発信画面を開く操作（通報完了ではない）`);
   incident().scroll=window.scrollY;persist();
   return;
 }
 const control=event.target.closest('[data-cmd]');if(!control)return;lastControl=control;
 const cmd=control.dataset.cmd,i=incident(),s=i?derive(i):null;
 switch(cmd){
 case 'home':goHome();break;
 case 'start':start(control.dataset.kind,control.dataset.mode);break;
 case 'resume':resume(control.dataset.id);break;
 case 'export':backup();break;
 case 'export-one':backup(true);break;
 case 'print':window.print();break;
 case 'practice-call':
   message('訓練の通報操作を記録しました。実際の発信はしていません。');
   log('practice-call','simulated','訓練：通報操作（実際の発信なし）');break;
 case 'record':{
   if(!editable())return;
   const {type,value,label,card:cardKey}=control.dataset;
   if(type==='breath'&&['analyzing','shock'].includes(s.aed)&&!restored.has(i.id)) {
     message('AEDの解析・ショック中は全員離れてください。実際に普段どおりの呼吸／目的のある動きが戻った場合は、回復の再確認へ進みます。');return;
   }
   const prefix={safety:'周囲の安全',response:'反応',breath:'呼吸',transport:'AED搬送',call:'119通報', 'hazard-observation':cardKey};
   let eventLabel=prefix[type]?`${prefix[type]}：${label}`:label;
   if(type==='hazard-observation'){
     const node=[i.template,...i.branches.map(b=>b.template)].flatMap(t=>t.nodes||[]).find(n=>n.id===cardKey);
     eventLabel=node?`${node.title}：${node.branches[Number(value)].condition}`:label;
   }
   if(['response','breath'].includes(type))pendingCpr=false;
   log(type,value,eventLabel,cardKey?{card:cardKey}:{});
   break;
 }
 case 'cpr-start':{
   if(!editable()||s.handed)return;
   if((s.response==='yes'||s.breath==='normal')&&!s.recheck){message('現在の記録は反応あり、または普段どおりの呼吸です。実際の状態が変化した場合は、反応と呼吸を確認し直してください。');return;}
   if(['analyzing','shock'].includes(s.aed)&&!restored.has(i.id)){message('解析・ショック中は全員離れます。AEDの最新の音声に従ってください。');return;}
   if(!needsCpr(s)||restored.has(i.id)){pendingCpr=true;render();return;}
   log('cpr','compressing','胸骨圧迫を開始・再開');break;
 }
 case 'cpr-confirm':
   pendingCpr=false;restored.delete(i.id);log('cpr','compressing','実際の反応・呼吸の適用条件を確認して胸骨圧迫を開始・再開',{conditionsConfirmed:true});break;
 case 'cpr-cancel':pendingCpr=false;render();break;
 case 'analysis-request':
   if(!editable())return;
   if(s.handed||s.response==='yes'||s.breath==='normal'){message('現場の反応・呼吸を確認してください。普段どおりの呼吸がある場合にAED解析へ誘導しません。');return;}
   if(!s.actions.pads||restored.has(i.id)||(!needsCpr(s)&&s.cpr!=='compressing')){pendingAed=true;render();return;}
   restored.delete(i.id);log('analysis','analyzing','AEDの最新の音声で解析開始・全員離れた');break;
 case 'analysis-confirm':
   pendingAed=false;restored.delete(i.id);log('analysis','analyzing','現場のAED解析を確認・全員離れた',{conditionsConfirmed:true});break;
 case 'analysis-cancel':pendingAed=false;render();break;
 case 'aed-shock-required':
   if(s.aed!=='analyzing'||restored.has(i.id))return;
   log('aed-instruction','shock','AEDの指示：ショックが必要');break;
 case 'aed-no-shock':
   if(s.aed!=='analyzing'||restored.has(i.id))return;
   log('aed-instruction','no-shock','AEDの指示：ショック不要・直ちに胸骨圧迫から再開');break;
 case 'shock-done':
   if(s.aed!=='shock'||restored.has(i.id))return;
   log('shock','delivered','誰も触れていないことを確認・AEDの指示でショックを実施');break;
 case 'aed-resume':
   if(restored.has(i.id)){pendingCpr=true;render();message('AEDの現在の音声と実際の状態を確認し、胸骨圧迫カードで再開を記録してください。');return;}
   if(s.aed!=='resume')return;
   log('cpr','compressing','AEDの指示に従い、胸骨圧迫を再開');break;
 case 'recovery':
   restored.delete(i.id);log('recovery','signs','普段どおりの呼吸／目的のある動きが戻ったため、胸骨圧迫を止めて再確認');break;
 case 'handover':restored.delete(i.id);log('handover','handed','救急隊等に実際に処置を引き継いだ');break;
 case 'edit-event':editId=control.dataset.id;render();break;
 case 'edit-cancel':editId=null;render();break;
 case 'save-correction':{
   if(!editable())return;
   const old=effectiveEvents(i).find(e=>e.id===control.dataset.id),v=$('#edit-time')?.value,reason=$('#edit-reason')?.value.trim();
   if(!old||!v||!Number.isFinite(Date.parse(v))||!reason){message('正しい時刻と訂正理由を入力してください。');return;}
   const newValue=$('#edit-value')?.value??old.value;
   const newLabel=old.type==='response'?'反応：'+RESPONSE[newValue]:old.type==='breath'?'呼吸：'+BREATH[newValue]:old.label;
   addEvent(i,'correction','amend',`記録の訂正：${newLabel}`,{targetId:old.id,patch:{value:newValue,label:newLabel,occurredAt:new Date(v).toISOString()},reason});
   // Corrected history must never become a fresh AED command.
   if(['analyzing','shock','resume'].includes(derive(i).aed))restored.add(i.id);
   editId=null;persist();render();break;
 }
 case 'late-add':{
   if(!editable())return;
   const type=$('#late-type').value,v=$('#late-time').value,note=$('#late-note').value.trim();
   if(!v||!Number.isFinite(Date.parse(v))||!note){message('実際の時刻と内容を入力してください。');return;}
   const labels={note:'メモ',cpr:'胸骨圧迫開始／再開',analysis:'AED解析',shock:'AEDショック',swap:'交代',transport:'AED到着',pads:'パッド装着',handover:'引き継ぎ'};
   log(type,'historical',`補記：${labels[type]}`,{occurredAt:new Date(v).toISOString(),note,historical:true});break;
 }
 case 'add-branch':{
   if(!editable())return;
   const kind=$('#add-kind').value,scope=$('#branch-scope').value.trim();
   if(!kind||!scope){message('同じ対象者・場所であることを記入してください。別の対象者・場所は新しい事案に分けます。');return;}
   if(kind===i.kind||i.branches.some(b=>b.kind===kind))return;
   i.branches.push({kind,scope,addedAt:iso(),template:clone(kind==='medical'?ADULT_TEMPLATE:HAZARDS[kind]||{name:TYPES[kind].name,edition:'記録用・手順未確認',sources:[]})});
   log('branch',kind,`複合事象を追加：${TYPES[kind].name}`,{note:scope});break;
 }
 case 'close-request':showClose=true;render();break;
 case 'close-cancel':showClose=false;render();break;
 case 'close-confirm':{
   const disposition=$('#close-disposition').value,note=$('#close-note').value.trim();
   if(!disposition||(disposition==='other'&&!note)){message('実際の状況を選択してください。「その他」は理由を記入してください。');return;}
   if(disposition==='handed'&&!s.handed)addEvent(i,'handover','handed','記録終了時に実際の処置引き継ぎを確認',{note});
   i.closedAt=iso();addEvent(i,'close',disposition,'対応記録を終了（処置の中止指示ではない）',{note,occurredAt:i.closedAt});
   showClose=false;persist();render();break;
 }
 case 'reopen':
   i.closedAt=null;addEvent(i,'reopen','open','対応記録を再開');persist();render();break;
 case 'import-cancel':importDraft=null;render();break;
 case 'import-confirm':{
   if(!importDraft)return;
   const result=mergeBackup(db,importDraft);db=result.db;importDraft=null;persist();
   uiMessage=`${result.count}件を復元しました。同一内容の${result.skipped}件は追加していません。`;render();break;
 }
 }
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(!el.matches('[data-field]'))return;
 if(el.dataset.profile){db.profile[el.dataset.field]=el.value;persist();return;}
 const i=incident();if(!i||i.closedAt)return;
 const key=el.dataset.field;
 if(key==='subject'||key==='location')i[key]=el.value;else i.fields[key]=el.value;
 persist();
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.matches('[data-obstacle]')&&editable()&&el.value){
   const key=el.dataset.obstacle,label=el.selectedOptions[0].textContent;
   log('obstacle',el.value,`${document.getElementById(key)?.querySelector('h3')?.textContent||key}：${label}`,{card:key});
 }
 if(el.id==='import-file'){
   const file=el.files?.[0];if(!file)return;
   if(file.size>20*1024*1024){message('20MB以下の記録ファイルを選んでください。');return;}
   try {importDraft=validateBackup(JSON.parse(await file.text()));render();}
   catch(e){message(`復元できません：${e.message}`);}
 }
});
document.addEventListener('toggle',event=>{
 const el=event.target;if(ignoreDetails||!el.matches('details'))return;
 if(el.dataset.homeDetail){homeOpen[el.dataset.homeDetail]=el.open;return;}
 const i=incident();if(i&&el.dataset.detail){i.open[el.dataset.detail]=el.open;persist();}
},true);
let scrollTimer;
window.addEventListener('scroll',()=>{
 clearTimeout(scrollTimer);
 scrollTimer=setTimeout(()=>{const i=incident();if(i){i.scroll=window.scrollY;persist();}},250);
},{passive:true});
window.addEventListener('pagehide',()=>{if(incident())incident().scroll=window.scrollY;persist();});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(incident())incident().scroll=window.scrollY;persist();}
 else if(incident()&&['analyzing','shock','resume'].includes(derive(incident()).aed)){
   restored.add(incident().id);render();
 }
});
window.addEventListener('storage',event=>{
 if(event.key===STORAGE_KEY){storageAvailable=false;saveError='別の画面で記録が更新されました。この画面の記録を書き出してから再読み込みしてください。';saveStatus='保存停止・競合あり';updateSaveLabel();}
});
window.addEventListener('offline',()=>render());
window.addEventListener('online',()=>render());
render(false);
if(storageAvailable)persist();
if(incident())requestAnimationFrame(()=>window.scrollTo(0,incident().scroll||0));
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(async()=>{
   const cache=await caches.open('action-os-shell-v1');
   offlineReady=!!(await cache.match(new URL('./app.js',location.href)));
   const status=$('#offline-status');if(status&&offlineReady)status.textContent='オフライン準備済み。この端末の同じブラウザーで、通信がなくても利用できます。';
   const foot=$('.footer');if(foot)foot.outerHTML=footer();
 }).catch(()=>{offlineReady=false;const status=$('#offline-status');if(status)status.textContent='オフラインの準備に失敗しました。オンラインで開き直してください。端末内の記録の保存状態は上部で確認できます。';});
}
