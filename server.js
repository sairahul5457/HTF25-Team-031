import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("."));


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/generate", async (req, res) => {
  const { command, lang } = req.body;
  try {
    const messages = [
      { role: "system", content: "You are an intelligent coding assistant. Convert natural language instructions into clean, correct, well-formatted code in the requested programming language. Return only code, no explanations." },
      { role: "user", content: `Instruction: ${command}\nLanguage: ${lang}` }
    ];
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", 
      messages,
      max_tokens: 300,
    });
    const code = response.choices[0].message.content.trim();
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate code" });
  }
});

app.post("/api/explain", async (req, res) => {
  const { code } = req.body;
  try {
    const messages = [
      { role: "system", content: "You are a senior developer. Explain the given code snippet clearly for beginners." },
      { role: "user", content: code }
    ];
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
    });
    res.json({ explanation: response.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});
