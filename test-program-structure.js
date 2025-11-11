// Test complete program structure

const program = `10 PRINT "HELLO"
20 GOTO 10`;

console.log('Testing program:');
console.log(program);
console.log('');

// Simulate tokenization
const TOKEN_MAP = {
  "PRINT": 0x99,
  "GOTO": 0x89,
};

function charToByte(char) {
  return char.charCodeAt(0);
}

function tokenizeLine(lineText) {
  const tokens = [];
  let i = 0;
  const text = lineText.trim();
  
  while (i < text.length) {
    let foundToken = false;
    
    const sortedKeywords = Object.keys(TOKEN_MAP).sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
      const upperText = text.substring(i).toUpperCase();
      
      if (upperText.startsWith(keyword)) {
        const nextChar = text[i + keyword.length];
        if (nextChar === undefined || 
            nextChar === ' ' || 
            nextChar === '(' || 
            nextChar === ')' ||
            nextChar === ',' ||
            nextChar === ';' ||
            nextChar === ':' ||
            nextChar === '"') {
          
          tokens.push(TOKEN_MAP[keyword]);
          i += keyword.length;
          foundToken = true;
          break;
        }
      }
    }
    
    if (!foundToken) {
      tokens.push(charToByte(text[i]));
      i++;
    }
  }
  
  return tokens;
}

const lines = program.trim().split('\n');
const parsedLines = [];

for (const line of lines) {
  const match = line.match(/^(\d+)\s+(.*)$/);
  const lineNum = parseInt(match[1], 10);
  const lineText = match[2];
  const tokenized = tokenizeLine(lineText);
  parsedLines.push({ lineNum, tokenized });
}

// Build binary format
const programBytes = [];
let currentAddr = 0x0801;

for (let i = 0; i < parsedLines.length; i++) {
  const { lineNum, tokenized } = parsedLines[i];
  
  const lineLength = 2 + 2 + tokenized.length + 1;
  const nextLineAddr = currentAddr + lineLength;
  
  console.log(`Line ${lineNum}:`);
  console.log(`  Current address: $${currentAddr.toString(16)}`);
  console.log(`  Line length: ${lineLength} bytes`);
  console.log(`  Next address: $${nextLineAddr.toString(16)}`);
  
  // Next line pointer (always points to next address)
  programBytes.push(nextLineAddr & 0xFF, (nextLineAddr >> 8) & 0xFF);
  console.log(`  Next ptr: ${nextLineAddr & 0xFF} ${(nextLineAddr >> 8) & 0xFF} ($${(nextLineAddr & 0xFF).toString(16)} $${((nextLineAddr >> 8) & 0xFF).toString(16)})`);
  
  // Line number
  programBytes.push(lineNum & 0xFF, (lineNum >> 8) & 0xFF);
  console.log(`  Line num: ${lineNum & 0xFF} ${(lineNum >> 8) & 0xFF}`);
  
  // Tokenized content
  programBytes.push(...tokenized);
  console.log(`  Content: [${tokenized.join(', ')}]`);
  
  // EOL
  programBytes.push(0x00);
  console.log(`  EOL: 0`);
  console.log('');
  
  currentAddr = nextLineAddr;
}

// Final end marker
programBytes.push(0x00, 0x00);

console.log('Complete program bytes:');
console.log(programBytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
console.log('');
console.log(`Total size: ${programBytes.length} bytes`);
console.log(`End address: $${(0x0801 + programBytes.length).toString(16)}`);
