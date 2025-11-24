import express, { json } from 'express';
import routes from './routes.js';
import { setupSwagger } from './swagger.js';

const app = express();

app.use(json());
setupSwagger(app);
app.use('/api', routes);

export default app;
