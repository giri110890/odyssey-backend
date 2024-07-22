var app = require('./app')
var config = require('./config/config')

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server is running on http://localhost:${config.PORT}`);
});

// Gracefully close server and connections on application exit
process.on('SIGINT', () => {
  console.log('Closing server and cleaning up resources...');
  console.log('Server closed.');
  // No need to manually close the DynamoDB connections
  process.exit(0);
});