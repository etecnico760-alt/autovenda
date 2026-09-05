const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const conversas = {};
const LEADS_FILE = path.join(__dirname, "leads.json");

function carregarLeads() {
  try {
    if (fs.existsSync(LEADS_FILE)) return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
  } catch (e) {}
  return [];
}

function salvarLeadLocal(telefone, mensagem, produto) {
  try {
    const leads = carregarLeads();
    leads.push({ id: leads.length + 1, telefone, mensagem, produto, data: new Date().toISOString() });
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    console.log("Lead salvo:", telefone, produto);
  } catch (err) {
    console.error("Erro ao salvar lead:", err.message);
  }
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
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
app.get("/leads", (req, res) => res.json(carregarLeads()));

app.get("/webhook", (req, res) => {
  const token = "autovenda123";
  if (req.query["hub.verify_token"] === token && req.query["hub.mode"] === "subscribe") {
    res.send(req.query["hub.challenge"]);
  } else res.sendStatus(403);
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
      salvarLeadLocal(telefone, texto, produto.nome);
      console.log("Chamando Groq...");
      const resposta = await chamarGroq(telefone, texto);
      console.log("Resposta Groq:", resposta?.substring(0, 50));
      console.log("Enviando WhatsApp...");
      await enviarWhatsApp(telefone, resposta);
      console.log("WhatsApp enviado!");
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
    return { nome: "Segredos e Curiosidades Ocultas da Bíblia", preco: "R$19,90", link: "https://kiwify.app/PmzGa2h", descricao: "Descubra segredos e curiosidades que a maioria das pessoas nunca soube sobre a Bíblia." };
  }
  if (msg.includes("devocional") || msg.includes("ferida") || msg.includes("feridas") || msg.includes("curad") || msg.includes("cura emocional") || msg.includes("deus") || msg.includes("restaura") || msg.includes("paz") || msg.includes("companhia") || msg.includes("libertar") || msg.includes("valor")) {
    return { nome: "Feridas Que Deus Vê: 21 Dias de Restauração", preco: "R$9,90", link: "https://kiwify.app/e11dvCH", descricao: "Devocional de 21 dias para mulheres que carregam dores que ninguém vê, mas Deus vê." };
  }
  if (msg.includes("diabet") || msg.includes("açúcar") || msg.includes("glicose") || msg.includes("doce vida")) {
    return { nome: "DOCE VIDA - Receitas para Diabéticos", preco: "R$37,90", link: "https://go.hotmart.com/P99475025N", descricao: "eBook com receitas deliciosas e saudáveis para diabéticos. Inclui 3 bônus exclusivos!" };
  }
  if (msg.includes("tiktok") || msg.includes("viralizar") || msg.includes("vender online") || msg.includes("renda")) {
    return { nome: "Segredos para Viralizar no TikTok", preco: "R$27,90", link: "https://go.hotmart.com/D100124946B", descricao: "Aprenda a criar conteúdo viral no TikTok e vender todos os dias!" };
  }
  if (msg.includes("zenfit") || msg.includes("colageno") || msg.includes("colágeno") || msg.includes("peptideo") || msg.includes("peptídeo")) {
    return { nome: "ZenFit Caps", preco: "a partir de R$297,00", link: "https://saude-beleza.site/zenfitcaps/?pv=prodzxk5&af=afilxydg7m", descricao: "Suplemento para emagrecer de forma natural, sem dieta restritiva ou efeito rebote." };
  }
  return { nome: "Emagreça de Forma Saudável e Duradoura", preco: "R$37,90", link: "https://go.hotmart.com/H99214246H", descricao: "Método completo para emagrecer sem efeito sanfona. Inclui 3 bônus exclusivos!" };
}

async function chamarGroq(telefone, mensagem) {
  const apiKey = process.env.GROQ_API_KEY;
  console.log("GROQ_API_KEY presente:", !!apiKey);
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
- Se o produto for bíblico, use um tom acolhedor e espiritual`;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama3-8b-8192", messages: [{ role: "system", content: systemPrompt }, ...conversas[telefone].historico] })
    });
    const data = await response.json();
    console.log("Groq status:", response.status);
    if (data.error) console.error("Groq erro:", data.error);
    const resposta = data.choices?.[0]?.message?.content || "Sem resposta";
    conversas[telefone].historico.push({ role: "assistant", content: resposta });
    return resposta;
  } catch (err) {
    console.error("Erro Groq fetch:", err.message);
    return "Desculpe, tive um problema técnico. Tente novamente!";
  }
}

async function enviarWhatsApp(telefone, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || "1151104828086519";
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: mensagem } })
    });
    const data = await res.json();
    console.log("WhatsApp status:", res.status, JSON.stringify(data).substring(0, 100));
  } catch (err) {
    console.error("Erro WhatsApp:", err.message);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log("Rodando na porta " + PORT));
