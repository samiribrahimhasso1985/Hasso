/**
 * Validates an uploaded image by its bytes (not its name) and removes metadata.
 * JPEG: APP1–APP15 segments (EXIF incl. GPS, XMP, ICC…) and comments are dropped; APP0 (JFIF) is kept.
 * PNG: text, time and EXIF chunks are dropped.
 */
export type CleanImage = { mime: 'image/jpeg' | 'image/png'; data: Buffer; width: number; height: number };

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

export function cleanImage(input: Buffer): CleanImage | null {
  if (input.length > 4 && input[0] === 0xff && input[1] === 0xd8) return cleanJpeg(input);
  if (input.length > 8 && input.subarray(0, 8).equals(PNG_SIG)) return cleanPng(input);
  return null;
}

function cleanJpeg(b: Buffer): CleanImage | null {
  const out: Buffer[] = [b.subarray(0, 2)];
  let i = 2;
  let width = 0;
  let height = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xd9) { out.push(b.subarray(i, i + 2)); i += 2; break; }
    if (marker === 0xda) { out.push(b.subarray(i)); i = b.length; break; } // start of scan: rest is image data
    if (marker >= 0xd0 && marker <= 0xd7) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > b.length) return null;
    const seg = b.subarray(i, i + 2 + len);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      height = b.readUInt16BE(i + 5);
      width = b.readUInt16BE(i + 7);
    }
    const drop = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!drop) out.push(seg);
    i += 2 + len;
  }
  if (!width || !height) return null;
  return { mime: 'image/jpeg', data: Buffer.concat(out), width, height };
}

function cleanPng(b: Buffer): CleanImage | null {
  const out: Buffer[] = [PNG_SIG];
  let i = 8;
  let width = 0;
  let height = 0;
  let ended = false;
  while (i + 12 <= b.length) {
    const len = b.readUInt32BE(i);
    const type = b.subarray(i + 4, i + 8).toString('latin1');
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (type === 'IHDR') { width = b.readUInt32BE(i + 8); height = b.readUInt32BE(i + 12); }
    if (!PNG_DROP.has(type)) out.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') { ended = true; break; }
  }
  if (!ended || !width || !height) return null;
  return { mime: 'image/png', data: Buffer.concat(out), width, height };
}
