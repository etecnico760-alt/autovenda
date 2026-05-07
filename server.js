const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.json({ error: "Preencha todos os campos." });
  res.json({ success: true });
});

app.post("/cadastro", async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.json({ error: "Preencha todos os campos." });
  res.json({ success: true });
});

app.get("/leads", async (req, res) => {
  const { data, error } = await supabase.from("leads").select("*").order("id", { ascending: false }).limit(50);
  if (error) return res.json([]);
  res.json(data);
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
      await supabase.from("leads").insert({ telefone, mensagem: texto });
      const resposta = await chamarGroq(texto);
      await enviarWhatsApp(telefone, resposta);
    }
  }
  res.sendStatus(200);
});

app.get("/testar", async (req, res) => {
  const mensagem = req.query.msg || "Olá!";
  try {
    const resposta = await chamarGroq(mensagem);
    res.json({ voce: mensagem, bot: resposta });
  } catch (err) {
    res.json({ voce: mensagem, bot: "Erro: " + err.message });
  }
});

async function chamarGroq(mensagem) {
  const apiKey = process.env.GROQ_API_KEY;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Você é um assistente de vendas simpático do AutoVenda. Responda sempre em português brasileiro. O AutoVenda custa R$47/mês e oferece bot com IA, respostas automáticas 24h, captação de leads e dashboard. Seja positivo e mostre o valor do produto." },
        { role: "user", content: mensagem }
      ]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resposta";
}

async function enviarWhatsApp(telefone, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = "1110093775517296";
  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: mensagem } })
  });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
