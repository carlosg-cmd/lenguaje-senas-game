const fs = require('fs');
const path = require('path');

const indexHtmlPath = 'index.html';
const styleCssPath = 'style.css';
const scriptJsPath = 'script.js';
const assetsDir = path.join(__dirname, 'assets', 'signs');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Extract CSS
const styleRegex = /<style>([\s\S]*?)<\/style>/i;
const styleMatch = htmlContent.match(styleRegex);
if (styleMatch) {
    fs.writeFileSync(styleCssPath, styleMatch[1].trim());
    htmlContent = htmlContent.replace(styleRegex, '<link rel="stylesheet" href="style.css">');
    console.log('Extraído style.css');
}

// 2. Extract JS
const scriptRegex = /<script>([\s\S]*?)<\/script>/i;
const scriptMatch = htmlContent.match(scriptRegex);
if (scriptMatch) {
    let jsContent = scriptMatch[1].trim();

    // 3. Extract Base64 Images
    const signImagesRegex = /const SIGN_IMAGES = {([\s\S]*?)};/;
    const imagesMatch = jsContent.match(signImagesRegex);
    
    if (imagesMatch) {
        let newImagesObj = "const SIGN_IMAGES = {\n";
        const imageLines = imagesMatch[1].split('\n');
        
        for (let line of imageLines) {
            const entryMatch = line.match(/"([A-ZÑ])": "(data:image\/png;base64,([a-zA-Z0-9+/=]+))",?/);
            if (entryMatch) {
                const letter = entryMatch[1];
                const base64Data = entryMatch[3];
                
                // Write image file
                const imgPath = path.join(assetsDir, `${letter}.png`);
                fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
                console.log(`Guardada imagen: assets/signs/${letter}.png`);
                
                // Update object
                newImagesObj += `  "${letter}": "assets/signs/${letter}.png",\n`;
            }
        }
        newImagesObj += "};";
        
        // Replace in JS content
        jsContent = jsContent.replace(signImagesRegex, newImagesObj);
    }
    
    fs.writeFileSync(scriptJsPath, jsContent);
    htmlContent = htmlContent.replace(scriptRegex, '<script src="script.js"></script>');
    console.log('Extraído script.js y actualizadas las rutas de imágenes.');
}

// Write updated HTML
fs.writeFileSync(indexHtmlPath, htmlContent);
console.log('Actualizado index.html');
