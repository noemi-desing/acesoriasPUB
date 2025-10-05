/* ============================================================
   CHATBOT DIF JALISCO — ASESOR PUB + VALIDADOR INTELIGENTE
   ============================================================ */

// --- Variables principales ---
const chatOutput = document.getElementById("chatOutput");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

// --- Base de conocimientos simplificada ---
const baseConocimiento = [
  {
    campo: "CURP",
    respuesta: "La CURP debe contener 18 caracteres en mayúsculas, sin espacios ni guiones. Ejemplo: ABCD010101HDFRRN09.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  },
  {
    campo: "SEXO",
    respuesta: "En el campo SEXO utiliza 'H' para Hombre y 'M' para Mujer, según la clave del catálogo GENERO.xlsx.",
    fuente: "MANUAL GUÍA PUB PERSONAS"
  },
  {
    campo: "DOMICILIO",
    respuesta: "Captura la dirección separando calle, número, colonia y código postal (5 dígitos).",
    fuente: "MANUAL ASESORÍA DIF JALISCO"
  },
  {
    campo: "ESCOLARIDAD",
    respuesta: "Selecciona la clave correspondiente del catálogo ESCOLARIDAD.xlsx, según el nivel educativo alcanzado.",
    fuente: "MANUAL GUÍA PUB PERSONAS"
  },
  {
    campo: "ENTIDAD",
    respuesta: "Usa la clave de 2 dígitos del catálogo CLAVE_ENT.xlsx.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  },
  {
    campo: "MUNICIPIO",
    respuesta: "Usa la clave de 3 dígitos del catálogo CLAVE_MUN.xlsx para el municipio correspondiente.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  }
];

// --- Configurar Fuse.js (búsqueda con tolerancia a errores) ---
const fuse = new Fuse(baseConocimiento, {
  keys: ["campo"],
  threshold: 0.4
});

// --- Función para agregar mensajes al chat ---
function agregarMensaje(texto, tipo = "bot") {
  const msg = document.createElement("div");
  msg.className = tipo === "bot" ? "bot-message" : "user-message";
  msg.innerText = texto;
  chatOutput.appendChild(msg);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// --- Responder al usuario ---
function responder(mensaje) {
  const resultado = fuse.search(mensaje);
  if (resultado.length > 0) {
    const data = resultado[0].item;
    agregarMensaje(`${data.respuesta}\n\nFuente: ${data.fuente}`, "bot");
  } else {
    agregarMensaje(
      "No encontré información exacta, pero puedes revisar los manuales disponibles en la sección de descargas.",
      "bot"
    );
  }
}

// --- Evento: Enviar mensaje ---
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto, "user");
  userInput.value = "";
  responder(texto);
});

// --- Permitir enviar con Enter ---
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

// --- VALIDADOR INTELIGENTE DEL PUB ---
validateBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML = "Por favor selecciona un archivo PLANTILLA_PUB.xlsx para validar.";
    return;
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let errores = [];
  let totalRegistros = rows.length;

  rows.forEach((row, i) => {
    const num = i + 2; // fila (considerando encabezado)
    if (!row.CURP || row.CURP.length !== 18) {
      errores.push(`Fila ${num}: CURP inválida o incompleta.`);
    }
    if (!row.SEXO || !["H", "M"].includes(row.SEXO)) {
      errores.push(`Fila ${num}: campo SEXO inválido (usa H o M).`);
    }
    if (!row.CODIGO_POSTAL || String(row.CODIGO_POSTAL).length !== 5) {
      errores.push(`Fila ${num}: Código postal debe tener 5 dígitos.`);
    }
    if (!row.ENTIDAD) {
      errores.push(`Fila ${num}: Falta la clave de ENTIDAD.`);
    }
  });

  if (errores.length === 0) {
    validationResult.innerHTML = `<span style="color:green;font-weight:bold;">✅ Validación completada: ${totalRegistros} registros sin errores.</span>`;
  } else {
    validationResult.innerHTML = `
      <span style="color:#d9534f;font-weight:bold;">⚠️ Se detectaron ${errores.length} posibles errores:</span><br><br>
      ${errores.slice(0, 10).join("<br>")}
      <br><br><em>(solo se muestran los primeros 10 resultados)</em>
    `;
  }
});

// --- Mensaje de bienvenida ---
window.onload = () => {
  agregarMensaje("👋 Bienvenido al asistente de llenado del PUB. Puedo ayudarte con tus dudas o validar tu archivo Excel.", "bot");
};

