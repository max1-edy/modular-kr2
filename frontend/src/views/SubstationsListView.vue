<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import type { Substation } from '../types/energy'
import { fetchSubstations, deleteSubstation } from '../api/client'

const route = useRoute()
const router = useRouter()

const substations = ref<Substation[]>([])
const hasLoadedOnce = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

const search = ref<string>('')
const voltageClass = ref<string>('')
const status = ref<string>('')
const sort = ref<string>('name')
const order = ref<'asc' | 'desc'>('asc')

let searchTimer: ReturnType<typeof setTimeout> | null = null
let latestRequestId = 0

function syncFromUrl(): void {
  search.value = typeof route.query.search === 'string' ? route.query.search : ''
  voltageClass.value = typeof route.query.voltageClass === 'string' ? route.query.voltageClass : ''
  status.value = typeof route.query.status === 'string' ? route.query.status : ''
  sort.value = typeof route.query.sort === 'string' ? route.query.sort : 'name'
  order.value = route.query.order === 'desc' ? 'desc' : 'asc'
}

function pushQueryToUrl(): void {
  const query: Record<string, string> = {}
  if (search.value.trim()) query.search = search.value.trim()
  if (voltageClass.value) query.voltageClass = voltageClass.value
  if (status.value) query.status = status.value
  if (sort.value && sort.value !== 'name') query.sort = sort.value
  if (order.value !== 'asc') query.order = order.value

  router.replace({ query })
}

function onSearchInput(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pushQueryToUrl()
  }, 300)
}

async function loadData(): Promise<void> {
  const reqId = ++latestRequestId
  isLoading.value = true
  loadError.value = null

  try {
    const data = await fetchSubstations({
      search: search.value.trim() || undefined,
      voltageClass: voltageClass.value || undefined,
      status: status.value || undefined,
      sort: sort.value || undefined,
      order: order.value
    })
    if (reqId !== latestRequestId) return
    substations.value = data
    hasLoadedOnce.value = true
  } catch (err) {
    if (reqId !== latestRequestId) return
    loadError.value = err instanceof Error ? err.message : 'Не вдалося завантажити список'
  } finally {
    if (reqId === latestRequestId) {
      isLoading.value = false
    }
  }
}

function resetFilters(): void {
  if (searchTimer) clearTimeout(searchTimer)
  search.value = ''
  voltageClass.value = ''
  status.value = ''
  sort.value = 'name'
  order.value = 'asc'
  pushQueryToUrl()
}

async function handleDelete(item: Substation): Promise<void> {
  actionError.value = null
  const confirmed = window.confirm(
    `Видалити підстанцію «${item.code} (${item.name})» разом з усіма її комірками?`
  )
  if (!confirmed) return

  try {
    await deleteSubstation(item.id)
    await loadData()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Не вдалося видалити підстанцію'
  }
}

function statusBadgeClass(st: Substation['status']): string {
  if (st === 'в роботі') return 'badge-ok'
  if (st === 'плановий ремонт') return 'badge-warn'
  return 'badge-danger'
}

watch(
  () => route.query,
  () => {
    syncFromUrl()
    loadData()
  }
)

onMounted(() => {
  syncFromUrl()
  loadData()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section>
    <div class="page-head">
      <h1>Реєстр трансформаторних підстанцій</h1>
      <div class="head-meta">
        <span v-if="isLoading && hasLoadedOnce" class="sync-label">Оновлення...</span>
        <span class="badge">Об'єктів: {{ substations.length }}</span>
      </div>
    </div>

    <div class="filters">
      <div class="filter-item wide">
        <label>Пошук (шифр або назва)</label>
        <input
          v-model="search"
          type="text"
          placeholder="ПС-110 або Північна..."
          @input="onSearchInput"
        />
      </div>

      <div class="filter-item">
        <label>Клас напруги</label>
        <select v-model="voltageClass" @change="pushQueryToUrl">
          <option value="">Усі класи</option>
          <option value="110/10 кВ">110/10 кВ</option>
          <option value="35/10 кВ">35/10 кВ</option>
          <option value="10/0.4 кВ">10/0.4 кВ</option>
        </select>
      </div>

      <div class="filter-item">
        <label>Статус</label>
        <select v-model="status" @change="pushQueryToUrl">
          <option value="">Усі статуси</option>
          <option value="в роботі">в роботі</option>
          <option value="плановий ремонт">плановий ремонт</option>
          <option value="аварійний вивід">аварійний вивід</option>
        </select>
      </div>

      <div class="filter-item">
        <label>Сортування</label>
        <select v-model="sort" @change="pushQueryToUrl">
          <option value="name">За назвою</option>
          <option value="totalPowerKva">За потужністю (кВА)</option>
          <option value="commissioningYear">За роком введення</option>
        </select>
      </div>

      <div class="filter-item">
        <label>Напрямок</label>
        <select v-model="order" @change="pushQueryToUrl">
          <option value="asc">За зростанням</option>
          <option value="desc">За спаданням</option>
        </select>
      </div>

      <button type="button" class="btn btn-secondary" @click="resetFilters">Скинути</button>
    </div>

    <div v-if="actionError" class="inline-alert">
      <span>{{ actionError }}</span>
      <button type="button" class="btn btn-secondary btn-sm" @click="actionError = null">Закрити</button>
    </div>

    <div v-if="isLoading && !hasLoadedOnce" class="state-box">
      <p>Завантаження даних...</p>
    </div>

    <div v-else-if="loadError" class="state-box error-box">
      <p>Помилка з'єднання з сервером: {{ loadError }}</p>
      <button type="button" class="btn btn-primary" @click="loadData">Спробувати ще раз</button>
    </div>

    <div v-else-if="substations.length === 0" class="state-box">
      <p>Підстанцій за заданими критеріями не знайдено</p>
      <button type="button" class="btn btn-secondary" @click="resetFilters">Скинути фільтри</button>
    </div>

    <div v-else class="table-wrap" :class="{ reloading: isLoading }">
      <table class="data-table">
        <thead>
          <tr>
            <th>Шифр</th>
            <th>Назва об'єкта</th>
            <th>Клас напруги</th>
            <th>Потужність, кВА</th>
            <th>Рік</th>
            <th>Статус</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in substations" :key="item.id">
            <td class="mono">{{ item.code }}</td>
            <td>
              <RouterLink :to="`/substations/${item.id}`" class="row-link">
                {{ item.name }}
              </RouterLink>
              <div class="sub-loc">{{ item.location }}</div>
            </td>
            <td>{{ item.voltageClass }}</td>
            <td class="mono">{{ item.totalPowerKva.toLocaleString('uk-UA') }}</td>
            <td class="mono">{{ item.commissioningYear }}</td>
            <td>
              <span class="badge" :class="statusBadgeClass(item.status)">
                {{ item.status }}
              </span>
            </td>
            <td class="actions">
              <RouterLink :to="`/substations/${item.id}`" class="btn btn-secondary btn-sm">
                Паспорт
              </RouterLink>
              <RouterLink :to="`/substations/${item.id}/edit`" class="btn btn-secondary btn-sm">
                Ред.
              </RouterLink>
              <button type="button" class="btn btn-danger btn-sm" @click="handleDelete(item)">
                Видалити
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  font-size: 1.45rem;
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.filters {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 145px;
}

.filter-item.wide {
  flex: 1;
  min-width: 210px;
}

label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.reloading {
  opacity: 0.65;
  transition: opacity 0.15s ease;
}

.row-link {
  color: var(--primary);
  font-weight: 600;
}

.row-link:hover {
  text-decoration: underline;
}

.sub-loc {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>