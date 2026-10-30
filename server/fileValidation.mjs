// Upload validation by content (magic bytes), not by file name or declared type alone.

export const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export function sniffMimeType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG' && buf[4] === 0x0d && buf[5] === 0x0a)
    return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')
    return 'image/webp';
  return null;
}

/**
 * Validates an uploaded buffer. Returns { ok: true, mimeType } or { ok: false, code, message }.
 */
export function validateUpload(buf, declaredType, maxBytes) {
  const declared = String(declaredType || '').split(';')[0].trim().toLowerCase();
  // Some browsers report an empty type; then the content alone decides.
  const generic = declared === 'application/octet-stream';
  if (!generic && !ALLOWED_TYPES.includes(declared)) {
    return { ok: false, code: 'unsupported_type', message: 'Only PDF, JPG, PNG and WebP files are supported.' };
  }
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return { ok: false, code: 'empty_file', message: 'The uploaded file is empty.' };
  }
  if (buf.length > maxBytes) {
    return { ok: false, code: 'file_too_large', message: `Files must be ${Math.round(maxBytes / 1048576)} MB or smaller.` };
  }
  const sniffed = sniffMimeType(buf);
  if (!sniffed || (!generic && sniffed !== declared)) {
    return {
      ok: false,
      code: 'content_mismatch',
      message: 'The file contents do not match a supported PDF or image format.',
    };
  }
  if (sniffed === 'application/pdf') {
    // Only the head and tail are scanned; enough to catch encryption and active content markers.
    const head = buf.subarray(0, Math.min(buf.length, 4096)).toString('latin1');
    const tail = buf.subarray(Math.max(0, buf.length - 4096)).toString('latin1');
    if (!tail.includes('%%EOF')) {
      return { ok: false, code: 'malformed_pdf', message: 'This PDF appears to be incomplete or damaged.' };
    }
    if (/\/Encrypt\b/.test(head + tail)) {
      return { ok: false, code: 'encrypted_pdf', message: 'Password-protected PDFs cannot be analysed. Please upload an unlocked copy.' };
    }
  }
  return { ok: true, mimeType: sniffed };
}
