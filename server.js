const express = require("express");

const app = express();

// rota raiz
app.get("/", (req, res) => {
  res.send("API online 🚀");
});

// rota teste
app.get("/produtos", (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
