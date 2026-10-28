const fs = require('fs');
const path = require('path');
const { DEFAULT_MOCK_DATA } = require('./blade-engine');

/**
 * Parses Vue Single File Components (.vue) and produces an isolated
 * browser-executable Vue 3 harness with mock Inertia.js props and layout.
 */
class InertiaEngine {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = options;
  }

  parseVueSFC(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract template
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i);
    const template = templateMatch ? templateMatch[1] : '<div>لا يوجد قالب متاح</div>';

    // Extract script
    const scriptMatch = content.match(/<script(?:\s+setup)?(?:\s+lang=['"](?:ts|js)['"])?>([\s\S]*?)<\/script>/i);
    const script = scriptMatch ? scriptMatch[1] : '';

    // Extract styles
    const styleMatches = [...content.matchAll(/<style(?:\s+scoped)?(?:\s+lang=['"](?:css|scss|postcss)['"])?>([\s\S]*?)<\/style>/gi)];
    const styles = styleMatches.map(m => m[1]).join('\n');

    // Analyze expected props
    const props = this.extractProps(script, content);

    return {
      template,
      script,
      styles,
      props,
      raw: content
    };
  }

  extractProps(script, fullContent) {
    const detectedProps = {};

    // Match defineProps<{ ... }>() or defineProps({ ... })
    const definePropsMatch = script.match(/defineProps\s*(?:<([\s\S]*?)>)?\s*\(([\s\S]*?)\)/);
    if (definePropsMatch) {
      const typeBlock = definePropsMatch[1] || '';
      const objBlock = definePropsMatch[2] || '';
      const rawText = typeBlock + ' ' + objBlock;

      const propNames = [...rawText.matchAll(/([a-zA-Z0-9_]+)\s*[:?]/g)].map(m => m[1]);
      for (const p of propNames) {
        detectedProps[p] = this.generateMockValueForProp(p);
      }
    }

    // Match Options API props: ['prop1', 'prop2'] or props: { prop1: Object }
    const optionsPropsMatch = script.match(/props\s*:\s*(\[[^\]]+\]|\{[^}]+\})/);
    if (optionsPropsMatch) {
      const pText = optionsPropsMatch[1];
      const pNames = [...pText.matchAll(/['"]([a-zA-Z0-9_]+)['"]|([a-zA-Z0-9_]+)\s*:/g)].map(m => m[1] || m[2]);
      for (const p of pNames) {
        if (p && !['type', 'default', 'required'].includes(p)) {
          detectedProps[p] = this.generateMockValueForProp(p);
        }
      }
    }

    // Common standard Inertia props if none found
    if (Object.keys(detectedProps).length === 0) {
      detectedProps['auth'] = DEFAULT_MOCK_DATA.auth;
      detectedProps['user'] = DEFAULT_MOCK_DATA.user;
      detectedProps['stats'] = DEFAULT_MOCK_DATA.stats;
      detectedProps['items'] = DEFAULT_MOCK_DATA.items;
      detectedProps['appName'] = DEFAULT_MOCK_DATA.appName;
    }

    return detectedProps;
  }

  generateMockValueForProp(propName) {
    const lower = propName.toLowerCase();
    if (lower.includes('user') || lower.includes('auth')) {
      return DEFAULT_MOCK_DATA.auth;
    }
    if (lower.includes('stat') || lower.includes('count') || lower.includes('metric')) {
      return DEFAULT_MOCK_DATA.stats;
    }
    if (lower.includes('item') || lower.includes('post') || lower.includes('list') || lower.includes('data') || lower.includes('project')) {
      return DEFAULT_MOCK_DATA.items;
    }
    if (lower.includes('notification')) {
      return DEFAULT_MOCK_DATA.notifications;
    }
    if (lower.includes('title') || lower.includes('name')) {
      return 'لوحة متابعة الأعمال والمشاريع';
    }
    if (lower.includes('status') || lower.includes('filter')) {
      return 'active';
    }
    if (lower.includes('can') || lower.includes('is') || lower.includes('has')) {
      return true;
    }
    return 'قيمة تجريبية افتراضية';
  }

  /**
   * Generates a fully contained HTML document that mounts the Inertia page
   * using client-side Vue 3 and mock Inertia runtime.
   */
  generateStandaloneHtml(pageComponentPath, pageName = 'Page') {
    const sfc = this.parseVueSFC(pageComponentPath);
    if (!sfc) {
      return `<!DOCTYPE html><html><body><h1>تعذر قراءة المكون: ${pageName}</h1></body></html>`;
    }

    // Clean template: convert custom tags that might break standard browser mount
    let cleanTemplate = sfc.template
      .replace(/<Head(?:\s+title=['"][^'"]*['"])?[^>]*>[\s\S]*?<\/Head>/gi, '')
      .replace(/<Head\s*\/>/gi, '')
      // Replace <Link href="..."> with standard <a>
      .replace(/<Link\b([^>]*)>([\s\S]*?)<\/Link>/gi, '<a $1>$2</a>')
      // Normalize Lucide or Heroicon tags to simple SVG placeholders if custom
      .replace(/<([A-Z][a-zA-Z0-9]+Icon)\b[^>]*\/>/gi, '<span class="inline-block w-5 h-5 bg-slate-300 rounded"></span>');

    const mockProps = {
      ...DEFAULT_MOCK_DATA,
      ...sfc.props
    };

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl" class="h-full bg-slate-50">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageName} - استعراض Inertia Vue</title>
        <!-- Tailwind CSS CDN -->
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- Google Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <!-- Vue 3 CDN -->
        <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
        <style>
          body { font-family: 'Cairo', 'Inter', system-ui, sans-serif; }
          ${sfc.styles}
        </style>
      </head>
      <body class="h-full text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
        <div id="app"></div>

        <script>
          const { createApp, ref, reactive, computed } = Vue;

          // Mock Inertia Context
          const mockProps = ${JSON.stringify(mockProps)};
          const mockPage = {
            props: mockProps,
            url: window.location.pathname,
            component: '${pageName}'
          };

          // Mock Layouts
          const AuthenticatedLayout = {
            template: \`
              <div class="min-h-screen bg-slate-100 flex flex-col">
                <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div class="flex items-center gap-6">
                      <div class="font-bold text-xl text-indigo-600">\${mockProps.appName || 'المنصة الرقمية'}</div>
                      <nav class="hidden md:flex gap-4 text-sm font-medium text-slate-600">
                        <a href="#" class="text-indigo-600 font-bold">الرئيسية</a>
                        <a href="#" class="hover:text-indigo-600">المعاملات</a>
                        <a href="#" class="hover:text-indigo-600">الإحصائيات</a>
                        <a href="#" class="hover:text-indigo-600">الإعدادات</a>
                      </nav>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="text-right text-xs">
                        <div class="font-bold text-slate-900">\${mockProps.auth?.user?.name || 'عبدالله محمد'}</div>
                        <div class="text-slate-500">\${mockProps.auth?.user?.email || 'admin@example.com'}</div>
                      </div>
                      <img src="\${mockProps.auth?.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="w-9 h-9 rounded-full border border-slate-300" />
                    </div>
                  </div>
                </header>
                <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                  <slot />
                </main>
              </div>
            \`
          };

          const GuestLayout = {
            template: \`
              <div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-slate-100">
                <div class="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">
                  <slot />
                </div>
              </div>
            \`
          };

          const PageComponent = {
            components: {
              AuthenticatedLayout,
              GuestLayout,
              AppLayout: AuthenticatedLayout
            },
            data() {
              return {
                ...mockProps,
                $page: mockPage,
                showingNavigationDropdown: false,
                form: {
                  email: 'test@example.com',
                  password: 'password',
                  remember: true,
                  processing: false,
                  errors: {}
                }
              };
            },
            template: ${JSON.stringify(cleanTemplate)}
          };

          const app = createApp(PageComponent);
          app.config.globalProperties.$page = mockPage;
          app.mount('#app');
        </script>
      </body>
      </html>
    `;

    return html;
  }
}

module.exports = {
  InertiaEngine
};
