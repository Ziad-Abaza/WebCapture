const http = require('http');
const { captureWebsite, generatePreview, listCaptures } = require('./src/edge-capture');

const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>موقع تجريبي - متجر إلكتروني فاخر</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; }
    header { position: sticky; top: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(10px); padding: 1.5rem 3rem; display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; z-index: 100; }
    .hero { position: relative; min-height: 85vh; padding: 6rem 3rem; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; background: radial-gradient(circle at 80% 20%, #3b82f6 0%, #1e1b4b 60%, #0f172a 100%); overflow: hidden; }
    .hero h1 { font-size: 3.5rem; max-width: 800px; margin-bottom: 1.5rem; line-height: 1.2; }
    .hero p { font-size: 1.3rem; color: #94a3b8; max-width: 600px; margin-bottom: 2rem; }
    .cta-btn { background: #3b82f6; color: white; padding: 1rem 2.5rem; font-size: 1.1rem; border-radius: 9999px; border: none; font-weight: bold; cursor: pointer; box-shadow: 0 10px 25px -5px rgba(59,130,246,0.5); }
    .hero-badge { position: absolute; right: 5%; bottom: 10%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 1rem; padding: 2rem; backdrop-filter: blur(12px); }
    .features { padding: 5rem 3rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; background: #0b0f19; }
    .card { background: #1e293b; border-radius: 1rem; padding: 2rem; border: 1px solid #334155; }
    footer { padding: 4rem 3rem; text-align: center; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <header>
    <div style="font-size: 1.5rem; font-weight: bold;">شعار المنصة</div>
    <nav><a href="#" style="color: white;">الرئيسية</a></nav>
  </header>
  <section class="hero">
    <h1>واجهة رقمية فائقة التطور لنمو أعمالك</h1>
    <p>نساعدك في تحويل أفكارك إلى منصات سريعة واحترافية تلائم معايير الويب العالمية وتجذب عملائك المستهدفين.</p>
    <button class="cta-btn">ابدأ الآن مجاناً</button>
    <div class="hero-badge">
      <h3>+99.8%</h3>
      <p>معدل رضا العملاء</p>
    </div>
  </section>
  <section class="features">
    <div class="card"><h3>سرعة فائقة</h3><p>أداء خفيف وأوقات استجابة بالمللي ثانية.</p></div>
    <div class="card"><h3>تصميم عصري</h3><p>متجاوب بالكامل مع كافة الشاشات والأجهزة.</p></div>
    <div class="card"><h3>أمان متكامل</h3><p>حماية مشددة لكافة البيانات والمعاملات.</p></div>
  </section>
  <footer>حقوق النشر &copy; 2026</footer>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlContent);
});

server.listen(4567, async () => {
  try {
    const url = 'http://localhost:4567';
    console.log('1. Testing generatePreview & Hero detection on local server...');
    const preview = await generatePreview({ url, width: 1920, height: 1080 });
    console.log('Title:', preview.title);
    console.log('Hero section found:', preview.heroInfo.found);
    console.log('Hero selector & box:', preview.heroInfo.selector, preview.heroInfo.box);

    console.log('\n2. Testing Hero section capture with padding/bleed...');
    const heroCapture = await captureWebsite({
      url,
      captureMode: 'hero',
      preset: 'mostaql_hd',
      heroBleedPadding: { top: 0, right: 0, bottom: 20, left: 0 },
      deviceScaleFactor: 2
    });
    console.log('Hero capture saved:', heroCapture.filePath);
    console.log('Hero dimensions:', heroCapture.metadata.dimensions);

    console.log('\n3. Testing Full Page capture without clipping...');
    const fullCapture = await captureWebsite({
      url,
      captureMode: 'fullPage',
      preset: 'desktop_fhd',
      deviceScaleFactor: 2
    });
    console.log('Full capture saved:', fullCapture.filePath);
    console.log('Full dimensions:', fullCapture.metadata.dimensions);

    console.log('\n4. Testing listCaptures()...');
    const list = listCaptures();
    console.log(`Found ${list.length} captures in output folder.`);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
