const fs = require('fs');
const path = require('path');

const directory = './src/pages';

fs.readdirSync(directory).forEach(file => {
  if (file.endsWith('.jsx')) {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Quitar cualquier rastro de blancos o grises claros
    content = content.replace(/bg-white/g, 'glass-panel');
    content = content.replace(/bg-gray-50/g, 'bg-transparent');
    content = content.replace(/bg-gray-100/g, 'bg-transparent');
    content = content.replace(/bg-gray-200/g, 'border-transparent');
    
    // Tablas responsive
    content = content.replace(/<div className="glass-panel rounded-xl overflow-hidden mt-8">/g, '<div className="glass-panel rounded-xl overflow-hidden mt-8 overflow-x-auto">');
    content = content.replace(/<div className="glass-panel rounded-xl overflow-hidden">/g, '<div className="glass-panel rounded-xl overflow-hidden overflow-x-auto">');

    // Textos oscuros que quedaron
    content = content.replace(/text-gray-700/g, 'text-slate-300');
    content = content.replace(/text-gray-800/g, 'text-slate-100');
    content = content.replace(/text-gray-600/g, 'text-slate-400');
    content = content.replace(/text-gray-500/g, 'text-slate-500');
    content = content.replace(/text-gray-400/g, 'text-slate-600');

    fs.writeFileSync(filePath, content);
  }
});

// App.jsx responsive layout
const appPath = './src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/className="flex h-screen/g, 'className="flex flex-col md:flex-row h-screen');
fs.writeFileSync(appPath, appContent);

// Sidebar responsive layout
const sidebarPath = './src/components/Sidebar.jsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
sidebarContent = sidebarContent.replace(/w-64/g, 'w-full md:w-64');
sidebarContent = sidebarContent.replace(/h-full flex flex-col/g, 'h-auto md:h-full flex flex-col shrink-0');
fs.writeFileSync(sidebarPath, sidebarContent);

console.log("Fixes aplicados phase 2");
