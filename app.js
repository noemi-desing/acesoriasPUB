// ============================================================
// DIF JALISCO — ASISTENTE PUB (Chatbot + Validador Inteligente)
// (Manteniendo diseño original)
// ============================================================

let fuse;
let baseConocimiento = [];

// ---------- Utilidades ----------
function normaliza(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\sáéíóúñü./-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectarColumnas(headers) {
  const H = headers.map(h => normaliza(String(h || "")));
  let qIdx = H.findIndex(h => h.includes("pregunta"));
  let aIdx = H.findIndex(h => h.includes("respuesta"));
  if (qIdx === -1 && aIdx === -1 && headers.length >= 3) { qIdx = 1; aIdx = 2; }
  if (qIdx === -1) qIdx = 0;
  if (aIdx === -1) aIdx = 1;
  return { qIdx, aIdx };
}

// ---------- Carga de base (dos cuestionarios) ----------
async function cargarBaseDesdeExcel() {
  try {
    const archivos = [
      "catalogos/CUESTIONARIO_PUB_PERSONAS.xlsx",
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"
    ];

    baseConocimiento = [];

    for (const archivo of archivos) {
      const res = await fetch(archivo);
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!filas.length) continue;

      const { qIdx, aIdx } = detectarColumnas(filas[0]);

      filas.slice(1).forEach(row => {
        const pregunta = normaliza(row[qIdx] || "");
        let respuesta = (row[aIdx] || "").toString().trim();

        // Limpieza para no “publicitar” la palabra catálogo en respuestas
        respuesta = respuesta
          .replace(/\b\d*\s*cat[aá]logo\b:?/gi, "")
          .replace(/\bcat[aá]logo\b:?/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        if (pregunta && respuesta) baseConocimiento.push({ pregunta, respuesta });
      });
    }

    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.55,      // tolerancia a errores ortográficos
      distance: 600,
      ignoreLocation: true,
      includeScore: true
    });
  } catch (e) {
    console.error("Error cargando bases:", e);
  }
}

// ---------- CHATBOT ----------
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
  if (!fuse) await cargarBaseDesdeExcel();

  const texto = normaliza(mensajeUsuario);
  let respuesta = "No encontré una coincidencia. Intenta con otra palabra o frase.";

  // Búsqueda principal
  let resultados = fuse.search(texto);

  // Si no hay resultados, intentar por fragmentos (para frase mal escrita)
  if (!resultados.length) {
    const partes = texto.split(/\s+/).filter(Boolean);
    for (let size of [3, 2]) {
      for (let i = 0; i <= partes.length - size; i++) {
        const frag = partes.slice(i, i + size).join(" ");
        const r = fuse.search(frag);
        if (r.length) { resultados = r; break; }
      }
      if (resultados.length) break;
    }
  }

  if (resultados.length > 0) respuesta = resultados[0].item.respuesta;

  agregarMensajeHTML(`${respuesta}<br><button class='copy-btn' data-copy='${respuesta}'>Copiar respuesta</button>`);
}

sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto, "user-message");
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
  navigator.clipboard.writeText(btn.getAttribute("data-copy"));
  btn.textContent = "✅ Copiada";
  setTimeout(() => (btn.textContent = "Copiar respuesta"), 1500);
});

// ---------- VALIDADOR ----------
const fileInput        = document.getElementById("fileInput");
const validateBtn      = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

