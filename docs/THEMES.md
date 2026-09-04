# Sistema de temas (oscuro / claro / automático)

## Resumen

A partir de la versión **1.2.1**, la interfaz usa variables CSS centralizadas en `frontend/src/assets/main.css` en lugar de clases Tailwind fijas de modo oscuro (`bg-slate-*`, `text-slate-*`). Esto garantiza contraste legible en ambos temas.

## Problema corregido en v1.2.1

En **tema claro**, varias vistas mostraban texto blanco o gris muy claro sobre fondos blancos porque las tablas y formularios conservaban estilos pensados solo para modo oscuro:

- Celdas sticky con `bg-slate-900`
- Encabezados de tabla con `bg-slate-800/50`
- Texto de filas con `text-slate-400` sin adaptación al tema activo
- Modales con overlay fijo `bg-black/60`

**Vistas afectadas y corregidas:** Suscripciones, Cuentas, Clientes, Dashboard, Usuarios, Notificaciones, Plantillas, Versión, Seguridad, layout principal, `FormField` y `KpiCard`.

## Cómo funciona

El store `frontend/src/stores/theme.ts` aplica el atributo `data-theme="dark"` o `data-theme="light"` en `<html>`. Las variables en `main.css` cambian según ese atributo.

| Variable | Uso |
|----------|-----|
| `--color-text` | Texto principal |
| `--color-text-muted` | Subtítulos, hints, fechas |
| `--color-bg-card` | Fondos de tarjetas |
| `--color-border` | Bordes e inputs |
| `--color-table-header` | Encabezado de tablas |
| `--color-table-sticky` | Columna fija en tablas anchas |
| `--color-row-hover` | Hover en filas |
| `--color-overlay` | Fondo de modales |
| `--color-link` | Enlaces y acciones |
| `--color-danger` | Costos / errores |
| `--color-success-money` | Ingresos / ganancias |

## Clases utilitarias

Usar estas clases en lugar de colores Tailwind hardcodeados:

| Clase | Descripción |
|-------|-------------|
| `.data-table` | Tabla responsive con colores del tema |
| `.table-wrap` | Contenedor con scroll horizontal |
| `.card-flush` | Card sin padding (tablas a borde) |
| `.text-themed-primary` | Texto principal |
| `.text-themed-muted` | Texto secundario |
| `.text-brand` | Acento de marca |
| `.text-link` | Enlaces interactivos |
| `.text-cost` | Montos de costo (rojo) |
| `.text-income` | Montos de ingreso (azul) |
| `.text-money` | Ganancias positivas (verde) |
| `.text-success` | Estados OK |
| `.modal-overlay` | Overlay de diálogos |
| `.nav-link` / `.nav-link-active` | Navegación lateral |
| `.input` | Campos de formulario |
| `.tag-pill` | Etiquetas (ej. tipo de versión) |

## Patrón recomendado para tablas

```html
<div class="table-wrap card card-flush">
  <table class="data-table">
    <thead>
      <tr>
        <th class="sticky-col">Columna fija</th>
        <th>Otra columna</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="sticky-col">Valor</td>
        <td class="text-themed-muted">Detalle</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Selector de tema

El componente `ThemeToggle.vue` (sidebar) ofrece **Claro**, **Oscuro** y **Auto** (prefiere `prefers-color-scheme` del sistema). La preferencia se guarda en `localStorage`.

## Agregar nuevos componentes

1. Evitar `text-slate-*`, `bg-slate-*` y `text-white` en contenido de datos.
2. Usar variables o clases utilitarias de `main.css`.
3. Probar la vista en ambos temas antes de cerrar el cambio.
