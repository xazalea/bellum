export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sponsored</title>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      body { display: grid; place-items: center; min-height: 100vh; }
      /* Ensure the ad iframe stays crisp and centered */
      #ad-root { width: 160px; height: 300px; overflow: hidden; border-radius: 14px; }
    </style>
  </head>
  <body>
    <div id="ad-root">
      <script type="text/javascript">
        atOptions = {
          'key' : '797d26c0be4590b29d90574f3c90b181',
          'format' : 'iframe',
          'height' : 300,
          'width' : 160,
          'params' : {}
        };
      </script>
      <script
        type="text/javascript"
        src="https://www.highperformanceformat.com/797d26c0be4590b29d90574f3c90b181/invoke.js"
      ></script>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

