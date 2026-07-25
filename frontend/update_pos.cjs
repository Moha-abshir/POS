const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/PosPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/bg-\[#1C1F24\]/g, 'bg-[var(--color-bg-surface)] border-l border-[var(--color-border)]');

// Header
content = content.replace(/border-b border-white\/5/g, 'border-b border-[var(--color-border)] bg-[var(--color-bg-base)]');
content = content.replace(/text-white font-bold text-lg leading-none/g, 'text-[var(--color-text-primary)] font-bold text-lg leading-none');
content = content.replace(/text-xs text-zinc-400 mt-1/g, 'text-xs text-[var(--color-text-secondary)] mt-1');
content = content.replace(/w-10 h-10 rounded-full bg-white\/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white\/10/g, 'w-10 h-10 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]');
content = content.replace(/w-10 h-10 rounded-full bg-white\/5 flex items-center justify-center/g, 'w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center');
content = content.replace(/text-xs font-bold text-zinc-500 hover:text-red-400/g, 'text-xs font-bold text-[var(--color-text-secondary)] hover:text-red-500');

// Empty Cart
content = content.replace(/p-6 bg-white\/5 rounded-full border border-white\/5 text-zinc-600/g, 'p-6 bg-[var(--color-bg-sunken)] rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]');
content = content.replace(/font-bold text-base text-zinc-300/g, 'font-bold text-base text-[var(--color-text-primary)]');
content = content.replace(/text-sm text-zinc-500 mt-1/g, 'text-sm text-[var(--color-text-secondary)] mt-1');

// Cart Items
content = content.replace(/bg-white\/\[0\.03\] hover:bg-white\/\[0\.06\] border border-white\/5/g, 'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)]');
content = content.replace(/font-bold text-white text-sm truncate/g, 'font-bold text-[var(--color-text-primary)] text-sm truncate');
content = content.replace(/text-xs text-zinc-400 mt-1\.5 font-medium/g, 'text-xs text-[var(--color-text-secondary)] mt-1.5 font-medium');
content = content.replace(/bg-white\/10 rounded-md/g, 'bg-[var(--color-border)] text-[var(--color-text-primary)] rounded-md');
content = content.replace(/font-extrabold text-white text-sm/g, 'font-extrabold text-[var(--color-text-primary)] text-sm');
content = content.replace(/bg-white\/5 rounded-xl border border-white\/5/g, 'bg-[var(--color-bg-sunken)] rounded-xl border border-[var(--color-border)]');
content = content.replace(/text-zinc-400 hover:bg-white\/10 hover:text-white/g, 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-primary)]');
content = content.replace(/text-center text-white/g, 'text-center text-[var(--color-text-primary)]');

// Cart Summary
content = content.replace(/bg-white\/\[0\.02\] border-t border-white\/5 backdrop-blur-xl/g, 'bg-[var(--color-bg-base)] border-t border-[var(--color-border)]');
content = content.replace(/text-zinc-400 font-medium/g, 'text-[var(--color-text-secondary)] font-medium');
content = content.replace(/text-zinc-200/g, 'text-[var(--color-text-primary)] font-bold');
content = content.replace(/bg-white\/5 text-white border border-white\/10/g, 'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)]');
content = content.replace(/bg-white\/5 group-hover:bg-\[#D97706\]\/20/g, 'bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-accent-subtle)]');
content = content.replace(/text-sm text-zinc-400 cursor-pointer/g, 'text-sm text-[var(--color-text-secondary)] cursor-pointer');
content = content.replace(/border-t border-white\/10/g, 'border-t border-[var(--color-border)]');
content = content.replace(/text-3xl font-extrabold text-white/g, 'text-3xl font-extrabold text-[var(--color-text-primary)]');

// Checkout Button
content = content.replace(/bg-\[#D97706\] hover:bg-\[#B45309\]/g, 'bg-gray-900 hover:bg-black');
content = content.replace(/shadow-\[#D97706\]\/20 hover:shadow-\[#D97706\]\/40/g, ''); // Remove shadow specific to orange
content = content.replace(/disabled:bg-zinc-800 disabled:text-zinc-500/g, 'disabled:bg-gray-200 disabled:text-gray-400');
content = content.replace(/text-white font-bold text-base/g, 'text-white font-bold text-base'); // Keep text white

// Backdrop
content = content.replace(/bg-black\/30 backdrop-blur-sm/g, 'bg-black/50'); // Remove blur for legacy support, make slightly darker

fs.writeFileSync(file, content, 'utf8');
console.log('PosPage styling updated.');
