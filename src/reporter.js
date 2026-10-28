const fs = require('fs');
const path = require('path');

function generateMarkdownReport(results) {
  const { repository, repoName, timestamp, stack, totalPages, renderedCount, failedCount, pages } = results;

  let md = `# تقرير استخراج واجهات المشروع: ${repoName}\n\n`;
  md += `- **المصدر**: \`${repository}\`\n`;
  md += `- **تاريخ الفحص**: ${new Date(timestamp).toLocaleString('ar-SA')}\n`;
  md += `- **الحالة العامة**: تم التقاط **${renderedCount}** واجهة بنجاح من أصل **${totalPages}** (${failedCount} متعذرة)\n\n`;

  md += `## 🛠️ التقنيات المكتشفة (Tech Stack)\n\n`;
  md += `- **أطر العمل**: ${stack.frameworks.join(', ') || 'لم تُحدد'}\n`;
  md += `- **الحزم والأدوات**: ${stack.packages.join(', ') || 'لا توجد حزم إضافية'}\n`;
  md += `- **محرك العرض**: ${stack.isInertia ? 'Inertia.js + Vue' : (stack.isBlade ? 'Laravel Blade' : 'واجهات ساكنة')}\n`;
  md += `- **أداة البناء**: ${stack.isVite ? 'Vite' : (stack.isLaravelMix ? 'Laravel Mix' : 'غير محدد')}\n\n`;

  md += `## 📸 سجل الواجهات واللقطات الملتقطة\n\n`;
  md += `| الصفحة / المسار | النوع | الحالة | المحاكاة والبيانات التجريبية | صورة المعاينة |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const p of pages) {
    const statusBadge = p.status === 'success' ? '✅ ناجحة' : '❌ متعذرة';
    const mockNotes = p.mockDetails?.join('; ') || (p.error ? `السبب: ${p.error}` : 'بدون');
    const imgCell = p.screenshot ? `\`${p.screenshot}\`` : '-';
    md += `| **${p.name}** (\`${p.relativeRoute}\`) | \`${p.type}\` | ${statusBadge} | ${mockNotes} | ${imgCell} |\n`;
  }

  md += `\n---\n*تم إنشاء هذا التقرير تلقائيًا بواسطة استوديو التقاط الواجهات الاحترافي.*\n`;
  return md;
}

function generateHtmlReport(results) {
  const { repository, repoName, timestamp, stack, totalPages, renderedCount, failedCount, pages } = results;

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>تقرير مشروع ${repoName} - استوديو الواجهات</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', system-ui, sans-serif; }
      </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen p-6 sm:p-10">
      <div class="max-w-6xl mx-auto space-y-8">
        
        <!-- Header Card -->
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              تقرير فحص واستخراج الواجهات
            </div>
            <h1 class="text-3xl font-extrabold text-white tracking-tight">${repoName}</h1>
            <p class="text-slate-400 text-sm mt-1 font-mono break-all">${repository}</p>
          </div>
          
          <div class="flex gap-4">
            <div class="bg-slate-900/60 border border-slate-700 rounded-xl px-5 py-3 text-center">
              <div class="text-2xl font-bold text-emerald-400">${renderedCount}</div>
              <div class="text-xs text-slate-400">صفحات ناجحة</div>
            </div>
            <div class="bg-slate-900/60 border border-slate-700 rounded-xl px-5 py-3 text-center">
              <div class="text-2xl font-bold text-rose-400">${failedCount}</div>
              <div class="text-xs text-slate-400">صفحات متعذرة</div>
            </div>
            <div class="bg-slate-900/60 border border-slate-700 rounded-xl px-5 py-3 text-center">
              <div class="text-2xl font-bold text-indigo-400">${totalPages}</div>
              <div class="text-xs text-slate-400">إجمالي المكتشف</div>
            </div>
          </div>
        </div>

        <!-- Tech Stack Banner -->
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">التقنيات ومحركات العرض المكتشفة</h2>
          <div class="flex flex-wrap gap-2">
            ${stack.frameworks.map(f => `<span class="bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 text-xs px-3 py-1.5 rounded-lg font-medium">${f}</span>`).join('')}
            ${stack.packages.map(p => `<span class="bg-slate-700/60 border border-slate-600 text-slate-200 text-xs px-3 py-1.5 rounded-lg font-medium">${p}</span>`).join('')}
          </div>
        </div>

        <!-- Discovered Views Grid -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>الواجهات المستخرجة واللقطات القياسية</span>
            <span class="text-xs bg-slate-800 px-2.5 py-1 rounded-full text-slate-400 font-normal">جاهزة لمعارض الأعمال</span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${pages.map(p => `
              <div class="bg-slate-800 border ${p.status === 'success' ? 'border-slate-700 hover:border-indigo-500/50' : 'border-rose-900/50'} rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <!-- Screenshot Preview or Failure Placeholder -->
                  <div class="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-700/60">
                    ${p.screenshot ? `
                      <img src="${p.screenshot}" alt="${p.name}" class="w-full h-full object-cover object-top hover:scale-105 transition duration-500 cursor-pointer" onclick="window.open(this.src)" />
                      <div class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-1 rounded-md">
                        جاهز للمحفظة
                      </div>
                    ` : `
                      <div class="text-center p-6">
                        <div class="text-rose-400 text-3xl mb-2">⚠️</div>
                        <div class="text-sm font-semibold text-rose-300">تعذر العرض المعزول</div>
                        <div class="text-xs text-slate-500 mt-1 max-w-xs">${p.error || 'يحتاج اتصال قاعدة بيانات حي'}</div>
                      </div>
                    `}
                  </div>

                  <!-- Details -->
                  <div class="p-5">
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <h3 class="font-bold text-white text-lg">${p.name}</h3>
                      <span class="text-xs px-2.5 py-1 rounded-full ${p.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                        ${p.status === 'success' ? 'تم الالتقاط' : 'تعذر'}
                      </span>
                    </div>

                    <p class="text-xs font-mono text-slate-400 mb-3">${p.relativeRoute}</p>

                    <!-- Mock Notes -->
                    <div class="bg-slate-900/70 rounded-lg p-3 text-xs text-slate-300 border border-slate-700/40">
                      <span class="text-slate-400 block font-semibold mb-1">تفاصيل المحاكاة والبيانات:</span>
                      ${p.mockDetails && p.mockDetails.length > 0 ? p.mockDetails.join(' • ') : (p.error || 'لا توجد ملاحظات')}
                    </div>
                  </div>
                </div>

                ${p.screenshot ? `
                  <div class="px-5 py-3 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span>${p.dimensions?.renderedWidth || 1920} &times; ${p.dimensions?.renderedHeight || 1080} px</span>
                    <a href="${p.screenshot}" target="_blank" class="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1">
                      عرض اللقطة الكاملة &larr;
                    </a>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer -->
        <footer class="pt-8 text-center text-xs text-slate-500 border-t border-slate-800">
          تم إنشاء التقرير بواسطة أداة استوديو التقاط الواجهات وتوثيق مشاريع GitHub المحلية • تاريخ: ${new Date(timestamp).toLocaleString('ar-SA')}
        </footer>

      </div>
    </body>
    </html>
  `;
}

function saveReports(results, outputFolder) {
  const md = generateMarkdownReport(results);
  const html = generateHtmlReport(results);

  fs.writeFileSync(path.join(outputFolder, 'REPORT.md'), md, 'utf8');
  fs.writeFileSync(path.join(outputFolder, 'report.html'), html, 'utf8');
}

module.exports = {
  generateMarkdownReport,
  generateHtmlReport,
  saveReports
};
