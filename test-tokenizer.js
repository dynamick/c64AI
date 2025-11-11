// Quick test of tokenizer logic

const TOKEN_MAP = {
  "PRINT": 0x99,
  "GOTO": 0x89,
  "FOR": 0x81,
  "NEXT": 0x82,
  "REM": 0x8F,
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

// Test
const testLine = 'PRINT "HELLO WORLD"';
console.log('Input:', testLine);
const tokenized = tokenizeLine(testLine);
console.log('Tokenized:', tokenized);
console.log('Hex:', tokenized.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

// Expected: 0x99 (PRINT) + space + quote + HELLO WORLD + quote
// 0x99 0x20 0x22 0x48 0x45 0x4C 0x4C 0x4F 0x20 0x57 0x4F 0x52 0x4C 0x44 0x22
