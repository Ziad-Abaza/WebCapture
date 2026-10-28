const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const urlParser = require('url');

// Standard Dimensions for Freelance Platforms & Portfolios
const PRESETS = {
  'mostaql_hd': { width: 1600, height: 1200, label: 'مستقل / خمسات (4:3 - 1600x1200)', aspect: '4:3' },
  'mostaql_std': { width: 1200, height: 900, label: 'مستقل / خمسات (4:3 - 1200x900)', aspect: '4:3' },
  'behance_cover': { width: 1600, height: 1200, label: 'بيهانس غلاف (4:3 - 1600x1200)', aspect: '4:3' },
  'behance_16_9': { width: 1920, height: 1080, label: 'بيهانس / دريبل (16:9 - 1920x1080)', aspect: '16:9' },
  'behance_retina': { width: 2880, height: 1800, label: 'ريتينا شاشة عريضة (16:10 - 2880x1800)', aspect: '16:10' },
  'upwork_catalog': { width: 1000, height: 750, label: 'أب ورك معرض الأعمال (4:3 - 1000x750)', aspect: '4:3' },
  'desktop_fhd': { width: 1920, height: 1080, label: 'شاشة حاسوب كاملة FHD (1920x1080)', aspect: '16:9' },
  'macbook': { width: 1440, height: 900, label: 'ماك بوك قياسي (16:10 - 1440x900)', aspect: '16:10' },
  'hero_banner': { width: 1920, height: 800, label: 'بانر عريض هيرو (1920x800)', aspect: '2.4:1' },
  'mobile_iphone': { width: 393, height: 852, label: 'آيفون حديث (393x852)', aspect: '9:19.5' },
  'custom': { width: 1920, height: 1080, label: 'أبعاد مخصصة', aspect: 'custom' }
};

let browserInstance = null;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list'
    ]
  });
  return browserInstance;
}

/**
 * Creates a stealth browser context mimicking genuine Edge on Windows.
 */
async function createStealthContext(browser, { width = 1920, height = 1080, deviceScaleFactor = 1 } = {}) {
  return await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: Number(deviceScaleFactor) || 1,
    userAgent: USER_AGENT,
    locale: 'ar-SA',
    extraHTTPHeaders: {
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Sec-Ch-Ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"'
    }
  });
}

/**
 * Strips automation flags and masks webdriver on page creation.
 */
async function preparePage(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
  });
}

function sanitizeSlug(str) {
  return str
    .replace(/^https?:\/\//i, '')
    .replace(/[^\w\u0600-\u06FF.-]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'website';
}

/**
 * Navigates to URL, bypasses bot challenges (Cloudflare/DDoS),
 * waits for network & dynamic content, handles preloaders, and triggers lazy loading.
 */
async function navigateAndLoadPage(page, url, { waitDelay = 3, dismissLoaders = true, timeout = 40000 } = {}) {
  await preparePage(page);

  // 1. Initial navigation
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    } catch (e2) {}
  }

  // 2. Cloudflare / Anti-Bot Security Challenge Check
  let currentTitle = await page.title().catch(() => '');
  if (/checking your browser|just a moment|security check|cloudflare|ddos/i.test(currentTitle)) {
    console.log(`[EdgeCapture] Bot verification detected: "${currentTitle}". Waiting for clearance...`);
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(1000);
      currentTitle = await page.title().catch(() => '');
      if (!/checking your browser|just a moment|security check|cloudflare|ddos/i.test(currentTitle)) {
        console.log(`[EdgeCapture] Verification cleared successfully! Title is now: "${currentTitle}"`);
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        } catch (e) {}
        try {
          await page.waitForLoadState('load', { timeout: 15000 });
        } catch (e) {}
        break;
      }
    }
  }

  // 3. Wait for load event
  try {
    await page.waitForLoadState('load', { timeout: 10000 });
  } catch (e) {}

  // 4. User-configured extra wait delay for animations, Vue/React rendering, and transitions
  const delaySec = Math.max(0, Number(waitDelay) !== undefined && !isNaN(Number(waitDelay)) ? Number(waitDelay) : 3);
  if (delaySec > 0) {
    console.log(`[EdgeCapture] Applying wait delay: ${delaySec}s for ${url}`);
    await page.waitForTimeout(delaySec * 1000);
  } else {
    // Direct mode - gentle 1s networkidle check
    try {
      await page.waitForLoadState('networkidle', { timeout: 1000 });
    } catch (e) {}
  }

  // 5. Scroll down to trigger lazy loading / IntersectionObservers, then scroll back
  try {
    await page.evaluate(async () => {
      const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const step = Math.min(800, scrollHeight / 4);
      for (let y = 0; y < Math.min(scrollHeight, 4000); y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);

      // Wait for visible images to load
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(imgs.slice(0, 30).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = img.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      }));
    });
  } catch (e) {}

  // 6. Smart Preloader Detection & Auto-Dismissal
  let removedLoadersCount = 0;
  if (dismissLoaders) {
    removedLoadersCount = await page.evaluate(() => {
      let count = 0;
      const loaderSelectors = [
        '#preloader', '.preloader', '#loader', '.loader', '.site-preloader',
        '.page-loader', '.loading-overlay', '.spinner-wrapper', '.ct-preloader',
        '[class*="preloader" i]', '[id*="preloader" i]', '[class*="loading-screen" i]',
        '[class*="site-loader" i]', '[id*="site-loader" i]',
        '.pace', '#pace', '.spinner-circle', '.loader-container', '.loading-container',
        '#site-loading', '.site-loading', '#loader-wrapper', '.loader-wrapper'
      ];

      loaderSelectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('opacity', '0', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('pointer-events', 'none', 'important');
              el.style.setProperty('z-index', '-99999', 'important');
              count++;
            }
          });
        } catch (e) {}
      });

      // Detect full-screen blocking overlay divs with spinners/loading texts
      try {
        document.querySelectorAll('div, section, aside').forEach(el => {
          const style = window.getComputedStyle(el);
          const pos = style.position;
          if ((pos === 'fixed' || pos === 'absolute') && parseInt(style.zIndex, 10) >= 100) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= window.innerWidth * 0.85 && rect.height >= window.innerHeight * 0.85) {
              const text = (el.innerText || '').trim();
              const cls = ((el.className || '') + ' ' + (el.id || '')).toLowerCase();
              if (text.length < 50 && (/load|wait|spin|جار|لحظة|انتظر|تحميل/i.test(cls) || /load|wait|spin|جار|لحظة|انتظر|تحميل/i.test(text))) {
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('opacity', '0', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('pointer-events', 'none', 'important');
                el.style.setProperty('z-index', '-99999', 'important');
                count++;
              }
            }
          }
        });
      } catch (e) {}

      // Ensure scrolling is enabled if preloader locked body
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';

      return count;
    });
  }

  return { removedLoadersCount, currentTitle, appliedWaitDelay: delaySec };
}

