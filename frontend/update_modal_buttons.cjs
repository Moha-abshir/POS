const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('Modal.tsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const modalFiles = walkSync('/home/moha/Projects/POS/frontend/src');

modalFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the accent background variations (which might have focus rings)
  let newContent = content.replace(/bg-\[var\(--color-accent\)\] hover:bg-\[var\(--color-accent-hover\)\] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-\[var\(--color-accent\)\]/g, 'bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900');
  
  newContent = newContent.replace(/bg-\[var\(--color-accent\)\] hover:bg-\[var\(--color-accent-hover\)\] focus:ring-\[var\(--color-accent\)\]/g, 'bg-gray-900 hover:bg-black focus:ring-gray-900');
  
  // Replace primary background variations for solid buttons
  newContent = newContent.replace(/bg-\[var\(--color-primary\)\] hover:bg-\[var\(--color-primary-hover\)\]/g, 'bg-gray-900 hover:bg-black');
  
  // Also check if any buttons just have bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] without the focus ring
  newContent = newContent.replace(/bg-\[var\(--color-accent\)\] hover:bg-\[var\(--color-accent-hover\)\]/g, 'bg-gray-900 hover:bg-black');

  // And let's make sure it has text-white. (Those primary buttons usually already have text-white).
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
