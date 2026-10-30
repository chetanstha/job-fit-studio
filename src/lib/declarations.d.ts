declare module "mammoth/mammoth.browser.js" {
  interface Result {
    value: string;
    messages: { type: string; message: string }[];
  }
  const mammoth: {
    extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<Result>;
  };
  export default mammoth;
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
