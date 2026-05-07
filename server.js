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
