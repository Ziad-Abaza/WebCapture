<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head } from '@inertiajs/vue3';

defineProps({
  stats: Array,
  items: Array
});
</script>

<template>
  <AuthenticatedLayout>
    <div class="space-y-6">
      <!-- Welcome Banner -->
      <div class="bg-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div class="relative z-10">
          <h2 class="text-2xl font-bold mb-2">أهلاً بك مجدداً في لوحة التحكم</h2>
          <p class="text-indigo-200 text-sm max-w-xl">تابع سير مشاريعك المفتوحة وتحديثات العملاء ومعدلات الإنجاز لحظة بلحظة.</p>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div v-for="(stat, idx) in stats" :key="idx" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-xs text-slate-500 font-medium mb-1">{{ stat.title }}</div>
          <div class="text-2xl font-bold text-slate-900">{{ stat.value }}</div>
          <div class="text-xs mt-2 font-semibold" :class="stat.isPositive ? 'text-emerald-600' : 'text-rose-600'">
            {{ stat.change }} مقارنة بالشهر السابق
          </div>
        </div>
      </div>

      <!-- Recent Items Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 class="font-bold text-slate-900 text-sm">أحدث الطلبات والمشاريع</h3>
          <span class="text-xs text-indigo-600 font-semibold cursor-pointer">عرض الجميع &larr;</span>
        </div>
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-400 font-medium">
            <tr>
              <th class="p-3">رقم الطلب</th>
              <th class="p-3">اسم المشروع</th>
              <th class="p-3">العميل</th>
              <th class="p-3">الحالة</th>
              <th class="p-3">القيمة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
            <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/60">
              <td class="p-3 font-mono text-slate-400">#{{ item.id }}</td>
              <td class="p-3 font-bold text-slate-900">{{ item.title }}</td>
              <td class="p-3 text-slate-600">{{ item.client }}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-semibold">
                  {{ item.status }}
                </span>
              </td>
              <td class="p-3 font-bold text-indigo-600">{{ item.price }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AuthenticatedLayout>
</template>
