import { writeFileSync } from 'fs';
import { stringify } from 'yaml';
import swaggerSpec from '../src/swagger.js';

writeFileSync('./openapi.yaml', stringify(swaggerSpec));
console.log('openapi.yaml de Orders API generated successfully');