<script setup>
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { Head, Link } from '@inertiajs/vue3';

defineProps({
  canResetPassword: Boolean,
  status: String,
});
</script>

<template>
  <GuestLayout>
    <div class="mb-4 text-center">
      <h2 class="text-xl font-bold text-slate-900">تسجيل الدخول للمنظومة</h2>
      <p class="text-xs text-slate-500 mt-1">أدخل بيانات اعتمادك للمتابعة إلى حسابك</p>
    </div>

    <form class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
        <input type="email" value="user@example.com" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">كلمة المرور</label>
        <input type="password" value="••••••••" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div class="flex items-center justify-between text-xs">
        <label class="flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked class="rounded text-indigo-600" />
          <span>تذكرني</span>
        </label>
        <a href="#" class="text-indigo-600 font-medium">نسيت كلمة المرور؟</a>
      </div>

      <button type="button" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-500/20">
        دخول الحساب
      </button>
    </form>
  </GuestLayout>
</template>
