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
        messages: [
          {
            role: "system",
            content: `Você é um assistente de vendas simpático e prestativo do AutoVenda, 
            um sistema de automação de WhatsApp para negócios brasileiros. 
            Responda sempre em português brasileiro de forma amigável e objetiva.
            Seu objetivo é tirar dúvidas dos clientes e ajudá-los a entender como o AutoVenda pode ajudar o negócio deles.
            O AutoVenda custa R$47/mês e oferece: bot de WhatsApp com IA, respostas automáticas 24h, 
            captação de leads automática e dashboard de controle.
            Seja sempre positivo e tente mostrar o valor do produto.`
          },
          { role: "user", content: mensagem }
        ]
      })
    });
    const data = await response.json();
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
