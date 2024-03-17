import express from 'express';
import apiRoutes2 from './routes/threads.js';

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use('/threadRobo', apiRoutes2);

// Define the JSON message middleware at the end
app.use('/', async (req, res) => {
  try {
    res.json({ message: 'threadRobo-API is working perfectly!' });
  } catch (error) {
    res.status(500).json({ alert: 'threadRobo-API is not working!', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API is listening on http://localhost:${PORT}`);
});
