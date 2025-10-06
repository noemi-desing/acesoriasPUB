// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 con Catálogos dinámicos)
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
      threshold: 0.5,
      distance: 200,
      minMatchCharLength: 2
    });

  } catch (error) {
    console.error("❌ Error al cargar el archivo Excel:", error);
  }
}

// ==================== ELEMENTOS DEL DOM ====================
const chatOutput = document.getElementById("chatOutput");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearChat");

// ==================== FUNCIONES DEL CHAT ====================

// Agregar mensajes al chat
function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.classList.add(clase);
  div.textContent = texto;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Mostrar lista desplegable
function mostrarListaDesplegable(opciones, titulo = "Opciones disponibles:") {
  const contenedor = document.createElement("div");
  contenedor.classList.add("bot-message");

  const label = document.createElement("p");
  label.textContent = titulo;
  label.style.fontWeight = "bold";
  contenedor.appendChild(label);

  const select = document.createElement("select");
  select.style.padding = "10px";
  select.style.borderRadius = "8px";
  select.style.border = "1px solid #ccc";
  select.style.marginTop = "5px";
  select.style.width = "100%";

  opciones.forEach(op => {
    const option = document.createElement("option");
    option.textContent = op;
    select.appendChild(option);
  });

  contenedor.appendChild(select);
  chatOutput.appendChild(contenedor);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Cargar catálogo según palabra clave
async function cargarCatalogo(nombreArchivo) {
  try {
    const response = await fetch(`catalogos/${nombreArchivo}`);
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
    // Omitimos encabezado
    const opciones = filas.slice(1).map(row => row[0]).filter(v => v);
    return opciones;
  } catch (error) {
    console.error("⚠️ No se pudo cargar el catálogo:", nombreArchivo);
    return null;
  }
}

// ==================== RESPUESTA DEL BOT ====================
async function responder(mensajeUsuario) {
  if (baseConocimiento.length === 0) {
    await cargarBaseDesdeExcel();
  }

  const texto = mensajeUsuario.toLowerCase().trim();
  const resultados = fuse.search(texto);

  let respuesta = "";

  if (resultados.length > 0) {
    respuesta = resultados[0].item.respuesta;
  } else {
    const palabraCoincidente = baseConocimiento.find(item =>
      texto.split(" ").some(palabra => item.pregunta.includes(palabra))
    );
    respuesta = palabraCoincidente
      ? palabraCoincidente.respuesta
      : "No encontré una coincidencia exacta 😔. Intenta usar una palabra relacionada o revisa el archivo INSTRUCTIVO_LLENADO_PUB.xlsx en la sección de Catálogos.";
  }

  // Mostrar respuesta del bot
  agregarMensaje(respuesta, "bot-message");

  // ======== NUEVO: detectar si hay catálogos relevantes ========
  if (texto.includes("sexo") || texto.includes("género")) {
    const opciones = await cargarCatalogo("GENERO.xlsx");
    if (opciones) mostrarListaDesplegable(opciones, "Opciones de SEXO:");
  }

  if (texto.includes("estado civil") || texto.includes("edo civil")) {
    const opciones = await cargarCatalogo("EDO_CIVIL.xlsx");
    if (opciones) mostrarListaDesplegable(opciones, "Opciones de ESTADO CIVIL:");
  }

  if (texto.includes("ocupación")) {
    const opciones = await cargarCatalogo("OCUPACION.xlsx");
    if (opciones) mostrarListaDesplegable(opciones, "Opciones de OCUPACIÓN:");
  }

  if (texto.includes("entidad") && texto.includes("nac")) {
    const opciones = await cargarCatalogo("ENTIDAD_DE_NAC.xlsx");
    if (opciones) mostrarListaDesplegable(opciones, "Opciones de ENTIDAD DE NACIMIENTO:");
  }
}

// ==================== EVENTOS ====================
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

// ==================== VALIDADOR ====================
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

validateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.textContent = "Por favor, selecciona un archivo antes de validar.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    const encabezados = datos[0];
    const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
    const faltantes = requeridos.filter(campo => !encabezados.includes(campo));

    if (faltantes.length === 0) {
      validationResult.innerHTML = `<p style="color:green;"><b>✅ Archivo válido.</b> Todos los campos requeridos están presentes.</p>`;
    } else {
      validationResult.innerHTML = `<p style="color:red;"><b>⚠️ Campos faltantes:</b> ${faltantes.join(", ")}</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});
