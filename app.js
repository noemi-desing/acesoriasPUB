// ============================================================
// DIF JALISCO — ASISTENTE PUB (2025) Chatbot + Validador Inteligente
// ============================================================

let fuse;
let baseConocimiento = [];

// ---------- Utilidad: normalizar texto ----------
function normaliza(str = "") {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Detectar columnas de Pregunta/Respuesta ----------
function detectarColumnas(headers) {
  const H = headers.map(h => normaliza(String(h || "")));
  let qIdx = H.findIndex(h => h.includes("pregunta"));
  let aIdx = H.findIndex(h => h.includes("respuesta"));
  if (qIdx === -1 && aIdx === -1 && headers.length >= 3) { qIdx = 1; aIdx = 2; }
  if (qIdx === -1) qIdx = 0;
  if (aIdx === -1) aIdx = 1;
  return { qIdx, aIdx };
}

// ==================== CARGA DE BASE DE CONOCIMIENTO ====================
async function cargarBaseDesdeExcel() {
  try {
    const archivos = [
      "catalogos/CUESTIONARIO_PUB_PERSONAS.xlsx",
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"
    ];

    baseConocimiento = [];

    for (const archivo of archivos) {
      const response = await fetch(archivo);
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
      if (!filas || !filas.length) continue;

      const { qIdx, aIdx } = detectarColumnas(filas[0]);
      filas.slice(1).forEach(row => {
        const pregunta = normaliza(row[qIdx] || "");
        const respuesta = (row[aIdx] || "").toString().trim();
        if (pregunta && respuesta) baseConocimiento.push({ pregunta, respuesta });
      });
    }

    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.45,
      distance: 300,
      minMatchCharLength: 2,
      ignoreLocation: true
    });

  } catch (error) {
    console.error("❌ Error al cargar las bases:", error);
  }
}

// ==================== CHATBOT ====================
const chatOutput = document.getElementById("chatOutput");
const userInput  = document.getElementById("userInput");
const sendBtn    = document.getElementById("sendBtn");
const clearBtn   = document.getElementById("clearChat");

function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.classList.add(clase);
  div.textContent = texto;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function agregarMensajeHTML(html) {
  const div = document.createElement("div");
  div.classList.add("bot-message");
  div.innerHTML = html;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function resaltarRespuesta(txt) {
  return txt
    .replace(/(El campo\s+[A-Z0-9_]+)/gi, "<b>$1</b>")
    .replace(/(corresponde a\s+[^;]+;?)/gi, "<b>$1</b>")
    .replace(/(Ejemplo:\s*[^<]+)/gi, "<b>$1</b>");
}

function botonCopiar(texto) {
  const safe = texto.replace(/"/g, "&quot;");
  return `<button class="copy-btn" data-copy="${safe}">📋 Copiar respuesta</button>`;
}

async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) await cargarBaseDesdeExcel();

  const texto = normaliza(mensajeUsuario);
  let respuesta = "No encontré una coincidencia. Intenta otra palabra o revisa los catálogos.";

  const resultados = fuse.search(texto);
  if (resultados.length > 0) respuesta = resultados[0].item.respuesta;
  else {
    const tokens = texto.split(" ").filter(Boolean);
    const match = baseConocimiento.find(it => tokens.some(t => it.pregunta.includes(t)));
    if (match) respuesta = match.respuesta;
  }

  const html = `${resaltarRespuesta(respuesta)}<br>${botonCopiar(respuesta)}`;
  agregarMensajeHTML(html);
}

// EVENTOS CHATBOT
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto.toUpperCase(), "user-message");
  responder(texto);
  userInput.value = "";
});

userInput.addEventListener("keypress", e => { if (e.key === "Enter") sendBtn.click(); });
clearBtn.addEventListener("click", () => chatOutput.innerHTML = '<div class="bot-message">🧹 Historial borrado. Comienza de nuevo.</div>');

document.addEventListener("click", ev => {
  const btn = ev.target.closest(".copy-btn");
  if (!btn) return;
  const txt = btn.getAttribute("data-copy");
  navigator.clipboard.writeText(txt);
  btn.textContent = "✅ Copiada";
  setTimeout(() => btn.textContent = "📋 Copiar respuesta", 1500);
});

// ==================== VALIDADOR ====================
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML = `<p class="alert-error">⚠️ Selecciona un archivo Excel válido.</p>`;
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
      if (!filas || !filas.length) throw new Error("Hoja vacía");

      const encabezados = (filas[0] || []).map(x => String(x || "").trim().toUpperCase());
      const esPersonas = encabezados.includes("CURP") && encabezados.includes("NOMBRE");
      const esActores = encabezados.includes("SA_ID_FAS") && encabezados.includes("CURP_ACTOR");

      if (esPersonas) {
        const req = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
        const faltan = req.filter(c => !encabezados.includes(c));
        validationResult.innerHTML = faltan.length === 0
          ? `<p class="alert-success">✅ Archivo válido (Padrón de Personas).</p>`
          : `<p class="alert-error">⚠️ Faltan campos: ${faltan.join(", ")}</p>`;
        return;
      }

      if (esActores) {
        const req = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];
        const faltan = req.filter(c => !encabezados.includes(c));
        validationResult.innerHTML = faltan.length === 0
          ? `<p class="alert-success">✅ Archivo válido (Actores Sociales).</p>`
          : `<p class="alert-error">⚠️ Faltan campos: ${faltan.join(", ")}</p>`;
        return;
      }

      validationResult.innerHTML = `<p class="alert-warning">⚠️ Tipo de archivo no reconocido.</p>`;
    } catch (err) {
      validationResult.innerHTML = `<p class="alert-error">❌ Error al procesar el archivo.</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});
