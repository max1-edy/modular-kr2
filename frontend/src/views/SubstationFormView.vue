<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, RouterLink } from 'vue-router'
import type { SubstationPayload, VoltageClass, SubstationStatus } from '../types/energy'
import {
  fetchSubstationById,
  createSubstation,
  updateSubstation
} from '../api/client'

const route = useRoute()
const router = useRouter()

const isEditMode = computed<boolean>(() => Boolean(route.params.id))
const currentYear = new Date().getFullYear()

const code = ref<string>('')
const name = ref<string>('')
const location = ref<string>('')
const voltageClass = ref<VoltageClass>('110/10 кВ')
const status = ref<SubstationStatus>('в роботі')
const totalPowerKva = ref<number>(10000)
const commissioningYear = ref<number>(2000)
const description = ref<string>('')

const isDirty = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const loadError = ref<string | null>(null)
const isNotFound = ref<boolean>(false)
const isSubmitting = ref<boolean>(false)
const submitError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

function markDirty(): void {
  isDirty.value = true
}

function validateForm(): boolean {
  const errors: Record<string, string> = {}

  if (!code.value.trim()) {
    errors.code = 'Вкажіть диспетчерський шифр'
  }
  if (!name.value.trim()) {
    errors.name = 'Вкажіть назву обʼєкта'
  }
  if (!location.value.trim()) {
    errors.location = 'Вкажіть фізичну адресу або координатну привʼязку'
  }
  if (typeof totalPowerKva.value !== 'number' || Number.isNaN(totalPowerKva.value) || totalPowerKva.value <= 0) {
    errors.totalPowerKva = 'Потужність має бути додатним числом'
  }
  if (
    typeof commissioningYear.value !== 'number' ||
    !Number.isInteger(commissioningYear.value) ||
    commissioningYear.value < 1950 ||
    commissioningYear.value > currentYear
  ) {
    errors.commissioningYear = `Рік має бути цілим числом від 1950 до ${currentYear}`
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function loadExisting(): Promise<void> {
  if (!isEditMode.value) return

  const id = String(route.params.id)
  isLoading.value = true
  loadError.value = null
  isNotFound.value = false

  try {
    const data = await fetchSubstationById(id)
    code.value = data.code
    name.value = data.name
    location.value = data.location
    voltageClass.value = data.voltageClass
    status.value = data.status
    totalPowerKva.value = data.totalPowerKva
    commissioningYear.value = data.commissioningYear
    description.value = data.description
    isDirty.value = false
  } catch (err) {
    const st = (err as { status?: number }).status
    if (st === 404) {
      isNotFound.value = true
    } else {
      loadError.value = err instanceof Error ? err.message : 'Не вдалося завантажити дані підстанції'
    }
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  submitError.value = null
  if (!validateForm()) return

  const payload: SubstationPayload = {
    code: code.value.trim(),
    name: name.value.trim(),
    location: location.value.trim(),
    voltageClass: voltageClass.value,
    status: status.value,
    totalPowerKva: totalPowerKva.value,
    commissioningYear: commissioningYear.value,
    description: description.value.trim()
  }

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      const updated = await updateSubstation(String(route.params.id), payload)
      isDirty.value = false
      await router.push(`/substations/${updated.id}`)
    } else {
      const created = await createSubstation(payload)
      isDirty.value = false
      await router.push(`/substations/${created.id}`)
    }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Помилка збереження даних'
  } finally {
    isSubmitting.value = false
  }
}

onBeforeRouteLeave(() => {
  if (isDirty.value) {
    return window.confirm('Є незбережені зміни у формі. Вийти без збереження?')
  }
  return true
})

function handleBeforeUnload(e: BeforeUnloadEvent): void {
  if (isDirty.value) {
    e.preventDefault()
  }
}

onMounted(() => {
  loadExisting()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <section class="form-wrap">
    <div v-if="isLoading" class="state-box">Завантаження даних об'єкта...</div>

    <div v-else-if="isNotFound" class="state-box">
      <h2 class="err-title">Підстанцію не знайдено (404)</h2>
      <p>Неможливо редагувати об'єкт, якого немає в базі.</p>
      <RouterLink to="/substations" class="btn btn-primary">Повернутися до реєстру</RouterLink>
    </div>

    <div v-else-if="loadError" class="state-box error-box">
      <p>Не вдалося завантажити паспорт: {{ loadError }}</p>
      <div class="retry-actions">
        <button type="button" class="btn btn-primary" @click="loadExisting">Спробувати ще раз</button>
        <RouterLink to="/substations" class="btn btn-secondary">До реєстру</RouterLink>
      </div>
    </div>

    <div v-else class="form-card">
      <h1>{{ isEditMode ? 'Редагування паспорта підстанції' : 'Реєстрація нової підстанції' }}</h1>

      <form @submit.prevent="handleSubmit" novalidate>
        <div v-if="submitError" class="inline-alert">
          <span><strong>Помилка:</strong> {{ submitError }}</span>
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Диспетчерський шифр *</label>
            <input
              v-model="code"
              type="text"
              :class="{ invalid: fieldErrors.code }"
              placeholder="ПС-110/10 «Північна»"
              @input="markDirty"
            />
            <span v-if="fieldErrors.code" class="err-hint">{{ fieldErrors.code }}</span>
          </div>

          <div class="field">
            <label>Назва об'єкта *</label>
            <input
              v-model="name"
              type="text"
              :class="{ invalid: fieldErrors.name }"
              placeholder="Північна вузлова"
              @input="markDirty"
            />
            <span v-if="fieldErrors.name" class="err-hint">{{ fieldErrors.name }}</span>
          </div>
        </div>

        <div class="field">
          <label>Фізична адреса або координатна прив'язка *</label>
          <input
            v-model="location"
            type="text"
            :class="{ invalid: fieldErrors.location }"
            placeholder="вул. Промислова, 14"
            @input="markDirty"
          />
          <span v-if="fieldErrors.location" class="err-hint">{{ fieldErrors.location }}</span>
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Номінальний клас напруги *</label>
            <select v-model="voltageClass" @change="markDirty">
              <option value="110/10 кВ">110/10 кВ</option>
              <option value="35/10 кВ">35/10 кВ</option>
              <option value="10/0.4 кВ">10/0.4 кВ</option>
            </select>
          </div>

          <div class="field">
            <label>Експлуатаційний статус *</label>
            <select v-model="status" @change="markDirty">
              <option value="в роботі">в роботі</option>
              <option value="плановий ремонт">плановий ремонт</option>
              <option value="аварійний вивід">аварійний вивід</option>
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Сумарна потужність трансформаторів, кВА *</label>
            <input
              v-model.number="totalPowerKva"
              type="number"
              min="1"
              :class="{ invalid: fieldErrors.totalPowerKva }"
              @input="markDirty"
            />
            <span v-if="fieldErrors.totalPowerKva" class="err-hint">{{ fieldErrors.totalPowerKva }}</span>
          </div>

          <div class="field">
            <label>Рік введення в експлуатацію (1950–{{ currentYear }}) *</label>
            <input
              v-model.number="commissioningYear"
              type="number"
              min="1950"
              :max="currentYear"
              :class="{ invalid: fieldErrors.commissioningYear }"
              @input="markDirty"
            />
            <span v-if="fieldErrors.commissioningYear" class="err-hint">{{ fieldErrors.commissioningYear }}</span>
          </div>
        </div>

        <div class="field">
          <label>Примітки щодо чергового персоналу або особливостей під'їзду</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="Додаткова оперативна інформація..."
            @input="markDirty"
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Збереження...' : 'Зберегти паспорт' }}
          </button>
          <button type="button" class="btn btn-secondary" @click="router.push('/substations')">
            Скасувати
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.form-wrap {
  max-width: 720px;
  margin: 0 auto;
}

.err-title {
  color: var(--danger);
  margin-top: 0;
}

.retry-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 22px;
}

h1 {
  margin: 0 0 18px;
  font-size: 1.4rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 14px;
}

label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

input.invalid {
  border-color: var(--danger);
  background-color: #fef2f2;
}

.err-hint {
  color: var(--danger);
  font-size: 0.8rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
</style>