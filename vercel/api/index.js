const express = require('express');
const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Vercel Node.js API!' });
});

// Example: add more routes as needed
// app.get('/api/your-endpoint', (req, res) => { ... });

module.exports = app;

// For local dev
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
