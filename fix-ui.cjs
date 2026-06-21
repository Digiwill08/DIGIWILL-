const fs = require('fs');
const path = require('path');

const directory = './src/pages';

fs.readdirSync(directory).forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Reemplazos de UI blanca a UI oscura glassmorphism
    content = content.replace(/bg-white/g, 'glass-panel');
    content = content.replace(/text-gray-800/g, 'text-slate-100');
    content = content.replace(/text-gray-700/g, 'text-slate-300');
    content = content.replace(/text-gray-600/g, 'text-slate-400');
    content = content.replace(/text-gray-500/g, 'text-slate-500');
    content = content.replace(/border-gray-100/g, 'border-none');
    content = content.replace(/border-gray-200/g, 'border-none');
    content = content.replace(/border-gray-300/g, 'border-transparent');
    content = content.replace(/shadow-sm/g, '');
    
    // Botones
    content = content.replace(/bg-indigo-600 text-white[^"]*hover:bg-indigo-700/g, 'neon-button w-full sm:w-auto');
    content = content.replace(/bg-blue-600 text-white[^"]*hover:bg-blue-700/g, 'neon-button w-full sm:w-auto');
    content = content.replace(/bg-emerald-600 text-white[^"]*hover:bg-emerald-700/g, 'neon-button-emerald w-full sm:w-auto');
    
    // Títulos de Dashboard/etc
    content = content.replace(/<h2 className="text-3xl font-bold text-slate-100 mb-6">/g, '<h2 className="text-3xl font-bold text-slate-100 mb-6 neon-text">');

    fs.writeFileSync(filePath, content);
  }
});

console.log("Fixes aplicados");
