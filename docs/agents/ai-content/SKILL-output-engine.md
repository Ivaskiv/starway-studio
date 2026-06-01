# SKILL: output-engine
> Статус: ACTIVE

## Hard rules (дослівно)
1. Zero inline styles (style={{}}) — CSS custom properties або data-attr
2. Zero backdrop-filter — замість: gradient layers + shadow stacking
3. Стилі тільки в src/styles/ — Tailwind + CSS vars через className
4. No SCSS modules
5. No нових файлів якщо можна оновити існуючий
