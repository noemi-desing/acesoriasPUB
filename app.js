// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 Inteligente con Excel)
// ============================================================

let fuse;
let baseConocimiento = [];

// ---------- Utilidad: normalizar texto (acentos/espacios) ----------
function normaliza(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==================== CARGA BASES (2 fuentes internas) ====================
async function cargarBaseDesdeExcel() {
  try {
    const archivos = [
      "catalogos/INSTRUCTIVO_LLENADO_PUB.xlsx",        // Personas (no visible)
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"   // Actores Sociales (no visible)
    ];

    baseConocimiento = [];

    for (const archivo of archivos) {
      const response = await fetch(archivo);
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });

      if (!filas || !filas.length) continue;

      // Detectar columnas "Pregunta" y "Respuesta" por encabezado
      const headers = (filas[0] || []).map(h => normaliza(String(h || "")));
      let qIdx = headers.findIndex(h => h.includes("pregunta"));
      let aIdx = headers.findIndex(h => h.includes("respuesta"));

      // Fallback para formato [N°, Pregunta, Respuesta]
      if (qIdx === -1 && aIdx === -1 && (filas[0] || []).length >= 3) {
        qIdx = 1; aIdx = 2;
      }

      filas.slice(1).forEach(row => {
        const preguntaRaw = (row[qIdx] || "").toString();
        const respuestaRaw = (row[aIdx] || "").toString();
        const pregunta = normaliza(preguntaRaw);
        const respuesta = respuestaRaw.trim();
        if (pregunta && respuesta) {
          baseConocimiento.push({ pregunta, respuesta });
        }
      });
    }

    // Configuración flexible de Fuse.js
    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.45,
      distance: 300,
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

// Permite HTML (para negritas + botón copiar)
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

function botonCopiar(respuestaPlano) {
  const safe = respuestaPlano.replace(/"/g, "&quot;");
  return `<button class="copy-btn" data-copy="${safe}">Copiar respuesta</button>`;
}

async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) {
    await cargarBaseDesdeExcel();
  }

  const texto = normaliza(mensajeUsuario);
  let resultados = fuse.search(texto);

  let respuesta = "";
  if (resultados.length > 0) {
    respuesta = resultados[0].item.respuesta;
  } else {
    // Búsqueda por palabra clave (fallback)
    const tokens = texto.split(" ").filter(Boolean);
    const hit = baseConocimiento.find(item =>
      tokens.some(pal => item.pregunta.includes(pal))
    );
    respuesta = hit ? hit.respuesta : "No encontré una coincidencia. Intenta otra palabra o revisa los catálogos.";
  }

  const html = `${resaltarRespuesta(respuesta)}<br>${botonCopiar(respuesta)}`;
  agregarMensajeHTML(html);
}

// Eventos
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (texto === "") return;
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

// Copiar respuesta (delegación a document)
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".copy-btn");
  if (!btn) return;
  const txt = btn.getAttribute("data-copy") || "";
  navigator.clipboard.writeText(txt);
  btn.textContent = "¡Copiada!";
  setTimeout(() => (btn.textContent = "Copiar respuesta"), 1500);
});

// ==================== VALIDADOR DE ARCHIVOS ====================
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
      const primeraHoja = workbook.SheetNames[0];
      const hoja = workbook.Sheets[primeraHoja];
      const datos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

      const encabezados = (datos[0] || []).map(x => String(x || "").trim().toUpperCase());

      // Heurística de tipo de archivo
      const esPersonas = encabezados.includes("CURP") && encabezados.includes("NOMBRE");
      const esActores  = encabezados.includes("SA_ID_FAS") && encabezados.includes("CURP_ACTOR");

      if (esPersonas) {
        const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
        const faltantes = requeridos.filter((c) => !encabezados.includes(c));
        validationResult.innerHTML =
          faltantes.length === 0
            ? `<p style="color:green;"><b>✅ Archivo válido (Padrón de Personas).</b> Todos los campos requeridos están presentes.</p>`
            : `<p style="color:#b22;"><b>⚠️ Campos faltantes (Padrón de Personas):</b> ${faltantes.join(", ")}</p>`;
        return;
      }

      if (esActores) {
        const requeridosActores = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];
        const faltantesActores = requeridosActores.filter((c) => !encabezados.includes(c));
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
