import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Minimal Express working!' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.listen(3003, () => {
  console.log('Minimal server on port 3003');
}); 