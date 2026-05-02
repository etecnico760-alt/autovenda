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

app.post("/webhook", (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg) {
      console.log("Mensagem recebida:", msg.from, msg.text?.body);
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
