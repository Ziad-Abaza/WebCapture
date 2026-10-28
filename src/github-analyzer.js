const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { BladeEngine } = require('./blade-engine');
const { InertiaEngine } = require('./inertia-engine');
const { captureWebsite } = require('./edge-capture');
const { saveReports } = require('./reporter');

function sanitizeRepoName(urlOrPath) {
  const clean = urlOrPath.replace(/\.git$/i, '').trim();
  const parts = clean.split(/[/\\]/);
  const name = parts[parts.length - 1] || 'project';
  return name.replace(/[^\w\u0600-\u06FF.-]/gi, '_');
}

/**
 * Deep Tech Stack & Route/Page Analyzer for Laravel, Vue, Inertia, and Blade
 */
class GitHubAnalyzer {
  constructor(targetUrlOrPath, options = {}) {
    this.source = targetUrlOrPath;
    this.options = options;
    this.repoName = sanitizeRepoName(targetUrlOrPath);
    this.repoDir = null;
    this.isCloned = false;
  }

  async prepareRepository() {
    // If it's a local folder that already exists
    if (fs.existsSync(this.source) && fs.statSync(this.source).isDirectory()) {
      this.repoDir = path.resolve(this.source);
      return { success: true, dir: this.repoDir, isLocal: true };
    }

    // Otherwise clone from GitHub
    const reposDir = path.join(process.cwd(), 'storage', 'repos');
    if (!fs.existsSync(reposDir)) {
      fs.mkdirSync(reposDir, { recursive: true });
    }

    this.repoDir = path.join(reposDir, this.repoName);

    if (fs.existsSync(this.repoDir)) {
      // Already cached/cloned
      return { success: true, dir: this.repoDir, isLocal: false, cached: true };
    }

    try {
      // Shallow clone for rapid analysis
      execSync(`git clone --depth 1 "${this.source}" "${this.repoDir}"`, {
        stdio: 'pipe',
        timeout: 120000
      });
      this.isCloned = true;
      return { success: true, dir: this.repoDir, isLocal: false, cached: false };
    } catch (err) {
      throw new Error(`تعذر استنساخ المستودع من GitHub: ${err.message}`);
    }
  }

  analyzeStack() {
    if (!this.repoDir || !fs.existsSync(this.repoDir)) {
      throw new Error('المستودع غير متاح للفحص.');
    }

    const composerPath = path.join(this.repoDir, 'composer.json');
    const packagePath = path.join(this.repoDir, 'package.json');
    const viteConfigPath = ['vite.config.js', 'vite.config.ts'].map(f => path.join(this.repoDir, f)).find(f => fs.existsSync(f));
    const tailwindConfigPath = ['tailwind.config.js', 'tailwind.config.ts'].map(f => path.join(this.repoDir, f)).find(f => fs.existsSync(f));

    let composer = null;
    let pkg = null;

    if (fs.existsSync(composerPath)) {
      try { composer = JSON.parse(fs.readFileSync(composerPath, 'utf8')); } catch (e) {}
    }
    if (fs.existsSync(packagePath)) {
      try { pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')); } catch (e) {}
    }

    const stack = {
      isLaravel: false,
      laravelVersion: null,
      isVue: false,
      vueVersion: null,
      isInertia: false,
      inertiaVersion: null,
      isBlade: false,
      isTailwind: false,
      isBootstrap: false,
      isVite: !!viteConfigPath,
      isLaravelMix: fs.existsSync(path.join(this.repoDir, 'webpack.mix.js')),
      packages: [],
      frameworks: []
    };

    // Detect Laravel
    if (composer) {
      const req = { ...(composer.require || {}), ...(composer['require-dev'] || {}) };
      if (req['laravel/framework']) {
        stack.isLaravel = true;
        stack.laravelVersion = req['laravel/framework'];
        stack.frameworks.push(`Laravel (${req['laravel/framework']})`);
      }
      if (req['inertiajs/inertia-laravel']) {
        stack.isInertia = true;
        stack.packages.push('Inertia.js (Laravel Adapter)');
      }
      if (req['livewire/livewire']) stack.packages.push('Livewire');
      if (req['filament/filament']) stack.packages.push('Filament Admin');
    }

    // Detect Vue & Inertia in package.json
    if (pkg) {
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps['vue']) {
        stack.isVue = true;
        stack.vueVersion = deps['vue'];
        stack.frameworks.push(`Vue (${deps['vue']})`);
      }
      if (deps['@inertiajs/vue3']) {
        stack.isInertia = true;
        stack.inertiaVersion = 'Vue 3';
        stack.frameworks.push('Inertia.js Vue 3');
      } else if (deps['@inertiajs/inertia-vue']) {
        stack.isInertia = true;
        stack.inertiaVersion = 'Vue 2';
        stack.frameworks.push('Inertia.js Vue 2');
      }
      if (deps['tailwindcss'] || tailwindConfigPath) {
        stack.isTailwind = true;
        stack.packages.push('Tailwind CSS');
      }
      if (deps['bootstrap']) {
        stack.isBootstrap = true;
        stack.packages.push('Bootstrap');
      }
      if (deps['vite']) {
        stack.isVite = true;
        stack.packages.push('Vite');
      }
    }

    // Check Blade views
    const viewsDir = path.join(this.repoDir, 'resources', 'views');
    if (fs.existsSync(viewsDir)) {
      stack.isBlade = true;
      stack.frameworks.push('Blade Templates');
    }

    return stack;
  }

