declare module "html2pdf.js" {
  interface Html2PdfWorker {
    set: (options: unknown) => Html2PdfWorker
    from: (element: HTMLElement) => Html2PdfWorker
    save: () => Promise<void>
  }

  interface Html2PdfStatic {
    (): Html2PdfWorker
  }

  const html2pdf: Html2PdfStatic
  export default html2pdf
}

declare module "html2pdf.js/dist/html2pdf.bundle.min.js" {
  import type html2pdf from "html2pdf.js"
  export default html2pdf
}
