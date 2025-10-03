// Script simple para desarrollo con HTTPS
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  // Certificados auto-firmados para desarrollo local
  // NOTA: El navegador mostrará una advertencia de seguridad que puedes ignorar
  key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost-key.pem'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost.pem'), 'utf8'),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, (err) => {
    if (err) throw err;
    console.log('> Ready on https://localhost:3001');
  });
});