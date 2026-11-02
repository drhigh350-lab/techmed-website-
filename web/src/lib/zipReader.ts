/**
 * TECHMED In-Memory ZIP Archive Reader & Extractor
 * Zero external dependencies — uses native DataView and DecompressionStream('deflate-raw').
 * 
 * Provides:
 * 1. Safe in-memory parsing of ZIP headers without touching disk.
 * 2. Directory traversal protection against malicious paths ('..' or leading '/').
 * 3. In-memory extraction of PDF documents to Blobs/Object URLs for PDF.js rendering.
 */

export interface ZipEntry {
  fileName: string;
  cleanName: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number; // 0 = stored, 8 = deflate
  localHeaderOffset: number;
  isDirectory: boolean;
  mimeType: string;
  isPdf: boolean;
  formattedSize: string;
}

export interface ZipArchive {
  entries: ZipEntry[];
  pdfEntries: ZipEntry[];
  hasPdfs: boolean;
  extractEntry: (entry: ZipEntry) => Promise<Uint8Array>;
  extractPdfBlob: (entry: ZipEntry) => Promise<Blob>;
  extractPdfUrl: (entry: ZipEntry) => Promise<string>;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function sanitizeZipPath(rawPath: string): string | null {
  // Disallow directory traversal attacks
  if (rawPath.includes('..') || rawPath.startsWith('/') || rawPath.startsWith('\\')) {
    return null;
  }
  // Remove trailing slashes and normalize
  const clean = rawPath.replace(/^[\.\/]+/, '').replace(/\\/g, '/');
  return clean.length > 0 ? clean : null;
}

/**
 * Parse a ZIP file from an ArrayBuffer in memory.
 */
export async function parseZipArchive(input: ArrayBuffer | Uint8Array): Promise<ZipArchive> {
  let buffer: ArrayBuffer;
  if (input instanceof Uint8Array) {
    buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  } else {
    buffer = input;
  }
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const len = buffer.byteLength;

  if (len < 22) {
    throw new Error('Invalid archive: file too small to be a valid ZIP archive.');
  }

  // 1. Locate End of Central Directory (EOCD) signature: 0x06054b50
  let eocdOffset = -1;
  const maxSearch = Math.min(len - 22, 65536 + 22);
  for (let i = len - 22; i >= len - maxSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  const entries: ZipEntry[] = [];

  if (eocdOffset !== -1) {
    // Standard central directory parsing
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    let offset = cdOffset;
    for (let e = 0; e < totalEntries && offset < cdOffset + cdSize; e++) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x02014b50) break; // Central directory file header signature

      const compressionMethod = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const fileNameLen = view.getUint16(offset + 28, true);
      const extraFieldLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);

      const fileNameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLen);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
      const isDirectory = fileName.endsWith('/') || fileName.endsWith('\\');

      const cleanName = sanitizeZipPath(fileName);
      if (cleanName && !isDirectory) {
        const mime = getMimeType(cleanName);
        entries.push({
          fileName,
          cleanName,
          compressedSize,
          uncompressedSize,
          compressionMethod,
          localHeaderOffset,
          isDirectory: false,
          mimeType: mime,
          isPdf: mime === 'application/pdf',
          formattedSize: formatBytes(uncompressedSize),
        });
      }

      offset += 46 + fileNameLen + extraFieldLen + commentLen;
    }
  } else {
    // Fallback: Scan local file headers if EOCD is missing or corrupted
    let offset = 0;
    while (offset < len - 30) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) break;

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraFieldLen = view.getUint16(offset + 28, true);

      const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder('utf-8').decode(fileNameBytes);
      const isDirectory = fileName.endsWith('/') || fileName.endsWith('\\');

      const cleanName = sanitizeZipPath(fileName);
      if (cleanName && !isDirectory) {
        const mime = getMimeType(cleanName);
        entries.push({
          fileName,
          cleanName,
          compressedSize,
          uncompressedSize,
          compressionMethod,
          localHeaderOffset: offset,
          isDirectory: false,
          mimeType: mime,
          isPdf: mime === 'application/pdf',
          formattedSize: formatBytes(uncompressedSize),
        });
      }

      offset += 30 + fileNameLen + extraFieldLen + compressedSize;
    }
  }

  async function extractEntry(entry: ZipEntry): Promise<Uint8Array> {
    const locOffset = entry.localHeaderOffset;
    if (view.getUint32(locOffset, true) !== 0x04034b50) {
      throw new Error(`Corrupted local header for file "${entry.cleanName}"`);
    }

    const locFileNameLen = view.getUint16(locOffset + 26, true);
    const locExtraLen = view.getUint16(locOffset + 28, true);
    const dataStart = locOffset + 30 + locFileNameLen + locExtraLen;
    const rawCompressedData = bytes.subarray(dataStart, dataStart + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      // Uncompressed (Stored)
      return new Uint8Array(rawCompressedData);
    } else if (entry.compressionMethod === 8) {
      // Deflate compressed — use native web standard DecompressionStream
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Response(rawCompressedData).body?.pipeThrough(ds);
        if (!stream) {
          throw new Error('Decompression stream creation failed.');
        }
        const decompressedRes = await new Response(stream).arrayBuffer();
        return new Uint8Array(decompressedRes);
      } else {
        throw new Error('Browser runtime does not support DecompressionStream.');
      }
    } else {
      throw new Error(`Unsupported compression method: ${entry.compressionMethod}`);
    }
  }

  async function extractPdfBlob(entry: ZipEntry): Promise<Blob> {
    const data = await extractEntry(entry);
    return new Blob([data], { type: 'application/pdf' });
  }

  async function extractPdfUrl(entry: ZipEntry): Promise<string> {
    const blob = await extractPdfBlob(entry);
    return URL.createObjectURL(blob);
  }

  const pdfEntries = entries.filter((e) => e.isPdf);

  return {
    entries,
    pdfEntries,
    hasPdfs: pdfEntries.length > 0,
    extractEntry,
    extractPdfBlob,
    extractPdfUrl,
  };
}
