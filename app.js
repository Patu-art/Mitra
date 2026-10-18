(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const KEY_NAME = "mitra-chat-history-v1";
  const messagesEl = $("messages");
  const welcomeEl = $("welcome");
  const input = $("messageInput");
  const sendBtn = $("sendBtn");
  const modal = $("settingsModal");
  let apiKey = "";
  let model = "gemini-2.5-flash";
  let history = loadHistory();
  let busy = false;

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY_NAME) || "[]");
      return Array.isArray(value) ? value.slice(-80) : [];
    } catch {
      return [];
    }
  }

  function persistHistory() {
    try {
      localStorage.setItem(KEY_NAME, JSON.stringify(history.slice(-80)));
    } catch {
      showToast("Browser storage is full or unavailable. This conversation may not be saved.");
    }
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function addMessage(role, text, options = {}) {
    const row = document.createElement("div");
    row.className = "message " + (role === "user" ? "user" : "assistant") + (options.error ? " error" : "");
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "Y" : "M";
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "message-body";
    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = role === "user" ? "YOU" : "MITRA";
    const body = document.createElement("div");
    body.textContent = text;
    bodyWrap.append(label, body);
    row.append(avatar, bodyWrap);
    messagesEl.appendChild(row);
    welcomeEl.hidden = true;
    row.scrollIntoView({ behavior: "smooth", block: "end" });
    return row;
  }

  function renderHistory() {
    messagesEl.replaceChildren();
    if (!history.length) {
      welcomeEl.hidden = false;
      return;
    }
    welcomeEl.hidden = true;
    history.forEach((item) => addMessage(item.role, item.text));
  }

  function openSettings() {
    $("apiKeyInput").value = apiKey;
    $("modelSelect").value = model;
    $("settingsStatus").textContent = "";
    modal.hidden = false;
    $("apiKeyInput").focus();
  }

  function closeSettings() {
    modal.hidden = true;
  }

  function updateConnection() {
    $("connectionLabel").textContent = apiKey ? "Gemini connected · " + model : "AI not connected";
    $("topSettingsBtn").innerHTML = apiKey ? "AI settings <span>↗</span>" : "Connect AI <span>↗</span>";
  }

  function setBusy(value) {
    busy = value;
    sendBtn.disabled = value;
    input.disabled = value;
    sendBtn.innerHTML = value ? "…" : "<span>↑</span>";
  }

  function friendlyError(error) {
    const message = String(error && error.message ? error.message : error);
    if (/API_KEY_INVALID|invalid api key|API key not valid/i.test(message)) return "That API key was rejected. Check the key and try again.";
    if (/quota|RESOURCE_EXHAUSTED|rate limit/i.test(message)) return "The AI provider reports that the usage limit has been reached. Try again later or check your plan and limits.";
    if (/403|PERMISSION_DENIED/i.test(message)) return "Google did not allow this request. Check whether the key and selected model are available to your account.";
    if (/404|NOT_FOUND/i.test(message)) return "The selected model was not found or is unavailable for this key. Open settings and try another listed model.";
    if (/Failed to fetch|NetworkError|fetch/i.test(message)) return "Could not reach the AI service. Check your internet connection and try again.";
    return "The AI request failed. " + message.slice(0, 260);
  }

  async function askGemini(chatHistory) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    const contents = chatHistory.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }]
    }));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are Mitra, a practical personal AI assistant. Be clear, truthful, calm and useful. Explain unfamiliar concepts simply. Never claim to perform actions you have not performed. Do not request passwords or secrets." }]
        },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });
    let data;
    try { data = await response.json(); } catch { throw new Error("The AI service returned an unreadable response."); }
    if (!response.ok) {
      const apiMessage = data && data.error && data.error.message ? data.error.message : "HTTP " + response.status;
      throw new Error(apiMessage);
    }
    const answer = data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map((part) => part.text || "").join("").trim()
      : "";
    if (!answer) throw new Error("The AI returned no text. It may have blocked the prompt or ended without an answer.");
    return answer;
  }

  async function sendMessage(prefilled) {
    if (busy) return;
    const text = (typeof prefilled === "string" ? prefilled : input.value).trim();
    if (!text) return;
    if (!apiKey) {
      openSettings();
      $("settingsStatus").textContent = "Add your Gemini API key before sending a message.";
      input.value = text;
      return;
    }

    history.push({ role: "user", text, time: Date.now() });
    persistHistory();
    addMessage("user", text);
    input.value = "";
    resizeInput();
    setBusy(true);

    const typingRow = document.createElement("div");
    typingRow.className = "message assistant";
    typingRow.innerHTML = '<div class="avatar">M</div><div class="message-body"><div class="message-label">MITRA IS THINKING</div><div class="typing"><span></span><span></span><span></span></div></div>';
    messagesEl.appendChild(typingRow);
    typingRow.scrollIntoView({ behavior: "smooth", block: "end" });

    try {
      // Only send the latest 20 turns to keep requests smaller.
      const context = history.slice(-20).map(({ role, text: content }) => ({ role, text: content }));
      const answer = await askGemini(context);
      typingRow.remove();
      history.push({ role: "assistant", text: answer, time: Date.now() });
      history = history.slice(-80);
      persistHistory();
      addMessage("assistant", answer);
    } catch (error) {
      typingRow.remove();
      addMessage("assistant", friendlyError(error), { error: true });
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  }

  $("settingsBtn").addEventListener("click", openSettings);
  $("topSettingsBtn").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeSettings(); });
  $("saveSettingsBtn").addEventListener("click", () => {
    const key = $("apiKeyInput").value.trim();
    if (!key) {
      $("settingsStatus").textContent = "Paste an API key first.";
      return;
    }
    apiKey = key;
    model = $("modelSelect").value;
    updateConnection();
    closeSettings();
    showToast("Key loaded for this tab. Send a message to test the connection.");
  });
  $("disconnectBtn").addEventListener("click", () => {
    apiKey = "";
    $("apiKeyInput").value = "";
    updateConnection();
    closeSettings();
    showToast("Disconnected. Your key has been cleared from this tab.");
  });
  sendBtn.addEventListener("click", () => sendMessage());
  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => sendMessage(button.dataset.prompt));
  });
  $("newChatBtn").addEventListener("click", () => {
    if (busy) return;
    history = [];
    persistHistory();
    renderHistory();
    input.value = "";
    resizeInput();
    $("sidebar").classList.remove("open");
  });
  $("memoryNav").addEventListener("click", () => {
    showToast("Saved notes are not implemented yet. Conversation history stays on this device.");
  });
  $("chatNav").addEventListener("click", () => {
    $("sidebar").classList.remove("open");
    input.focus();
  });
  $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSettings();
  });

  renderHistory();
  updateConnection();
})();