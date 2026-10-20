import test from 'node:test';
import assert from 'node:assert/strict';
import {newIncident,addEvent,derive,currentAction,needsCpr,effectiveEvents,blankDb,saveDb,STORAGE_KEY,validateBackup,mergeBackup,ADULT_TEMPLATE} from '../dist/model.js';
const setup=()=>newIncident();
const event=(i,t,v)=>addEvent(i,t,v,`${t}:${v}`);
const arrest=()=>{const i=setup();event(i,'response','no');event(i,'breath','abnormal');return i;};
test('未回答は不明・正常ではない。時間の経過による状態遷移がない',()=>{
 const i=setup();i.startedAt='2000-01-01T00:00:00Z';
 const s=derive(i);assert.equal(s.response,null);assert.equal(s.breath,null);assert.equal(needsCpr(s),false);assert.match(currentAction(s).title,/安全と反応/);
});
test('反応ありは終了でも胸骨圧迫でもない',()=>{
 const i=setup();event(i,'response','yes');const s=derive(i);
 assert.equal(s.cpr,'observing');assert.equal(needsCpr(s),false);assert.equal(i.closedAt,null);assert.match(currentAction(s).title,/手当.*観察/);
});
test('反応なし・普段どおりの呼吸は観察。悪化時は圧迫へ',()=>{
 const i=setup();event(i,'response','no');event(i,'breath','normal');
 assert.equal(derive(i).cpr,'observing');assert.equal(needsCpr(derive(i)),false);
 event(i,'breath','abnormal');assert.equal(needsCpr(derive(i)),true);assert.match(currentAction(derive(i)).title,/胸骨圧迫/);
});
for(const response of ['no','unknown'])for(const breath of ['abnormal','unknown']){
 test(`反応 ${response}・呼吸 ${breath} で通報・搬送未入力でも圧迫が必要`,()=>{
  const i=setup();event(i,'response',response);event(i,'breath',breath);
  const s=derive(i);assert.equal(needsCpr(s),true);assert.equal(s.call,'none');assert.equal(s.transport,'none');
  event(i,'cpr','compressing');assert.equal(derive(i).cpr,'compressing');
 });
}
test('前段の記録なしで実施を記録しても観察を捏造しない',()=>{
 const i=setup();event(i,'cpr','compressing');
 assert.equal(derive(i).response,null);assert.equal(derive(i).breath,null);assert.equal(derive(i).cpr,'compressing');
});
test('AED到着・装着・使用を別々に記録',()=>{
 const i=arrest();event(i,'cpr','compressing');event(i,'transport','arrived');
 assert.equal(derive(i).actions.pads,undefined);assert.equal(derive(i).cpr,'compressing');
 event(i,'aed-power','on');event(i,'pads','attached');
 assert.equal(derive(i).actions.pads,true);assert.equal(derive(i).aed,'cpr');
});
test('解析・ショック時に圧迫の継続を現在の指示として表示しない',()=>{
 const i=arrest();event(i,'cpr','compressing');event(i,'analysis','analyzing');
 assert.equal(derive(i).cpr,'paused');assert.equal(currentAction(derive(i)).title,'全員離れる');
 event(i,'aed-instruction','shock');assert.equal(currentAction(derive(i)).title,'全員離れる');
 event(i,'shock','delivered');assert.match(currentAction(derive(i)).title,/直ちに胸骨圧迫から再開/);
 event(i,'cpr','compressing');assert.equal(currentAction(derive(i)).title,'胸骨圧迫を続ける');
});
test('ショック不要は終了や観察ではなく直ちに再開',()=>{
 const i=arrest();event(i,'analysis','analyzing');event(i,'aed-instruction','no-shock');
 assert.equal(derive(i).cpr,'resume');assert.match(currentAction(derive(i)).title,/再開/);assert.equal(i.closedAt,null);
});
test('再解析は搬送やパッド貼付へ戻さず繰り返し時刻を残す',()=>{
 const i=arrest();event(i,'transport','arrived');event(i,'pads','attached');
 for(let n=0;n<3;n++){event(i,'analysis','analyzing');event(i,'aed-instruction','no-shock');event(i,'cpr','compressing');}
 assert.equal(i.events.filter(e=>e.type==='analysis').length,3);assert.equal(derive(i).transport,'arrived');assert.equal(derive(i).actions.pads,true);
 assert.equal(new Set(i.events.map(e=>e.id)).size,i.events.length);assert.ok(i.events.every(e=>e.recordedAt&&e.occurredAt));
});
test('回復の兆候から再確認し、正常で観察・異常で圧迫へ',()=>{
 const i=arrest();event(i,'cpr','compressing');event(i,'recovery','signs');
 assert.equal(derive(i).recheck,true);assert.equal(derive(i).breath,null);assert.match(currentAction(derive(i)).title,/再確認/);
 event(i,'breath','normal');assert.equal(derive(i).cpr,'observing');
 event(i,'breath','unknown');assert.equal(needsCpr(derive(i)),true);
});
test('救急隊の到着と処置の引き継ぎは別',()=>{
 const i=arrest();event(i,'cpr','compressing');event(i,'arrival','arrived');
 assert.equal(derive(i).cpr,'compressing');assert.equal(derive(i).handed,false);
 event(i,'handover','handed');assert.equal(derive(i).handed,true);assert.equal(i.closedAt,null);
});
test('記録終了だけでは圧迫を停止しない',()=>{
 const i=arrest();event(i,'cpr','compressing');i.closedAt=new Date().toISOString();event(i,'close','continuing');
 assert.equal(derive(i).cpr,'compressing');assert.equal(derive(i).handed,false);
});
test('訂正は原本・記録時刻を保持し、観察結果を更新',()=>{
 const i=setup(),original=event(i,'breath','normal'),copy=structuredClone(original);
 addEvent(i,'correction','amend','訂正',{targetId:original.id,patch:{value:'unknown',label:'呼吸：わからない',occurredAt:'2026-10-20T01:00:00Z'},reason:'再確認'});
 assert.deepEqual(i.events[0],copy);assert.equal(derive(i).breath,'unknown');assert.equal(effectiveEvents(i)[0].occurredAt,'2026-10-20T01:00:00Z');
});
test('補記した過去のショックを現在のAED指示にしない',()=>{
 const i=arrest();event(i,'cpr','compressing');addEvent(i,'shock','historical','過去のショック',{historical:true,occurredAt:'2026-10-20T01:00:00Z'});
 assert.equal(derive(i).cpr,'compressing');assert.equal(derive(i).aed,'cpr');
});
for(const phase of ['analyzing','shock','resume']){
 test(`復帰時の過去の ${phase} を新しい機器指示として再表示しない`,()=>{
  const i=arrest();event(i,'analysis','analyzing');
  if(phase==='shock')event(i,'aed-instruction','shock');
  if(phase==='resume')event(i,'aed-instruction','no-shock');
  assert.match(currentAction(derive(i),true).title,/最新の音声を確認/);
 });
}
test('通報画面操作・訓練の通報は通報完了にならない',()=>{
 const i=setup();event(i,'phone-open','119');event(i,'practice-call','simulated');
 assert.equal(derive(i).call,'none');
});
test('正常扱いしない制約記録',()=>{
 const i=arrest();addEvent(i,'obstacle','unable','実施できない',{card:'cpr'});
 assert.equal(derive(i).obstacles.cpr,'unable');assert.equal(needsCpr(derive(i)),true);assert.equal(derive(i).cpr,'unable');assert.match(currentAction(derive(i)).title,/協力を求める/);
});
test('保存成功時だけ成功を返し、失敗した記録はメモリに保持',()=>{
 const db=blankDb();db.incidents.push(arrest());
 const fail={getItem:()=>null,setItem:()=>{throw Error('quota');}};
 const result=saveDb(fail,db,0);assert.equal(result.ok,false);assert.equal(db.incidents.length,1);
 let raw=null;const memory={getItem:()=>raw,setItem:(k,v)=>{assert.equal(k,STORAGE_KEY);raw=v;}};
 const saved=saveDb(memory,db,0);assert.equal(saved.ok,true);assert.deepEqual(validateBackup(JSON.parse(raw)).incidents,db.incidents);
 assert.equal(saveDb(memory,db,0).conflict,true);
});
test('複合事象・詳細展開・スクロール・時刻・テンプレートを復元',()=>{
 const db=blankDb(),i=arrest();db.incidents.push(i);i.open={response:true,call:true};i.scroll=678;i.branches.push({kind:'fire',scope:'同じ場所',template:{name:'火災',sources:[]}});
 const restored=validateBackup(JSON.parse(JSON.stringify(db)));
 assert.deepEqual(restored.incidents[0],i);assert.equal(i.template.id,ADULT_TEMPLATE.id);
});
test('別対象・衝突したIDを自動統合せず別コピーにする',()=>{
 const db=blankDb(),i=arrest();db.incidents.push(i);const incoming=structuredClone(db);incoming.incidents[0].subject='別の記録';
 const result=mergeBackup(db,incoming);
 assert.equal(result.db.incidents.length,2);assert.notEqual(result.db.incidents[0].id,result.db.incidents[1].id);
 assert.equal(result.db.incidents[0].subject,'');assert.equal(mergeBackup(db,db).skipped,1);
});
test('不正な復元ファイル・訂正パッチを拒否',()=>{
 assert.throws(()=>validateBackup({schema:99,incidents:[]}));
 const db=blankDb(),i=arrest();db.incidents.push(i);
 addEvent(i,'correction','amend','invalid',{targetId:i.events[0].id,patch:{type:'shock',occurredAt:new Date().toISOString()}});
 assert.throws(()=>validateBackup(db));
});
