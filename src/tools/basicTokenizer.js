/*
   BASIC program tokenizer
   Converts BASIC text to tokenized binary format for C64
*/

// BASIC tokens (from $80 to $CB)
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

// Operators and symbols that don't need a separator after them
const OPERATORS = new Set(["+", "-", "*", "/", "^", ">", "=", "<"]);

// Convert character to byte (ASCII to PETSCII conversion)
function charToByte(char) {
  const code = char.charCodeAt(0);
  
  // PETSCII conversion:
  // Uppercase A-Z (65-90) stays the same
  // Lowercase a-z (97-122) needs to be converted to PETSCII (193-218)
  if (code >= 97 && code <= 122) {
    return code - 97 + 65; // Convert lowercase to uppercase for PETSCII
  }
  
  // For everything else, keep as-is
  return code;
}

// Tokenize a single line of BASIC
function tokenizeLine(lineText) {
  const tokens = [];
  let i = 0;
  const text = lineText.trim();
  
  // Special handling for REM - everything after REM is literal text
  const remIndex = text.toUpperCase().indexOf('REM');
  if (remIndex !== -1) {
    // Check if REM is actually a keyword (not part of a variable name)
    const beforeRem = text.substring(0, remIndex);
    const afterRemStart = remIndex + 3;
    const charAfterRem = text[afterRemStart];
    
    // REM must be preceded by nothing, space, or colon, and followed by space or nothing
    const isValidRem = (remIndex === 0 || beforeRem.endsWith(' ') || beforeRem.endsWith(':')) &&
                       (charAfterRem === undefined || charAfterRem === ' ' || charAfterRem === ':');
    
    if (isValidRem) {
      // Tokenize everything before REM
      const beforeRemTokens = tokenizeWithoutRem(beforeRem);
      tokens.push(...beforeRemTokens);
      
      // Add REM token
      tokens.push(TOKEN_MAP["REM"]);
      
      // Add everything after REM as literal characters
      const afterRem = text.substring(afterRemStart);
      for (let j = 0; j < afterRem.length; j++) {
        tokens.push(charToByte(afterRem[j]));
      }
      
      return tokens;
    }
  }
  
  // No REM in line, tokenize normally
  return tokenizeWithoutRem(text);
}

