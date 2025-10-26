import os
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

import json
from flask import Flask, request, render_template, jsonify
import openai
from flask import Flask
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)




openai.api_key = os.environ.get("OPENAI_API_KEY")

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.json
    command = data.get("command", "")
    lang = data.get("lang", "python")
    prompt = (
        f"You are an intelligent coding assistant. Convert the natural language instruction below into clean, correct code for the requested language.\n"
        f"Instruction: {command}\nLanguage: {lang}\nRespond only with code, no explanations."
    )
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
        max_tokens=300
    )
    code = response.choices[0].message.content.strip()
    return jsonify({"code": code})

@app.route("/api/explain", methods=["POST"])
def explain():
    code = request.json.get("code", "")
    prompt = f"Explain the following code snippet clearly for a beginner:\n{code}"
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
        max_tokens=200
    )
    explanation = response.choices[0].message.content.strip()
    return jsonify({"explanation": explanation})

app.run(debug=True, port=5000)
