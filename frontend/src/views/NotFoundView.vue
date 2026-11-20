<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="state-box not-found">
    <div class="code">404</div>
    <h1>Сторінку не знайдено</h1>
    <p>Такої адреси в панелі диспетчера немає.</p>
    <RouterLink to="/substations" class="btn btn-primary">На головну</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  max-width: 480px;
  margin: 40px auto;
}

.code {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--danger);
  line-height: 1;
  margin-bottom: 10px;
}

h1 {
  margin: 0 0 8px;
  font-size: 1.4rem;
}

p {
  margin: 0 0 20px;
}
</style>