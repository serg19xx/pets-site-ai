<script setup lang="ts">
/**
 * Date of birth via year/month/day selects.
 * Avoids native <input type="date"> on mobile, where the calendar popup
 * often opens and closes immediately (esp. with labels / DevTools / some WebViews).
 */
const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    id?: string
    required?: boolean
    minYear?: number
    maxYear?: number
  }>(),
  {
    id: 'date-of-birth',
    required: false,
    minYear: 1970,
    maxYear: 0,
  },
)

const { t, locale } = useI18n()

const year = ref('')
const month = ref('')
const day = ref('')
const syncingFromModel = ref(false)

const effectiveMaxYear = computed(() => {
  if (props.maxYear > 0) {
    return props.maxYear
  }
  return new Date().getFullYear()
})

const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = effectiveMaxYear.value; y >= props.minYear; y -= 1) {
    years.push(y)
  }
  return years
})

const monthOptions = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { month: 'long' })
  return Array.from({ length: 12 }, (_, index) => {
    const value = String(index + 1).padStart(2, '0')
    const label = formatter.format(new Date(2020, index, 1))
    return { value, label }
  })
})

const daysInMonth = computed(() => {
  const y = Number(year.value)
  const m = Number(month.value)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return 31
  }
  return new Date(y, m, 0).getDate()
})

const dayOptions = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, index) =>
    String(index + 1).padStart(2, '0'),
  ),
)

function parseModel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return { year: '', month: '', day: '' }
  }
  return { year: match[1], month: match[2], day: match[3] }
}

watch(
  () => model.value,
  (value) => {
    const next = parseModel(value || '')
    if (
      next.year === year.value &&
      next.month === month.value &&
      next.day === day.value
    ) {
      return
    }
    syncingFromModel.value = true
    year.value = next.year
    month.value = next.month
    day.value = next.day
    syncingFromModel.value = false
  },
  { immediate: true },
)

watch([year, month, day], () => {
  if (syncingFromModel.value) {
    return
  }

  if (!year.value || !month.value || !day.value) {
    if (model.value) {
      model.value = ''
    }
    return
  }

  const maxDay = daysInMonth.value
  let safeDay = day.value
  if (Number(safeDay) > maxDay) {
    safeDay = String(maxDay).padStart(2, '0')
    syncingFromModel.value = true
    day.value = safeDay
    syncingFromModel.value = false
  }

  const next = `${year.value}-${month.value}-${safeDay}`
  if (next !== model.value) {
    model.value = next
  }
})
</script>

<template>
  <div :id="id" class="ui-dob-field" role="group" :aria-labelledby="`${id}-label`">
    <div class="ui-dob-grid">
      <label class="ui-dob-part">
        <span class="ui-caption">{{ t('dateOfBirthField.year') }}</span>
        <select
          v-model="year"
          class="ui-select"
          :required="required"
          :aria-label="t('dateOfBirthField.year')"
        >
          <option disabled value="">{{ t('dateOfBirthField.year') }}</option>
          <option v-for="y in yearOptions" :key="y" :value="String(y)">
            {{ y }}
          </option>
        </select>
      </label>

      <label class="ui-dob-part">
        <span class="ui-caption">{{ t('dateOfBirthField.month') }}</span>
        <select
          v-model="month"
          class="ui-select"
          :required="required"
          :aria-label="t('dateOfBirthField.month')"
        >
          <option disabled value="">{{ t('dateOfBirthField.month') }}</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">
            {{ m.label }}
          </option>
        </select>
      </label>

      <label class="ui-dob-part">
        <span class="ui-caption">{{ t('dateOfBirthField.day') }}</span>
        <select
          v-model="day"
          class="ui-select"
          :required="required"
          :aria-label="t('dateOfBirthField.day')"
        >
          <option disabled value="">{{ t('dateOfBirthField.day') }}</option>
          <option v-for="d in dayOptions" :key="d" :value="d">
            {{ Number(d) }}
          </option>
        </select>
      </label>
    </div>
  </div>
</template>
