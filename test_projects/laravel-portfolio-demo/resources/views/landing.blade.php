@extends('layouts.app')

@section('title', 'منصة الحلول السحابية الذكية')

@section('content')
<div class="space-y-12 py-6">
  <div class="text-center max-w-3xl mx-auto space-y-4">
    <div class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
      الجيل القادم من واجهات الويب
    </div>
    <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
      صممت خصيصاً لمطوري البرمجيات والشركات الريادية
    </h1>
    <p class="text-lg text-slate-600">
      بيئة عمل تكاملية توفر لك كافة الأدوات اللازمة لإطلاق منتجاتك الرقمية خلال أيام بدلاً من أشهر.
    </p>
    <div class="flex justify-center gap-4 pt-4">
      <a href="#" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25">ابدأ تجربة مجانية</a>
      <a href="#" class="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold hover:bg-slate-50">جدول عرضاً توضيحياً</a>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 class="text-lg font-bold text-slate-900 mb-2">سرعة استجابة فائقة</h3>
      <p class="text-sm text-slate-600">تصيير متطور في أجزاء من الثانية مع تجربة تصفح انسيابية خالية من أي تقطيع.</p>
    </div>
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 class="text-lg font-bold text-slate-900 mb-2">تكامل مع Inertia و Vue</h3>
      <p class="text-sm text-slate-600">بناء صفحات تطبيق أحادية (SPA) بدون تعقيدات بناء واجهات برمجة التطبيقات (API).</p>
    </div>
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 class="text-lg font-bold text-slate-900 mb-2">تقارير وتحليلات لحظية</h3>
      <p class="text-sm text-slate-600">إحصائيات فورية حول الأداء والمبيعات وسلوك المستخدمين على منصتك.</p>
    </div>
  </div>
</div>
@endsection
