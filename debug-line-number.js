// Debug what we're actually writing vs what we expect

const program = "10 PRINT \"HELLO\"";

// Parse line
const match = program.match(/^(\d+)\s+(.*)$/);
const lineNum = parseInt(match[1], 10);
const lineText = match[2];

console.log('Line number:', lineNum);
console.log('Line text:', lineText);

// Line number in little-endian
const loByte = lineNum & 0xFF;
const hiByte = (lineNum >> 8) & 0xFF;

console.log('Line number bytes:');
console.log('  Low byte:', loByte, '(0x' + loByte.toString(16) + ')');
console.log('  High byte:', hiByte, '(0x' + hiByte.toString(16) + ')');

// If we write these backwards by mistake:
const wrongNum = hiByte | (loByte << 8);
console.log('If bytes are swapped:', wrongNum);

// Test tokenization
const TOKEN_PRINT = 0x99;
console.log('\nExpected tokenization of PRINT "HELLO":');
console.log('0x99 (PRINT token)');
console.log('0x20 (space)');
console.log('0x22 (quote)');
console.log('0x48 0x45 0x4C 0x4C 0x4F (HELLO)');
console.log('0x22 (quote)');
console.log('0x00 (EOL)');

// What if we're writing the pointer wrong?
const addr = 0x0801;
const lineLength = 2 + 2 + 9 + 1; // ptr + linenum + content + eol = 14
const nextAddr = addr + lineLength; // 0x080f

console.log('\nNext line pointer:');
console.log('Next address: 0x' + nextAddr.toString(16));
console.log('Low byte:', nextAddr & 0xFF, '(0x' + (nextAddr & 0xFF).toString(16) + ')');
console.log('High byte:', (nextAddr >> 8) & 0xFF, '(0x' + ((nextAddr >> 8) & 0xFF).toString(16) + ')');

// Test what 15420 looks like in hex
console.log('\n15420 in hex: 0x' + (15420).toString(16));
console.log('15420 low byte:', 15420 & 0xFF, '(0x' + (15420 & 0xFF).toString(16) + ')');
console.log('15420 high byte:', (15420 >> 8) & 0xFF, '(0x' + ((15420 >> 8) & 0xFF).toString(16) + ')');

// Reverse engineering: what bytes give us 15420?
// 15420 = 0x3C3C
console.log('\n0x3C3C = ', 0x3C3C, '(ASCII: "<<")');
console.log('0x3C in ASCII:', String.fromCharCode(0x3C));
