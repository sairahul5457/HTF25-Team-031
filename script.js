const speakBtn = document.getElementById("speak-btn");
const output = document.getElementById("output");
const codeBlock = document.getElementById("code-block");
const copyBtn = document.getElementById("copy-btn");
const historyList = document.getElementById("history-list");
const languageSelect = document.getElementById("language-select");
const shareBtn = document.getElementById("share-btn");
const explainBtn = document.getElementById("explain-btn");
const themeToggle = document.getElementById("theme-toggle");
const syntaxErrorsDiv = document.getElementById("syntax-errors");

let recognition;
let history = [];

if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = () => output.textContent = "Listening...";
  recognition.onresult = async event => {
    const transcript = event.results[0][0].transcript;
    output.textContent = "You said: " + transcript;
    history.unshift({command: transcript});
    updateHistory();
    codeBlock.textContent = "Generating code...";
    Prism.highlightElement(codeBlock);
    await generateCode(transcript, languageSelect.value);
  };
  recognition.onerror = e => output.textContent = "Error recognizing speech.";
} else {
  output.textContent = "Speech recognition not supported in this browser.";
}

speakBtn.addEventListener("click", () => recognition && recognition.start());

async function generateCode(command, lang) {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({command, lang}),
    });
    const data = await response.json();
    if (data.code) {
      codeBlock.textContent = data.code;
      if (history.length) history[0].code = data.code;
      Prism.highlightElement(codeBlock);
      displaySyntaxIssues(data.code);
    } else {
      codeBlock.textContent = "No code generated.";
    }
  } catch (err) {
    codeBlock.textContent = "Error generating code.";
  }
}

function updateHistory() {
  historyList.innerHTML = "";
  history.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item.command + (item.code ? " → Code Generated" : "");
    historyList.appendChild(li);
  });
}

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(codeBlock.textContent);
  copyBtn.textContent = "Copied!";
  setTimeout(() => copyBtn.textContent = "Copy Code", 2000);
});

shareBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href + "?code=" + encodeURIComponent(codeBlock.textContent));
  shareBtn.textContent = "Link Copied!";
  setTimeout(() => shareBtn.textContent = "Share Code", 2000);
});

explainBtn.addEventListener("click", async () => {
  explainBtn.textContent = "Explaining...";
  const code = codeBlock.textContent;
  try {
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({code}),
    });
    const data = await response.json();
    alert(data.explanation || "No explanation received.");
  } catch {
    alert("Error explaining code.");
  }
  explainBtn.textContent = "Explain Code";
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

function displaySyntaxIssues(code) {
  syntaxErrorsDiv.textContent = "";

  if (languageSelect.value === "python" && /print\(/.test(code) && !code.includes(")")) {
    syntaxErrorsDiv.textContent = "Possible syntax error: unmatched parentheses in print statement.";
  }
}

languageSelect.addEventListener("change", () => {
  codeBlock.className = "language-" + languageSelect.value;
  if (history.length && history[0].code) Prism.highlightElement(codeBlock);
});
