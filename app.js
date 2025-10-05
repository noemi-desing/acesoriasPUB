// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 Dinámica con Excel)
// ============================================================

let fuse;
let baseConocimiento = [];

// ==================== CHATBOT ====================

// Cargar datos desde el Excel INSTRUCTIVO_LLENADO_PUB.xlsx
async function cargarBaseDesdeExcel() {
  try {
    const response = await fetch("catalogos/INSTRUCTIVO_LLENADO_PUB.xlsx");
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    baseConocimiento = filas.slice(1).map(row => ({
      pregunta: row[1]?.toLowerCase() || "",
      respuesta: row[2] || ""
    }));

    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.35
    });

  } catch (error) {
    console.error("Error al cargar el archivo Excel:", error);
  }
}

// Elementos del DOM
const chatOutput = document.getElementById("chatOutput");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

// Función para agregar mensajes al chat
function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.classList.add(clase);
  div.textContent = texto;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Función para generar respuesta del bot
async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) {
    await cargarBaseDesdeExcel();
  }

  const resultados = fuse.search(mensajeUsuario.toLowerCase());
  let respuesta =
    resultados.length > 0
      ? resultados[0].item.respuesta
      : "No encontré una coincidencia exacta. Intenta reformular tu pregunta o revisa el archivo INSTRUCTIVO_LLENADO_PUB.xlsx en la sección de Catálogos.";

  setTimeout(() => {
    agregarMensaje(respuesta, "bot-message");
  }, 600);
}

// Enviar mensaje con el botón
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (texto === "") return;
  agregarMensaje(texto, "user-message");
  responder(texto);
  userInput.value = "";
});

// Enviar mensaje con Enter
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Borrar historial del chat
clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML =
    '<div class="bot-message">🧹 Historial borrado. Puedes comenzar una nueva consulta.</div>';
});

// ==================== VALIDADOR DE ARCHIVOS ====================

const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.textContent =
      "Por favor, selecciona un archivo antes de validar.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const primeraHoja = workbook.SheetNames[0];
    const hoja = workbook.Sheets[primeraHoja];
    const datos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    const encabezados = datos[0];
    const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
    const faltantes = requeridos.filter(
      (campo) => !encabezados.includes(campo)
    );

    if (faltantes.length === 0) {
      validationResult.innerHTML =
        `<p style="color:green;"><b>✅ Archivo válido.</b> Todos los campos requer
