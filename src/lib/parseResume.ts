// Extract plain text from an uploaded resume. Libraries load on demand so the
// first page load stays small.

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let line = "";
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const y = item.transform[5] as number;
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line);
          line = "";
        }
        line += item.str;
        lastY = y;
      }
      lines.push(line);
      pages.push(lines.join("\n"));
    }
    return tidy(pages.join("\n\n"));
  }

  if (name.endsWith(".docx")) {
    const mammoth = (await import("mammoth/mammoth.browser.js")).default;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return tidy(result.value);
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return tidy(await file.text());
  }

  throw new Error("Use a PDF, Word (.docx) or text file.");
}

function tidy(s: string) {
  return s
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
