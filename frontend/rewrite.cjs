const fs = require('fs');
const path = require('path');

function replaceAPI(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceAPI(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let originalContent = content;
      // Replace single quotes
      content = content.replace(/'http:\/\/localhost:5000([^']+)'/g, '`${import.meta.env.VITE_API_URL}$1`');
      
      // Replace double quotes
      content = content.replace(/"http:\/\/localhost:5000([^"]+)"/g, '`${import.meta.env.VITE_API_URL}$1`');
      
      // Replace existing template literals
      content = content.replace(/http:\/\/localhost:5000/g, '${import.meta.env.VITE_API_URL}');
      
      if (originalContent !== content) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceAPI(path.join(__dirname, 'src', 'pages'));
replaceAPI(path.join(__dirname, 'src', 'components'));
console.log('Done!');
