// Test completo del tokenizer con un programma semplice
// Questo simula cosa succede quando clicchi Apply

const TOKEN_MAP = {
  "END": 0x80, "FOR": 0x81, "NEXT": 0x82, "DATA": 0x83, "INPUT#": 0x84,
  "INPUT": 0x85, "DIM": 0x86, "READ": 0x87, "LET": 0x88, "GOTO": 0x89,
  "RUN": 0x8A, "IF": 0x8B, "RESTORE": 0x8C, "GOSUB": 0x8D, "RETURN": 0x8E,
  "REM": 0x8F, "STOP": 0x90, "ON": 0x91, "WAIT": 0x92, "LOAD": 0x93,
  "SAVE": 0x94, "VERIFY": 0x95, "DEF": 0x96, "POKE": 0x97, "PRINT#": 0x98,
  "PRINT": 0x99, "CONT": 0x9A, "LIST": 0x9B, "CLR": 0x9C, "CMD": 0x9D,
  "SYS": 0x9E, "OPEN": 0x9F, "CLOSE": 0xA0, "GET": 0xA1, "NEW": 0xA2,
  "TAB(": 0xA3, "TO": 0xA4, "FN": 0xA5, "SPC(": 0xA6, "THEN": 0xA7,
  "NOT": 0xA8, "STEP": 0xA9, "+": 0xAA, "-": 0xAB, "*": 0xAC, "/": 0xAD,
  "^": 0xAE, "AND": 0xAF, "OR": 0xB0, ">": 0xB1, "=": 0xB2, "<": 0xB3,
  "SGN": 0xB4, "INT": 0xB5, "ABS": 0xB6, "USR": 0xB7, "FRE": 0xB8,
  "POS": 0xB9, "SQR": 0xBA, "RND": 0xBB, "LOG": 0xBC, "EXP": 0xBD,
  "COS": 0xBE, "SIN": 0xBF, "TAN": 0xC0, "ATN": 0xC1, "PEEK": 0xC2,
  "LEN": 0xC3, "STR$": 0xC4, "VAL": 0xC5, "ASC": 0xC6, "CHR$": 0xC7,
  "LEFT$": 0xC8, "RIGHT$": 0xC9, "MID$": 0xCA, "GO": 0xCB
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

// Test program from AI
const program = `10 PRINT "HELLO WORLD"
20 GOTO 10`;

console.log('=== Testing BASIC Tokenizer ===');
console.log('Input program:');
console.log(program);
console.log('');

const lines = program.trim().split('\n').filter(line => line.trim());
const parsedLines = [];

for (const line of lines) {
  const trimmedLine = line.trim();
  const match = trimmedLine.match(/^(\d+)\s+(.*)$/);
  if (!match) {
    console.warn('Invalid line:', trimmedLine);
    continue;
  }
  
  const lineNum = parseInt(match[1], 10);
  const lineText = match[2];
  const tokenized = tokenizeLine(lineText);
  
  parsedLines.push({ lineNum, tokenized });
  console.log(`Line ${lineNum}: "${lineText}"`);
  console.log(`  Tokens: [${tokenized.join(', ')}]`);
  console.log(`  Hex: ${tokenized.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
}

console.log('');
console.log('=== Building Memory Structure ===');

const programBytes = [];
let currentAddr = 0x0801;

for (let i = 0; i < parsedLines.length; i++) {
  const { lineNum, tokenized } = parsedLines[i];
  
  const lineLength = 2 + 2 + tokenized.length + 1;
  const nextLineAddr = currentAddr + lineLength;
  
  console.log(`Line ${lineNum} at $${currentAddr.toString(16)}:`);
  console.log(`  Length: ${lineLength} bytes`);
  console.log(`  Next: $${nextLineAddr.toString(16)}`);
  
  programBytes.push(nextLineAddr & 0xFF, (nextLineAddr >> 8) & 0xFF);
  programBytes.push(lineNum & 0xFF, (lineNum >> 8) & 0xFF);
  programBytes.push(...tokenized);
  programBytes.push(0x00);
  
  currentAddr = nextLineAddr;
}

programBytes.push(0x00, 0x00);

console.log('');
console.log('=== Complete Program in Memory ===');
console.log(`Total bytes: ${programBytes.length}`);
console.log(`End address: $${(0x0801 + programBytes.length).toString(16)}`);
console.log('');
console.log('Memory dump:');
for (let i = 0; i < programBytes.length; i++) {
  const addr = 0x0801 + i;
  const byte = programBytes[i];
  const hex = byte.toString(16).padStart(2, '0');
  const ascii = (byte >= 32 && byte < 127) ? String.fromCharCode(byte) : '.';
  console.log(`$${addr.toString(16).padStart(4, '0')}: ${hex}  ${ascii}`);
}