  discoverRoutesAndPages() {
    const pages = [];
    const webRoutesPath = path.join(this.repoDir, 'routes', 'web.php');

    // 1. Scan Inertia Vue Pages in resources/js/Pages
    const inertiaPagesDir = path.join(this.repoDir, 'resources', 'js', 'Pages');
    if (fs.existsSync(inertiaPagesDir)) {
      const findVueFiles = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            findVueFiles(full, `${prefix}${entry.name}/`);
          } else if (entry.isFile() && entry.name.endsWith('.vue')) {
            const pageName = `${prefix}${entry.name.replace(/\.vue$/, '')}`;
            pages.push({
              name: pageName,
              type: 'inertia-vue',
              filePath: full,
              relativeRoute: '/' + pageName.toLowerCase().replace(/index$/, '').replace(/\/$/, ''),
              title: `صفحة ${pageName}`
            });
          }
        }
      };
      findVueFiles(inertiaPagesDir);
    }

    // 2. Scan Blade views in resources/views
    const viewsDir = path.join(this.repoDir, 'resources', 'views');
    if (fs.existsSync(viewsDir)) {
      const findBladeFiles = (dir, prefix = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            // Skip components or layouts for standalone rendering if desirable, but allow view folders
            if (entry.name !== 'components' && entry.name !== 'vendor' && entry.name !== 'layouts') {
              findBladeFiles(full, `${prefix}${entry.name}.`);
            }
          } else if (entry.isFile() && entry.name.endsWith('.blade.php')) {
            const rawName = entry.name.replace(/\.blade\.php$/, '');
            // Skip partials starting with underscore
            if (!rawName.startsWith('_')) {
              const viewDotName = `${prefix}${rawName}`;
              pages.push({
                name: viewDotName,
                type: 'blade',
                filePath: full,
                relativeRoute: '/' + viewDotName.replace(/\./g, '/').replace(/index$/, ''),
                title: `واجهة Blade: ${viewDotName}`
              });
            }
          }
        }
      };
      findBladeFiles(viewsDir);
    }

    // 3. Scan routes/web.php to match named routes or custom controllers
    if (fs.existsSync(webRoutesPath)) {
      try {
        const routesContent = fs.readFileSync(webRoutesPath, 'utf8');

        // Match Inertia routes: Route::get('url', function() { return Inertia::render('ComponentName'); }) or Route::inertia('url', 'ComponentName')
        const inertiaRouteMatches = [
          ...routesContent.matchAll(/Route::get\s*\(\s*['"]([^'"]+)['"][\s\S]*?Inertia::render\s*\(\s*['"]([^'"]+)['"]/g),
          ...routesContent.matchAll(/Route::inertia\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)
        ];

        for (const m of inertiaRouteMatches) {
          const routeUrl = m[1];
          const compName = m[2];
          // Find matching page
          const existing = pages.find(p => p.name === compName || p.name.endsWith('/' + compName) || p.name.toLowerCase() === compName.toLowerCase());
          if (existing) {
            existing.relativeRoute = routeUrl;
          }
        }

        // Match Blade view routes: Route::view('url', 'view_name') or return view('view_name')
        const viewRouteMatches = [
          ...routesContent.matchAll(/Route::view\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g),
          ...routesContent.matchAll(/Route::get\s*\(\s*['"]([^'"]+)['"][\s\S]*?view\s*\(\s*['"]([^'"]+)['"]/g)
        ];

        for (const m of viewRouteMatches) {
          const routeUrl = m[1];
          const vName = m[2];
          const existing = pages.find(p => p.name === vName);
          if (existing) {
            existing.relativeRoute = routeUrl;
          }
        }
      } catch (e) {}
    }

    return pages;
  }

  /**
   * Batch render & capture discovered frontend pages
   */
  async renderAndCaptureAll({ preset = 'desktop_fhd', deviceScaleFactor = 2 } = {}) {
    await this.prepareRepository();
    const stack = this.analyzeStack();
    const pages = this.discoverRoutesAndPages();

    const outputFolder = path.join(process.cwd(), 'output', `github_${this.repoName}`);
    const tempDir = path.join(process.cwd(), 'storage', 'temp', `github_${this.repoName}`);
    if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const viewsDir = path.join(this.repoDir, 'resources', 'views');
    const bladeEngine = new BladeEngine(viewsDir);
    const inertiaEngine = new InertiaEngine(this.repoDir);

    const results = {
      repository: this.source,
      repoName: this.repoName,
      timestamp: new Date().toISOString(),
      stack,
      totalPages: pages.length,
      renderedCount: 0,
      failedCount: 0,
      pages: []
    };

    for (const page of pages) {
      const pageResult = {
        name: page.name,
        type: page.type,
        relativeRoute: page.relativeRoute,
        status: 'pending',
        screenshot: null,
        mockApplied: true,
        mockDetails: [],
        error: null
      };

      try {
        let compiledHtml = '';
        if (page.type === 'inertia-vue') {
          if (page.filePath && fs.existsSync(page.filePath)) {
            compiledHtml = inertiaEngine.generateStandaloneHtml(page.filePath, page.name);
            pageResult.mockDetails.push('تم استخراج وحقن المكون في بيئة Vue 3 وInertia مع محاكاة Props ومكونات التوجيه.');
          } else {
            throw new Error('ملف مكون Vue غير موجود فعلياً في المستودع.');
          }
        } else if (page.type === 'blade') {
          if (page.filePath && fs.existsSync(page.filePath)) {
            compiledHtml = bladeEngine.compile(page.name);
            pageResult.mockDetails.push('تم تصيير قوالب Blade وتطبيق الـ Layout وتوليد بيانات محاكاة للمتغيرات والمصفوفات.');
          } else {
            throw new Error('ملف قالب Blade غير موجود.');
          }
        }

        // Write compiled HTML to temp file
        const safePageName = page.name.replace(/[^\w-]/g, '_');
        const tempHtmlFile = path.join(tempDir, `${safePageName}.html`);
        fs.writeFileSync(tempHtmlFile, compiledHtml, 'utf8');

        // File URL for Edge to capture
        const fileUrl = 'file:///' + tempHtmlFile.replace(/\\/g, '/');

        // Capture via Edge
        const capture = await captureWebsite({
          url: fileUrl,
          outputDir: outputFolder,
          fileName: `${safePageName}_preview`,
          preset,
          deviceScaleFactor,
          captureMode: 'viewport',
          format: 'png'
        });

        pageResult.status = 'success';
        pageResult.screenshot = capture.metadata.fileName;
        pageResult.screenshotRelative = `/output/github_${this.repoName}/${capture.metadata.fileName}`;
        pageResult.dimensions = capture.metadata.dimensions;
        results.renderedCount++;
      } catch (err) {
        pageResult.status = 'failed';
        pageResult.error = err.message || 'تعذر التصيير المنفصل';
        results.failedCount++;
      }

      results.pages.push(pageResult);
    }

    // Save final report
    const reportPath = path.join(outputFolder, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

    // Generate Markdown & HTML Reports
    saveReports(results, outputFolder);

    return {
      results,
      reportPath,
      outputFolder
    };
  }
}

module.exports = {
  GitHubAnalyzer,
  sanitizeRepoName
};