/**
 * Prepares the page by loading fonts and stabilizing CSS animations and scrollbars.
 * Must be executed AFTER preloader has vanished to avoid freezing loaders halfway.
 */
async function stabilizePage(page, { hideFixed = false, hideBanners = true } = {}) {
  // Wait for fonts
  try {
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
  } catch (e) {}

  // Inject anti-clipping & anti-distortion CSS with retry on navigation
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.addStyleTag({
        content: `
          /* Hide scrollbars cleanly */
          ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
          html, body {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          /* Pause animations & transitions to avoid motion blur / halfway renders */
          *, *::before, *::after {
            animation-play-state: paused !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
          ${hideBanners ? `
            /* Hide typical annoyance overlays: cookies, feedback, chat badges */
            [id*="cookie"], [class*="cookie"], [class*="consent"],
            [id*="consent"], [id*="crisp-chatbox"], [class*="intercom-frame"],
            div[aria-label*="cookie" i] {
              display: none !important;
            }
          ` : ''}
          ${hideFixed ? `
            /* Hide fixed/sticky headers if user requests clean non-obscuring captures */
            header[style*="fixed"], nav[style*="fixed"], .sticky, .fixed-top {
              position: absolute !important;
            }
          ` : ''}
        `
      });
      break;
    } catch (e) {
      if (attempt < 2 && /execution context was destroyed|navigation/i.test(e.message)) {
        await page.waitForTimeout(800);
        continue;
      }
    }
  }

  // Brief pause for paint to settle
  await page.waitForTimeout(150);
}

/**
 * Automatically inspects page to locate the Hero section bounding box
 */
