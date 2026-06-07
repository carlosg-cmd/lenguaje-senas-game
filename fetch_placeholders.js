const fs = require('fs');
const https = require('https');
const path = require('path');

const numeros = ['1','2','3','4','5','6','7','8','9','10'];
const colores = ['Rojo','Azul','Verde','Amarillo'];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function run() {
  console.log("Descargando imágenes de números...");
  for(let n of numeros) {
    const url = `https://placehold.co/200x200/3b82f6/ffffff/png?text=${n}`;
    const dest = path.join(__dirname, 'assets', 'signs', 'numeros', `${n}.png`);
    await download(url, dest);
    console.log(`- ${n}.png descargado`);
  }
  
  console.log("Descargando imágenes de colores...");
  for(let c of colores) {
    const hex = c==='Rojo'?'ef4444':c==='Azul'?'3b82f6':c==='Verde'?'22c55e':'eab308';
    const url = `https://placehold.co/200x200/${hex}/ffffff/png?text=${c}`;
    const dest = path.join(__dirname, 'assets', 'signs', 'colores', `${c}.png`);
    await download(url, dest);
    console.log(`- ${c}.png descargado`);
  }
  console.log("Terminado!");
}

run();
