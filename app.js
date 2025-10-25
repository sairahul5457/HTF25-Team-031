let recognition;
let transcriptEl = document.getElementById("transcript");
let resultEl = document.getElementById("result");
let recordBtn = document.getElementById("record");
let stopBtn = document.getElementById("stop");
let sendBtn = document.getElementById("send");

if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
  transcriptEl.textContent = "Your browser does not support the Web Speech API. Use Chrome or Edge.";
  recordBtn.disabled = true;
} else {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;

  let finalTranscript = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      let t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }
    transcriptEl.textContent = finalTranscript + interim;
    sendBtn.disabled = finalTranscript.trim().length === 0;
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error", e);
    transcriptEl.textContent = "Speech recognition error: " + e.error;
  };

  recognition.onend = () => {
    stopBtn.disabled = true;
    recordBtn.disabled = false;
  };

  recordBtn.onclick = () => {
    finalTranscript = "";
    transcriptEl.textContent = "Listening...";
    recognition.start();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  };

  stopBtn.onclick = () => {
    recognition.stop();
    stopBtn.disabled = true;
  };

  sendBtn.onclick = async () => {
    const instr = transcriptEl.textContent.trim();
    if (!instr) return;
    resultEl.textContent = "Sending to server...";
    try {
      const res = await fetch("/voice-command", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({text: instr})
      });
      const j = await res.json();
      resultEl.textContent = JSON.stringify(j, null, 2);
    } catch (e) {
      resultEl.textContent = "Request failed: " + e.toString();
    }
  };
}