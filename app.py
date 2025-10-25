import os
import re
import json
from flask import Flask, request, render_template, jsonify
import openai

openai.api_key = os.environ.get("OPENAI_API_KEY", "")

app = Flask(_name_, static_folder="static", template_folder="templates")

SYSTEM_PROMPT = """
You are a voice-enabled coding assistant that receives a plain-English developer instruction and outputs a single JSON object describing exactly one action to perform on the project's files.

The JSON object MUST have these fields:
- action: one of ["create_file", "replace_file", "insert_after_marker", "return_snippet"]
- path: path of the file (string). For create_file, path may be new.
- marker: (optional) when action is insert_after_marker — a string to search in the target file.
- content: the content to write (string). For replace_file, this will be the full new file content.
- explanation: short human text explaining what you did or suggest.

Only output valid JSON in the response (no extra commentary). If you cannot perform the action, set action to "return_snippet" and put a code snippet in content and explain why in explanation.
"""

def call_openai_for_action(instruction):
    # Build a chat completion to produce JSON
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": instruction}
    ]
    # Use gpt-4/others — change model name to match your account
    resp = openai.ChatCompletion.create(
        model="gpt-4o-mini", # replace with available model if needed
        messages=messages,
        temperature=0.0,
        max_tokens=800
    )
    text = resp["choices"][0]["message"]["content"].strip()
    # extract JSON: try to find a JSON object in the text
    m = re.search(r'(\{.*\})', text, re.S)
    json_text = m.group(1) if m else text
    try:
        action_obj = json.loads(json_text)
    except Exception as e:
        # fallback: return text as snippet
        action_obj = {
            "action": "return_snippet",
            "path": "",
            "content": text,
            "explanation": f"Failed to parse JSON from model: {str(e)}"
        }
    return action_obj

def apply_action(action_obj):
    action = action_obj.get("action")
    path = action_obj.get("path", "")
    content = action_obj.get("content", "")
    marker = action_obj.get("marker")
    safe_root = os.path.abspath(".")  # working directory safety baseline
    target = os.path.abspath(path) if path else None

    # Basic safety: file path must be inside repo working dir
    if target and not target.startswith(safe_root):
        return {"status":"error", "message":"Path outside working directory not allowed."}

    try:
        if action == "create_file":
            if os.path.exists(path):
                return {"status":"error", "message":"File already exists."}
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"status":"ok", "message":"File created.", "path":path}

        elif action == "replace_file":
            # Overwrite (create if missing)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"status":"ok", "message":"File replaced/created.", "path":path}

        elif action == "insert_after_marker":
            if not os.path.exists(path):
                return {"status":"error", "message":"Target file does not exist."}
            if marker is None:
                return {"status":"error", "message":"Marker required for insertion."}
            with open(path, "r", encoding="utf-8") as f:
                orig = f.read()
            idx = orig.find(marker)
            if idx == -1:
                return {"status":"error", "message":"Marker not found in file."}
            insert_pos = idx + len(marker)
            new = orig[:insert_pos] + "\n" + content + "\n" + orig[insert_pos:]
            with open(path, "w", encoding="utf-8") as f:
                f.write(new)
            return {"status":"ok", "message":"Inserted content after marker.", "path":path}

        elif action == "return_snippet":
            return {"status":"ok", "message":"Returned snippet.", "content":content}
        else:
            return {"status":"error", "message":"Unknown action."}
    except Exception as e:
        return {"status":"error", "message":str(e)}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/voice-command", methods=["POST"])
def voice_command():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"ok": False, "error":"Empty instruction"}), 400

    # Ask the language model for a concrete action (JSON)
    action_obj = call_openai_for_action(text)

    # Apply the action
    result = apply_action(action_obj)

    # include the model's explanation if present
    response = {
        "ok": True,
        "model_action": action_obj,
        "apply_result": result
    }
    return jsonify(response)

if _name_ == "_main_":
    app.run(debug=True, port=5000)