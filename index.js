const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { app } = require('./app.js');
dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

async function main () {
  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const port = process.env.PORT;
  app.listen(port, () => console.log(`Listening on port ${port}...`));
}

main().catch(err => console.log(err));
