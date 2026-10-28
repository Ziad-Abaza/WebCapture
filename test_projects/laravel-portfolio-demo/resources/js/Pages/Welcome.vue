<script setup>
import { Head, Link } from '@inertiajs/vue3';

defineProps({
  canLogin: Boolean,
  canRegister: Boolean,
  laravelVersion: String,
  phpVersion: String,
});
</script>

<template>
  <div class="relative sm:flex sm:justify-center sm:items-center min-h-screen bg-dots-darker bg-center bg-gray-100 selection:bg-red-500 selection:text-white">
    <div class="max-w-7xl mx-auto p-6 lg:p-8">
      <div class="flex justify-between items-center pb-8 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-500/30">
            L11
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">منظومة الخدمات الرقمية المتقدمة</h1>
            <p class="text-xs text-gray-500">مبني بواسطة Laravel 11 و Inertia و Vue 3</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <Link href="/login" class="font-semibold text-gray-600 hover:text-gray-900 text-sm">تسجيل الدخول</Link>
          <Link href="/register" class="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 shadow">حساب جديد</Link>
        </div>
      </div>

      <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div class="scale-100 p-6 bg-white from-gray-700/50 via-transparent rounded-2xl shadow-2xl flex motion-safe:hover:scale-[1.01] transition-all duration-250">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">توثيق شامل ومكونات مرنة</h2>
            <p class="mt-4 text-gray-500 text-sm leading-relaxed">
              تتيح لك المنصة إدارة العمليات المحاسبية ومتابعة مؤشرات الأداء الحيوية في الوقت الحقيقي بدون أي تأخير.
            </p>
          </div>
        </div>

        <div class="scale-100 p-6 bg-white from-gray-700/50 via-transparent rounded-2xl shadow-2xl flex motion-safe:hover:scale-[1.01] transition-all duration-250">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">أمان عالي وموثوقية متناهية</h2>
            <p class="mt-4 text-gray-500 text-sm leading-relaxed">
              بروتوكولات حماية متوافقة مع أرقى المعايير العالمية لضمان سرية وسلامة كافة البيانات.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
