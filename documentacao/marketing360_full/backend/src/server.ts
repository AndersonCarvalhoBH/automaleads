import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import routes from './api/routes';
import dotenv from 'dotenv';
import logger from './lib/logger';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ success:true, data: { status: 'ok' }}));

app.use('/api/v1', routes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info(`Server listening on ${port}`);
});
