const messagesEl = document.getElementById('chat-messages');
const formEl = document.getElementById('chat-form');
const inputEl = document.getElementById('user-input');

function addMessage(text, role='bot') {
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.className = role === 'bot' ? 'bot' : 'user';
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function getResponse(question) {
  question = question.toLowerCase();
  if (question.includes('curp')) return 'La CURP debe tener 18 caracteres alfanuméricos sin espacios.';
  if (question.includes('sexo')) return 'El campo SEXO acepta H (hombre) o M (mujer).';
  if (question.includes('direccion') || question.includes('domicilio')) return 'La dirección debe incluir calle, número y código postal de 5 dígitos.';
  return 'No tengo esa información específica, por favor revisa los manuales del PUB.';
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  inputEl.value = '';
  const reply = getResponse(text);
  addMessage(reply, 'bot');
});

document.getElementById('year').textContent = new Date().getFullYear();
