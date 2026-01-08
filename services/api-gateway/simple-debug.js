console.log('Starting simple debug...');

try {
  const express = require('express');
  console.log('Express loaded');
  
  const app = express();
  console.log('Express app created');
  
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  console.log('Route added');
  
  const server = app.listen(3000, () => {
    console.log('Server started on port 3000');
  });
  
  setTimeout(() => {
    console.log('Closing server after 5 seconds...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }, 5000);
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}