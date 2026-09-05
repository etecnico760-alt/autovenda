const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const conversas = {};

const SUPABASE_URL = "https://ckwyxmdfhwcztkrbbnph.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrd3l4bWRmaHdjenRrcmJibnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzYwNTYsImV4cCI6MjA5MzUxMjA1Nn0.Vybkz6tgu2BBhkmjYG3LU9SuCX-LdVTwxd1PE_UaH-E";

async function salvarLead(telefone, mensagem, produto) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ telefone, mensagem, produto })
    });
    console.log("Lead salvo, status:", res.status);
  } catch (err) {
    console.error("Erro ao salvar lead:", err.message);
  }
}

async function buscarLeads() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  });
  return await res.json();
}

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
  try {
    const leads = await buscarLeads();
    res.json(leads);
  } catch (err) {
    res.json({ error: err.message });
  }
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
  console.log("Webhook recebido!");
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (msg && msg.type === "text") {
      const texto = msg.text.body;
      const telefone = msg.from;

      console.log("Mensagem de", telefone, ":", texto);
      const produto = detectarProduto(texto);
      await salvarLead(telefone, texto, produto.nome);

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

  if (msg.includes("curiosidades") || msg.includes("segredos") || msg.includes("biblia") || msg.includes("bíblia")) {
    return {
      nome: "Segredos e Curiosidades Ocultas da Bíblia",
      preco: "R$19,90",
      link: "https://kiwify.app/PmzGa2h",
      descricao: "Descubra segredos e curiosidades que a maioria das pessoas nunca soube sobre a Bíblia. Conteúdo revelador e fascinante para quem quer aprofundar sua fé e conhecimento bíblico."
    };
  }

  if (msg.includes("devocional") || msg.includes("ferida") || msg.includes("feridas") ||
      msg.includes("curad") || msg.includes("cura emocional") || msg.includes("deus") ||
      msg.includes("restaura") || msg.includes("paz") || msg.includes("companhia") ||
      msg.includes("libertar") || msg.includes("valor")) {
    return {
      nome: "Feridas Que Deus Vê: 21 Dias de Restauração",
      preco: "R$9,90",
      link: "https://kiwify.app/e11dvCH",
      descricao: "Devocional de 21 dias para mulheres que carregam dores que ninguém vê, mas Deus vê. Inclui versículo, reflexão e oração guiada para cada dia, além de um bônus de 7 declarações de identidade em Cristo."
    };
  }

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

  if (msg.includes("zenfit") || msg.includes("colageno") || msg.includes("colágeno") ||
      msg.includes("peptideo") || msg.includes("peptídeo")) {
    return {
      nome: "ZenFit Caps",
      preco: "a partir de R$297,00",
      link: "https://saude-beleza.site/zenfitcaps/?pv=prodzxk5&af=afilxydg7m",
      descricao: "Suplemento à base de peptídeos bioativos e colágeno hidrolisado tipo 2 que atua no sinal de saciedade do corpo, reduzindo a fome e o inchaço sem estimulantes. Ajuda a emagrecer de forma natural, sem dieta restritiva ou efeito rebote. Disponível em kits (2, 3 ou 5 caixas) com condições especiais direto da fábrica."
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
    conversas[telefone] = { produto, historico: [] };
  }

  const { produto, historico } = conversas[telefone];
  historico.push({ role: "user", content: mensagem });
  if (historico.length > 20) conversas[telefone].historico = historico.slice(-20);

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
- Seja simpático e motivador
- Se o produto for bíblico (devocional ou curiosidades), use um tom acolhedor e espiritual, sem ser exagerado`;

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
