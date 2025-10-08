// ============================================================
// DIF JALISCO — ASISTENTE PUB 2025 (Chatbot + Validador Limpio)
// ============================================================

let fuse;
let baseConocimiento = [];

// Normalizar texto
function normaliza(str = "") {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Detectar columnas Pregunta/Respuesta
function detectarColumnas(headers) {
  const H = headers.map(h => normaliza(String(h || "")));
  let qIdx = H.findIndex(h => h.includes("pregunta"));
  let aIdx = H.findIndex(h => h.includes("respuesta"));
  if (qIdx === -1 && aIdx === -1 && headers.length >= 3) { qIdx = 1; aIdx = 2; }
  if (qIdx === -1) qIdx = 0;
  if (aIdx === -1) aIdx = 1;
  return { qIdx, aIdx };
}

// ==================== CARGA BASE DE CONOCIMIENTO ====================
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
        let respuesta = (row[aIdx] || "").toString().trim();

        // 🧹 Elimina “Catálogo”, “1 Catálogo”, “Cat.”, etc.
        respuesta = respuesta
          .replace(/\b\d*\s*cat[aá]logo\b:?/gi, "")
          .replace(/\bcat[aá]logo\b:?/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        if (pregunta && respuesta) {
          baseConocimiento.push({ pregunta, respuesta });
        }
      });
    }

    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.45,
      distance: 350,
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

async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) await cargarBaseDesdeExcel();
  const texto = normaliza(mensajeUsuario);
  let respuesta = "No encontré una coincidencia. Intenta otra palabra o revisa tu archivo.";

  const resultados = fuse.search(texto);
  if (resultados.length > 0) respuesta = resultados[0].item.respuesta;

  agregarMensajeHTML(`${respuesta}<br><button class='copy-btn' data-copy='${respuesta}'>Copiar respuesta</button>`);
}

// Eventos
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto.toUpperCase(), "user-message");
  responder(texto);
  userInput.value = "";
});

userInput.addEventListener("keypress", e => { if (e.key === "Enter") sendBtn.click(); });

clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML = '<div class="bot-message">🧹 Historial borrado. Puedes comenzar una nueva consulta.</div>';
});

document.addEventListener("click", e => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const txt = btn.getAttribute("data-copy");
  navigator.clipboard.writeText(txt);
  btn.textContent = "✅ Copiada";
  setTimeout(() => (btn.textContent = "Copiar respuesta"), 1500);
});

// ==================== VALIDADOR ====================
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML = `<p style="color:#b22;"><b>⚠️ Selecciona un archivo Excel.</b></p>`;
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
      if (!filas.length) throw new Error("Hoja vacía");

      const encabezados = (filas[0] || []).map(x => String(x || "").trim().toUpperCase());
      const esPersonas = encabezados.includes("CURP") && encabezados.includes("NOMBRE");
      const esActores = encabezados.includes("SA_ID_FAS") && encabezados.includes("CURP_ACTOR");

      if (esPersonas) {
        const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
        const faltantes = requeridos.filter(c => !encabezados.includes(c));
        validationResult.innerHTML =
          faltantes.length === 0
            ? `<p style="color:green;"><b>✅ Archivo válido (Personas).</b></p>`
            : `<p style="color:#b22;"><b>⚠️ Faltan campos:</b> ${faltantes.join(", ")}</p>`;
        return;
      }

      if (esActores) {
        const requeridos = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];
        const faltantes = requeridos.filter(c => !encabezados.includes(c));
        validationResult.innerHTML =
          faltantes.length === 0
            ? `<p style="color:green;"><b>✅ Archivo válido (Actores Sociales).</b></p>`
            : `<p style="color:#b22;"><b>⚠️ Faltan campos:</b> ${faltantes.join(", ")}</p>`;
        return;
      }

      validationResult.innerHTML = `<p style="color:#d18a00;"><b>⚠️ Tipo de archivo no reconocido.</b></p>`;
    } catch {
      validationResult.innerHTML = `<p style="color:#b22;">❌ Error al procesar el archivo.</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});
