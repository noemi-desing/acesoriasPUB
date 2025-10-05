/* ============================================================
   DIF JALISCO — CHATBOT + VALIDADOR INTELIGENTE DEL PUB
   Versión final 2025 con botón para borrar historial
   ============================================================ */

// --- Variables principales ---
const chatOutput = document.getElementById("chatOutput");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const validateBtn = document.getElementById("validateBtn");
const validationResult = document.getElementById("validationResult");

// Crear botón dinámico para borrar historial
const clearBtn = document.createElement("button");
clearBtn.innerText = "🗑️ Borrar historial de consulta";
clearBtn.classList.add("clear-btn");
chatOutput.parentNode.insertBefore(clearBtn, chatOutput.nextSibling);

// --- Base de conocimiento simplificada ---
const baseConocimiento = [
  {
    campo: "CURP",
    respuesta:
      "La CURP debe contener 18 caracteres en mayúsculas, sin espacios ni guiones. Ejemplo: ABCD010101HDFRRN09.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  },
  {
    campo: "SEXO",
    respuesta:
      "En el campo SEXO utiliza 'H' para Hombre y 'M' para Mujer, conforme al catálogo GENERO.xlsx.",
    fuente: "MANUAL GUÍA PUB PERSONAS"
  },
  {
    campo: "DOMICILIO",
    respuesta:
      "Captura calle, número y colonia conforme al catálogo ASENTAMIENTO.xlsx. Evita abreviaturas informales.",
    fuente: "MANUAL DE ASESORÍA DIF JALISCO"
  },
  {
    campo: "ESCOLARIDAD",
    respuesta:
      "Usa las claves del catálogo ESCOLARIDAD.xlsx según el nivel educativo alcanzado por el beneficiario.",
    fuente: "MANUAL GUÍA PUB PERSONAS"
  },
  {
    campo: "ENTIDAD",
    respuesta:
      "Usa la clave de 2 dígitos del catálogo CLAVE_ENT.xlsx para la entidad federativa correspondiente.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  },
  {
    campo: "MUNICIPIO",
    respuesta:
      "Usa la clave de 3 dígitos del catálogo CLAVE_MUN.xlsx para el municipio de residencia.",
    fuente: "INSTRUCCIONES DE LLENADO DEL PUB"
  },
  {
    campo: "EDO CIVIL",
    respuesta:
      "Selecciona el estado civil correcto de acuerdo con el catálogo EDO_CIVIL.xlsx.",
    fuente: "MANUAL GUÍA PUB PERSONAS"
  }
];

// --- Configurar Fuse.js para coincidencias con errores ---
const fuse = new Fuse(baseConocimiento, {
  keys: ["campo"],
  threshold: 0.4
});

// --- Agregar mensajes al chat ---
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
    agregarMensaje(`${data.respuesta}\n\n📘 Fuente: ${data.fuente}`, "bot");
  } else {
    agregarMensaje(
      "No encontré información exacta sobre eso 🤔. Puedes revisar los manuales disponibles en la sección de descargas.",
      "bot"
    );
  }
}

// --- Enviar mensaje ---
sendBtn.addEventListener("click", () => {
  const texto = userInput.value.trim();
  if (!texto) return;
  agregarMensaje(texto, "user");
  userInput.value = "";
  responder(texto);
});

// --- Enviar con Enter ---
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

// --- Borrar historial del chat ---
clearBtn.addEventListener("click", () => {
  chatOutput.innerHTML = "";
  agregarMensaje(
    "🧹 Historial de consulta borrado.\n\n👋 Bienvenido nuevamente al asistente DIF Jalisco. Puedes realizar una nueva consulta cuando gustes.",
    "bot"
  );
});

// --- Validador inteligente del PUB ---
validateBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    validationResult.innerHTML =
      "⚠️ Por favor selecciona un archivo PLANTILLA_PUB.xlsx para validar.";
    return;
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  let errores = [];
  let total = rows.length;

  rows.forEach((row, i) => {
    const n = i + 2;
    if (!row.CURP || row.CURP.length !== 18)
      errores.push(`Fila ${n}: CURP inválida o incompleta.`);
    if (!row.SEXO || !["H", "M"].includes(row.SEXO))
      errores.push(`Fila ${n}: campo SEXO incorrecto (usa H o M).`);
    if (!row.CODIGO_POSTAL || String(row.CODIGO_POSTAL).length !== 5)
      errores.push(`Fila ${n}: Código postal debe tener 5 dígitos.`);
    if (!row.ENTIDAD)
      errores.push(`Fila ${n}: Falta clave de ENTIDAD federativa.`);
    if (!row.MUNICIPIO)
      errores.push(`Fila ${n}: Falta clave de MUNICIPIO.`);
  });

  if (errores.length === 0) {
    validationResult.innerHTML = `
      <div style="color:green;font-weight:600;">
        ✅ Validación exitosa: ${total} registros revisados sin errores.
      </div>`;
  } else {
    validationResult.innerHTML = `
      <div style="color:#d9534f;font-weight:600;">
        ⚠️ Se detectaron ${errores.length} posibles errores.
      </div>
      <ul style="margin-top:8px;list-style:disc;padding-left:20px;color:#333;">
        ${errores.slice(0, 10).map(e => `<li>${e}</li>`).join("")}
      </ul>
      <em style="color:#888;">(solo se muestran los primeros 10 errores)</em>
    `;
  }
});

// --- Mensaje de bienvenida ---
window.onload = () => {
  agregarMensaje(
    "👋 Bienvenido al asistente de llenado PUB del DIF Jalisco.\nPuedo resolver tus dudas o validar tu archivo Excel.",
    "bot"
  );
};