// Reglas básicas
const REGEX_CURP = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM]{1}(AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/i;
const VALORES_SEXO = new Set(["H","M","F"]);
const esEnteroPos  = v => /^\d+$/.test(String(v).trim());
const noVacio      = v => String(v ?? "").trim() !== "";

// Validadores por tipo
function validaPersonas(rowObj) {
  const errs = [];
  const curp = String(rowObj.CURP || rowObj.curp || "").toUpperCase();
  const nombre = rowObj.NOMBRE || rowObj.Nombre || rowObj.nombre;
  const sexo = String(rowObj.SEXO || rowObj.sexo || "").toUpperCase();
  const edad = rowObj.EDAD ?? rowObj.edad;
  const ocup = rowObj.OCUPACION ?? rowObj.ocupacion;

  if (!noVacio(curp)) errs.push(["CURP", "Campo requerido"]);
  else if (!REGEX_CURP.test(curp)) errs.push(["CURP", "CURP con formato inválido"]);

  if (!noVacio(nombre)) errs.push(["NOMBRE", "Campo requerido"]);

  if (!noVacio(sexo)) errs.push(["SEXO", "Campo requerido"]);
  else if (!VALORES_SEXO.has(sexo)) errs.push(["SEXO", "Valor no válido (usa H/M/F)"]);

  if (!noVacio(edad)) errs.push(["EDAD", "Campo requerido"]);
  else if (!esEnteroPos(edad)) errs.push(["EDAD", "Debe ser número entero"]);
  else if (Number(edad) < 0 || Number(edad) > 120) errs.push(["EDAD", "Rango inválido (0-120)"]);

  if (!noVacio(ocup)) errs.push(["OCUPACION", "Campo requerido"]);

  return errs;
}

function validaActores(rowObj) {
  const errs = [];
  const idfas = rowObj.SA_ID_FAS ?? rowObj["SA_ID_FAS"];
  const curpA = String(rowObj.CURP_ACTOR || "").toUpperCase();
  const nomA  = rowObj.NOMBRE_ACTOR ?? rowObj["NOMBRE_ACTOR"];
  const sexo  = String(rowObj.SEXO || "").toUpperCase();
  const rfc   = String(rowObj.RFC_ACTOR || "").toUpperCase();

  if (!noVacio(idfas)) errs.push(["SA_ID_FAS", "Campo requerido"]);
  if (!noVacio(curpA)) errs.push(["CURP_ACTOR", "Campo requerido"]);
  else if (!REGEX_CURP.test(curpA)) errs.push(["CURP_ACTOR", "CURP con formato inválido"]);

  if (!noVacio(nomA)) errs.push(["NOMBRE_ACTOR", "Campo requerido"]);

  if (!noVacio(sexo)) errs.push(["SEXO", "Campo requerido"]);
  else if (!VALORES_SEXO.has(sexo)) errs.push(["SEXO", "Valor no válido (usa H/M/F)"]);

  if (!noVacio(rfc)) errs.push(["RFC_ACTOR", "Campo requerido"]);
  return errs;
}

// Helpers AOA
function sheetToAOA(sheet) { return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }); }
function AOAtoSheet(aoa)    { return XLSX.utils.aoa_to_sheet(aoa); }