async function detectHeroSection(page) {
  try {
    return await page.evaluate(() => {
      const candidates = [
        'section[class*="hero" i]',
        'div[class*="hero" i]',
        '[id*="hero" i]',
        'header:not([class*="nav" i]):not([class*="menu" i])',
        'main > section:first-of-type',
        'main > div:first-of-type',
        'body > div:first-of-type > section:first-of-type'
      ];

      let foundEl = null;
      for (const selector of candidates) {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.height >= 200 && rect.width >= 300) {
            foundEl = el;
            break;
          }
        }
      }

      if (!foundEl) {
        const h1 = document.querySelector('h1');
        if (h1) {
          let parent = h1.parentElement;
          while (parent && parent !== document.body) {
            const rect = parent.getBoundingClientRect();
            if (rect.height >= 250 && rect.width >= 400) {
              foundEl = parent;
              break;
            }
            parent = parent.parentElement;
          }
        }
      }

      if (foundEl) {
        const rect = foundEl.getBoundingClientRect();
        const style = window.getComputedStyle(foundEl);
        return {
          found: true,
          selector: foundEl.tagName.toLowerCase() + (foundEl.id ? '#' + foundEl.id : '') + (foundEl.className ? '.' + foundEl.className.split(' ').slice(0, 2).join('.') : ''),
          box: {
            x: Math.max(0, Math.round(rect.left + window.scrollX)),
            y: Math.max(0, Math.round(rect.top + window.scrollY)),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          hasBackground: style.backgroundImage !== 'none' || style.backgroundColor !== 'rgba(0, 0, 0, 0)'
        };
      }

      return {
        found: false,
        selector: 'body',
        box: {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: Math.min(window.innerHeight, 900)
        },
        hasBackground: false
      };
    });
  } catch (err) {
    return {
      found: false,
      selector: 'body',
      box: {
        x: 0,
        y: 0,
        width: 1920,
        height: 900
      },
      hasBackground: false
    };
  }
}

/**
 * Generates live preview snapshot with page inspection data.
 */
async function generatePreview({
  url,
  width = 1920,
  height = 1080,
  deviceScaleFactor = 1,
  scrollY = 0,
  waitDelay = 3,
  dismissLoaders = true
}) {
  const browser = await getBrowser();
  const context = await createStealthContext(browser, {
    width,
    height,
    deviceScaleFactor: 1 // Keep preview fast
  });
  const page = await context.newPage();

  const loadInfo = await navigateAndLoadPage(page, url, { waitDelay, dismissLoaders });

  await stabilizePage(page);

  if (scrollY > 0) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  }

  const title = (await page.title()) || loadInfo.currentTitle || 'الموقع';
  const dimensions = await page.evaluate(() => {
    return {
      totalWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      totalHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY
    };
  });

  const heroInfo = await detectHeroSection(page);

  // Take lightweight base64 preview screenshot
  const buffer = await page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
  const previewBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  await context.close();

  return {
    success: true,
    title,
    dimensions,
    heroInfo,
    previewBase64,
    removedLoadersCount: loadInfo.removedLoadersCount || 0,
    appliedWaitDelay: loadInfo.appliedWaitDelay || 0
  };
}

/**
 * Performs final high-fidelity capture with exact framing, scale factor, and anti-clipping.
 */
