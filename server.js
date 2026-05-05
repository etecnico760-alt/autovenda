const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});

app.get("/testar", async (req, res) => {
  const mensagem = req.query.msg || "Olá!";
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: mensagem }] }]
      })
    });
    const text = await response.text();
    console.log("Raw Gemini:", text);
    const data = JSON.parse(text);
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
    res.json({ voce: mensagem, bot: resposta });
  } catch (err) {
    console.error("Erro:", err.message);
    res.json({ voce: mensagem, bot: "Erro: " + err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
