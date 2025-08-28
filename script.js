// Utils
const $ = (s)=>document.querySelector(s);
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
function normalize(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function score(q, t){ const qs=normalize(q).split(/\s+/).filter(Boolean); const tt=normalize(t||""); let s=0; for(const w of qs){ if(tt.includes(w)) s++; if(tt.includes(" "+w+" ")) s++; } return s; }
async function getJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error(url+" "+r.status); return r.json(); }

// Tabs
const tabChat=$("#tab-chat"), tabCats=$("#tab-catalogs");
const chatView=$("#chat-view"), catsView=$("#catalogs-view");
tabChat.addEventListener("click",()=>{tabChat.classList.add("active");tabCats.classList.remove("active");chatView.style.display="block";catsView.style.display="none";});
tabCats.addEventListener("click",()=>{tabCats.classList.add("active");tabChat.classList.remove("active");catsView.style.display="block";chatView.style.display="none";});

// Chatbot
const chatLog=$("#chat-log"), input=$("#user-input"), btn=$("#consultar-btn");
let FAQS=[];
getJSON("faqs.json").then(d=>{ FAQS=d.faqs||[]; }).catch(()=> addBubble("No pude cargar <code>faqs.json</code> en la raíz.","assistant"));
function addBubble(html, who="assistant", cite=""){ const b=document.createElement("div"); b.className="bubble "+who; b.innerHTML=html; if(cite){const c=document.createElement("div"); c.className="cite"; c.innerHTML=cite; b.appendChild(c);} chatLog.appendChild(b); chatLog.scrollTop=chatLog.scrollHeight; }
async function handleAsk(){ const q=input.value.trim(); if(!q) return; addBubble(q,"user"); input.value=""; await sleep(40); let best=null, bs=-1; for(const it of FAQS){ const s=score(q,(it.question||"")+" "+(it.answer||"")+" "+(it.category||"")); if(s>bs){bs=s; best=it;} } if(!best||bs<=0){ addBubble("No encontré una coincidencia clara. Intenta con otras palabras clave.","assistant"); return;} const head=best.category?`<strong>${best.category}</strong><br>`:""; const cite=best.source?`Fuente: <em>${best.source}</em>.`:""; addBubble(`${head}${best.answer}`,"assistant",cite); }
btn.addEventListener("click",handleAsk); input.addEventListener("keydown",(e)=>{ if(e.key==="Enter") handleAsk(); });

// Catálogos
const buttonsWrap=$("#catalog-buttons"), output=$("#catalog-output"); let INDEX=[];
getJSON("catalog_index.json").then(d=>{ INDEX=(d.catalogs||[]).slice(0,16); renderButtons(); }).catch(()=> addBubble("No pude cargar <code>catalog_index.json</code> en la raíz.","assistant"));
function renderButtons(){ buttonsWrap.innerHTML=""; INDEX.forEach(c=>{ const b=document.createElement("button"); b.textContent=c.name||c.slug; b.addEventListener("click",()=>openCatalog(c)); buttonsWrap.appendChild(b); }); }
async function openCatalog(cat){ output.innerHTML="Cargando catálogo…"; try{ const json = (cat.json||"").replace(/^data\/catalogs\//,""); const csv  = (cat.csv ||"").replace(/^data\/catalogs\//,""); const data = await getJSON(json); const keys = data.length?Object.keys(data[0]):[]; let html='<div class="table-wrap"><table><thead><tr>'; keys.forEach(k=> html+=`<th>${k}</th>`); html+='</tr></thead><tbody>'; data.forEach(r=>{ html+='<tr>'; keys.forEach(k=> html+=`<td>${r[k]??""}</td>`); html+='</tr>'; }); html+='</tbody></table></div>'; html += `<p><a download href="${csv||json.replace(/\.json$/,'.csv')}">⬇️ Descargar CSV</a> &nbsp; <a download href="${json}">⬇️ Descargar JSON</a></p>`; html += `<p class="cite">Fuente: <em>${cat.source||"Documento de catálogos"}</em>.</p>`; output.innerHTML = html; }catch(e){ output.innerHTML = `<p style="color:#b91c1c">No pude abrir el catálogo <strong>${cat.name||cat.slug}</strong>. Verifica que existan los archivos JSON/CSV en la raíz.</p>`; } }
