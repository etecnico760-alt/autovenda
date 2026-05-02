const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});

app.get("/produtos", (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Rodando na porta " + PORT);
});
