<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>@yield('title', 'منصة الأعمال')</title>
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-slate-50 text-slate-800">
  <header class="bg-white border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <span class="font-extrabold text-xl text-indigo-600">منظومة كلاود بريميوم</span>
        <nav class="flex gap-4 text-sm font-semibold text-slate-600">
          <a href="#" class="text-indigo-600">الرئيسية</a>
          <a href="#" class="hover:text-indigo-600">المميزات</a>
          <a href="#" class="hover:text-indigo-600">الأسعار</a>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs font-semibold text-slate-700">{{ $user->name }}</span>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-8">
    @yield('content')
  </main>
</body>
</html>
