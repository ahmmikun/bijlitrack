import { NextRequest, NextResponse } from 'next/server';
import { fetchOfficialLescoBill } from '@/lib/server/services/lesco.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceNo = searchParams.get('referenceNo') || '';

    if (!referenceNo) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>Error</h2><p>Reference number is required.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    const result = await fetchOfficialLescoBill(referenceNo);
    if (!result.success || !result.html) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #ef4444;">Failed to Fetch Official Bill</h2>
          <p>${result.error || 'The utility portal did not respond. Please try again.'}</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border: 0; background: #0ea5e9; color: white;">Try Again</button>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 502 }
      );
    }

    // Inject auto-print script so it automatically opens the browser's "Save as PDF / Print" dialog on our own website
    let html = result.html;
    const autoPrintScript = `
      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 400);
        });
      </script>
    `;
    html = html.replace('</body>', `${autoPrintScript}</body>`);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    return new NextResponse(
      `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2>Error</h2><p>${error?.message || 'Server error'}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
