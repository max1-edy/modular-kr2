<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/substations" class="brand">
          <span class="brand-tag">ОДС</span>
          <span>Диспетчеризація підстанцій</span>
        </RouterLink>

        <nav class="nav">
          <RouterLink to="/substations" class="nav-link">Реєстр ПС</RouterLink>
          <RouterLink to="/substations/new" class="btn btn-primary">+ Нова підстанція</RouterLink>
        </nav>
      </div>
    </header>

    <main class="container">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background: var(--header-bg);
  color: #f8fafc;
  border-bottom: 3px solid var(--accent);
}

.topbar-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.08rem;
}

.brand-tag {
  background: var(--accent);
  color: var(--header-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 800;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-link {
  color: #cbd5e1;
  font-weight: 500;
}

.nav-link.router-link-active {
  color: #ffffff;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.container {
  max-width: 1140px;
  width: 100%;
  margin: 24px auto;
  padding: 0 20px;
  flex: 1;
}
</style>