async function captureWebsite({
  url,
  outputDir,
  fileName,
  preset = 'mostaql_hd',
  customWidth,
  customHeight,
  deviceScaleFactor = 2, // 2x Retina for crisp freelance portfolio quality
  captureMode = 'viewport', // 'viewport' | 'fullPage' | 'hero' | 'custom_clip' | 'selector'
  selector = null,
  clip = null, // { x, y, width, height }
  heroBleedPadding = { top: 0, right: 0, bottom: 0, left: 0 },
  scrollY = 0,
  format = 'png', // 'png' | 'jpeg' | 'webp'
  quality = 95,
  hideFixed = false,
  hideBanners = true,
  waitDelay = 3,
  dismissLoaders = true
}) {
  const browser = await getBrowser();

  // Determine viewport dimensions
  let targetWidth = 1920;
  let targetHeight = 1080;

  if (preset && PRESETS[preset] && preset !== 'custom') {
    targetWidth = PRESETS[preset].width;
    targetHeight = PRESETS[preset].height;
  } else if (customWidth && customHeight) {
    targetWidth = parseInt(customWidth, 10);
    targetHeight = parseInt(customHeight, 10);
  }

  const context = await createStealthContext(browser, {
    width: targetWidth,
    height: targetHeight,
    deviceScaleFactor: Number(deviceScaleFactor) || 2
  });
  const page = await context.newPage();

  const loadInfo = await navigateAndLoadPage(page, url, { waitDelay, dismissLoaders });

  await stabilizePage(page, { hideFixed, hideBanners });

  // Handle scroll offset
  if (scrollY > 0 && captureMode !== 'hero') {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(100);
  }

  // Determine site slug & target directory
  let siteSlug = 'website';
  try {
    const parsed = new URL(url);
    siteSlug = sanitizeSlug(parsed.hostname || 'site');
  } catch (e) {
    siteSlug = sanitizeSlug(url.slice(0, 30));
  }
  const finalFolder = outputDir || path.join(process.cwd(), 'output', siteSlug);
  if (!fs.existsSync(finalFolder)) {
    fs.mkdirSync(finalFolder, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseName = fileName ? sanitizeSlug(fileName) : `capture_${captureMode}_${timestamp}`;
  const outExtension = format === 'jpeg' ? 'jpg' : format;
  const outFilePath = path.join(finalFolder, `${baseName}.${outExtension}`);

  let screenshotOptions = {
    path: outFilePath,
    type: format === 'jpg' ? 'jpeg' : format
  };
  if (format === 'jpeg' || format === 'webp') {
    screenshotOptions.quality = Number(quality) || 95;
  }

  let finalBounds = { width: targetWidth, height: targetHeight };

  // Handle Capture Modes
  if (captureMode === 'fullPage') {
    screenshotOptions.fullPage = true;
    finalBounds = await page.evaluate(() => ({
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    }));
  } else if (captureMode === 'hero') {
    const hero = await detectHeroSection(page);
    const pad = heroBleedPadding || { top: 0, right: 0, bottom: 0, left: 0 };
    
    // Apply bleed / padding adjustments
    const x = Math.max(0, hero.box.x - (pad.left || 0));
    const y = Math.max(0, hero.box.y - (pad.top || 0));
    const width = Math.min(targetWidth, hero.box.width + (pad.left || 0) + (pad.right || 0));
    const height = Math.round(hero.box.height + (pad.top || 0) + (pad.bottom || 0));

    // Scroll hero into view if needed
    await page.evaluate((topY) => window.scrollTo(0, topY), Math.max(0, y));
    await page.waitForTimeout(100);

    screenshotOptions.clip = { x, y, width, height };
    finalBounds = { width, height };
  } else if (captureMode === 'custom_clip' && clip) {
    screenshotOptions.clip = {
      x: Math.max(0, Number(clip.x) || 0),
      y: Math.max(0, Number(clip.y) || 0),
      width: Math.min(targetWidth, Number(clip.width) || targetWidth),
      height: Math.max(50, Number(clip.height) || targetHeight)
    };
    finalBounds = { width: screenshotOptions.clip.width, height: screenshotOptions.clip.height };
  } else if (captureMode === 'selector' && selector) {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        screenshotOptions.clip = {
          x: Math.max(0, Math.round(box.x)),
          y: Math.max(0, Math.round(box.y)),
          width: Math.round(box.width),
          height: Math.round(box.height)
        };
        finalBounds = { width: box.width, height: box.height };
      }
    }
  }

  // Take screenshot
  await page.screenshot(screenshotOptions);

  const fileStats = fs.statSync(outFilePath);
  const metadata = {
    title: (await page.title()) || loadInfo.currentTitle || 'الموقع',
    url,
    timestamp: new Date().toISOString(),
    preset,
    dimensions: {
      viewportWidth: targetWidth,
      viewportHeight: targetHeight,
      renderedWidth: Math.round(finalBounds.width * Number(deviceScaleFactor)),
      renderedHeight: Math.round(finalBounds.height * Number(deviceScaleFactor)),
      deviceScaleFactor: Number(deviceScaleFactor)
    },
    captureMode,
    filePath: outFilePath,
    relativeFilePath: path.relative(process.cwd(), outFilePath),
    fileName: `${baseName}.${outExtension}`,
    fileSizeKB: Math.round(fileStats.size / 1024),
    format,
    waitDelay: Number(waitDelay) || 0,
    dismissLoaders: !!dismissLoaders,
    removedLoadersCount: loadInfo.removedLoadersCount || 0
  };

  const metaPath = path.join(finalFolder, `${baseName}.meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

  await context.close();

  return {
    success: true,
    filePath: outFilePath,
    metaPath,
    metadata,
    appliedWaitDelay: loadInfo.appliedWaitDelay || 0,
    removedLoadersCount: loadInfo.removedLoadersCount || 0
  };
}

/**
 * Lists all existing captures grouped by site folder.
 */
function listCaptures(baseDir) {
  const root = baseDir || path.join(process.cwd(), 'output');
  if (!fs.existsSync(root)) return [];

  const folders = fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const results = [];
  for (const folder of folders) {
    const folderPath = path.join(root, folder);
    const files = fs.readdirSync(folderPath);
    const images = files.filter(f => /\.(png|jpe?g|webp)$/i.test(f));

    for (const img of images) {
      const imgPath = path.join(folderPath, img);
      const metaName = img.replace(/\.[^.]+$/, '') + '.meta.json';
      const metaPath = path.join(folderPath, metaName);
      let meta = null;
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) {}
      }
      const stat = fs.statSync(imgPath);
      results.push({
        folder,
        fileName: img,
        fullPath: imgPath,
        relativeUrl: `/output/${folder}/${img}`,
        sizeKB: Math.round(stat.size / 1024),
        createdAt: stat.mtime,
        metadata: meta
      });
    }
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
}

module.exports = {
  PRESETS,
  getBrowser,
  generatePreview,
  captureWebsite,
  listCaptures
};
