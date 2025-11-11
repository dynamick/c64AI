// Test operator tokenization

const TOKEN_MAP = {
  "PRINT": 0x99,
  "IF": 0x8B,
  "GOTO": 0x89,
  "THEN": 0xA7,
  "<": 0xB3,
  ">": 0xB1,
  "=": 0xB2,
};

const OPERATORS = new Set(["<", ">", "="]);

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
        const needsSeparator = !OPERATORS.has(keyword);
        
        if (!needsSeparator || 
            nextChar === undefined || 
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

// Test cases
const tests = [
  'PRINT "HELLO"',
  'IF A<10 THEN GOTO 100',
  'IF X>5 THEN PRINT "BIG"',
  'IF A=B THEN PRINT "EQUAL"'
];

tests.forEach(test => {
  console.log(`\nInput: ${test}`);
  const tokens = tokenizeLine(test);
  console.log('Tokens:', tokens.map(t => '0x' + t.toString(16).padStart(2, '0')).join(' '));
  
  // Decode
  let decoded = '';
  tokens.forEach(t => {
    if (t === 0x99) decoded += 'PRINT ';
    else if (t === 0x8B) decoded += 'IF ';
    else if (t === 0x89) decoded += 'GOTO ';
    else if (t === 0xA7) decoded += 'THEN ';
    else if (t === 0xB3) decoded += '<';
    else if (t === 0xB1) decoded += '>';
    else if (t === 0xB2) decoded += '=';
    else decoded += String.fromCharCode(t);
  });
  console.log('Decoded:', decoded);
});
