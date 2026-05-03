# Schema del manifest de guía

Estructura formal del JSON que se sube a Supabase (`game_guides.manifest`).

## Top-level

| Campo | Tipo | Obligatorio | Notas |
|---|---|:-:|---|
| `igdb_id` | string \| number | ✅ | El ID numérico del juego en IGDB |
| `title` | string | ✅ | Nombre canónico del juego |
| `info` | object | ❌ | Stats agregadas (ver abajo) |
| `achievements` | Achievement[] | ✅ | Lista plana de TODOS los logros |
| `playthroughs` | Playthrough[] | ✅ | 1+ partidas, cada una con zonas y pasos |

## `info`

```ts
{
  difficulty?: string;          // "4/10" — escala libre
  estimated_time?: string;      // "20–30 horas"
  min_playthroughs?: number;    // 3
  total_trophies?: number;      // 38
  breakdown?: string;           // "22 Bronce · 12 Plata · 3 Oro · 1 Platino"
  missable_warning?: string;    // 1 párrafo, sin spoilers de trama
  tip?: string;                 // 1 párrafo con el consejo más útil
}
```

## `Achievement`

```ts
{
  id: string;                   // "ach_b14" — único en el manifest
  type: "platinum" | "gold" | "silver" | "bronze";
  title: string;                // Nombre oficial del trofeo
  description: string;          // Cómo obtenerlo, 1–3 frases
  missable?: boolean;           // true si se puede perder permanentemente
}
```

## `Playthrough`

```ts
{
  title: string;                // "Partida 1 — Normal + Coleccionables"
  summary?: string;             // 1 frase de objetivo
  zones: Zone[];                // En orden de juego
}
```

## `Zone`

```ts
{
  name: string;                 // "Casa Principal — Planta Baja"
  steps: Step[];                // En orden de ejecución
}
```

## `Step`

```ts
{
  id: string;                   // "p1_cp4" — único en el manifest
  type: "missable" | "collectible" | "tip" | "main";
  description: string;          // Acción concreta, 1–2 frases
  unlocks?: string[];           // IDs de achievements que desbloquea este paso
}
```

### Tipos de step

- **`missable`** — paso perdible (si lo saltas necesitas otra partida).
- **`collectible`** — coleccionable opcional (moneda, figura, documento).
- **`main`** — paso obligatorio de la historia que vale la pena marcar.
- **`tip`** — consejo, NO es checkable. Úsalo para soluciones de puzzles, estrategias de jefe, etc.

## Reglas de calidad

1. **IDs sistemáticos**: prefijo `p<N>` por partida + sufijo de zona. Ej: `p1_cv7` = Partida 1, Casa vieja, paso 7. NUNCA dupliques IDs.
2. **Una acción por paso**: si el paso tiene "primero X y luego Y", parte en dos.
3. **Descripciones cortas**: 1–2 frases máximo. La estrategia de jefe larga va en un step `tip`, no dentro del missable.
4. **Sin emojis decorativos** (`⚠️`, `🏆`) en las descripciones — la UI ya marca los missables en rojo. Solo añaden ruido.
5. **`unlocks` vincula pasos con logros**: si el paso desbloquea un trofeo concreto, mete su `id` en `unlocks`. Permite mostrar progreso por logro.
6. **Orden de ejecución real**: las zonas y pasos deben seguir el orden en el que el jugador los hace. No alfabético.
7. **No spoilers de trama** en `description`. La UI tiene "Spoilers OFF" para ocultarlos, pero el texto en sí debe centrarse en la mecánica, no en el plot.
8. **Datos verificables**: ubicaciones específicas, no "por ahí". Códigos exactos. Inputs concretos (`L2+R2`, no "el ataque fuerte").
