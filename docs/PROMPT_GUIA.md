# Prompt para generar manifests de guía

Copia este prompt entero y pégaselo a **Claude** (mejor) o ChatGPT, **con búsqueda web activada**. Si no, el modelo inventa.

Sustituye `{{NOMBRE_DEL_JUEGO}}`, `{{IGDB_ID}}` y `{{PLATAFORMA_REF}}`.

> **Regla de oro de este proyecto**: la guía debe ser **autosuficiente**. El usuario NO tiene que abrir otra pestaña. Si un trofeo pide "encuentra los 141 cómics", el manifest tiene que tener 141 pasos con la ubicación de cada cómic, uno por uno. Sin enlaces a Powerpyx, sin "ver guía completa", sin atajos.

---

## El prompt

```
Eres un experto en guías de trofeos y logros con conocimiento profundo de "{{NOMBRE_DEL_JUEGO}}" (IGDB id: {{IGDB_ID}}). Vas a generar un manifest JSON para una web de guías paso a paso. Plataforma de referencia: {{PLATAFORMA_REF}}.

PRINCIPIO CENTRAL — AUTOSUFICIENCIA POR VÍDEO + TEXTO

La guía debe ser AUTOSUFICIENTE: el usuario no abre otra pestaña. Pero NO enumeres a mano docenas de coleccionables: para conjuntos grandes, USA un step de tipo "video" con un vídeo real de YouTube que muestre todas las ubicaciones.

Reglas de cuándo usar texto vs vídeo:
- Coleccionables ≤ 10 ubicaciones → un step por ubicación con texto preciso.
- Coleccionables ≥ 10 ubicaciones → UN solo step type:"video" con video_id de YouTube apuntando a una guía visual de todas las ubicaciones. Su `unlocks` lista TODOS los logros que ese vídeo permite cumplir (el grupal y los individuales si los hay).
- Estrategia de jefe complejo → un step "main" + opcionalmente un step "video" con la estrategia visual.
- Logros pequeños / acciones puntuales / decisiones → text steps normales (missable, main, tip).
- Tips de orden de juego, advertencias, soluciones de puzzles → text steps "tip".

OBLIGATORIO PARA STEPS DE TIPO VIDEO

- BUSCA en YouTube un vídeo que YA EXISTA. Acepta cualquier idioma. Prioriza canales reconocidos (PowerPyx, GameRiotArmy, MonkeyKing1969, 100% Guides, Trophygamers, Maka91, Optinooby, etc.).
- Devuelve el video_id real de 11 caracteres (NO inventes — verifica que el vídeo existe).
- Formato de búsqueda recomendado: "{nombre del juego} all {coleccionable} locations" o "{juego} platinum walkthrough collectibles".
- Si NO encuentras un vídeo razonable para un conjunto, entonces SÍ desglosa los coleccionables a mano. Mejor texto largo verificado que un video_id inventado.

Esquema del step:
{
  "id": "p1_z3_video_comics",
  "type": "video",
  "title": "Ubicaciones de los 141 cómics (PowerPyx)",
  "description": "Guía visual completa. Vídeo en inglés pero las ubicaciones se ven claras. Marca este paso al terminar.",
  "video_id": "DkhJWnEpgX4",
  "unlocks": ["ach_bookworm"]
}

VERIFICACIÓN OBLIGATORIA EN INTERNET ANTES DE GENERAR

1. Lista REAL de logros (PSNProfiles, Steam, TrueAchievements, Exophase). Confirma número total y tipos.
2. Para CADA logro de coleccionable o "haz todos los X", busca la guía detallada que enumera las ubicaciones (PowerPyx, GameRant, IGN guides, fextralife, Steam community guides). LEE las ubicaciones y trasládalas al manifest.
3. Si para un coleccionable concreto no encuentras ubicación, escribe en su descripción "Ubicación N — verifica con guía visual: <nombre del coleccionable>" y déjalo como step pendiente. PREFERIBLE a omitirlo.
4. Si el juego es muy grande (>200 coleccionables) y no puedes generar todo en un prompt, AVISA y pide que te dejen continuar en bloques.

ESTRUCTURA EXACTA

{
  "igdb_id": "{{IGDB_ID}}",
  "title": "{{NOMBRE_DEL_JUEGO}}",
  "info": {
    "difficulty": "X/10",
    "estimated_time": "Xh–Yh",
    "min_playthroughs": <int>,
    "total_trophies": <int>,
    "breakdown": "X Bronce · Y Plata · Z Oro · 1 Platino  (Steam: N achievements)",
    "missable_warning": "1 párrafo. Cuántos perdibles, cuándo se pierden, qué hacer.",
    "tip": "1 párrafo con el consejo más útil para el platino."
  },
  "achievements": [
    {
      "id": "ach_<n>",
      "type": "platinum|gold|silver|bronze",
      "title": "Nombre OFICIAL EXACTO",
      "description": "1–3 frases. Qué pide.",
      "missable": true|false
    }
  ],
  "playthroughs": [
    {
      "title": "Partida N — <objetivo>",
      "summary": "1 frase de qué se hace en esta partida.",
      "zones": [
        {
          "name": "<Capítulo o zona en orden de juego>",
          "steps": [
            {
              "id": "p<N>_<zona>_<n>",
              "type": "missable|collectible|main|tip",
              "description": "1–2 frases. Acción CONCRETA y verificable.",
              "unlocks": ["ach_xxx"]
            }
          ]
        }
      ]
    }
  ]
}

REGLAS DURAS

1. COLECCIONABLES POR VÍDEO si son muchos.
   - >10 ubicaciones del mismo tipo → UN step "video".
   - ≤10 ubicaciones → desglose a mano con descripción precisa de cada una.

2. UN PASO POR LOGRO ESPECÍFICO QUE PIDE UNA ACCIÓN.
   "Mata 5 enemigos con un cuchillo" → si hay enemigos concretos donde es fácil hacerlo, lista los 5 momentos. Si es genérico ("durante el juego"), basta UN paso missable con la estrategia.
   "Vence al jefe X" → un paso main + un paso tip con estrategia detallada (puntos débiles, fases, ataques a evitar). Opcionalmente un step "video" con la pelea grabada.

3. IDS ÚNICOS Y SISTEMÁTICOS.
   Pasos: "p<partida>_<zona-corta>_<n>". Achievements: "ach_<n>" o "ach_<tipo>_<n>".
   Nunca dupliques.

4. UNLOCKS OBLIGATORIO en pasos que desbloquean un trofeo.
   - Coleccionable individual que cuenta hacia un trofeo "all of X" → unlocks: ["<id_del_trofeo_grupal>"].
   - Paso final que completa el conjunto (el último cómic) → unlocks: incluye también el achievement grupal.
   - Paso missable que desbloquea un logro específico → unlocks: ["<id_del_logro>"].
   - Pasos "tip" o "main" sin trofeo asociado → omite unlocks.

5. TIPOS:
   - missable: perdible (saltarlo obliga a otra partida o capítulo).
   - collectible: coleccionable opcional individual (cómic, moneda, log, foto, figura) — solo si son pocos.
   - main: paso obligatorio de historia digno de marcar (terminar capítulo, derrotar jefe principal).
   - tip: NO checkable. Solución de puzzle, estrategia de jefe, lista de prerequisitos, advertencia.
   - video: SÍ checkable. Reemplaza un grupo de coleccionables o una estrategia compleja. Requiere video_id de YouTube real (11 chars) y title corto descriptivo.

6. UNA ACCIÓN POR PASO. "Coge X y mata Y" → dos pasos.

7. DESCRIPCIONES CORTAS pero PRECISAS (1–2 frases).
   Ubicación: nombre de la sala / habitación / zona + objeto cercano de referencia ("sobre la mesa de billar", "dentro del cubo de basura junto al cartel rojo", "en el cajón inferior del escritorio").
   Estrategia: input concreto ("L2+R2 para ataque cargado"), no genérico ("ataque fuerte").

8. NO emojis decorativos. Sin ⚠️, sin 🏆.

9. ORDEN REAL DE JUEGO. Capítulos y pasos siguen el flujo del jugador.

10. NO SPOILERS DE TRAMA. Cíñete a mecánica.

11. SUMA DE LOGROS = total_trophies. Si no cuadra, has olvidado o duplicado.

12. SOLO JUEGO BASE — NUNCA DLCs.
    El platino se consigue con el juego base; los logros de DLC son aparte y NO los incluimos. Esto significa:
    - achievements: solo los del juego base. NO incluyas trofeos de "Left Behind", "Burial at Sea", "Phantom Liberty", season passes, expansions, etc.
    - playthroughs/zones: solo zonas del juego base.
    - Si el listado oficial mezcla base+DLC, FILTRA y deja solo base.
    - En info.breakdown indica el conteo del juego base. Puedes mencionar "(N DLCs aparte, no requeridos)" como aclaración pero nada más.
    - Si el "platino" oficial sí depende de un DLC (caso rarísimo), AVISA antes de generar y espera confirmación.

PRESUPUESTO Y CADENCIA

- Sin tope de pasos. La densidad correcta es: coleccionables + missables + bosses opcionales + 1–2 main por capítulo + tips de estrategia.
- Para juegos con muchos coleccionables (>100) usa zonas estrictamente por capítulo/área del juego, en orden cronológico, así el usuario los puede ir tachando linealmente.
- Si en una zona hay 30 coleccionables, son 30 steps en esa zona. No los agrupes.

AUTOVERIFICACIÓN ANTES DE RESPONDER (si fallas alguna, vuelve atrás)

[ ] ¿Verificaste la lista de logros en al menos UNA fuente externa?
[ ] ¿Filtraste cualquier logro/zona de DLC? Solo juego base.
[ ] ¿Suma de achievements = total_trophies?
[ ] ¿Cada logro grupal de coleccionables (>10) tiene un step type:"video" con video_id real de 11 caracteres apuntándolo en unlocks?
[ ] ¿Cada coleccionable individual (cuando son ≤10) tiene ubicación específica, no "por ahí"?
[ ] ¿Cada achievement con missable: true tiene al menos un step missable/collectible/video con unlocks apuntándolo?
[ ] ¿Los video_id que devuelves son reales (verificaste que el vídeo existe)?
[ ] ¿IDs únicos en TODO el manifest?
[ ] ¿Zonas en orden de juego?
[ ] ¿Nombres oficiales exactos (acentos/mayúsculas)?
[ ] ¿JSON válido, sin trailing commas?

ANTES DE EMPEZAR

Cuenta primero el total real, **SOLO del juego base** (excluye DLCs, expansiones, season pass):
- ¿Cuántos logros tiene el juego base?
- ¿Cuántos coleccionables hay en total en el juego base (suma de todas las categorías)?
- ¿Cuántos jefes opcionales / desafíos opcionales / desafíos de combate del juego base?
- ¿Cuántas decisiones / finales requeridos?

Suma todo. ESE es aproximadamente el número mínimo de steps que tendrá el manifest. Si tu primera generación tiene MUCHOS menos pasos que esa cuenta, has agrupado cosas indebidamente; rehazlo.

Devuelve SOLO el JSON dentro de un bloque ```json. Sin texto antes ni después. Si por límite de tokens no puedes terminar, devuelve lo generado hasta el corte CERRANDO el JSON correctamente y di al final "CORTADO_EN_<zona>" para que pueda pedirte la continuación.
```

---

## Estrategia para juegos enormes (>150 coleccionables)

El modelo se quedará corto en un solo prompt. Divide:

1. **Prompt 1 — esqueleto**: pide solo `info` + `achievements` completos (verificados). El JSON se queda con `playthroughs: []`.
2. **Prompt 2 — Partida 1, capítulos 1–3**: pasa el JSON anterior y pide que rellene esas zonas COMPLETAS, con todos los coleccionables.
3. **Prompt 3 — Partida 1, capítulos 4–N**: lo mismo.
4. **Prompt N — partidas adicionales** (NG+, dificultad máxima, etc.).
5. **Mergear**: con un editor de texto, copia el `zones` de cada respuesta dentro del playthrough del JSON original.

Ejemplo de petición continuación:
```
Te paso el JSON parcial. Continúa desde la zona "<X>" (capítulo 4) hasta el final de la Partida 1. Mantén el patrón de IDs (p1_<zona-corta>_<n>) y enlaza con unlocks. Devuelve SOLO las zones nuevas a añadir, ya en JSON. No re-generes lo previo.
```

---

## Después de generar

1. `pnpm validate src/data/<juego>.json` — el validador detecta IDs duplicados, descripciones vacías, campos faltantes, missables sin unlocks, suma incorrecta.
2. Inspección rápida: cuenta los pasos `collectible` y verifica que coincide con lo que dicen los logros tipo "all X".
3. Si todo cuadra, sube vía `/admin`.
