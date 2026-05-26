import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  try {
    const { html, css, scale, filename } = await request.json()

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
    }

    // Launch headless Chromium browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Render viewport to match standard desktop sheet dimensions
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // High DPI for crisp rendering
    })

    // Construct self-contained layout
    const content = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          ${css || ''}
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div id="resume-print-root">
          ${html}
        </div>
      </body>
      </html>
    `

    // Inject content and wait for network/font assets to load
    await page.setContent(content, { waitUntil: 'networkidle0' as any })

    // Generate text-based PDF matching exactly standard A4 dimensions
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      pageRanges: '1', // Restrict strictly to one page!
    })

    await browser.close()

    // Send binary PDF buffer with appropriate file download headers
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'Tailored_Resume.pdf'}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('Error generating server-side PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
