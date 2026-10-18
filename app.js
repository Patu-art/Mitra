(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const KEY_NAME = "mitra-chat-history-v1";
  const messagesEl = $("messages");
  const welcomeEl = $("welcome");
  const modal = $("settingsModal");
  const voiceBtn = document.createElement("button");
  voiceBtn.id = "voiceBtn";
  voiceBtn.type = "button";
  voiceBtn.className = "voice-btn";
  voiceBtn.setAttribute("aria-label", "Speak to Mitra");
  voiceBtn.textContent = "🎙";
  const voiceStatus = document.createElement("span");
  voiceStatus.id = "voiceStatus";
  voiceStatus.setAttribute("aria-live", "polite");
  voiceStatus.textContent = "Tap the microphone and speak";

  function setupVoiceUi() {
    const composer = $("composer");
    const textarea = $("messageInput");
    const send = $("sendBtn");
    const hint = document.querySelector(".composer-hint");
    const bottom = composer && composer.querySelector(".composer-bottom");
    if (!composer || !bottom) return;

    composer.classList.add("assistant-composer");
    if (textarea) textarea.hidden = false;
    if (send) send.hidden = false;
    if (hint) hint.hidden = false;

    const voiceDock = document.createElement("div");
    voiceDock.className = "voice-dock";
    voiceDock.append(voiceBtn, voiceStatus);
    bottom.insertBefore(voiceDock, bottom.firstChild);

    const disclaimer = document.querySelector(".disclaimer");
    if (disclaimer) disclaimer.textContent = "Text replies work when an AI connection is available. Voice input depends on browser support; spoken replies use your device’s available speech voice.";
    const welcomeCopy = document.querySelector(".welcome-copy");
    if (welcomeCopy) welcomeCopy.textContent = "A voice-first personal system for quick questions, thinking out loud, and getting things done. Type for now; use the mic when you’re ready.";
    const modelSelect = $("modelSelect");
    if (modelSelect) {
      modelSelect.replaceChildren();
      [["gemini-3.8-flash","Gemini 3.8 Flash"],["gemini-3.5-flash-lite","Gemini 3.5 Flash-Lite"],["gemini-2.5-flash","Gemini 2.5 Flash (legacy access may be limited)"]].forEach(([value,label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        modelSelect.append(option);
      });
      modelSelect.value = "gemini-3.8-flash";
    }
  }
  let apiKey = "";
  let model = "gemini-3.8-flash";
  let history = loadHistory();
  let busy = false;
  let listening = false;
  let recognition = null;

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY_NAME) || "[]");
      return Array.isArray(value) ? value.slice(-80) : [];
    } catch { return []; }
  }

  function persistHistory() {
    try { localStorage.setItem(KEY_NAME, JSON.stringify(history.slice(-80))); }
    catch { showToast("Browser storage is unavailable. This conversation may not be saved."); }
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
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
    label.textContent = role === "user" ? "YOU · VOICE" : "MITRA";
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
    if (!history.length) { welcomeEl.hidden = false; return; }
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

  function closeSettings() { modal.hidden = true; }

  function updateConnection() {
    $("connectionLabel").textContent = apiKey ? "Gemini ready · " + model : "AI not connected";
    $("topSettingsBtn").innerHTML = apiKey ? "AI settings <span>↗</span>" : "Connect AI <span>↗</span>";
  }

  function setBusy(value) {
    busy = value;
    voiceBtn.disabled = value;
    voiceBtn.classList.toggle("working", value);
    if (value) {
      voiceStatus.textContent = "Mitra is thinking…";
      voiceBtn.setAttribute("aria-label", "Mitra is thinking");
    } else if (!listening) {
      voiceStatus.textContent = "Tap the microphone and speak";
      voiceBtn.setAttribute("aria-label", "Speak to Mitra");
    }
  }

  function friendlyError(error) {
    const message = String(error && error.message ? error.message : error);
    if (/API_KEY_INVALID|API key not valid|invalid api key/i.test(message)) {
      return "Google rejected this API key. In Google AI Studio, create a new API key, then paste it into Mitra's settings. Do not share the key in chat.";
    }
    if (/reported as leaked|API key was reported as leaked/i.test(message)) {
      return "Google has blocked this key because it was reported as exposed. Create a replacement key in Google AI Studio and keep it private.";
    }
    if (/HTTP 503|high demand|UNAVAILABLE|HTTP 502|HTTP 504/i.test(message)) return "Google’s AI service is temporarily overloaded. I tried again automatically, but it is still busy. Wait a little and try again.";
    if (/quota|RESOURCE_EXHAUSTED|rate limit/i.test(message)) {
      return "Google says the API usage limit has been reached. Check your Gemini API quota or try again later.";
    }
    if (/403|PERMISSION_DENIED|permission/i.test(message)) {
      return "Google denied this request. Check that the key is active and allowed to use the Gemini API.";
    }
    if (/404|NOT_FOUND|model.*not found/i.test(message)) {
      return "Google could not find this model. Open AI settings and select a currently supported model.";
    }
    if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return "Mitra could not reach Google. Check your internet connection and try again.";
    }
    return "Gemini error: " + message.slice(0, 350);
  }

  async function askGemini(chatHistory) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    const contents = chatHistory.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }]
    }));
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Mitra, a practical voice-first personal AI assistant. Speak naturally and concisely, as in a real conversation. Be clear, truthful, calm and useful. Explain unfamiliar concepts simply. Never claim to perform actions you have not performed. Do not request passwords or secrets. Your replies will be spoken aloud, so avoid markdown tables, long headings, and visual-only formatting." }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      })
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("Google returned an unreadable response (HTTP " + response.status + ")."); }
    if (!response.ok) {
      const detail = data && data.error && data.error.message ? data.error.message : "HTTP " + response.status;
      throw new Error("HTTP " + response.status + " — " + detail);
    }
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const answer = parts ? parts.map((part) => part.text || "").join("").trim() : "";
    if (!answer) throw new Error("Google returned no text. The response may have been blocked or empty.");
    return answer;
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      showToast("Your browser cannot speak replies. Try Chrome on Android or desktop.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onerror = () => showToast("Mitra's reply appeared, but speech playback failed.");
    window.speechSynthesis.speak(utterance);
  }

  function localReply(text) {
    const value = text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
    if (/^(hi|hello|hey|hii|heyy|yo|sup)( mitra)?$/.test(value)) return "Hey. I'm here. You can type a message below, or try the microphone when you're ready.";
    if (/^(how are you|how are you doing|whats up|what's up)( mitra)?$/.test(value)) return "I'm running and ready to help. My full AI brain isn't connected yet, but basic local replies work.";
    if (/^(what is your name|whats your name|who are you|introduce yourself)$/.test(value)) return "I'm Mitra — your personal assistant project. Right now I can handle a few simple offline messages; broader conversations need an AI connection.";
    if (/^(thanks|thank you|thx|ty)$/.test(value)) return "You're welcome.";
    if (/^(good morning|good afternoon|good evening|good night)$/.test(value)) return "Hey. Hope your day is going alright. What are we working on?";
    if (/^(help|what can you do|commands)$/.test(value)) return "For now, I can respond to a few basic messages offline. Connect an AI provider in Settings for general questions. The mic uses your browser's speech recognition, and replies are spoken using a voice available on your device.";
    if (/^(are you online|are you connected|do you work offline)$/.test(value)) return apiKey ? "An AI provider is connected for this tab." : "The interface and a few basic replies work offline. General AI answers need an online model connection.";
    return null;
  }

  async function sendMessage(text) {
    if (busy) return;
    text = String(text || "").trim();
    if (!text) return;
    const offlineAnswer = !apiKey ? localReply(text) : null;
    if (!apiKey && !offlineAnswer) {
      addMessage("user", text);
      openSettings();
      $("settingsStatus").textContent = "This needs an AI provider. Basic greetings and help work offline.";
      return;
    }
    if (offlineAnswer) {
      history.push({ role: "user", text, time: Date.now() }, { role: "assistant", text: offlineAnswer, time: Date.now() });
      history = history.slice(-80);
      persistHistory();
      addMessage("user", text);
      addMessage("assistant", offlineAnswer);
      speak(offlineAnswer);
      return;
    }

    history.push({ role: "user", text, time: Date.now() });
    history = history.slice(-80);
    persistHistory();
    addMessage("user", text);
    setBusy(true);
    const typingRow = document.createElement("div");
    typingRow.className = "message assistant";
    typingRow.innerHTML = '<div class="avatar">M</div><div class="message-body"><div class="message-label">MITRA IS THINKING</div><div class="typing"><span></span><span></span><span></span></div></div>';
    messagesEl.appendChild(typingRow);
    typingRow.scrollIntoView({ behavior: "smooth", block: "end" });

    try {
      const context = history.slice(-20).map(({ role, text: content }) => ({ role, text: content }));
      let answer;
      // Retry temporary server overloads with exponential backoff.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          answer = await askGemini(context);
          break;
        } catch (error) {
          const temporary = /HTTP (503|502|504|429)|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED/i.test(String(error && error.message));
          if (!temporary || attempt === 2) throw error;
          voiceStatus.textContent = "Google is busy. Retrying… (" + (attempt + 1) + "/2)";
          await new Promise((resolve) => window.setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
      typingRow.remove();
      history.push({ role: "assistant", text: answer, time: Date.now() });
      history = history.slice(-80);
      persistHistory();
      addMessage("assistant", answer);
      speak(answer);
    } catch (error) {
      typingRow.remove();
      addMessage("assistant", friendlyError(error), { error: true });
      speak(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  function stopListening() {
    listening = false;
    voiceBtn.classList.remove("listening");
    voiceBtn.textContent = "🎙";
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
    if (!busy) voiceStatus.textContent = "Tap the microphone and speak";
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice input is not supported by this browser. Open Mitra in Chrome and allow microphone access.");
      return;
    }
    if (!apiKey) {
      openSettings();
      $("settingsStatus").textContent = "Add your Gemini API key before speaking to Mitra.";
      return;
    }
    if (busy || listening) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalTranscript = "";
    recognition.onstart = () => {
      listening = true;
      voiceBtn.classList.add("listening");
      voiceBtn.textContent = "■";
      voiceStatus.textContent = "Listening… tap stop when finished";
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      voiceStatus.textContent = (finalTranscript + interim).trim() || "Listening…";
    };
    recognition.onerror = (event) => {
      const errors = {
        "not-allowed": "Microphone permission was denied. Allow it in your browser settings.",
        "no-speech": "I didn't hear speech. Tap the microphone and try again.",
        "network": "Browser speech recognition needs a network connection. Check your internet."
      };
      showToast(errors[event.error] || "Voice input error: " + event.error);
    };
    recognition.onend = () => {
      const transcript = finalTranscript.trim();
      listening = false;
      voiceBtn.classList.remove("listening");
      voiceBtn.textContent = "🎙";
      if (transcript) sendMessage(transcript);
      else if (!busy) voiceStatus.textContent = "Tap the microphone and speak";
    };
    try { recognition.start(); }
    catch { showToast("Could not start the microphone. Wait a moment and try again."); }
  }

  $("settingsBtn").addEventListener("click", openSettings);
  $("topSettingsBtn").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", closeSettings);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeSettings(); });
  $("saveSettingsBtn").addEventListener("click", () => {
    const key = $("apiKeyInput").value.trim().replace(/^["']|["']$/g, "");
    if (!key) {
      $("settingsStatus").textContent = "Paste an API key first.";
      return;
    }
    apiKey = key;
    model = $("modelSelect").value;
    updateConnection();
    closeSettings();
    showToast("Key loaded for this tab. Tap the microphone to test the connection.");
  });
  $("disconnectBtn").addEventListener("click", () => {
    apiKey = "";
    $("apiKeyInput").value = "";
    updateConnection();
    closeSettings();
    showToast("Disconnected. Your key has been cleared from this tab.");
  });
  $("sendBtn").addEventListener("click", () => {
    const field = $("messageInput");
    const value = field.value;
    field.value = "";
    field.style.height = "auto";
    sendMessage(value);
  });
  $("messageInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("sendBtn").click();
    }
  });
  $("messageInput").addEventListener("input", (event) => {
    const field = event.currentTarget;
    field.style.height = "auto";
    field.style.height = Math.min(field.scrollHeight, 180) + "px";
  });
  voiceBtn.addEventListener("click", () => {
    if (listening) stopListening();
    else startListening();
  });
  $("newChatBtn").addEventListener("click", () => {
    if (busy) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    history = [];
    persistHistory();
    renderHistory();
    $("sidebar").classList.remove("open");
    voiceStatus.textContent = "Tap the microphone and speak";
  });
  $("memoryNav").addEventListener("click", () => showToast("Long-term notes are not implemented yet. Conversation history stays in this browser."));
  $("chatNav").addEventListener("click", () => $("sidebar").classList.remove("open"));
  $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeSettings(); stopListening(); } });

  setupVoiceUi();
  renderHistory();
  updateConnection();
})();