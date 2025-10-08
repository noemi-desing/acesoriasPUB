// ===============================
// DIF Jalisco — Chatbot + Validador 2025
// ===============================

let fuse;
let baseConocimiento = [];

// Normalización básica para mejor match (acentos, mayúsculas, espacios)
function normaliza(str=""){
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

// Cargar 2 fuentes: Personas + Actores Sociales
async function cargarBaseDesdeExcel(){
  try{
    const fuentes = [
      "catalogos/INSTRUCTIVO_LLENADO_PUB.xlsx",       // Personas
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"  // Actores Sociales
    ];
    baseConocimiento = [];

    for(const url of fuentes){
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const wb  = XLSX.read(buf,{type:"array"});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(sheet,{header:1});

      // Esperamos: [Pregunta, Respuesta]
      rows.slice(1).forEach(r=>{
        const pregunta = normaliza(r[0]||"");
        const respuesta = (r[1]||"").toString();
        if(pregunta && respuesta){
          baseConocimiento.push({pregunta, respuesta});
        }
      });
    }

    fuse = new Fuse(baseConocimiento,{
      keys:["pregunta"],
      threshold:0.45,     // tolerante a errores
      distance:300,
      minMatchCharLength:2,
      ignoreLocation:true
    });
  }catch(e){
    console.error("Error cargando Excel:", e);
  }
}

// UI helpers
const chatbox = document.getElementById("chatbox-messages");
function addMsg(html, type="bot"){
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.innerHTML = html;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function resaltarRespuesta(txt){
  // Resalta "El campo ...", "corresponde a ...", "Ejemplo: ..."
  return txt
    .replace(/(El campo\s+[A-Z0-9_]+)/gi,"<b>$1</b>")
    .replace(/(corresponde a\s+[^;]+;?)/gi,"<b>$1</b>")
    .replace(/(Ejemplo:\s*[^<]+)/gi,"<b>$1</b>");
}

function botonCopiar(respuestaPlano){
  return `<button class="copy-btn" data-copy="${respuestaPlano.replace(/"/g,'&quot;')}">Copiar respuesta</button>`;
}

// CHATBOT
document.addEventListener("DOMContentLoaded", async ()=>{
  await cargarBaseDesdeExcel();

  const input = document.getElementById("userInput");
  const send  = document.getElementById("sendBtn");

  // Copiar respuesta (delegación)
  document.addEventListener("click",(e)=>{
    const btn = e.target.closest(".copy-btn");
    if(!btn) return;
    const text = btn.getAttribute("data-copy");
    navigator.clipboard.writeText(text||"");
    btn.textContent = "¡Copiada!";
    setTimeout(()=>btn.textContent="Copiar respuesta",1500);
  });

  send.addEventListener("click", ()=>{
    const raw = input.value.trim();
    if(!raw) return;

    const preguntaUser = normaliza(raw);
    addMsg(raw, "user");

    let respuesta = "";
    // 1) Fuzzy
    const resultados = fuse.search(preguntaUser);
    if(resultados.length>0){
      respuesta = resultados[0].item.respuesta;
    }else{
      // 2) Fallback por palabra clave
      const tokens = preguntaUser.split(" ").filter(Boolean);
      const hit = baseConocimiento.find(it =>
        tokens.some(t => it.pregunta.includes(t))
      );
      respuesta = hit ? hit.respuesta : "No encontré una coincidencia. Intenta con otra palabra o revisa los catálogos.";
    }

    const html = `${resaltarRespuesta(respuesta)}<br>${botonCopiar(respuesta)}`;
    addMsg(html,"bot");
    input.value = "";
  });
});

// ===============================
// VALIDADOR INTELIGENTE (Personas / Actores Sociales)
// ===============================
const validateBtn = document.getElementById("validateBtn");
validateBtn.addEventListener("click", async ()=>{
  const fileInput = document.getElementById("fileInput");
  const resultEl  = document.getElementById("validationResult");
  const file = fileInput.files[0];

  if(!file){
    resultEl.innerHTML = `<p style="color:#b22;">⚠️ Selecciona un archivo Excel.</p>`;
    return;
  }

  try{
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf,{type:"array"});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet,{header:1});
    if(rows.length===0){ throw new Error("Hoja vacía"); }

    // Encabezados normalizados
    const headers = (rows[0]||[]).map(v => normaliza((v||"").toString()).toUpperCase());

    // Heurística de tipo
    const esPersonas = headers.includes("CURP") && headers.includes("NOMBRE");
    const esActores  = headers.includes("SA_ID_FAS") && headers.includes("CURP_ACTOR");

    if(esPersonas){
      const requeridos = ["CURP","NOMBRE","SEXO","EDAD","OCUPACION"].map(normaliza).map(s=>s.toUpperCase());
      const faltantes = requeridos.filter(req => !headers.includes(req));
      resultEl.innerHTML = faltantes.length===0
        ? `<p style="color:green;"><b>✅ Archivo válido (Padrón de Personas).</b> Todos los campos requeridos están presentes.</p>`
        : `<p style="color:#b22;"><b>⚠️ Campos faltantes (Padrón de Personas):</b> ${faltantes.join(", ")}</p>`;
      return;
    }

    if(esActores){
      const reqAct = ["SA_ID_FAS","CURP_ACTOR","NOMBRE_ACTOR","SEXO","RFC_ACTOR"].map(normaliza).map(s=>s.toUpperCase());
      const faltantes = reqAct.filter(req => !headers.includes(req));
      resultEl.innerHTML = faltantes.length===0
        ? `<p style="color:green;"><b>✅ Archivo válido (Actores Sociales).</b> Todos los campos requeridos están presentes.</p>`
        : `<p style="color:#b22;"><b>⚠️ Campos faltantes (Actores Sociales):</b> ${faltantes.join(", ")}</p>`;
      return;
    }

    resultEl.innerHTML = `<p style="color:#d18a00;"><b>⚠️ No se pudo determinar el tipo de archivo.</b> Revisa encabezados o selecciona otra hoja.</p>`;
  }catch(e){
    console.error(e);
    document.getElementById("validationResult").innerHTML =
      `<p style="color:#b22;">❌ Error al procesar el archivo. Verifica que sea un .xlsx válido.</p>`;
  }
});
