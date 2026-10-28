const fs = require('fs');
const path = require('path');

/**
 * Intelligent Mock Context for Laravel Views
 */
const DEFAULT_MOCK_DATA = {
  appName: 'نظام إدارة المشاريع المتطور',
  app_name: 'منصة الابتكار الرقمي',
  title: 'لوحة التحكم والمؤشرات',
  user: {
    id: 1,
    name: 'عبدالله محمد',
    email: 'admin@example.com',
    role: 'مدير النظام',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    created_at: '2026-01-15'
  },
  auth: {
    check: true,
    user: {
      id: 1,
      name: 'عبدالله محمد',
      email: 'admin@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    }
  },
  stats: [
    { title: 'إجمالي المبيعات', value: '148,250 ر.س', change: '+12.5%', isPositive: true },
    { title: 'الطلبات النشطة', value: '1,280', change: '+8.2%', isPositive: true },
    { title: 'العملاء الجدد', value: '342', change: '-2.4%', isPositive: false },
    { title: 'معدل التحويل', value: '4.85%', change: '+1.1%', isPositive: true }
  ],
  items: [
    { id: 101, title: 'تصميم واجهة متجر سلة', client: 'شركة الأفق التقنية', status: 'مكتمل', date: '2026-10-20', price: '4,500 ر.س' },
    { id: 102, title: 'تطوير تطبيق توصيل طلبات', client: 'مؤسسة المسار السريع', status: 'قيد التنفيذ', date: '2026-10-22', price: '12,000 ر.س' },
    { id: 103, title: 'ربط بوابات الدفع الإلكتروني', client: 'متجر سدرة العطور', status: 'مراجعة نهائية', date: '2026-10-25', price: '2,800 ر.س' },
    { id: 104, title: 'تحسين محركات البحث SEO', client: 'مدونة الحلول الذكية', status: 'مجدول', date: '2026-10-27', price: '1,900 ر.س' }
  ],
  notifications: [
    { id: 1, message: 'تم إيداع دفعة مالية جديدة بقيمة 4,500 ر.س', time: 'منذ ساعتين', unread: true },
    { id: 2, message: 'قام العميل بالموافقة على مسودة التصميم الأولى', time: 'منذ 5 ساعات', unread: false }
  ]
};

/**
 * Strips or safely evaluates Blade control structures and interpolates mock data
 */
class BladeEngine {
  constructor(viewsRoot, options = {}) {
    this.viewsRoot = viewsRoot;
    this.options = options;
    this.mockData = { ...DEFAULT_MOCK_DATA, ...(options.mockData || {}) };
    this.resolvedCache = new Map();
  }

  findViewFile(viewPath) {
    const normalized = viewPath.replace(/\./g, '/').replace(/^\/+/, '');
    const possiblePaths = [
      path.join(this.viewsRoot, `${normalized}.blade.php`),
      path.join(this.viewsRoot, `${normalized}.php`),
      path.join(this.viewsRoot, normalized, 'index.blade.php'),
      path.join(this.viewsRoot, 'components', `${normalized}.blade.php`),
      path.join(this.viewsRoot, 'layouts', `${normalized}.blade.php`)
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  readView(viewPath) {
    const filePath = this.findViewFile(viewPath);
    if (!filePath) return null;
    return fs.readFileSync(filePath, 'utf8');
  }

  compile(viewNameOrContent, isRawContent = false) {
    let content = isRawContent ? viewNameOrContent : this.readView(viewNameOrContent);
    if (!content) {
      return `<!-- View not found: ${viewNameOrContent} -->`;
    }

    const sections = {};
    let layoutView = null;

    // Check for @extends('layout.name')
    const extendsMatch = content.match(/@extends\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (extendsMatch) {
      layoutView = extendsMatch[1];
    }

    // Extract @section('name') ... @endsection / @stop
    const sectionRegex = /@section\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\s*\)([\s\S]*?)@(endsection|stop|show)/gi;
    let secMatch;
    while ((secMatch = sectionRegex.exec(content)) !== null) {
      const secName = secMatch[1];
      const inlineVal = secMatch[2];
      const blockContent = secMatch[3];
      sections[secName] = inlineVal !== undefined ? inlineVal : blockContent;
    }

    // Extract short @section('title', 'My Page')
    const shortSectionRegex = /@section\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/gi;
    while ((secMatch = shortSectionRegex.exec(content)) !== null) {
      sections[secMatch[1]] = secMatch[2];
    }

    // Also handle Laravel component syntax <x-app-layout> or <x-guest-layout>
    const compMatch = content.match(/<x-([a-z0-9_-]+)layout[^>]*>([\s\S]*?)<\/x-\1layout>/i);
    let componentSlot = null;
    if (compMatch) {
      layoutView = `layouts.${compMatch[1]}layout`;
      componentSlot = compMatch[2];
      // Check for <x-slot:header> or <x-slot name="header">
      const headerSlotMatch = componentSlot.match(/<x-slot\s*(?:name=|:)?['"]?header['"]?[^>]*>([\s\S]*?)<\/x-slot>/i);
      if (headerSlotMatch) {
        sections['header'] = headerSlotMatch[1];
        componentSlot = componentSlot.replace(headerSlotMatch[0], '');
      }
      sections['slot'] = componentSlot;
      sections['content'] = componentSlot;
    }

    // If layout was found, wrap within layout
    if (layoutView) {
      let layoutContent = this.readView(layoutView);
      if (!layoutContent) {
        // Fallback default responsive Tailwind layout
        layoutContent = this.getDefaultLayout();
      }

      // Replace @yield('sectionName', 'fallback')
      layoutContent = layoutContent.replace(/@yield\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"])?\s*\)/gi, (m, secName, fallback) => {
        return sections[secName] !== undefined ? sections[secName] : (fallback || '');
      });

      // Replace {{ $slot }} or {!! $slot !!}
      layoutContent = layoutContent.replace(/\{\{\s*\$slot\s*\}\}|\{!!\s*\$slot\s*!!\}/gi, () => {
        return sections['slot'] || sections['content'] || '';
      });

      // Replace $header if present
      layoutContent = layoutContent.replace(/\{\{\s*\$header\s*\}\}|\{!!\s*\$header\s*!!\}/gi, () => {
        return sections['header'] || '';
      });

      content = layoutContent;
    }

    // Resolve @include('view.name') recursively
    content = this.resolveIncludes(content);

    // Resolve Blade Directives
    content = this.resolveDirectives(content);

    // Replace Variables {{ $var }}
    content = this.resolveVariables(content);

    // Inject Tailwind CDN & standard portfolio reset styles
    content = this.injectStylingHarness(content);

    return content;
  }

  resolveIncludes(content) {
    let current = content;
    let depth = 0;
    while (/@include\s*\(/i.test(current) && depth < 5) {
      depth++;
      current = current.replace(/@include\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*\[[\s\S]*?\])?\s*\)/gi, (m, incView) => {
        const incContent = this.readView(incView);
        if (!incContent) return `<!-- Included view [${incView}] rendered with fallback mock -->`;
        return incContent;
      });
    }
    return current;
  }

  resolveDirectives(content) {
    let res = content;

    // @csrf
    res = res.replace(/@csrf/gi, '<input type="hidden" name="_token" value="mock_csrf_token_edge">');

    // @method('...')
    res = res.replace(/@method\s*\(\s*['"]([^'"]+)['"]\s*\)/gi, '<input type="hidden" name="_method" value="$1">');

    // @vite(...)
    res = res.replace(/@vite\s*\(\s*\[?[\s\S]*?\]?\s*\)/gi, '<!-- Vite Assets Bundled via Mock Engine -->');

    // @auth ... @else ... @endauth
    res = res.replace(/@auth([\s\S]*?)(?:@else([\s\S]*?))?@endauth/gi, '$1');

    // @guest ... @else ... @endguest
    res = res.replace(/@guest([\s\S]*?)(?:@else([\s\S]*?))?@endguest/gi, '$2');

    // Simple @if(true) or common checks
    res = res.replace(/@if\s*\([\s\S]*?\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/gi, '$1');

    // @foreach($items as $item) -> Render sample iteration
    res = res.replace(/@foreach\s*\(\s*(\$items|\$posts|\$users|\$stats)[\s\S]*?\)([\s\S]*?)@endforeach/gi, (m, varName, loopBody) => {
      let repeated = '';
      const items = this.mockData.items;
      for (let i = 0; i < Math.min(items.length, 3); i++) {
        const item = items[i];
        let row = loopBody
          .replace(/\{\{\s*\$item->title\s*\}\}/g, item.title)
          .replace(/\{\{\s*\$item->client\s*\}\}/g, item.client)
          .replace(/\{\{\s*\$item->status\s*\}\}/g, item.status)
          .replace(/\{\{\s*\$item->price\s*\}\}/g, item.price)
          .replace(/\{\{\s*\$item->date\s*\}\}/g, item.date)
          .replace(/\{\{\s*\$item->id\s*\}\}/g, String(item.id))
          .replace(/\{\{\s*\$loop->iteration\s*\}\}/g, String(i + 1));
        repeated += row;
      }
      return repeated || loopBody;
    });

    // Remove remaining @end* or unhandled directives cleanly
    res = res.replace(/@(endforeach|empty|endempty|unless|endunless|switch|case|break|default|endswitch|push|endpush|stack|once|endonce)/gi, '');

    return res;
  }

  resolveVariables(content) {
    // {{ $user->name }}
    content = content.replace(/\{\{\s*\$(?:auth\(\)->user\(\)->|user->)name\s*\}\}/gi, this.mockData.user.name);
    content = content.replace(/\{\{\s*\$(?:auth\(\)->user\(\)->|user->)email\s*\}\}/gi, this.mockData.user.email);
    content = content.replace(/\{\{\s*\$appName\s*\}\}|\{\{\s*config\('app\.name'[^)]*\)\s*\}\}/gi, this.mockData.appName);
    content = content.replace(/\{\{\s*\$title\s*\}\}/gi, this.mockData.title);
    content = content.replace(/\{\{\s*route\([^)]+\)\s*\}\}/gi, '#');
    content = content.replace(/\{\{\s*asset\((['"])([^'"]+)\1\)\s*\}\}/gi, '$2');
    content = content.replace(/\{\{\s*__\((['"])([^'"]+)\1\)\s*\}\}/gi, '$2');

    // Clean remaining {{ ... }} placeholders to readable text or empty string
    content = content.replace(/\{\{([\s\S]*?)\}\}/g, (m, inner) => {
      const trimmed = inner.trim();
      if (trimmed.startsWith('$')) {
        const key = trimmed.slice(1).split('->')[0].split('[')[0];
        if (this.mockData[key]) return String(this.mockData[key]);
      }
      return '';
    });

    return content;
  }

  injectStylingHarness(html) {
    const hasHead = /<head>/i.test(html);
    const harness = `
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', 'Inter', system-ui, -apple-system, sans-serif; }
        /* Prevent layout collapse during offline mock */
        img[src=""], img:not([src]) { background: #f1f5f9; min-height: 40px; }
      </style>
    `;

    if (hasHead) {
      return html.replace(/<head>/i, `<head>${harness}`);
    } else {
      return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>${harness}</head><body class="bg-slate-50 text-slate-800">${html}</body></html>`;
    }
  }

  getDefaultLayout() {
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>{{ $title }}</title>
      </head>
      <body class="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
        <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
            <div class="flex items-center gap-4">
              <span class="text-xl font-bold text-indigo-600 tracking-tight">{{ $appName }}</span>
              <nav class="hidden md:flex gap-6 text-sm font-medium text-slate-600">
                <a href="#" class="text-indigo-600 font-semibold">لوحة التحكم</a>
                <a href="#" class="hover:text-indigo-600">المشاريع</a>
                <a href="#" class="hover:text-indigo-600">العملاء</a>
                <a href="#" class="hover:text-indigo-600">التقارير</a>
              </nav>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-slate-700">{{ $user->name }}</span>
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" class="w-8 h-8 rounded-full border border-slate-300" alt="avatar" />
            </div>
          </div>
        </header>

        @if(isset($header))
          <div class="bg-white shadow">
            <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              @yield('header')
            </div>
          </div>
        @endif

        <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          @yield('content')
        </main>
      </body>
      </html>
    `;
  }
}

module.exports = {
  BladeEngine,
  DEFAULT_MOCK_DATA
};
