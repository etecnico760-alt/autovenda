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

const conversas = {};

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
      const resposta = await chamarGroq(telefone, texto);
      await enviarWhatsApp(telefone, resposta);
    }
  }
  res.sendStatus(200);
});

app.get("/testar", async (req, res) => {
  const mensagem = req.query.msg || "Olá!";
  try {
    const resposta = await chamarGroq("teste", mensagem);
    res.json({ voce: mensagem, bot: resposta });
  } catch (err) {
    res.json({ voce: mensagem, bot: "Erro: " + err.message });
  }
});

function detectarProduto(mensagem) {
  const msg = mensagem.toLowerCase();
  if (msg.includes("diabet") || msg.includes("açúcar") || msg.includes("glicose") || msg.includes("doce vida")) {
    return {
      nome: "DOCE VIDA - Receitas para Diabéticos",
      preco: "R$37,90",
      link: "https://go.hotmart.com/P99475025N",
      descricao: "eBook com receitas deliciosas e saudáveis para diabéticos. Inclui 3 bônus exclusivos!"
    };
  }
  if (msg.includes("tiktok") || msg.includes("viralizar") || msg.includes("vender online") || msg.includes("renda")) {
    return {
      nome: "Segredos para Viralizar no TikTok",
      preco: "R$27,90",
      link: "https://go.hotmart.com/D100124946B",
      descricao: "Aprenda a criar conteúdo viral no TikTok e vender todos os dias!"
    };
  }
  return {
    nome: "Emagreça de Forma Saudável e Duradoura",
    preco: "R$37,90",
    link: "https://go.hotmart.com/H99214246H",
    descricao: "Método completo para emagrecer sem efeito sanfona. Inclui 3 bônus exclusivos!"
  };
}

async function chamarGroq(telefone, mensagem) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!conversas[telefone]) {
    const produto = detectarProduto(mensagem);
    conversas[telefone] = {
      produto,
      historico: []
    };
  }

  const { produto, historico } = conversas[telefone];

  historico.push({ role: "user", content: mensagem });

  if (historico.length > 20) {
    conversas[telefone].historico = historico.slice(-20);
  }

  const systemPrompt = `Você é um vendedor simpático e focado. Responda SEMPRE em português brasileiro.

VOCÊ SÓ PODE VENDER ESTE PRODUTO AGORA:
Nome: ${produto.nome}
Preço: ${produto.preco}
Descrição: ${produto.descricao}
Link: ${produto.link}

REGRAS ABSOLUTAS:
- Fale APENAS sobre este produto, nunca mencione outros produtos
- Não fale o preço logo de cara, primeiro apresente os benefícios
- Só informe o preço quando o cliente perguntar
- Só mande o link quando o cliente disser que quer comprar
- Termine sempre com uma pergunta para engajar
- Seja simpático e motivador`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversas[telefone].historico
      ]
    })
  });

  const data = await response.json();
  const resposta = data.choices?.[0]?.message?.content || "Sem resposta";

  conversas[telefone].historico.push({ role: "assistant", content: resposta });

  return resposta;
}

async function enviarWhatsApp(telefone, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || "1151104828086519";
  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: mensagem } })
  });
}

app.get("/registrar-numero", async (req, res) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", pin: "335007" })
  });
  const data = await response.json();
  res.json(data);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
