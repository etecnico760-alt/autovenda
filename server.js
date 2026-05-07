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
    const apiKey = process.env.GROQ_API_KEY;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: mensagem }]
      })
    });
    const data = await response.json();
    console.log("Groq:", JSON.stringify(data));
    const resposta = data.choices?.[0]?.message?.content || "Sem resposta";
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
