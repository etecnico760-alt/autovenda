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

const MODELOS_GROQ = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192"
];

let modeloAtual = MODELOS_GROQ[0];

async function encontrarModeloFuncionando(apiKey) {
  for (const modelo of MODELOS_GROQ) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelo, messages: [{ role: "user", content: "oi" }], max_tokens: 5 })
      });
      const data = await res.json();
      if (res.status === 200 && data.choices) {
        console.log("Modelo funcionando:", modelo);
        modeloAtual = modelo;
        return modelo;
      }
    } catch (e) {}
  }
  return null;
}

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
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg && msg.type === "text") {
      const texto = msg.text.body;
      const telefone = msg.from;
      console.log("Mensagem de", telefone, ":", texto);
      const produto = detectarProduto(texto);

      // Inicia conversa ou troca de produto se cliente mandar palavra-chave diferente
      if (!conversas[telefone]) {
        conversas[telefone] = { produto, historico: [] };
      } else if (produto.nome !== conversas[telefone].produto.nome && produto.nome !== "Emagreça de Forma Saudável e Duradoura") {
        // Cliente pediu produto diferente — reinicia conversa
        console.log("Trocando produto para:", produto.nome);
        conversas[telefone] = { produto, historico: [] };
      }

      salvarLeadLocal(telefone, texto, conversas[telefone].produto.nome);
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
    res.json({ voce: mensagem, bot: resposta, modelo: modeloAtual });
  } catch (err) {
    res.json({ voce: mensagem, bot: "Erro: " + err.message });
  }
});

function detectarProduto(mensagem) {
  const msg = mensagem.toLowerCase();
  if (msg.includes("curiosidades") || msg.includes("segredos") || msg.includes("biblia") || msg.includes("bíblia")) {
    return { nome: "Segredos e Curiosidades Ocultas da Bíblia", preco: "R$19,90", link: "https://kiwify.app/PmzGa2h", descricao: "eBook com segredos e curiosidades ocultas da Bíblia que a maioria nunca soube." };
  }
  if (msg.includes("devocional") || msg.includes("ferida") || msg.includes("feridas") || msg.includes("curad") || msg.includes("cura emocional") || msg.includes("deus") || msg.includes("restaura") || msg.includes("paz") || msg.includes("companhia") || msg.includes("libertar") || msg.includes("valor")) {
    return { nome: "Feridas Que Deus Vê: 21 Dias de Restauração", preco: "R$9,90", link: "https://kiwify.app/e11dvCH", descricao: "Devocional de 21 dias para mulheres que carregam dores que ninguém vê, mas Deus vê." };
  }
  if (msg.includes("diabet") || msg.includes("açúcar") || msg.includes("glicose") || msg.includes("doce vida")) {
    return { nome: "DOCE VIDA - Receitas para Diabéticos", preco: "R$37,90", link: "https://go.hotmart.com/P99475025N", descricao: "eBook com receitas deliciosas e saudáveis para diabéticos." };
  }
  if (msg.includes("tiktok") || msg.includes("viralizar") || msg.includes("vender online") || msg.includes("renda")) {
    return { nome: "Segredos para Viralizar no TikTok", preco: "R$27,90", link: "https://go.hotmart.com/D100124946B", descricao: "Aprenda a criar conteúdo viral no TikTok e vender todos os dias." };
  }
  if (msg.includes("zenfit") || msg.includes("colageno") || msg.includes("colágeno") || msg.includes("peptideo") || msg.includes("peptídeo")) {
    return { nome: "ZenFit Caps", preco: "a partir de R$297,00", link: "https://saude-beleza.site/zenfitcaps/?pv=prodzxk5&af=afilxydg7m", descricao: "Suplemento para emagrecer de forma natural, sem dieta restritiva ou efeito rebote." };
  }
  return { nome: "Emagreça de Forma Saudável e Duradoura", preco: "R$37,90", link: "https://go.hotmart.com/H99214246H", descricao: "Método completo para emagrecer sem efeito sanfona." };
}

async function chamarGroq(telefone, mensagem) {
  const apiKey = process.env.GROQ_API_KEY;
  const { produto, historico } = conversas[telefone];

  historico.push({ role: "user", content: mensagem });
  if (historico.length > 20) conversas[telefone].historico = historico.slice(-20);

  const systemPrompt = `Você é um vendedor humano e simpático no WhatsApp. Responda SEMPRE em português brasileiro.

PRODUTO QUE VOCÊ VENDE:
Nome: ${produto.nome}
Preço: ${produto.preco}
Descrição: ${produto.descricao}
Link: ${produto.link}

REGRAS OBRIGATÓRIAS:
- Mensagens CURTAS, máximo 3 linhas, sem listas com bullet points
- Tom natural de WhatsApp, como um amigo conversando
- Na primeira mensagem: desperte curiosidade com 1 frase impactante e faça UMA pergunta curta
- Se o cliente demonstrar interesse: apresente 1 ou 2 benefícios principais de forma simples
- Se o cliente perguntar o preço: informe o preço e mande o link IMEDIATAMENTE na mesma mensagem
- Se o cliente disser "quero", "me manda", "como compro" ou qualquer sinal de querer comprar: mande o link IMEDIATAMENTE
- NUNCA use bullet points, listas ou asteriscos em excesso
- NUNCA mude de produto, fale SOMENTE sobre ${produto.nome}
- Se o produto for bíblico, use tom acolhedor e espiritual`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modeloAtual, messages: [{ role: "system", content: systemPrompt }, ...conversas[telefone].historico] })
    });
    const data = await res.json();

    if (data.error?.code === "model_decommissioned" || data.error?.code === "model_not_found" || res.status === 400 || res.status === 404) {
      console.log("Modelo parou, buscando alternativo...");
      const novoModelo = await encontrarModeloFuncionando(apiKey);
      if (!novoModelo) return "Desculpe, estou com dificuldades técnicas. Tente novamente em instantes!";

      const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modeloAtual, messages: [{ role: "system", content: systemPrompt }, ...conversas[telefone].historico] })
      });
      const data2 = await res2.json();
      const resposta2 = data2.choices?.[0]?.message?.content || "Desculpe, tente novamente!";
      conversas[telefone].historico.push({ role: "assistant", content: resposta2 });
      return resposta2;
    }

    const resposta = data.choices?.[0]?.message?.content || "Desculpe, tente novamente!";
    conversas[telefone].historico.push({ role: "assistant", content: resposta });
    return resposta;
  } catch (err) {
    console.error("Erro Groq:", err.message);
    return "Desculpe, tive um problema técnico. Tente novamente!";
  }
}

async function enviarWhatsApp(telefone, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || "1151104828086519";
  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: mensagem } })
    });
  } catch (err) {
    console.error("Erro WhatsApp:", err.message);
  }
}

const apiKey = process.env.GROQ_API_KEY;
encontrarModeloFuncionando(apiKey).then(m => {
  if (m) console.log("Modelo ativo ao iniciar:", m);
  else console.log("Nenhum modelo disponível!");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log("Rodando na porta " + PORT));
