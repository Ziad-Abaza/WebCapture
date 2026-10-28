const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { PRESETS, generatePreview, captureWebsite, listCaptures } = require('./edge-capture');
const { GitHubAnalyzer } = require('./github-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/output', express.static(path.join(__dirname, '..', 'output')));

// -------------------------------------------------------------
// Phase 1 Endpoints: Edge Studio Capture
// -------------------------------------------------------------

// 1. Get Presets
app.get('/api/presets', (req, res) => {
  res.json({ success: true, presets: PRESETS });
});

// 2. Generate Live Preview & Detect Hero Section
app.post('/api/preview', async (req, res) => {
  try {
    const { url, width, height, scrollY, waitDelay, dismissLoaders } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }
    const result = await generatePreview({
      url,
      width: Number(width) || 1920,
      height: Number(height) || 1080,
      scrollY: Number(scrollY) || 0,
      waitDelay: waitDelay !== undefined ? Number(waitDelay) : 3,
      dismissLoaders: dismissLoaders !== false
    });
    res.json(result);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. High Quality Capture
app.post('/api/capture', async (req, res) => {
  try {
    const {
      url,
      preset,
      customWidth,
      customHeight,
      deviceScaleFactor,
      captureMode,
      selector,
      clip,
      heroBleedPadding,
      scrollY,
      format,
      fileName,
      hideFixed,
      hideBanners,
      waitDelay,
      dismissLoaders
    } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }

    const captureResult = await captureWebsite({
      url,
      preset,
      customWidth,
      customHeight,
      deviceScaleFactor: Number(deviceScaleFactor) || 2,
      captureMode: captureMode || 'viewport',
      selector,
      clip,
      heroBleedPadding,
      scrollY: Number(scrollY) || 0,
      format: format || 'png',
      fileName,
      hideFixed: !!hideFixed,
      hideBanners: hideBanners !== false,
      waitDelay: waitDelay !== undefined ? Number(waitDelay) : 3,
      dismissLoaders: dismissLoaders !== false
    });

    res.json(captureResult);
  } catch (err) {
    console.error('Capture error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. List All Captures
app.get('/api/captures', (req, res) => {
  try {
    const captures = listCaptures();
    res.json({ success: true, captures });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete Capture
app.post('/api/captures/delete', (req, res) => {
  try {
    const { fullPath } = req.body;
    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      const metaPath = fullPath.replace(/\.[^.]+$/, '') + '.meta.json';
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: 'الملف غير موجود' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Open Folder in Windows Explorer
app.post('/api/captures/open-folder', (req, res) => {
  try {
    const { folder } = req.body;
    let target = path.join(process.cwd(), 'output');
    if (folder) {
      target = path.join(target, folder);
    }
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    exec(`explorer.exe "${target}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Phase 2 Endpoints: GitHub Project Frontend Extractor
// -------------------------------------------------------------

// 7. Analyze Repository (Stack + Routes + Views)
app.post('/api/github/analyze', async (req, res) => {
  try {
    const { repoUrlOrPath } = req.body;
    if (!repoUrlOrPath) {
      return res.status(400).json({ success: false, error: 'رابط أو مسار المستودع مطلوب' });
    }

    const analyzer = new GitHubAnalyzer(repoUrlOrPath);
    await analyzer.prepareRepository();
    const stack = analyzer.analyzeStack();
    const pages = analyzer.discoverRoutesAndPages();

    res.json({
      success: true,
      repoName: analyzer.repoName,
      repoDir: analyzer.repoDir,
      stack,
      pagesCount: pages.length,
      pages
    });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Batch Render & Capture GitHub Views
app.post('/api/github/render-capture', async (req, res) => {
  try {
    const { repoUrlOrPath, preset, deviceScaleFactor } = req.body;
    if (!repoUrlOrPath) {
      return res.status(400).json({ success: false, error: 'رابط أو مسار المستودع مطلوب' });
    }

    const analyzer = new GitHubAnalyzer(repoUrlOrPath);
    const result = await analyzer.renderAndCaptureAll({
      preset: preset || 'desktop_fhd',
      deviceScaleFactor: Number(deviceScaleFactor) || 2
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Render & Capture error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Edge Studio & GitHub Frontend Extractor running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
