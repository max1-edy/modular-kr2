<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import type {
  Substation,
  SwitchgearCell,
  BreakerType,
  CellStatus
} from '../types/energy'
import {
  fetchSubstationById,
  fetchCells,
  createCell,
  deleteCell
} from '../api/client'

const route = useRoute()

const substation = ref<Substation | null>(null)
const cells = ref<SwitchgearCell[]>([])
const isLoading = ref<boolean>(true)
const isNotFound = ref<boolean>(false)
const errorMessage = ref<string | null>(null)

const cellNumber = ref<string>('')
const feederName = ref<string>('')
const breakerType = ref<BreakerType>('вакуумний')
const currentLoadAmp = ref<number>(0)
const cellStatus = ref<CellStatus>('увімкнено')
const lastInspectionDate = ref<string>(new Date().toISOString().slice(0, 10))
const formError = ref<string | null>(null)
const cellActionError = ref<string | null>(null)
const isSubmitting = ref<boolean>(false)

async function loadDetails(): Promise<void> {
  const id = String(route.params.id || '')
  isLoading.value = true
  isNotFound.value = false
  errorMessage.value = null

  try {
    const [subData, cellsData] = await Promise.all([
      fetchSubstationById(id),
      fetchCells(id)
    ])
    substation.value = subData
    cells.value = cellsData
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 404) {
      isNotFound.value = true
    } else {
      errorMessage.value = err instanceof Error ? err.message : 'Помилка завантаження картки'
    }
  } finally {
    isLoading.value = false
  }
}

