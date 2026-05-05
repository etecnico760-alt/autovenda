const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});

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
      console.log("Mensagem de", telefone, ":", texto);

      // Salva o lead no Supabase
      await supabase.from("leads").insert({ telefone, mensagem: texto });

      // Chama o Gemini
      const resposta = await chamarGemini(texto);

      // Envia resposta pelo WhatsApp
      await enviarWhatsApp(telefone, resposta);
    }
  }
  res.sendStatus(200);
});

async function chamarGemini(mensagem) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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

async function enviarWhatsApp(telefone, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = "1110093775517296";
  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefone,
      type: "text",
      text: { body: mensagem }
    })
  });
}
app.get("/testar", async (req, res) => {
  const mensagem = req.query.msg || "Olá!";
  const resposta = await chamarGemini(mensagem);
  res.json({ 
    voce: mensagem, 
    bot: resposta 
  });
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
