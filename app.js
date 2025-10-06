// ============================================================
// DIF JALISCO — ASISTENTE PUB (Versión 2025 con catálogos dinámicos)
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

// Agregar mensaje
function agregarMensaje(texto, clase) {
  const div = document.createElement("div");
  div.classList.add(clase);
  div.textContent = texto;
  chatOutput.appendChild(div);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Mostrar lista desplegable desde catálogo
function mostrarListaDesplegable(opciones, titulo = "Opciones disponibles:") {
  const contenedor = document.createElement("div");
  contenedor.classList.add("bot-message");

  const label = document.createElement("p");
  label.textContent = titulo;
  label.style.fontWeight = "bold";
  label.style.marginBottom = "5px";
  contenedor.appendChild(label);

  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.padding = "10px";
  select.style.border = "1px solid #ccc";
  select.style.borderRadius = "8px";
  select.style.backgroundColor = "#fff";

  opciones.forEach(op => {
    const option = document.createElement("option");
    option.textContent = op;
    select.appendChild(option);
  });

  contenedor.appendChild(select);
  chatOutput.appendChild(contenedor);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

// Cargar catálogo desde /catalogos/
async function cargarCatalogo(nombreArchivo) {
  try {
    const response = await fetch(`catalogos/${nombreArchivo}`);
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
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

  agregarMensaje(respuesta, "bot-message");

  // ======== NUEVO: detectar palabras clave y mostrar listas ========
  const catalogos = [
    { palabras: ["sexo", "género"], archivo: "GENERO.xlsx", titulo: "Opciones de SEXO:" },
    { palabras: ["estado civil", "edo civil"], archivo: "EDO_CIVIL.xlsx", titulo: "Opciones de ESTADO CIVIL:" },
    { palabras: ["ocupación"], archivo: "OCUPACION.xlsx", titulo: "Opciones de OCUPACIÓN:" },
    { palabras: ["entidad", "nac"], archivo: "ENTIDAD_DE_NAC.xlsx", titulo: "Opciones de ENTIDAD DE NACIMIENTO:" },
    { palabras: ["escolaridad"], archivo: "ESCOLARIDAD.xlsx", titulo: "Opciones de ESCOLARIDAD:" },
    { palabras: ["grupo étnico", "etnia"], archivo: "GRUPO_ETNICO.xlsx", titulo: "Opciones de GRUPO ÉTNICO:" },
    { palabras: ["discapacidad"], archivo: "DISCAPACIDAD.xlsx", titulo: "Opciones de DISCAPACIDAD:" },
    { palabras: ["tipo vivienda"], archivo: "TIPO_VIVIENDA.xlsx", titulo: "Opciones de TIPO DE VIVIENDA:" },
    { palabras: ["parentesco"], archivo: "PARENTESCO.xlsx", titulo: "Opciones de PARENTESCO:" },
    { palabras: ["motivo baja"], archivo: "MOTIVO_BAJA.xlsx", titulo: "Opciones de MOTIVO DE BAJA:" }
  ];

  for (const cat of catalogos) {
    if (cat.palabras.some(p => texto.includes(p))) {
      const opciones = await cargarCatalogo(cat.archivo);
      if (opciones && opciones.length > 0) {
        mostrarListaDesplegable(opciones, cat.titulo);
      }
    }
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