async function handleAddCell(): Promise<void> {
  formError.value = null
  if (!cellNumber.value.trim()) {
    formError.value = 'Вкажіть диспетчерський номер комірки'
    return
  }
  if (!feederName.value.trim()) {
    formError.value = 'Вкажіть найменування фідера'
    return
  }
  if (typeof currentLoadAmp.value !== 'number' || Number.isNaN(currentLoadAmp.value) || currentLoadAmp.value < 0) {
    formError.value = 'Струм має бути числом >= 0'
    return
  }
  if (!substation.value) return

  isSubmitting.value = true
  try {
    const created = await createCell(substation.value.id, {
      cellNumber: cellNumber.value.trim(),
      feederName: feederName.value.trim(),
      breakerType: breakerType.value,
      currentLoadAmp: currentLoadAmp.value,
      status: cellStatus.value,
      lastInspectionDate: lastInspectionDate.value
    })
    cells.value.push(created)
    cellNumber.value = ''
    feederName.value = ''
    currentLoadAmp.value = 0
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Не вдалося додати комірку'
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteCell(cell: SwitchgearCell): Promise<void> {
  cellActionError.value = null
  const ok = window.confirm(`Видалити комірку ${cell.cellNumber} (${cell.feederName})?`)
  if (!ok) return

  try {
    await deleteCell(cell.id)
    cells.value = cells.value.filter((c) => c.id !== cell.id)
  } catch (err) {
    cellActionError.value = err instanceof Error ? err.message : 'Не вдалося видалити комірку'
  }
}

function cellBadgeClass(st: CellStatus): string {
  if (st === 'увімкнено') return 'badge-ok'
  if (st === 'заземлено') return 'badge-warn'
  return ''
}

watch(() => route.params.id, loadDetails)
onMounted(loadDetails)
</script>

<template>
  <section>
    <div v-if="isLoading" class="state-box">Завантаження паспорта підстанції...</div>

    <div v-else-if="isNotFound" class="state-box">
      <h2 class="err-title">Підстанцію не знайдено (404)</h2>
      <p>Об'єкт із таким ID відсутній у реєстрі.</p>
      <RouterLink to="/substations" class="btn btn-primary">До реєстру підстанцій</RouterLink>
    </div>

    <div v-else-if="errorMessage" class="state-box error-box">
      <p>{{ errorMessage }}</p>
      <button type="button" class="btn btn-primary" @click="loadDetails">Спробувати ще раз</button>
    </div>

    <div v-else-if="substation">
      <div class="top-bar">
        <RouterLink to="/substations" class="back-link">&larr; До реєстру ПС</RouterLink>
        <RouterLink :to="`/substations/${substation.id}/edit`" class="btn btn-primary">
          Редагувати паспорт
        </RouterLink>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <span class="mono code-tag">{{ substation.code }}</span>
            <h1>{{ substation.name }}</h1>
          </div>
          <span class="badge">{{ substation.status }}</span>
        </div>

        <div class="specs">
          <div class="spec">
            <span class="spec-label">Клас напруги</span>
            <span class="spec-val">{{ substation.voltageClass }}</span>
          </div>
          <div class="spec">
            <span class="spec-label">Встановлена потужність</span>
            <span class="spec-val mono">{{ substation.totalPowerKva.toLocaleString('uk-UA') }} кВА</span>
          </div>
          <div class="spec">
            <span class="spec-label">Рік введення</span>
            <span class="spec-val mono">{{ substation.commissioningYear }}</span>
          </div>
          <div class="spec">
            <span class="spec-label">Розташування</span>
            <span class="spec-val">{{ substation.location }}</span>
          </div>
        </div>

        <div v-if="substation.description" class="desc-box">
          <strong>Примітки:</strong> {{ substation.description }}
        </div>
      </div>

      <h2>Розподільчі комірки / фідери ({{ cells.length }})</h2>

      <form class="card" @submit.prevent="handleAddCell">
        <h3>Додати комірку</h3>
        <div v-if="formError" class="inline-alert">
          <span>{{ formError }}</span>
        </div>

        <div class="form-row">
          <div class="field">
            <label>№ комірки *</label>
            <input v-model="cellNumber" type="text" placeholder="К-03" />
          </div>

          <div class="field wide">
            <label>Найменування фідера *</label>
            <input v-model="feederName" type="text" placeholder="Фідер 10 кВ Лікарня №1" />
          </div>

          <div class="field">
            <label>Тип вимикача</label>
            <select v-model="breakerType">
              <option value="вакуумний">вакуумний</option>
              <option value="елегазовий">елегазовий</option>
              <option value="масляний">масляний</option>
            </select>
          </div>

          <div class="field">
            <label>Струм, А</label>
            <input v-model.number="currentLoadAmp" type="number" min="0" step="1" />
          </div>

          <div class="field">
            <label>Стан</label>
            <select v-model="cellStatus">
              <option value="увімкнено">увімкнено</option>
              <option value="вимкнено">вимкнено</option>
              <option value="заземлено">заземлено</option>
            </select>
          </div>

          <div class="field">
            <label>Дата техогляду</label>
            <input v-model="lastInspectionDate" type="date" />
          </div>

          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Додавання...' : '+ Додати' }}
          </button>
        </div>
      </form>

      <div v-if="cellActionError" class="inline-alert">
        <span>{{ cellActionError }}</span>
        <button type="button" class="btn btn-secondary btn-sm" @click="cellActionError = null">Закрити</button>
      </div>

      <div v-if="cells.length === 0" class="state-box">
        Для цієї підстанції ще немає зареєстрованих комірок.
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>№ комірки</th>
              <th>Фідер / Лінія</th>
              <th>Вимикач</th>
              <th>Навантаження</th>
              <th>Стан</th>
              <th>Останній огляд</th>
              <th>Дія</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cells" :key="c.id">
              <td class="mono">{{ c.cellNumber }}</td>
              <td>{{ c.feederName }}</td>
              <td>{{ c.breakerType }}</td>
              <td class="mono">{{ c.currentLoadAmp }} А</td>
              <td>
                <span class="badge" :class="cellBadgeClass(c.status)">{{ c.status }}</span>
              </td>
              <td class="mono">{{ c.lastInspectionDate }}</td>
              <td>
                <button type="button" class="btn btn-danger btn-sm" @click="handleDeleteCell(c)">
                  Видалити
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.err-title {
  color: var(--danger);
  margin-top: 0;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.back-link {
  color: var(--primary);
  font-weight: 600;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 20px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.code-tag {
  background: var(--header-bg);
  color: var(--accent);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

h1 {
  margin: 8px 0 0;
  font-size: 1.45rem;
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 12px;
}

h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.specs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.spec {
  background: var(--surface-alt);
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.spec-val {
  font-weight: 600;
}

.desc-box {
  margin-top: 14px;
  padding: 10px 12px;
  background: #fefce8;
  border-left: 4px solid var(--accent);
  border-radius: 4px;
  font-size: 0.92rem;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 115px;
}

.field.wide {
  flex: 1;
  min-width: 200px;
}

label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}
</style>