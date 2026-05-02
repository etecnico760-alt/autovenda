const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// teste simples
app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

// rota produtos
app.get("/produtos", (req, res) => {
  res.json([]);
});

// rota teste responder
app.post("/responder", (req, res) => {
  res.json({ resposta: "Funcionando!" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
