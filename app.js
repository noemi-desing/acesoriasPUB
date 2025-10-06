// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 Inteligente con Excel)
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

    // 🔍 Configuración flexible de Fuse.js para aceptar errores, palabras sueltas, etc.
    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.5,      // Permite diferencias notables entre el texto
      distance: 200,       // Amplía la distancia para emparejar palabras parecidas
      minMatchCharLength: 2 // Solo necesita 2 letras para considerar una coincidencia
    });

  } catch (error) {
    console.error("❌ Error al cargar el archivo Excel:", error);
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

  const texto = mensajeUsuario.toLowerCase().trim();
  const resultados = fuse.search(texto);

  let respuesta = "";

  // ✅ Si hay coincidencias difusas, usar la mejor
  if (resultados.length > 0) {
    respuesta = resultados[0].item.respuesta;
  } else {
    // 🔍 Si no hay coincidencias, buscar palabra clave manualmente
    const palabraCoincidente = baseConocimiento.find(item =>
      texto.split(" ").some(palabra => item.pregunta.includes(palabra))
    );
    if (palabraCoincidente) {
      respuesta = palabraCoincidente.respuesta;
    } else {
      respuesta = "No encontré una coincidencia exacta 😔. Intenta usar una palabra relacionada o revisa el archivo INSTRUCTIVO_LLENADO_PUB.xlsx en la sección de Catálogos.";
    }
  }

  // Efecto de escritura simulada
  setTimeout(() => {
    agregarMensaje(respuesta, "bot-message");
  }, 500);
}

// Enviar mensaje al presionar el botón
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (texto === "") return;
  agregarMensaje(texto.toUpperCase(), "user-message");
  responder(texto);
  userInput.value = "";
});

// Enviar mensaje con Enter
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// Borrar historial del chat
clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML = '<div class="bot-message">🧹 Historial borrado. Puedes comenzar una nueva consulta.</div>';
});

// ==================== VALIDADOR DE ARCHIVOS ====================

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
    const primeraHoja = workbook.SheetNames[0];
    const hoja = workbook.Sheets[primeraHoja];
    const datos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    // Validación básica de columnas requeridas
    const encabezados = datos[0];
    const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
    const faltantes = requeridos.filter((campo) => !encabezados.includes(campo));

    if (faltantes.length === 0) {
      validationResult.innerHTML = `<p style="color:green;"><b>✅ Archivo válido.</b> Todos los campos requeridos están presentes.</p>`;
    } else {
      validationResult.innerHTML = `<p style="color:red;"><b>⚠️ Campos faltantes:</b> ${faltantes.join(", ")}</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
});
