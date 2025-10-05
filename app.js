// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 Mejorada)
// ============================================================

// ==================== CHATBOT ====================

// Base de conocimiento inicial (palabras clave)
const respuestas = [
  { clave: ["curp", "clave única", "identidad"], respuesta: "Para registrar la CURP, escribe los 18 caracteres tal como aparecen en el documento oficial. Si el beneficiario no cuenta con CURP, deberás generar una clave temporal en el sistema conforme al Manual de Asesoría." },
  { clave: ["nombre", "beneficiario", "persona"], respuesta: "El nombre debe escribirse con mayúscula inicial, sin acentos ni caracteres especiales. Usa un solo espacio entre nombres y apellidos." },
  { clave: ["sexo", "género", "masculino", "femenino"], respuesta: "Selecciona el código correspondiente al género: 1 para Masculino, 2 para Femenino, conforme al catálogo GÉNERO.xlsx." },
  { clave: ["dirección", "domicilio"], respuesta: "La dirección debe incluir calle, número, colonia y municipio según los catálogos CLAVE_ENT y CLAVE_MUN." },
  { clave: ["ocupación"], respuesta: "El campo OCUPACIÓN debe llenarse con el código indicado en el catálogo OCUPACION.xlsx. Si el beneficiario no tiene ocupación, deja el campo en blanco o usa el código 99 según la guía." },
  { clave: ["escolaridad"], respuesta: "Selecciona el nivel educativo conforme al catálogo ESCOLARIDAD.xlsx. Verifica que coincida con el código oficial." },
  { clave: ["grupo étnico"], respuesta: "Usa el código correcto del catálogo GRUPO_ETNICO.xlsx según el grupo de pertenencia. Si no aplica, deja el campo vacío." },
  { clave: ["discapacidad"], respuesta: "Indica el tipo de discapacidad según el catálogo DISCAPACIDAD.xlsx, usando el código correspondiente." },
  { clave: ["parentesco"], respuesta: "Registra el parentesco del beneficiario con el titular, conforme al catálogo PARENTESCO.xlsx." },
  { clave: ["vivienda"], respuesta: "Selecciona el tipo de vivienda de acuerdo con el catálogo TIPO_VIVIENDA.xlsx." },
  { clave: ["manual", "asesoría"], respuesta: "Puedes consultar el documento 'MANUAL_ACESORIA_PUB.docx' para ejemplos completos del llenado." },
  { clave: ["instrucciones", "llenado"], respuesta: "Revisa el archivo 'INSTRUCCIONES_LLENADO_PUB.xlsx' dentro de la carpeta CATALOGOS para conocer la descripción de cada campo del PUB." },
  { clave: ["plantilla", "pub", "formato"], respuesta: "Descarga la PLANTILLA_PUB.xlsx disponible en la sección de Catálogos para comenzar tu registro." },
  { clave: ["error", "validar", "archivo"], respuesta: "Puedes usar el validador inteligente más abajo para revisar si tu archivo PUB tiene los campos completos y bien estructurados." },
  { clave: ["hola", "buenas", "buenos días"], respuesta: "¡Hola! 😊 Soy tu asistente DIF Jalisco. Puedo ayudarte a llenar el PUB o validar tus archivos. Escribe tu pregunta." },
  { clave: ["gracias", "ok", "excelente"], respuesta: "¡Con gusto! Si tienes otra duda sobre el llenado del PUB, escríbela aquí mismo." },
];

// Inicializar Fuse.js para coincidencias difusas
const fuse = new Fuse(respuestas, {
  keys: ["clave"],
  threshold: 0.3, // Tolerancia a errores ortográficos o similares
});

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
function responder(mensajeUsuario) {
  const resultados = fuse.search(mensajeUsuario.toLowerCase());
  let respuesta =
    resultados.length > 0
      ? resultados[0].item.respuesta
      : "Lo siento, no tengo información sobre eso aún. Puedes revisar el manual de asesoría o el catálogo correspondiente. Estoy aprendiendo constantemente.";

  // Simulación de escritura (efecto typing)
  setTimeout(() => {
    agregarMensaje(respuesta, "bot-message");
  }, 600);
}

// Enviar mensaje al presionar botón
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (texto === "") return;
  agregarMensaje(texto, "user-message");
  responder(texto);
  userInput.value = "";
});

// Enviar mensaje con Enter
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
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

    // Validación básica: columnas requeridas
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
