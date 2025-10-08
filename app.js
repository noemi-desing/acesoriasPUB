// ============================================================
// DIF JALISCO — ASISTENTE PUB (2025) Chatbot + Validador
// ============================================================

let fuse;
let baseConocimiento = [];

// ---------- Utilidad: normalizar texto ----------
function normaliza(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Detectar columnas de Pregunta/Respuesta ----------
function detectarColumnas(headers) {
  const H = headers.map(h => normaliza(String(h || "")));
  // Búsqueda explícita
  let qIdx = H.findIndex(h => h.includes("pregunta"));
  let aIdx = H.findIndex(h => h.includes("respuesta"));
  // Fallback más común: [N°, Pregunta, Respuesta]
  if (qIdx === -1 && aIdx === -1 && headers.length >= 3) {
    qIdx = 1; aIdx = 2;
  }
  // Fallback genérico: primeras dos columnas con texto
  if (qIdx === -1) qIdx = 0;
  if (aIdx === -1) aIdx = 1;
  return { qIdx, aIdx };
}

// ==================== CARGA BASES (2 fuentes internas) ====================
async function cargarBaseDesdeExcel() {
  try {
    const archivos = [
      "catalogos/INSTRUCTIVO_LLENADO_PUB.xlsx",        // Personas (fuente interna)
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"   // Actores Sociales (fuente interna)
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
        const preg = (row[qIdx] || "").toString();
        const resp = (row[aIdx] || "").toString();
        const pregunta = normaliza(preg);
        const respuesta = resp.trim();
        if (pregunta && respuesta) {
          baseConocimiento.push({ pregunta, respuesta });
        }
      });
    }

    // Configuración flexible de Fuse.js (tolerante a errores y frases incompletas)
    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.45,
      distance: 350,
      minMatchCharLength: 2,
      ignoreLocation: true
    });

  } catch (error) {
    console.error("❌ Error al cargar las bases Excel:", error);
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

// Permitir HTML (negritas y botón copiar)
function agregarMensajeHTML(html) {
  const div = document.createElement("div");
  div.classList.add("bot-message");
  div.innerHTML = html;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

function resaltarRespuesta(txt) {
  // Resalta partes clave sin alterar tu frase tipo
  return txt
    .replace(/(El campo\s+[A-Z0-9_]+)/gi, "<b>$1</b>")
    .replace(/(corresponde a\s+[^;]+;?)/gi, "<b>$1</b>")
    .replace(/(Ejemplo:\s*[^<]+)/gi, "<b>$1</b>");
}

function botonCopiar(respuestaPlano) {
  const safe = respuestaPlano.replace(/"/g, "&quot;");
  return `<button class="copy-btn" data-copy="${safe}">Copiar respuesta</button>`;
}

async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) {
    await cargarBaseDesdeExcel();
  }

  const texto = normaliza(mensajeUsuario);
  let respuesta = "";

  // 1) Fuzzy
  const resultados = fuse.search(texto);
  if (resultados.length > 0) {
    respuesta = resultados[0].item.respuesta;
  } else {
    // 2) Fallback por palabra clave (tokens)
    const tokens = texto.split(" ").filter(Boolean);
    const hit = baseConocimiento.find(it =>
      tokens.some(t => it.pregunta.includes(t))
    );
    respuesta = hit ? hit.respuesta :
      "No encontré una coincidencia. Intenta otra palabra o revisa los catálogos.";
  }

  const html = `${resaltarRespuesta(respuesta)}<br>${botonCopiar(respuesta)}`;
  agregarMensajeHTML(html);
}

// Eventos del chat
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto.toUpperCase(), "user-message");
  responder(texto);
  userInput.value = "";
});

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML = '<div class="bot-message">🧹 Historial borrado. Puedes comenzar una nueva consulta.</div>';
});

// Copiar respuesta (delegación)
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".copy-btn");
  if (!btn) return;
  const txt = btn.getAttribute("data-copy") || "";
  navigator.clipboard.writeText(txt);
  btn.textContent = "¡Copiada!";
  setTimeout(() => (btn.textContent = "Copiar respuesta"), 1200);
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
      if (!filas || !filas.length) throw new Error("Hoja vacía");

      const encabezados = (filas[0] || []).map(x => String(x || "").trim().toUpperCase());

      // Heurística de tipo de archivo
      const esPersonas = encabezados.includes("CURP") && encabezados.includes("NOMBRE");
      const esActores  = encabezados.includes("SA_ID_FAS") && encabezados.includes("CURP_ACTOR");

      if (esPersonas) {
        const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
        const faltantes = requeridos.filter(c => !encabezados.includes(c));
        validationResult.innerHTML =
          faltantes.length === 0
            ? `<p style="color:green;"><b>✅ Archivo válido (Padrón de Personas).</b> Todos los campos requeridos están presentes.</p>`
            : `<p style="color:#b22;"><b>⚠️ Campos faltantes (Padrón de Personas):</b> ${faltantes.join(", ")}</p>`;
        return;
      }

      if (esActores) {
        const requeridosActores = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];
        const faltantesActores = requeridosActores.filter(c => !encabezados.includes(c));
        validationResult.innerHTML =
          faltantesActores.length === 0
            ? `<p style="color:green;"><b>✅ Archivo válido (Actores Sociales).</b> Todos los campos requeridos están presentes.</p>`
            : `<p style="color:#b22;"><b>⚠️ Campos faltantes (Actores Sociales):</b> ${faltantesActores.join(", ")}</p>`;
        return;
      }

      validationResult.innerHTML = `<p style="color:#d18a00;"><b>⚠️ No se pudo determinar el tipo de archivo.</b> Verifica los encabezados.</p>`;
    } catch (err) {
      console.error(err);
      validationResult.innerHTML = `<p style="color:#b22;">❌ Error al procesar el archivo. Asegúrate de subir un Excel válido.</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});
