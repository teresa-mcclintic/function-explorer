/* Function Explorer: session first-name entry and optional mastery reporting.
   Public JavaScript cannot hold secrets. Enter an approved endpoint only after setup. */
(function(){
'use strict';
const SETTINGS={endpoint:'https://script.google.com/macros/s/AKfycbwOuiyp99anDsmcYzAcgWeiQ3UsoiodUC_QwVQdfFInzs_ngnoVPDgnSJP_cAGu7vN7AQ/exec',version:'v1'};
const KEY='fx.firstName';
const style = document.createElement('style');
style.textContent = '.fx-chip{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin:8px 0 14px;font:13px Arial,sans-serif;color:#435b6b}.fx-chip button{background:#fff;border:1px solid #bccfd9;padding:7px 10px;border-radius:8px;cursor:pointer;color:#17465d}.fx-layer{position:fixed;inset:0;z-index:99999;background:#172d40b8;display:flex;align-items:center;justify-content:center;padding:18px;font:16px Arial,sans-serif}.fx-layer[hidden]{display:none}.fx-modal{background:#fff;color:#173042;max-width:430px;width:100%;padding:26px;border-radius:14px;box-shadow:0 16px 50px #0005}.fx-modal h2{margin:0 0 9px;font:700 24px Arial,sans-serif}.fx-modal label{display:block;font-weight:700;margin:14px 0 6px}.fx-modal input{font:16px Arial,sans-serif;width:100%;padding:11px;border:1px solid #b3c8d3;border-radius:8px}.fx-modal button{background:#087a83;color:white;font:700 16px Arial,sans-serif;border:0;padding:12px;border-radius:9px;width:100%;margin-top:14px;cursor:pointer}.fx-modal p{font:14px/1.5 Arial,sans-serif;color:#52697b}.fx-notice{font:13px/1.5 Arial,sans-serif;color:#52697b;margin:10px 0}.fx-notice strong{color:#174a61}';
document.head.appendChild(style);
function cleanName(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,32)}
function validName(s){return /^[\p{L}][\p{L} '-]{0,31}$/u.test(s)}
function currentName(){try{return sessionStorage.getItem(KEY)||''}catch(e){return ''}}
function remember(n){try{sessionStorage.setItem(KEY,n)}catch(e){}}
function clearName(){try{sessionStorage.removeItem(KEY)}catch(e){}}
const chip=document.createElement('div');chip.className='fx-chip';
const who=document.createElement('span');const change=document.createElement('button');
change.type='button';change.textContent='Change student';chip.append(who,change);
const anchor=document.querySelector('nav')||document.querySelector('header');
if(anchor)anchor.parentNode.insertBefore(chip,anchor.nextSibling);
else document.body.insertBefore(chip,document.body.firstChild);
const layer=document.createElement('div');layer.className='fx-layer';layer.hidden=true;
layer.innerHTML='<div class="fx-modal" role="dialog" aria-modal="true" aria-labelledby="fx-title"><h2 id="fx-title">Welcome to Function Explorer</h2><p>Enter your first name before beginning. This is a name label, not a password-protected login.</p><form id="fx-signform"><label for="fx-first">First name</label><input id="fx-first" type="text" maxlength="32" autocomplete="off" required placeholder="First name"><p id="fx-error" role="alert" style="color:#a23d2d"></p><button type="submit">Start learning</button></form><p>Use only your first name. Please do not enter a last name or other personal information.</p></div>';
document.body.appendChild(layer);
const field=layer.querySelector('#fx-first'),error=layer.querySelector('#fx-error');
function updateChip(){who.textContent=currentName()?'Student: '+currentName():'Student not entered';change.textContent=currentName()?'Change student':'Enter first name'}
function openSignIn(){error.textContent='';field.value='';layer.hidden=false;field.focus()}
function closeSignIn(){layer.hidden=true;updateChip()}
change.onclick=()=>{clearName();updateChip();openSignIn()};
layer.querySelector('form').addEventListener('submit',e=>{
 e.preventDefault();const name=cleanName(field.value);
 if(!validName(name)){error.textContent='Please enter a first name (letters, spaces, hyphens or apostrophes only).';return}
 remember(name);closeSignIn();
});
updateChip();
if(!currentName())openSignIn();
const labMatch=location.pathname.match(/lab(\d+)\.html$/i);
if(!labMatch)return;
const id=Number(labMatch[1]);
const labNames={1:'Function Basics',2:'Is It a Function?',3:'Domain and Range'};
const resultsEl=document.querySelector('#mresults');
if(!resultsEl)return;
const notice=document.createElement('div');notice.className='fx-notice';notice.setAttribute('role','status');
resultsEl.appendChild(notice);
function securePayload(questions,answers){
 return questions.map((q,i)=>({
  skill:String(q.skill||q.topic||q.typ||'Functions').slice(0,70),
  prompt:String(q.prompt||q.q||'').slice(0,350),
  response:String(answers[i]??'').slice(0,120),
  correctAnswer:String(q.correctAnswer??'').slice(0,120),
  correct:Boolean(q.correct)
 }));
}
function reportMastery(payload){
 const name=currentName();
 if(!name){notice.textContent='Enter your first name before submitting results.';openSignIn();return}
 if(!SETTINGS.endpoint){notice.innerHTML='<strong>Results are not yet being sent.</strong> Your teacher still needs to connect the approved Google Sheets reporting system.';return}
 const body={schemaVersion:1,lab:id,labTitle:labNames[id],firstName:name,completedAt:new Date().toISOString(),score:payload.filter(q=>q.correct).length,total:payload.length,items:securePayload(payload.map(q=>({skill:q.skill,prompt:q.prompt,correctAnswer:q.correctAnswer,correct:q.correct})),payload.map(q=>q.response))};
 if(body.total!==8){notice.textContent='This attempt did not contain eight answers, so it was not submitted.';return}
 // Apps Script web apps typically do not provide cross-origin response headers.
 // A no-cors POST delivers the request, but the browser cannot verify receipt.
 notice.textContent='Sending results to the school reporting service…';
 fetch(SETTINGS.endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),keepalive:true})
 .then(()=>{notice.textContent='Results submission attempted. Delivery cannot be verified here; check with your teacher if needed.'})
 .catch(()=>{notice.textContent='Could not send results. Please tell your teacher and keep this score visible.'});
}
window.FunctionExplorerReporting={submit:reportMastery,studentName:currentName};
})();