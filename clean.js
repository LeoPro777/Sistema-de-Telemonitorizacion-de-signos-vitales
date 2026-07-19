const fs = require('fs');
const path = require('path');

const directory = 'frontend/src/views';

const spanPattern = /\s*<span className=\"text-\[10px\] text-\[\#D4AF37\] tracking-\[0\.2em\] font-bold uppercase block mb-1\">[\s\S]*?<\/span>/g;
const pPattern = /\s*<p className=\"text-xs text-slate-400 mt-1\">[\s\S]*?<\/p>/g;
// Another possible description text color:
const pPattern2 = /\s*<p className=\"text-xs text-slate-400 mt-1\">[\s\S]*?<\/p>/g;

function walkSync(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        let file_path = dir + '/' + file;
        let stat = fs.statSync(file_path);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkSync(file_path));
        } else {
            results.push(file_path);
        }
    });
    return results;
}

const files = walkSync(directory);

for (let file of files) {
    if (file.endsWith('.tsx')) {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content.replace(spanPattern, '').replace(pPattern, '');
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Cleaned headers in ' + file);
        }
    }
}
