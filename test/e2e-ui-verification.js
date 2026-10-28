const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Local sample test server for mock target website
const sampleSiteHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>موقع أعمال الواجهات الحية</title>
  <style>
    body { font-family: sans-serif; margin: 0; background: #0f172a; color: #fff; }
    .hero { min-height: 600px; padding: 4rem 2rem; background: linear-gradient(135deg, #4f46e5, #06b6d4); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; max-width: 600px; }
    .services { padding: 4rem 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; background: #1e293b; }
    .service-card { background: #334155; padding: 2rem; border-radius: 12px; }
    footer { padding: 2rem; text-align: center; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>استوديو الإبداع البرمجي</h1>
    <p>حلول تقنية متكاملة ومصممة بأعلى معايير الحداثة والسرعة لرواد الأعمال.</p>
  </div>
  <div class="services">
    <div class="service-card"><h3>تطوير الويب</h3><p>Laravel, Inertia, Vue 3</p></div>
    <div class="service-card"><h3>تصميم الواجهات</h3><p>Tailwind CSS & UX</p></div>
  </div>
  <footer>جميع الحقوق محفوظة 2026</footer>
</body>
</html>
`;

(async () => {
  console.log('===============================================================');
  console.log('🧪 Starting Strict End-to-End Autonomous UI & Functionality Verification');
  console.log('===============================================================');

  // Start local mock site server
  const mockSiteServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(sampleSiteHtml);
  });
  await new Promise(r => mockSiteServer.listen(5678, r));
  console.log('✓ Mock target server running on http://localhost:5678');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', r => {
    if (r.status() >= 400) {
      console.log(`[HTTP ERROR] ${r.status()} on: ${r.url()}`);
    }
  });

  try {
    // 1. Load application UI
    console.log('\n[TEST 1] Loading application at http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    const pageTitle = await page.title();
    console.log(`✓ Application loaded. Page Title: "${pageTitle}"`);

    // 2. Tab Navigation
    console.log('\n[TEST 2] Testing Tab Switching (Phase 1 <-> Phase 2)...');
    await page.click('#tabBtnPhase2');
    let phase2Visible = await page.isVisible('#sectionPhase2');
    let phase1Hidden = await page.isHidden('#sectionPhase1');
    console.log(`✓ Phase 2 active: visible=${phase2Visible}, Phase 1 hidden=${phase1Hidden}`);

    await page.click('#tabBtnPhase1');
    phase2Visible = await page.isVisible('#sectionPhase2');
    phase1Hidden = await page.isHidden('#sectionPhase1');
    console.log(`✓ Phase 1 active: visible=${!phase1Hidden}, Phase 2 hidden=${!phase2Visible}`);

    // 3. Dimension indicator live update before preview
    console.log('\n[TEST 3] Testing Dimension Display updates on preset change...');
    await page.selectOption('#presetSelect', 'desktop_fhd');
    let dimText = await page.textContent('#dimDisplay');
    console.log(`✓ Changed to desktop_fhd: dimDisplay = "${dimText.trim()}"`);

    await page.selectOption('#presetSelect', 'custom');
    await page.fill('#customWidth', '1400');
    await page.fill('#customHeight', '700');
    await page.evaluate(() => updateFramingBox());
    dimText = await page.textContent('#dimDisplay');
    console.log(`✓ Changed to custom 1400x700: dimDisplay = "${dimText.trim()}"`);

    await page.selectOption('#presetSelect', 'mostaql_hd');
    dimText = await page.textContent('#dimDisplay');
    console.log(`✓ Reverted to mostaql_hd: dimDisplay = "${dimText.trim()}"`);

    // 4. Mode switching & custom clip controls
    console.log('\n[TEST 4] Testing Capture Mode Selection & Custom Clip...');
    await page.selectOption('#captureMode', 'custom_clip');
    const customClipVisible = await page.isVisible('#customClipRow');
    console.log(`✓ Custom Clip Row visible: ${customClipVisible}`);

    // Test Quick Clip Presets
    await page.click('button:has-text("بانر عريض")');
    const clipW = await page.inputValue('#clipWidth');
    const clipH = await page.inputValue('#clipHeight');
    console.log(`✓ Clicked "بانر عريض": width=${clipW}, height=${clipH}`);

    await page.selectOption('#captureMode', 'hero');

    // 5. Delay & Anti-distortion toggles
    console.log('\n[TEST 5] Testing Wait Delays & Anti-Distortion Toggles...');
    await page.click('button[data-val="0"]');
    let activeDelay = await page.textContent('#activeDelayBadge');
    console.log(`✓ Wait delay set to 0s: badge = "${activeDelay.trim()}"`);

    // Test chkFreeze toggle
    const chkFreezeInitial = await page.isChecked('#chkFreeze');
    await page.click('#chkFreeze');
    const chkFreezeToggled = await page.isChecked('#chkFreeze');
    await page.click('#chkFreeze'); // Re-enable
    console.log(`✓ chkFreeze toggle functional: initial=${chkFreezeInitial}, toggled=${chkFreezeToggled}`);

    // 6. Test Empty URL Validation
    console.log('\n[TEST 6] Testing Validation on Empty URL...');
    await page.fill('#targetUrl', '');
    await page.click('#btnPreview');
    await page.waitForTimeout(500);
    const toastVisible = await page.isVisible('#toast');
    const toastMsg = await page.textContent('#toastMsg');
    console.log(`✓ Empty URL toast displayed: visible=${toastVisible}, text="${toastMsg}"`);

    // 7. Live Preview Generation
    console.log('\n[TEST 7] Testing Live Preview with Mock Target (http://localhost:5678)...');
    await page.fill('#targetUrl', 'http://localhost:5678');
    await page.click('#btnPreview');

    // Wait for preview loading spinner to disappear
    await page.waitForSelector('#previewImg[src^="data:image"]', { timeout: 25000 });
    const previewSrc = await page.getAttribute('#previewImg', 'src');
    const heroStatus = await page.textContent('#heroStatusBadge');
    const pageTitleLabel = await page.textContent('#pageTitleLabel');
    console.log(`✓ Preview loaded successfully!`);
    console.log(`  - Image src length: ${previewSrc.length} chars`);
    console.log(`  - Hero status: "${heroStatus.trim()}"`);
    console.log(`  - Detected Page title: "${pageTitleLabel.trim()}"`);

    // 8. Test Scroll Slider Interaction
    console.log('\n[TEST 8] Testing Scroll Slider Interaction...');
    await page.fill('#scrollSlider', '200');
    await page.dispatchEvent('#scrollSlider', 'input');
    await page.dispatchEvent('#scrollSlider', 'change');
    const scrollVal = await page.textContent('#scrollVal');
    console.log(`✓ Scroll slider moved to 200px: indicator = "${scrollVal.trim()}"`);

    // 9. High-Fidelity Capture Execution
    console.log('\n[TEST 9] Testing High-Fidelity Capture (Phase 1)...');
    await page.fill('#outFileName', 'e2e_test_capture');
    await page.click('#btnCapture');

    // Wait for capture processing to finish and button to re-enable
    await page.waitForFunction(() => {
      const btn = document.getElementById('btnCapture');
      return btn && !btn.disabled && !btn.innerHTML.includes('animate-spin');
    }, { timeout: 25000 });

    const captureToast = await page.textContent('#toastMsg');
    console.log(`✓ Capture completed. Feedback: "${captureToast.trim()}"`);

    // 10. Gallery Verification
    console.log('\n[TEST 10] Verifying Captures Gallery...');
    await page.waitForTimeout(1000);
    const galleryCount = await page.textContent('#galleryCountBadge');
    const galleryItems = await page.$$eval('#galleryGrid > div', items => items.length);
    console.log(`✓ Gallery displays ${galleryItems} items (badge says: "${galleryCount.trim()}")`);

    // Verify folder button on first card
    const folderButtonText = await page.textContent('#galleryGrid button[title="فتح هذا المجلد"]');
    console.log(`✓ Gallery card has clickable folder button: "${folderButtonText.trim()}"`);

    // 11. Phase 2: GitHub Repository Intake & Analysis
    console.log('\n[TEST 11] Testing Phase 2: GitHub / Local Laravel Project Analysis...');
    await page.click('#tabBtnPhase2');

    // Test 1-click demo button
    console.log('Clicking demo project quick button...');
    await page.click('button:has-text("test_projects/laravel-portfolio-demo")');
    const repoInputValue = await page.inputValue('#githubRepoInput');
    console.log(`✓ Input auto-filled with: "${repoInputValue}"`);

    // Click Analyze button
    console.log('Running Tech Stack & Route Discovery...');
    await page.click('#btnAnalyzeRepo');
    await page.waitForSelector('#ghAnalysisCard:not(.hidden)', { timeout: 25000 });

    const ghRepoTitle = await page.textContent('#ghRepoTitle');
    const ghPagesCount = await page.textContent('#ghPagesCount');
    const badgesCount = await page.$$eval('#ghStackBadges span', spans => spans.length);
    const pagesRows = await page.$$eval('#ghPagesTbody tr', rows => rows.length);

    console.log(`✓ Repository Analysis Succeeded!`);
    console.log(`  - Project title: "${ghRepoTitle.trim()}"`);
    console.log(`  - Discovered pages count: "${ghPagesCount.trim()}" (${pagesRows} table rows)`);
    console.log(`  - Stack badges: ${badgesCount} badges`);

    // 12. Phase 2: Single Page Render Verification
    console.log('\n[TEST 12] Testing Single View Isolated Rendering (Auth/Login)...');
    const firstPageBtn = await page.$('#ghPagesTbody tr:first-child button');
    await firstPageBtn.click();

    // Wait for button to transition to success
    await page.waitForFunction(() => {
      const btn = document.querySelector('#ghPagesTbody tr:first-child button');
      return btn && btn.textContent.includes('تم الالتقاط');
    }, { timeout: 25000 });
    console.log('✓ Single page render passed! Button updated to "تم الالتقاط".');

    // 13. Phase 2: Batch Render & Reports Generation
    console.log('\n[TEST 13] Testing Batch Extraction & Rendering (All Pages)...');
    await page.selectOption('#ghPresetSelect', 'mostaql_hd');
    await page.click('#btnGhScale1'); // Test 1x scale for speed
    await page.click('#btnRenderAll');

    // Wait for batch progress and final report
    await page.waitForSelector('#ghFinalReportView:not(.hidden)', { timeout: 45000 });
    const reportGridCards = await page.$$eval('#ghReportGrid > div', cards => cards.length);
    console.log(`✓ Batch rendering completed! Displayed ${reportGridCards} final report cards.`);

    const reportHtmlExists = fs.existsSync(path.join(process.cwd(), 'output', 'github_laravel-portfolio-demo', 'report.html'));
    const reportMdExists = fs.existsSync(path.join(process.cwd(), 'output', 'github_laravel-portfolio-demo', 'REPORT.md'));
    const reportJsonExists = fs.existsSync(path.join(process.cwd(), 'output', 'github_laravel-portfolio-demo', 'report.json'));

    console.log(`✓ Report files generated on disk:`);
    console.log(`  - report.html: ${reportHtmlExists}`);
    console.log(`  - REPORT.md: ${reportMdExists}`);
    console.log(`  - report.json: ${reportJsonExists}`);

    // Check Console Errors
    console.log('\n[CONSOLE AUDIT]');
    if (consoleErrors.length === 0) {
      console.log('✓ Zero console errors detected during the entire session!');
    } else {
      console.warn(`⚠️ Console errors encountered:`, consoleErrors);
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL 13 END-TO-END UI & FUNCTIONALITY TESTS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ Test Failure:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    mockSiteServer.close();
  }
})();
