<script setup lang="ts">
const modelValue = defineModel<string>({ default: 'i-lucide-circle' })

// Popular icons for activities
const iconCategories = [
  {
    name: 'Work',
    icons: [
      'i-lucide-briefcase',
      'i-lucide-laptop',
      'i-lucide-code',
      'i-lucide-file-text',
      'i-lucide-mail',
      'i-lucide-phone',
      'i-lucide-video',
      'i-lucide-presentation'
    ]
  },
  {
    name: 'Personal',
    icons: [
      'i-lucide-home',
      'i-lucide-user',
      'i-lucide-heart',
      'i-lucide-star',
      'i-lucide-coffee',
      'i-lucide-bed',
      'i-lucide-bath',
      'i-lucide-shirt'
    ]
  },
  {
    name: 'Health',
    icons: [
      'i-lucide-activity',
      'i-lucide-dumbbell',
      'i-lucide-bike',
      'i-lucide-footprints',
      'i-lucide-apple',
      'i-lucide-pill',
      'i-lucide-brain',
      'i-lucide-eye'
    ]
  },
  {
    name: 'Leisure',
    icons: [
      'i-lucide-gamepad-2',
      'i-lucide-music',
      'i-lucide-tv',
      'i-lucide-book-open',
      'i-lucide-palette',
      'i-lucide-camera',
      'i-lucide-plane',
      'i-lucide-utensils'
    ]
  },
  {
    name: 'Education',
    icons: [
      'i-lucide-graduation-cap',
      'i-lucide-book',
      'i-lucide-pencil',
      'i-lucide-library',
      'i-lucide-languages',
      'i-lucide-calculator',
      'i-lucide-atom',
      'i-lucide-flask-conical'
    ]
  },
  {
    name: 'Other',
    icons: [
      'i-lucide-circle',
      'i-lucide-square',
      'i-lucide-triangle',
      'i-lucide-hexagon',
      'i-lucide-sparkles',
      'i-lucide-zap',
      'i-lucide-flame',
      'i-lucide-leaf'
    ]
  }
]

const selectedCategory = ref(iconCategories[0].name)

const currentCategoryIcons = computed(() => {
  return iconCategories.find(c => c.name === selectedCategory.value)?.icons || []
})

function selectIcon(icon: string) {
  modelValue.value = icon
}
</script>

<template>
  <div class="space-y-3">
    <label class="block text-sm font-medium">Icon</label>
    
    <!-- Category tabs -->
    <div class="flex gap-1 overflow-x-auto pb-2">
      <button
        v-for="category in iconCategories"
        :key="category.name"
        class="px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors"
        :class="selectedCategory === category.name
          ? 'bg-primary text-primary-foreground'
          : 'bg-elevated text-muted hover:text-default'"
        @click="selectedCategory = category.name"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- Icon grid -->
    <div class="grid grid-cols-8 gap-2">
      <button
        v-for="icon in currentCategoryIcons"
        :key="icon"
        class="w-10 h-10 flex items-center justify-center rounded-lg transition-all"
        :class="modelValue === icon
          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-default'
          : 'bg-elevated hover:bg-muted/20'"
        @click="selectIcon(icon)"
      >
        <UIcon :name="icon" class="w-5 h-5" />
      </button>
    </div>

    <!-- Current selection -->
    <div class="flex items-center gap-2 text-sm text-muted">
      <UIcon :name="modelValue" class="w-5 h-5" />
      <span>Selected: {{ modelValue.replace('i-lucide-', '') }}</span>
    </div>
  </div>
</template>
