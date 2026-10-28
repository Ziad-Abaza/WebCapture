const path = require('path');
const fs = require('fs');
const { GitHubAnalyzer } = require('./src/github-analyzer');

(async () => {
  console.log('--- Testing Phase 2: GitHub / Laravel / Vue / Inertia / Blade Extractor ---');

  const testPath = path.resolve('./test_projects/laravel-portfolio-demo');
  console.log('Target project path:', testPath);

  const analyzer = new GitHubAnalyzer(testPath);
  await analyzer.prepareRepository();

  console.log('\n1. Tech Stack Detection:');
  const stack = analyzer.analyzeStack();
  console.log('Is Laravel:', stack.isLaravel, 'Version:', stack.laravelVersion);
  console.log('Is Vue:', stack.isVue, 'Version:', stack.vueVersion);
  console.log('Is Inertia:', stack.isInertia, 'Adapter:', stack.inertiaVersion);
  console.log('Is Blade:', stack.isBlade);
  console.log('Is Tailwind:', stack.isTailwind);
  console.log('Frameworks:', stack.frameworks);
  console.log('Packages:', stack.packages);

  console.log('\n2. Route & View Discovery:');
  const pages = analyzer.discoverRoutesAndPages();
  console.log(`Discovered ${pages.length} pages/routes:`);
  pages.forEach(p => console.log(`  - [${p.type}] ${p.name} -> ${p.relativeRoute}`));

  console.log('\n3. Isolated Rendering & Standardized Edge Capture (Portfolio Presets @ 2x Retina)...');
  const { results, outputFolder, reportPath } = await analyzer.renderAndCaptureAll({
    preset: 'desktop_fhd',
    deviceScaleFactor: 2
  });

  console.log('\n4. Results Summary:');
  console.log(`Total Pages: ${results.totalPages}`);
  console.log(`Successfully Rendered & Captured: ${results.renderedCount}`);
  console.log(`Failed / Incompatible: ${results.failedCount}`);
  console.log('Output folder:', outputFolder);
  console.log('Report JSON:', reportPath);
  console.log('Report HTML exists:', fs.existsSync(path.join(outputFolder, 'report.html')));
  console.log('Report Markdown exists:', fs.existsSync(path.join(outputFolder, 'REPORT.md')));

  console.log('\nCaptured screenshots in folder:');
  const files = fs.readdirSync(outputFolder);
  files.filter(f => f.endsWith('.png')).forEach(f => console.log('  ->', f));

  process.exit(0);
})().catch(err => {
  console.error('Phase 2 Test Error:', err);
  process.exit(1);
});
