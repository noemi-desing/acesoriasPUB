// ===========================
// CHATBOT Y VALIDADOR DIF JALISCO 2025
// ===========================

// Variables globales
let fuse;
let baseConocimiento = [];

// ===========================
// CARGAR ARCHIVOS DE CONOCIMIENTO
// ===========================
async function cargarBaseDesdeExcel() {
  try {
    const archivos = [
      "catalogos/INSTRUCTIVO_LLENADO_PUB.xlsx",
      "catalogos/CUESTIONARIO_ACTORES_SOCIALES.xlsx"
    ];

    baseConocimiento = [];

    for (const archivo of archivos) {
      const response = await fetch(archivo);
      const data = await response.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });

      // Cada fila: [Pregunta, Respuesta]
      const contenido = filas.slice(1).map(row => ({
        pregunta: (row[0] || "").toLowerCase(),
        respuesta: row[1] || ""
      }));

      baseConocimiento.push(...contenido);
    }

    fuse = new Fuse(baseConocimiento, {
      keys: ["pregunta"],
      threshold: 0.4,
      distance: 300,
      minMatchCharLength: 2
    });
  } catch (error) {
    console.error("Error al cargar archivos Excel:", error);
  }
}

// ===========================
// CHATBOT FUNCIONALIDAD
// ===========================
document.addEventListener("DOMContentLoaded", async () => {
  await cargarBaseDesdeExcel();

  const chatbox = document.getElementById("chatbox");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  function agregarMensaje(mensaje, tipo) {
    const msg = document.createElement("div");
    msg.classList.add("message", tipo);
    msg.innerHTML = mensaje;
    chatbox.appendChild(msg);
    chatbox.scrollTop = chatbox.scrollHeight;
  }

  function formatearRespuesta(texto) {
    return texto
      .replace(/(El campo\s[A-Z0-9_]+)/gi, "<b>$1</b>")
      .replace(/(corresponde a\s[^;]+)/gi, "<b>$1</b>")
      .replace(/(Ejemplo:\s[^<]+)/gi, "<b>$1</b>");
  }

  function copiarRespuesta(texto) {
    navigator.clipboard.writeText(texto);
    alert("Respuesta copiada al portapapeles ✅");
  }

  sendBtn.addEventListener("click", () => {
    const pregunta = userInput.value.trim().toLowerCase();
    if (!pregunta) return;

    agregarMensaje(pregunta, "user");
    userInput.value = "";

    let resultado = fuse.search(pregunta);

    if (resultado.length > 0) {
      const mejorCoincidencia = resultado[0].item.respuesta;
      const respuestaHTML = formatearRespuesta(mejorCoincidencia);

      const contenedor = document.createElement("div");
      contenedor.classList.add("message", "bot");
      contenedor.innerHTML = `${respuestaHTML} <br><button class="copy-btn">📋 Copiar respuesta</button>`;
      chatbox.appendChild(contenedor);

      const copyBtn = contenedor.querySelector(".copy-btn");
      copyBtn.addEventListener("click", () => copiarRespuesta(mejorCoincidencia));
    } else {
      agregarMensaje("No encontré información relacionada. Verifica tu pregunta o intenta con otra palabra clave.", "bot");
    }

    chatbox.scrollTop = chatbox.scrollHeight;
  });
});

// ===========================
// VALIDADOR INTELIGENTE
// ===========================
document.getElementById("validateBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const validationResult = document.getElementById("validationResult");
  const archivo = fileInput.files[0];

  if (!archivo) {
    validationResult.innerHTML = `<p style="color:red;">⚠️ Por favor, selecciona un archivo Excel.</p>`;
    return;
  }

  try {
    const data = await archivo.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });

    const encabezados = filas[0].map(e => e.toString().trim().toUpperCase());
    let faltantes = [];

    // Validación automática según tipo de archivo
    if (encabezados.includes("CURP") && encabezados.includes("NOMBRE")) {
      const requeridos = ["CURP", "NOMBRE", "SEXO", "EDAD", "OCUPACION"];
      faltantes = requeridos.filter(campo => !encabezados.includes(campo));
      validationResult.innerHTML =
        faltantes.length === 0
          ? `<p style="color:green;"><b>✅ Archivo válido (Padrón de Personas).</b> Todos los campos requeridos están presentes.</p>`
          : `<p style="color:red;"><b>⚠️ Campos faltantes (Padrón de Personas):</b> ${faltantes.join(", ")}</p>`;
    } else if (encabezados.includes("SA_ID_FAS") && encabezados.includes("CURP_ACTOR")) {
      const requeridosActores = ["SA_ID_FAS", "CURP_ACTOR", "NOMBRE_ACTOR", "SEXO", "RFC_ACTOR"];
      faltantes = requeridosActores.filter(campo => !encabezados.includes(campo));
      validationResult.innerHTML =
        faltantes.length === 0
          ? `<p style="color:green;"><b>✅ Archivo válido (Actores Sociales).</b> Todos los campos requeridos están presentes.</p>`
          : `<p style="color:red;"><b>⚠️ Campos faltantes (Actores Sociales):</b> ${faltantes.join(", ")}</p>`;
    } else {
      validationResult.innerHTML = `<p style="color:orange;"><b>⚠️ No se pudo determinar el tipo de archivo.</b> Verifica los encabezados.</p>`;
    }
  } catch (error) {
    console.error(error);
    validationResult.innerHTML = `<p style="color:red;">❌ Error al procesar el archivo. Asegúrate de subir un Excel válido.</p>`;
  }
});

