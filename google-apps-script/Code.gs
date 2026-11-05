// Function Explorer — School Google Apps Script (first names are not authentication).
// Script properties required: SHEET_ID, REPORT_EMAIL.
const TZ='America/Los_Angeles', TAB='Mastery Results';
function settings(){return PropertiesService.getScriptProperties()}
function resultSheet(){
 const id=settings().getProperty('SHEET_ID'); if(!id)throw new Error('Missing SHEET_ID');
 const book=SpreadsheetApp.openById(id);let sh=book.getSheetByName(TAB);
 if(!sh){sh=book.insertSheet(TAB);sh.appendRow(['Received at','Pacific date','First name','Lab','Lab title','Score','Total','Percent','Concepts to review','Responses']);sh.setFrozenRows(1)}
 return sh;
}
function safe(v,n){const s=String(v==null?'':v).slice(0,n).replace(/[\u0000-\u001f]/g,' ');return /^[=+\-@]/.test(s)?' '+s:s}
function reply(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function doPost(e){
 const lock=LockService.getScriptLock();if(!lock.tryLock(5000))return reply({ok:false,error:'busy'});
 try{
  const raw=e&&e.postData&&e.postData.contents;if(!raw||raw.length>18000)return reply({ok:false,error:'size'});
  const d=JSON.parse(raw);
  if(d.schemaVersion!==1||![1,2,3,4].includes(d.lab)||typeof d.firstName!=='string'||!/^[\p{L}][\p{L} '\-]{0,31}$/u.test(d.firstName)||!Array.isArray(d.items)||d.items.length!==8)return reply({ok:false,error:'validation'});
  if(d.items.some(i=>typeof i.correct!=='boolean'||typeof i.skill!=='string'||typeof i.prompt!=='string'))return reply({ok:false,error:'items'});
  const score=d.items.filter(i=>i.correct).length;if(score!==d.score||d.total!==8)return reply({ok:false,error:'score'});
  const date=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd');
  const skills=d.items.filter(i=>!i.correct).map(i=>safe(i.skill,70)).join(', ');
  const details=d.items.map((i,n)=>String(n+1)+'. '+safe(i.prompt,350)+' | Response: '+safe(i.response,120)+' | Correct: '+safe(i.correctAnswer,120)+' | '+(i.correct?'correct':'incorrect')).join('\n');
  resultSheet().appendRow([new Date(),date,safe(d.firstName,32),d.lab,safe(d.labTitle,75),score,8,score/8,skills,details]);
  return reply({ok:true});
 }catch(err){console.error(err);return reply({ok:false,error:'internal'})}finally{lock.releaseLock()}
}
// Send ONE email per day summarizing the previous completed calendar day.
function dailySummary(){
 const email=settings().getProperty('REPORT_EMAIL');if(!email)throw new Error('Missing REPORT_EMAIL');
 const yesterday=new Date(Date.now()-24*60*60*1000);
 const date=Utilities.formatDate(yesterday,TZ,'yyyy-MM-dd');
 const sh=resultSheet();if(sh.getLastRow()<2)return;
 const rows=sh.getRange(2,1,sh.getLastRow()-1,10).getValues().filter(r=>r[1]===date);
 if(!rows.length)return;
 const msg=['Function Explorer mastery summary for '+date,'',String(rows.length)+' completed attempt(s)',''];
 rows.forEach(r=>msg.push(r[2]+' — Lab '+r[3]+' ('+r[4]+'): '+r[5]+'/'+r[6]+'; Review: '+(r[8]||'none')));
 msg.push('','For individual question responses, open your school-owned Google Sheet.','Student first names are self-reported.');
 MailApp.sendEmail(email,'Function Explorer daily mastery summary — '+date,msg.join('\n'));
}
function installDailySummary(){
 if(!settings().getProperty('REPORT_EMAIL')||!settings().getProperty('SHEET_ID'))throw new Error('Set REPORT_EMAIL and SHEET_ID first');
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='dailySummary').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('dailySummary').timeBased().everyDays(1).atHour(7).inTimezone(TZ).create();
}