/*
   BASIC program extractor and detokenizer
   Extracts BASIC programs from C64 RAM and converts them to readable text
*/

// BASIC tokens (from $80 to $CB)
const tokens = {
  0x80: "END", 0x81: "FOR", 0x82: "NEXT", 0x83: "DATA", 0x84: "INPUT#",
  0x85: "INPUT", 0x86: "DIM", 0x87: "READ", 0x88: "LET", 0x89: "GOTO",
  0x8A: "RUN", 0x8B: "IF", 0x8C: "RESTORE", 0x8D: "GOSUB", 0x8E: "RETURN",
  0x8F: "REM", 0x90: "STOP", 0x91: "ON", 0x92: "WAIT", 0x93: "LOAD",
  0x94: "SAVE", 0x95: "VERIFY", 0x96: "DEF", 0x97: "POKE", 0x98: "PRINT#",
  0x99: "PRINT", 0x9A: "CONT", 0x9B: "LIST", 0x9C: "CLR", 0x9D: "CMD",
  0x9E: "SYS", 0x9F: "OPEN", 0xA0: "CLOSE", 0xA1: "GET", 0xA2: "NEW",
  0xA3: "TAB(", 0xA4: "TO", 0xA5: "FN", 0xA6: "SPC(", 0xA7: "THEN",
  0xA8: "NOT", 0xA9: "STEP", 0xAA: "+", 0xAB: "-", 0xAC: "*", 0xAD: "/",
  0xAE: "^", 0xAF: "AND", 0xB0: "OR", 0xB1: ">", 0xB2: "=", 0xB3: "<",
  0xB4: "SGN", 0xB5: "INT", 0xB6: "ABS", 0xB7: "USR", 0xB8: "FRE",
  0xB9: "POS", 0xBA: "SQR", 0xBB: "RND", 0xBC: "LOG", 0xBD: "EXP",
  0xBE: "COS", 0xBF: "SIN", 0xC0: "TAN", 0xC1: "ATN", 0xC2: "PEEK",
  0xC3: "LEN", 0xC4: "STR$", 0xC5: "VAL", 0xC6: "ASC", 0xC7: "CHR$",
  0xC8: "LEFT$", 0xC9: "RIGHT$", 0xCA: "MID$", 0xCB: "GO",
  0xFF: "π", // PI character
};

// Extract BASIC program from C64 RAM
export function extractBasicProgram(c64) {
  const ram = c64.ram;
  const lines = [];
  
  // BASIC programs start at $0801 (2049)
  let addr = 0x0801;
  
  while (true) {
    // Read pointer to next line (2 bytes, little-endian)
    const nextLinePtr = ram.readRam(addr) | (ram.readRam(addr + 1) << 8);
    
    // If pointer is 0, we've reached the end of the program
    if (nextLinePtr === 0) {
      break;
    }
    
    // Read line number (2 bytes, little-endian)
    const lineNum = ram.readRam(addr + 2) | (ram.readRam(addr + 3) << 8);
    
    // Start reading the line content
    let lineAddr = addr + 4;
    let lineText = "";
    
    while (true) {
      const byte = ram.readRam(lineAddr);
      
      // End of line marker
      if (byte === 0) {
        break;
      }
      
      // Check if it's a token
      if (byte >= 0x80 && byte <= 0xCB) {
        const token = tokens[byte];
        if (token) {
          lineText += token;
          
          // Add space after token unless it's a function or operator
          if (![0xA3, 0xA6, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF, 0xB0, 0xB1, 0xB2, 0xB3].includes(byte)) {
            lineText += " ";
          }
        }
      } else if (byte === 0xFF) {
        lineText += "π";
      } else {
        // Regular ASCII character
        lineText += String.fromCharCode(byte);
      }
      
      lineAddr++;
    }
    
    lines.push({
      number: lineNum,
      text: lineText.trim(),
    });
    
    // Move to next line
    addr = nextLinePtr;
  }
  
  return lines;
}

// Convert BASIC lines array to text format
export function basicLinesToText(lines) {
  if (lines.length === 0) {
    return "READY.\n";
  }
  
  return lines.map(line => `${line.number} ${line.text}`).join('\n') + '\n\nREADY.\n';
}

// Tokenize BASIC text back into bytes
// This is a simplified tokenizer - for full implementation would need more work
export function tokenizeBasicLine(lineNum, text) {
  const bytes = [];
  
  // This will be filled in later - for now just convert to PETSCII
  let i = 0;
  while (i < text.length) {
    let found = false;
    
    // Check for multi-character tokens
    for (const [tokenByte, tokenText] of Object.entries(tokens)) {
      const byte = parseInt(tokenByte);
      if (byte < 0x80) continue;
      
      if (text.substr(i, tokenText.length).toUpperCase() === tokenText.toUpperCase()) {
        bytes.push(byte);
        i += tokenText.length;
        found = true;
        
        // Skip following space if present
        if (text[i] === ' ') i++;
        break;
      }
    }
    
    if (!found) {
      // Regular character
      bytes.push(text.charCodeAt(i));
      i++;
    }
  }
  
  // Add null terminator
  bytes.push(0);
  
  // Build complete line: [next_ptr_lo, next_ptr_hi, line_num_lo, line_num_hi, ...bytes]
  return {
    lineNum,
    bytes,
  };
}
