<template>
  <section class="qg-ledger-table">
    <header>
      <h3>{{ title }}</h3>
      <span>{{ rows.length }} 条</span>
    </header>
    <div v-if="!rows.length" class="qg-empty">暂无记录</div>
    <div v-else class="qg-ledger-table__scroll">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in visibleRows" :key="index">
            <td v-for="column in columns" :key="column">{{ stringifyCell(row[column]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  limit: { type: Number, default: 30 },
});

const columns = computed(() => {
  const first = props.rows.find((row) => row && typeof row === 'object');
  return first ? Object.keys(first).slice(0, 10) : [];
});

const visibleRows = computed(() => props.rows.slice(0, props.limit));

function stringifyCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>
