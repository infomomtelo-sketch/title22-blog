export async function onRequest(context) {
  const request = context.request;
  const env = context.env;
  const url = new URL(request.url);

  // ==========================================
  // ROUTE 1: LEAVE YOUR EXTRACTED BLOG ROUTING INTACT
  // ==========================================
  if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) {
    const TARGET_BLOG_BASE = 'https://pages.dev'; 
    const targetUrl = new URL(url.pathname + url.search, TARGET_BLOG_BASE);
    const newRequest = new Request(targetUrl, request);
    try {
      return await fetch(newRequest);
    } catch (error) {
      return new Response(`Blog Proxy Error: ${error.message}`, { status: 502 });
    }
  }

  // ==========================================
  // ROUTE 2: THE UNIVERSAL PRINTABLE AI FORM GENERATOR API (ANTHROPIC VERSION)
  // ==========================================
  if (request.method === 'POST' && url.pathname === '/api/compliance/generate-universal-form') {
    try {
      const { formTitle, formDetails } = await request.json();

      if (!formTitle || !formDetails) {
        return new Response(JSON.stringify({ success: false, error: "Missing required parameters." }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const anthropicResponse = await fetch('https://anthropic.com', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,               
          'anthropic-version': '2023-06-01',                 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",                
          max_tokens: 4000,
          system: `You are an expert legal documents draftsman and state compliance expert. 
                   Your job is to generate a comprehensive, formal, and pixel-perfect document body text based on the user's inputs. 
                   Format your response cleanly with professional layout structures, defined lines, numbered clauses, and official signature execution blocks where applicable. 
                   Output your response using clean, simple HTML text tags (like <p>, <h3>, <ul>, <ol>, <strong>) so it renders perfectly inside a clean browser frame. Do NOT wrap your output in markdown code blocks like \`\`\`html. Output raw HTML tags directly.`,
          messages: [
            { 
              role: "user", 
              content: `Document Type Requested: ${formTitle}\n\nRaw Case/Facility Details Provided:\n${formDetails}` 
            }
          ]
        })
      });

      const aiData = await anthropicResponse.json();
      const formattedDocumentHTML = aiData.content[0].text;

      const printLayoutHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${formTitle}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; padding: 50px; color: #000; background: #fff; line-height: 1.5; }
              .document-container { max-width: 800px; margin: 0 auto; border: 1px solid #000; padding: 40px; box-shadow: none; }
              h1, h2, h3 { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; }
              hr { border: 0; border-top: 2px solid #000; margin: 20px 0; }
              @media print {
                body { padding: 0; }
                .document-container { border: none; padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div style="text-align: right; margin-bottom: 20px;">
              <button onclick="window.print()" style="background: #000; color: #fff; padding: 8px 16px; border: none; font-size: 14px; cursor: pointer; font-family: Arial, sans-serif; font-weight: bold;">
                🖨️ Print / Save as PDF
              </button>
            </div>
            <div class="document-container">
              <h1>${formTitle}</h1>
              <hr />
              <div class="document-body">
                ${formattedDocumentHTML}
              </div>
            </div>
          </body>
        </html>
      `;

      return new Response(JSON.stringify({ 
        success: true, 
        htmlOutput: printLayoutHtml 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // DEFAULT ROUTE: PASS ALL OTHER STANDARD TRAFFIC NORMALLY
  return fetch(request);
}
