/* ============================================================
   ESTILOS GLOBALES — DIF JALISCO
   Tema: Gris profesional + Naranja institucional
   ============================================================ */

:root {
  --naranja: #f37021;
  --gris-oscuro: #2f2f2f;
  --gris-claro: #f5f5f5;
  --gris-medio: #9b9b9b;
  --borde: #e0e0e0;
  --blanco: #ffffff;
  --fuente: 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--fuente);
  background-color: var(--gris-claro);
  color: var(--gris-oscuro);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ================= CABECERA ================= */
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background-color: var(--blanco);
  border-bottom: 4px solid var(--naranja);
  padding: 18px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.logo {
  height: 70px;
  width: auto;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--gris-oscuro);
  margin-bottom: 4px;
}

.header h2 {
  font-size: 14px;
  font-weight: 500;
  color: var(--gris-medio);
}

/* ================= SECCIÓN DE CHAT ================= */
.chat-section {
  background-color: var(--blanco);
  border: 1px solid var(--borde);
  border-radius: 12px;
  max-width: 900px;
  margin: 25px auto;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.chat-section h3 {
  color: var(--naranja);
  margin-bottom: 6px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
}

.lema {
  text-align: center;
  color: var(--gris-medio);
  margin-bottom: 14px;
  font-size: 15px;
}

/* Chatbox */
.chat-container {
  border: 1px solid var(--borde);
  background-color: #fafafa;
  height: 340px;
  overflow-y: auto;
  border-radius: 8px;
  padding: 10px;
  font-size: 15px;
}

.bot-message, .user-message {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  width: fit-content;
  max-width: 80%;
  line-height: 1.4;
}

.bot-message {
  background-color: #fff6f0;
  border: 1px solid #ffd9c0;
  color: #5a3c25;
  box-shadow: 0 2px 5px rgba(243, 112, 33, 0.15);
}

.user-message {
  background-color: var(--naranja);
  color: white;
  border: 1px solid #e35c13;
  margin-left: auto;
}

/* Input del chat */
.chat-input {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.chat-input input {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--borde);
  font-size: 15px;
  outline: none;
}

.chat-input input:focus {
  border-color: var(--naranja);
}

.chat-input button {
  background-color: var(--naranja);
  color: white;
  font-weight: 600;
  border: none;
  padding: 12px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.chat-input button:hover {
  background-color: #e55d10;
}

/* ================= VALIDADOR ================= */
.validator {
  background-color: #fff7f2;
  border: 1px solid #ffe3c9;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.validator h4 {
  color: var(--naranja);
  margin-bottom: 8px;
  text-align: center;
}

#fileInput {
  width: 100%;
  border: 1px solid var(--borde);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
}

#validateBtn {
  background-color: var(--naranja);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 14px;
  cursor: pointer;
  width: 100%;
  font-weight: 600;
}

#validateBtn:hover {
  background-color: #e55d10;
}

#validationResult {
  margin-top: 12px;
  font-size: 14px;
  color: var(--gris-oscuro);
}

/* ================= DESCARGAS ================= */
.downloads {
  background-color: var(--blanco);
  border: 1px solid var(--borde);
  border-radius: 12px;
  max-width: 900px;
  margin: 25px auto;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.downloads h3 {
  color: var(--naranja);
  text-align: center;
  font-size: 22px;
  margin-bottom: 18px;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}

.buttons a {
  display: inline-block;
  text-align: center;
  padding: 12px 10px;
  border: 2px solid var(--naranja);
  color: var(--naranja);
  text-decoration: none;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.25s;
  background-color: #fff;
}

.buttons a:hover {
  background-color: var(--naranja);
  color: #fff;
}

/* ================= FOOTER ================= */
footer {
  text-align: center;
  padding: 15px 10px;
  background-color: var(--gris-oscuro);
  color: white;
  font-size: 14px;
  margin-top: auto;
}

/* ================= RESPONSIVE ================= */
@media (max-width: 700px) {
  .header {
    flex-direction: column;
    text-align: center;
  }

  .chat-container {
    height: 280px;
  }

  .buttons {
    grid-template-columns: 1fr;
  }

  .logo {
    height: 60px;
  }
}
