// minigames/cooking.js — interactive recipe data for the kitchen.
export const INGREDIENTS = {
  banana:     { emoji: '🍌', ar: 'موز' },
  milk:       { emoji: '🍼', ar: 'حليب' },
  apple:      { emoji: '🍎', ar: 'تفاح' },
  strawberry: { emoji: '🍓', ar: 'فراولة' },
  potato:     { emoji: '🥔', ar: 'بطاطس' },
  carrot:     { emoji: '🥕', ar: 'جزر' },
  orange:     { emoji: '🍊', ar: 'برتقال' },
  dough:      { emoji: '🥣', ar: 'عجينة' },
  choco:      { emoji: '🍫', ar: 'شوكولاتة' },
};

export const TOOLS = {
  blender: { emoji: '🌀', ar: 'الخلاط', time: 2.2, sound: 'washer' },
  knife:   { emoji: '🔪', ar: 'التقطيع', time: 1.6, sound: 'munch' },
  pot:     { emoji: '🍲', ar: 'الموقد', time: 3, sound: 'fire' },
  oven:    { emoji: '🔥', ar: 'الفرن', time: 3, sound: 'shaver' },
};

export const RECIPES = [
  { id: 'shake',  ar: 'مشروب الموز', dishEmoji: '🥤', ingredients: ['banana', 'milk'], tool: 'blender', hunger: 25, happiness: 8 },
  { id: 'salad',  ar: 'سلطة فواكه',  dishEmoji: '🍓', ingredients: ['apple', 'strawberry', 'banana'], tool: 'knife', hunger: 22, happiness: 6 },
  { id: 'soup',   ar: 'شوربة خضار',  dishEmoji: '🍲', ingredients: ['potato', 'carrot'], tool: 'pot', hunger: 30, happiness: 5 },
  { id: 'cookie', ar: 'بسكويت',      dishEmoji: '🍪', ingredients: ['dough', 'choco'], tool: 'oven', hunger: 20, happiness: 10 },
  { id: 'juice',  ar: 'عصير برتقال', dishEmoji: '🧃', ingredients: ['orange', 'orange'], tool: 'blender', hunger: 15, happiness: 6 },
];

export function recipesFor(ing) {
  return RECIPES.filter(r => r.ingredients.includes(ing));
}
