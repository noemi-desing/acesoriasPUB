let fuse;
let baseConocimiento = [];

function normaliza(str = "") {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\sáéíóúñü./-]/gi, " ")
    .trim();
}

async function cargarBaseDesdeExcel() {
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

    if (filas.length > 1) {
      const headers = filas[0].map(h => normaliza(h));
      const qIdx = headers.findIndex(h => h.includes("pregunta")) || 0;
      const aIdx = headers.findIndex(h => h.includes("respuesta")) || 1;

      filas.slice(1).forEach(row => {
        const pregunta = normaliza(row[qIdx] || "");
        const respuesta = String(row[aIdx] || "").trim();
        if (pregunta && respuesta) baseConocimiento.push({ pregunta, respuesta });
      });
    }
  }

  fuse = new Fuse(baseConocimiento, {
    keys: ["pregunta"],
    threshold: 0.55,
    distance: 600,
    ignoreLocation: true
  });
}

// CHATBOT
const chatOutput = document.getElementById("chatOutput");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.classList.add(clase);
  div.textContent = texto;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

async function responder(mensajeUsuario) {
  if (!fuse) await cargarBaseDesdeExcel();

  const texto = normaliza(mensajeUsuario);
  let respuesta = "No encontré información relacionada.";

  const resultados = fuse.search(texto);
  if (resultados.length > 0) respuesta = resultados[0].item.respuesta;

  const div = document.createElement("div");
  div.classList.add("bot-message");
  div.innerHTML = `${respuesta}`;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto, "user-message");
  responder(texto);
  userInput.value = "";
});

userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.click();
});

clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML = '<div class="bot-message">🧹 Chat limpiado.</div>';
});

// VALIDADOR
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");
const gridPreview = document.getElementById("gridPreview");
const downloadFixedBtn = document.getElementById("downloadFixedBtn");

const REGEX_CURP = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM]{1}(AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/i;

function renderPreview(aoa, errores) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const trh = document.createElement("tr");
  aoa[0].forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  for (let r = 1; r < aoa.length; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < aoa[0].length; c++) {
      const td = document.createElement("td");
      const val = aoa[r][c];
      td.textContent = val;
      const key = `${r}-${c}`;
      if (errores[key]) {
        td.classList.add("cell-error");
        td.setAttribute("data-comment", errores[key]);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  gridPreview.innerHTML = "";
  gridPreview.appendChild(table);
}

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML = "<b>⚠️ Selecciona un archivo Excel.</b>";
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
    const headers = aoa[0].map(h => String(h).toUpperCase());
    const errores = {};
    const erroresLista = [];
    const curps = new Map();

    const idxCurp = headers.findIndex(h => h.includes("CURP"));
    if (idxCurp === -1) {
      validationResult.innerHTML = "No se encontró la columna CURP.";
      return;
    }

    for (let r = 1; r < aoa.length; r++) {
      const fila = aoa[r];
      const curp = String(fila[idxCurp]).toUpperCase().trim();
      if (!curp.match(REGEX_CURP)) {
        errores[`${r}-${idxCurp}`] = "CURP con formato inválido.";
        erroresLista.push([r + 1, "CURP", curp, "Formato inválido"]);
      }
      if (curps.has(curp)) {
        errores[`${r}-${idxCurp}`] = "CURP duplicada. Sugerencia: eliminar duplicado.";
        erroresLista.push([r + 1, "CURP", curp, "Duplicada"]);
      } else curps.set(curp, true);
    }

    renderPreview(aoa, errores);
    validationResult.innerHTML = `<b>${erroresLista.length}</b> errores encontrados.`;
    if (erroresLista.length > 0) downloadFixedBtn.style.display = "block";

    downloadFixedBtn.onclick = () => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, hoja, "Original");
      const hojaErr = [["FILA", "COLUMNA", "VALOR", "COMENTARIO"], ...erroresLista];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaErr), "ERRORES");
      XLSX.writeFile(wb, "VALIDACION_PUB.xlsx");
    };
  };
  reader.readAsArrayBuffer(file);
});