// Render dinámico del previo sin tocar el HTML original
function renderPreview(containerParent, aoa, erroresPorCelda) {
  // Crear contenedor si no existe
  let preview = containerParent.querySelector(".grid-preview");
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "grid-preview";
    containerParent.appendChild(preview);
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const trh = document.createElement("tr");
  aoa[0].forEach(h => {
    const th = document.createElement("th");
    th.textContent = String(h || "");
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  for (let r = 1; r < aoa.length; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < aoa[0].length; c++) {
      const td = document.createElement("td");
      const val = aoa[r][c];
      td.textContent = val === undefined || val === null ? "" : String(val);
      const key = `${r}-${c}`;
      if (erroresPorCelda.has(key)) {
        td.classList.add("cell-error");
        td.setAttribute("data-comment", erroresPorCelda.get(key));
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  preview.innerHTML = "";
  preview.appendChild(table);
}

// Descargar archivo con hoja ERRORES (sin cambiar tu HTML)
function prepararDescargaConErrores(containerParent, aoaOriginal, errores, nombreBase = "VALIDACION_PUB") {
  let btn = containerParent.querySelector(".download-fixed-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "download-fixed-btn";
    btn.textContent = "Descargar Excel con hoja de errores";
    containerParent.appendChild(btn);
  }

  btn.onclick = () => {
    const wb = XLSX.utils.book_new();
    // Hoja original (sin estilos)
    const wsData = AOAtoSheet(aoaOriginal);
    XLSX.utils.book_append_sheet(wb, wsData, "ORIGINAL");

    // Hoja ERRORES
    const hojaErrores = [["FILA", "COLUMNA", "VALOR", "COMENTARIO"]];
    for (const err of errores) {
      hojaErrores.push([err.fila, err.columna, err.valor, err.comentario]);
    }
    const wsErr = AOAtoSheet(hojaErrores);
    XLSX.utils.book_append_sheet(wb, wsErr, "ERRORES");

    XLSX.writeFile(wb, `${nombreBase}.xlsx`);
  };
}

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML = `<p style="color:#b22;"><b>⚠️ Selecciona un archivo Excel.</b></p>`;
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const hoja = workbook.Sheets[sheetName];
      const aoa = sheetToAOA(hoja);
      if (!aoa.length) throw new Error("Hoja vacía");

      const headers = (aoa[0] || []).map(x => String(x || "").trim().toUpperCase());
      const esPersonas = headers.includes("CURP") && headers.includes("NOMBRE");
      const esActores  = headers.includes("SA_ID_FAS") && headers.includes("CURP_ACTOR");

      const errores = [];                // Para hoja ERRORES
      const mapaErrores = new Map();     // Para celdas rojas
      const idxCol = {};                 // Map nombre-> índice
      headers.forEach((h, i) => idxCol[h] = i);

      if (!esPersonas && !esActores) {
        validationResult.innerHTML = `<p style="color:#d18a00;"><b>⚠️ Tipo de archivo no reconocido.</b></p>`;
        return;
      }

      // Requeridos por tipo
      let requeridos = [];
      if (esPersonas) requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
      if (esActores)  requeridos = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];

      const faltan = requeridos.filter(c => !(c in idxCol));
      if (faltan.length) {
        validationResult.innerHTML = `<p style="color:#b22;"><b>⚠️ Faltan columnas:</b> ${faltan.join(", ")}</p>`;
        return;
      }

      // Índice para duplicados de CURP
      const colCURP = esPersonas ? idxCol["CURP"] : idxCol["CURP_ACTOR"];
      const seenCURP = new Map();

      // Validación fila a fila
      for (let r = 1; r < aoa.length; r++) {
        const rowObj = {};
        headers.forEach((h, c) => (rowObj[h] = aoa[r][c]));

        const errsFila = esPersonas ? validaPersonas(rowObj) : validaActores(rowObj);
        for (const [colName, comentario] of errsFila) {
          if (!(colName in idxCol)) continue;
          const c = idxCol[colName];
          const key = `${r}-${c}`;
          mapaErrores.set(key, comentario);
          errores.push({ fila: r + 1, columna: colName, valor: aoa[r][c], comentario });
        }

        // Duplicados CURP (sugerencia de eliminación)
        const curpVal = String(aoa[r][colCURP] || "").toUpperCase().trim();
        if (curpVal) {
          if (seenCURP.has(curpVal)) {
            const c = colCURP;
            const key = `${r}-${c}`;
            const msg = "CURP duplicada. Sugerencia: eliminar duplicado.";
            mapaErrores.set(key, msg);
            errores.push({
              fila: r + 1,
              columna: esPersonas ? "CURP" : "CURP_ACTOR",
              valor: curpVal,
              comentario: "Sugerencia de eliminación por duplicado"
            });
          } else {
            seenCURP.set(curpVal, r);
          }
        }
      }

      // Render previo (bajo #validationResult, sin tocar tu layout)
      const parent = validationResult.parentElement; // .validator-box
      renderPreview(parent, aoa, mapaErrores);

      // Resumen
      const totalErrores = errores.length;
      validationResult.innerHTML = totalErrores === 0
        ? `<p style="color:green;"><b>✅ Sin errores.</b> El archivo cumple con las reglas básicas.</p>`
        : `<p style="color:#b22;"><b>⚠️ ${totalErrores} observación(es) detectadas.</b> Revisa las celdas marcadas en rojo (pasa el cursor para ver la sugerencia).</p>`;

      // Botón de descarga (creado dinámicamente)
      const nombreSalida = (esPersonas ? "PERSONAS" : "ACTORES") + "_VALIDADO";
      prepararDescargaConErrores(parent, aoa, errores, nombreSalida);

    } catch (err) {
      console.error(err);
      validationResult.innerHTML = `<p style="color:#b22;">❌ Error al procesar el archivo.</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});

