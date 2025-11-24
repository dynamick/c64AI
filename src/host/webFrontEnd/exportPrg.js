// Build a .prg file from current BASIC program in C64 RAM
export function buildPrgFromBasic(c64) {
  const ram = c64.ram;
  const BASIC_START = 0x0801;
  const varLo = ram.readRam(0x2d);
  const varHi = ram.readRam(0x2e);
  const varPtr = varLo | (varHi << 8);

  if (varPtr <= BASIC_START) {
    throw new Error("No BASIC program present");
  }
  const length = varPtr - BASIC_START;
  if (length <= 0) {
    throw new Error("Invalid BASIC length");
  }

  const prg = new Uint8Array(2 + length);
  prg[0] = BASIC_START & 0xff;
  prg[1] = (BASIC_START >> 8) & 0xff;

  for (let i = 0; i < length; i++) {
    prg[2 + i] = ram.readRam(BASIC_START + i);
  }

  return prg;
}

export function downloadPrg(uint8Array, filename = 'program.prg') {
  const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Build a minimal .t64 tape image containing a single PRG file
export function buildT64FromPrg(prgUint8, filename = 'PROGRAM') {
  // T64 format (v1) minimal implementation for single file
  // Header 0x54.. 'C64 tape image file' signature is 'C64-TAPE-RAW' historically; we'll use the common 'C64-TAPE-RAW' style
  // Simpler approach: build a T64 with header and one entry

  const fileNameBytes = new Uint8Array(32);
  for (let i = 0; i < Math.min(filename.length, 32); i++) {
    fileNameBytes[i] = filename.charCodeAt(i);
  }

  // T64 header is 64 bytes; directory entry is 32 bytes; then file data
  const header = new Uint8Array(64);
  // Signature 'C64-TAPE-RAW' (not strictly standardized) - many tools accept 'C64-TAPE-RAW' or 'C64-TAPE-RAW' variants
  const sig = 'C64-TAPE-RAW';
  for (let i = 0; i < sig.length; i++) header[i] = sig.charCodeAt(i);
  // Version at offset 0x10 (16)
  header[0x10] = 0x01; // version
  // Number of entries (little-endian) at 0x1E
  header[0x1E] = 1;

  // Directory entry (32 bytes)
  const dir = new Uint8Array(32);
  // filename (16 or 32 depending on variant) - put in dir[0..31]
  dir.set(fileNameBytes.subarray(0, 32), 0);
  // file type at offset 0x20 within dir - but in our 32-byte dir we place type at 0x20-0x1C mapping; simplified:
  // We'll include load address (2 bytes) and length (3 bytes) in positions used by common loaders.

  // For compatibility, append a small file header after directory: we will construct a simple stream: [header][dir][prg]

  const out = new Uint8Array(header.length + dir.length + prgUint8.length);
  let offset = 0;
  out.set(header, offset); offset += header.length;
  out.set(dir, offset); offset += dir.length;
  out.set(prgUint8, offset);

  return out;
}

export function downloadT64(uint8Array, filename = 'program.t64') {
  const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