function tokenizeWithoutRem(text) {
  const tokens = [];
  let i = 0;
  
  while (i < text.length) {
    // Check for BASIC keywords
    let foundToken = false;
    
    // Try to match keywords (longest first to handle things like "PRINT#" before "PRINT")
    const sortedKeywords = Object.keys(TOKEN_MAP).sort((a, b) => b.length - a.length);
    
    for (const keyword of sortedKeywords) {
      const upperText = text.substring(i).toUpperCase();
      
      // Check if keyword matches at current position
      if (upperText.startsWith(keyword)) {
        // Make sure it's not part of a variable name
        // Operators don't need a separator, but keywords do
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
      // Not a keyword, treat as literal character
      tokens.push(charToByte(text[i]));
      i++;
    }
  }
  
  return tokens;
}

// Tokenize complete BASIC program and write to C64 RAM
export function writeBasicProgramToRam(c64, programText) {
  console.log('writeBasicProgramToRam called with:', programText);
  
  const lines = programText.trim().split('\n').filter(line => line.trim());
  const programBytes = [];
  
  // Parse and tokenize all lines first
  const parsedLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Extract line number
    const match = trimmedLine.match(/^(\d+)\s+(.*)$/);
    if (!match) {
      console.warn('Invalid BASIC line (no line number):', trimmedLine);
      continue;
    }
    
    const lineNum = parseInt(match[1], 10);
    let lineText = match[2];
    
    // Clean up :: at the start (replace with single colon or remove if it's the only content before REM)
    if (lineText.startsWith('::')) {
      lineText = lineText.substring(2).trim();
      // If there's content after ::, add a colon separator
      if (lineText && !lineText.toUpperCase().startsWith('REM')) {
        lineText = ': ' + lineText;
      }
    }
    
    // Skip empty lines (lines that only had ::)
    if (!lineText) {
      console.log(`Skipping empty line ${lineNum}`);
      continue;
    }
    
    console.log(`Parsing line ${lineNum}: "${lineText}"`);
    
    // Tokenize the line content
    const tokenized = tokenizeLine(lineText);
    console.log(`Tokenized to ${tokenized.length} bytes:`, tokenized);
    
    parsedLines.push({ lineNum, tokenized });
  }
  
  // Now build the binary format with correct pointers
  let currentAddr = 0x0801;
  
  console.log(`Building ${parsedLines.length} lines starting at $0801`);
  
  for (let i = 0; i < parsedLines.length; i++) {
    const { lineNum, tokenized } = parsedLines[i];
    
    // Calculate length of this line:
    // 2 bytes for next line pointer + 2 bytes for line number + tokenized content + 1 byte for EOL
    const lineLength = 2 + 2 + tokenized.length + 1;
    const nextLineAddr = currentAddr + lineLength;
    
    console.log(`Line ${lineNum}: addr=$${currentAddr.toString(16)}, length=${lineLength}, next=$${nextLineAddr.toString(16)}`);
    
    // Next line pointer (2 bytes, little-endian)
    // Points to the start of the next line (or to the end marker for the last line)
    programBytes.push(nextLineAddr & 0xFF, (nextLineAddr >> 8) & 0xFF);
    
    // Line number (2 bytes, little-endian)
    programBytes.push(lineNum & 0xFF, (lineNum >> 8) & 0xFF);
    
    // Tokenized line content
    programBytes.push(...tokenized);
    
    // End-of-line marker
    programBytes.push(0x00);
    
    currentAddr = nextLineAddr;
  }
  
  // Add final end-of-program marker (2 zero bytes)
  programBytes.push(0x00, 0x00);
  
  // Write program to RAM
  const {wires: {cpuRead, cpuWrite}} = c64;
  
  console.log(`Writing ${programBytes.length} bytes to RAM starting at $0801`);
  console.log('First 20 bytes:', programBytes.slice(0, 20));
  
  // Save current memory configuration
  const dir = cpuRead(0);
  const port = cpuRead(1);
  
  // Set to all-RAM mode
  cpuWrite(0, 0b111);
  cpuWrite(1, 0);
  
  // Clear BASIC area first (from $0801 to end of program)
  for (let i = 0; i < 10000; i++) {
    cpuWrite(0x0801 + i, 0);
  }
  
  // Write the program
  for (let i = 0; i < programBytes.length; i++) {
    cpuWrite(0x0801 + i, programBytes[i]);
  }
  
  // Update BASIC pointers
  const endOfProgram = 0x0801 + programBytes.length;
  const lo = endOfProgram & 0xFF;
  const hi = (endOfProgram >> 8) & 0xFF;
  
  cpuWrite(0x2d, lo); // pointer to beginning of variable area
  cpuWrite(0x2e, hi);
  
  cpuWrite(0x2f, lo); // pointer to beginning of array variable area
  cpuWrite(0x30, hi);
  
  cpuWrite(0x31, lo); // pointer to end of array variable area
  cpuWrite(0x32, hi);
  
  // Restore memory configuration
  cpuWrite(0, dir);
  cpuWrite(1, port);
  
  console.log(`BASIC program written: ${programBytes.length} bytes, ending at $${endOfProgram.toString(16)}`);
}

// Auto-run BASIC program by simulating "RUN" command
export function autoRunBasicProgram(c64) {
  const {wires: {cpuWrite}} = c64;
  
  // Write "RUN" + Enter into keyboard buffer
  // Keyboard buffer starts at $0277
  // Number of characters in buffer is at $C6
  
  // R = 82, U = 85, N = 78, Enter = 13
  cpuWrite(0x0277, 82);  // R
  cpuWrite(0x0278, 85);  // U
  cpuWrite(0x0279, 78);  // N
  cpuWrite(0x027A, 13);  // Enter
  
  // Set buffer length to 4
  cpuWrite(0xC6, 4);
  
  console.log('Auto-executing RUN command');
}