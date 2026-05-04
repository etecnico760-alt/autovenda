const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});

app.get("/produtos", (req, res) => {
  res.json([]);
});

// Webhook do WhatsApp
app.get("/webhook", (req, res) => {
  const token = "autovenda123";
  if (req.query["hub.verify_token"] === token &&
      req.query["hub.mode"] === "subscribe") {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg && msg.type === "text") {
      const texto = msg.text.body;
      const telefone = msg.from;
      console.log("Mensagem recebida de", telefone, ":", texto);

      // Chama o Gemini
      const resposta = await chamarGemini(texto);
      console.log("Resposta da IA:", resposta);

      // Aqui vai enviar a resposta pelo WhatsApp (próximo passo)
    }
  }
  res.sendStatus(200);
});

async function chamarGemini(mensagem) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: mensagem }] }]
    })
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Não entendi 😅";
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
