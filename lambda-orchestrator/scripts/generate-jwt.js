import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

const token = jwt.sign(
  {
    type: 'service',
    service: 'postman-test'
  },
  jwtSecret,
  { expiresIn: '24h' }
);

console.log('\n=================================================');
console.log('JWT Token generado para pruebas en Postman');
console.log('=================================================');
console.log('\nToken (válido por 24 horas):');
console.log(token);
console.log('\n=================================================');
console.log('Usa este token en Postman:');
console.log(`Authorization: Bearer ${token}`);
console.log('=================================================\n');
