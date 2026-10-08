type AttachmentMetadata = { filename: string; mimeType: string };

export function saveMailboxAttachment(bytes: Blob, attachment: AttachmentMetadata) {
  // Preserve the binary response. The email view supplies the original name
  // even when response headers are hidden by CORS or the API uses a fallback.
  const filename = attachment.filename.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim() || "attachment";
  const blob = new Blob([bytes], {
    type: attachment.mimeType || bytes.type || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Allow the browser to consume the URL before releasing its backing bytes.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
