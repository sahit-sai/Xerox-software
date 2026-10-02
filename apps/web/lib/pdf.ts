import { PDFDocument } from 'pdf-lib';

export async function countDocumentPages(buffer: Buffer, mimeType: string): Promise<number> {
  // If image (JPG, PNG), 1 file = 1 page
  if (mimeType.startsWith('image/')) {
    return 1;
  }

  // If PDF, parse using pdf-lib
  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Error parsing PDF page count with pdf-lib:', err);
      // Fallback minimum 1 page
      return 1;
    }
  }

  // For DOCX or other text documents, default estimate 1 page per 2KB or min 1
  const kbSize = buffer.length / 1024;
  return Math.max(1, Math.ceil(kbSize / 15));
}

export function parsePageRange(rangeStr: string | undefined | null, totalPages: number): number {
  if (!rangeStr || rangeStr.trim() === '' || rangeStr.toLowerCase() === 'all') {
    return totalPages;
  }

  const pages = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
          pages.add(p);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pages.add(p);
      }
    }
  }

  return pages.size > 0 ? pages.size : totalPages;
}
