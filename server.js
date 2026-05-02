const express = require("express");
const cors = require("cors");        // ← estava faltando isso
const app = express();

app.use(cors());                     // ← e isso
app.use(express.json());             // ← bom ter também

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
