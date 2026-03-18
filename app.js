const LOGIC_APPS_URL = "https://web-to-fabric-dyb3axbkfnagbwfc.eastasia-01.azurewebsites.net:443/api/Receive_Request_Send_Response/triggers/When_a_HTTP_request_is_received/invoke?api-version=2022-05-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=pHZXgbO_lLMWbeDT3crZTY83PM28XK3njnSi_8Na3zI";

const sessionId = `sess-${crypto.randomUUID()}`;
const userId = "user-demo-001";
const messages = [
  {
    role: "assistant",
    text: "こんにちは。今日はどんなごはんだったかな？ 食べたものや、そのときの気持ちを教えてね。"
  }
];

const form = document.getElementById("mealForm");
const messagesEl = document.getElementById("messages");
const errorEl = document.getElementById("errorMessage");
const fileInput = document.getElementById("imageFile");
const fileNameEl = document.getElementById("fileName");
const messageTextEl = document.getElementById("messageText");
const moodTextEl = document.getElementById("moodText");
const mealTimeTextEl = document.getElementById("mealTimeText");
const submitButton = document.getElementById("submitButton");

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function autoResizeTextarea() {
  messageTextEl.style.height = "auto";
  messageTextEl.style.height = `${Math.min(messageTextEl.scrollHeight, 128)}px`;
}

function createMessageBubble(msg) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`;

  if (msg.role !== "user") {
    const avatar = document.createElement("div");
    avatar.className = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-line-green shadow";
    avatar.textContent = "あ";
    wrapper.appendChild(avatar);
  }

  const bubbleArea = document.createElement("div");
  bubbleArea.className = `max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`;

  const name = document.createElement("div");
  name.className = `mb-1 text-[11px] text-gray-600 ${msg.role === "user" ? "text-right" : "text-left"}`;
  name.textContent = msg.role === "user" ? "あなた" : "あおい";
  bubbleArea.appendChild(name);

  const bubble = document.createElement("div");
  bubble.className = msg.role === "user"
    ? "rounded-2xl rounded-br-md bg-[#06C755] px-4 py-3 text-sm text-white shadow-bubble"
    : "rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-gray-800 shadow-bubble";
  bubble.innerHTML = escapeHtml(msg.text).replaceAll("\n", "<br>");
  bubbleArea.appendChild(bubble);
  wrapper.appendChild(bubbleArea);

  return wrapper;
}

function renderMessages() {
  messagesEl.innerHTML = "";
  for (const msg of messages) {
    messagesEl.appendChild(createMessageBubble(msg));
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("画像変換に失敗しました"));
        return;
      }
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("画像読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

function setSubmitting(isSubmitting) {
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? "送信中" : "送信";
}

messageTextEl.addEventListener("input", autoResizeTextarea);
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileNameEl.textContent = file ? file.name : "未選択";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const messageText = messageTextEl.value.trim();
  const moodText = moodTextEl.value.trim();
  const mealTimeText = mealTimeTextEl.value.trim();
  const imageFile = fileInput.files?.[0] || null;

  if (!messageText) {
    errorEl.textContent = "会話内容を入力してください。";
    return;
  }

  if (!LOGIC_APPS_URL || LOGIC_APPS_URL === "YOUR_LOGIC_APPS_URL") {
    errorEl.textContent = "app.js の LOGIC_APPS_URL を実際の URL に変更してください。";
    return;
  }

  const messageId = `msg-${crypto.randomUUID()}`;
  let imageBase64 = null;
  let imageContentType = null;

  try {
    setSubmitting(true);

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

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      throw new Error(result.message || "送信に失敗しました。");
    }

    const assistantText = result.assistant_message
      || result.message
      || "受け付けました。記録しておくね。";

    messages.push({ role: "assistant", text: assistantText });
    renderMessages();

    form.reset();
    fileNameEl.textContent = "未選択";
    messageTextEl.value = "";
    autoResizeTextarea();
  } catch (err) {
    errorEl.textContent = err?.message || "エラーが発生しました。";
  } finally {
    setSubmitting(false);
  }
});

renderMessages();
autoResizeTextarea();
