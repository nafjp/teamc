
const LOGIC_APPS_URL = "https://prod-25.northcentralus.logic.azure.com:443/workflows/1f4121406b8741f2bff55307fc3e4f66/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=pCNJ_U_c86jR7y39_kOCHWNMl1KRVVpvnA64M8p5uPQ";
const sessionId = `sess-${crypto.randomUUID()}`;
const userId = "user-demo-001";
const messages = [];

const form = document.getElementById("mealForm");
const messagesEl = document.getElementById("messages");
const errorEl = document.getElementById("errorMessage");

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMessages() {
  messagesEl.innerHTML = "";
  for (const msg of messages) {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    div.innerHTML = `<strong>${msg.role === "user" ? "user" : "assistant"}</strong><div>${escapeHtml(msg.text)}</div>`;
    messagesEl.appendChild(div);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("file convert error"));
        return;
      }
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("file read error"));
    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const messageText = document.getElementById("messageText").value.trim();
  const moodText = document.getElementById("moodText").value.trim();
  const mealTimeText = document.getElementById("mealTimeText").value.trim();
  const imageFile = document.getElementById("imageFile").files[0];

  if (!messageText) {
    errorEl.textContent = "message is required";
    return;
  }

  const messageId = `msg-${crypto.randomUUID()}`;
  let imageBase64 = null;
  let imageContentType = null;

  try {
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
      imageContentType = imageFile.type || "image/jpeg";
    }

    messages.push({ role: "user", text: messageText });
    renderMessages();

    const payload = {
      session_id: sessionId,
      user_id: userId,
      message_id: messageId,
      message_text: messageText,
      mood_text: moodText || null,
      meal_time_text: mealTimeText || null,
      image_base64: imageBase64,
      image_content_type: imageContentType,
      client_timestamp: new Date().toISOString(),
      conversation_history: messages.map((m) => ({ role: m.role, content: m.text }))
    };

    const response = await fetch(LOGIC_APPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "request error");
    }

    messages.push({ role: "assistant", text: result.assistant_message || "" });
    renderMessages();
    form.reset();
  } catch (err) {
    errorEl.textContent = err && err.message ? err.message : "unknown error";
  }
});
