<template>
  <div class="flex min-h-screen items-center justify-center bg-ink-50 p-6">
    <div class="w-full max-w-md text-center">
      <div class="mx-auto flex justify-center">
        <svg viewBox="0 0 240 240" class="w-32 opacity-90">
          <g v-for="(row, r) in grid" :key="r">
            <rect
              v-for="(color, c) in row"
              :key="`${r}-${c}`"
              :x="30 + c * 62"
              :y="30 + r * 62"
              width="54"
              height="54"
              rx="10"
              :fill="color"
            />
          </g>
        </svg>
      </div>
      <h1 class="mt-6 text-[26px] font-bold tracking-tight text-ink-900">404</h1>
      <p class="mt-2 text-[14px] text-ink-500">这个页面转丢了，就像被打乱的魔方。</p>
      <RouterLink
        :to="{ name: 'home' }"
        class="mt-6 inline-flex h-10.5 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700"
      >
        <House class="size-4" />
        回到首页
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { House } from 'lucide-vue-next'

const colors = ['#ef4444', '#facc15', '#3b82f6', '#f97316', '#e2e8f0', '#22c55e', '#22c55e', '#3b82f6', '#ef4444']
const grid = [colors.slice(0, 3), colors.slice(3, 6), colors.slice(6, 9)]
</script>
