#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STEP_TYPES = new Set(['missable', 'collectible', 'tip', 'main']);
const TROPHY_TYPES = new Set(['platinum', 'gold', 'silver', 'bronze']);

const file = process.argv[2];
if (!file) {
  console.error('Uso: pnpm validate <ruta-al-json>');
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(resolve(file), 'utf8');
} catch (e) {
  console.error(`No pude leer ${file}: ${e.message}`);
  process.exit(1);
}

let m;
try {
  m = JSON.parse(raw);
} catch (e) {
  console.error(`JSON inválido: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warns = [];

if (!m.igdb_id) errors.push('Falta `igdb_id`');
if (!m.title) errors.push('Falta `title`');
if (!Array.isArray(m.achievements)) errors.push('`achievements` debe ser array');
if (!Array.isArray(m.playthroughs)) errors.push('`playthroughs` debe ser array');

const ids = new Set();
const achIds = new Set();

(m.achievements ?? []).forEach((a, i) => {
  if (!a.id) errors.push(`achievements[${i}]: falta id`);
  else if (achIds.has(a.id)) errors.push(`achievement id duplicado: ${a.id}`);
  else achIds.add(a.id);
  if (!TROPHY_TYPES.has(a.type)) errors.push(`achievements[${i}] (${a.id}): type inválido "${a.type}"`);
  if (!a.title) errors.push(`achievements[${i}] (${a.id}): falta title`);
  if (!a.description) warns.push(`achievements[${i}] (${a.id}): falta description`);
});

(m.playthroughs ?? []).forEach((p, pi) => {
  if (!p.title) errors.push(`playthroughs[${pi}]: falta title`);
  if (!Array.isArray(p.zones)) errors.push(`playthroughs[${pi}]: zones debe ser array`);
  (p.zones ?? []).forEach((z, zi) => {
    if (!z.name) errors.push(`playthroughs[${pi}].zones[${zi}]: falta name`);
    if (!Array.isArray(z.steps)) errors.push(`playthroughs[${pi}].zones[${zi}]: steps debe ser array`);
    (z.steps ?? []).forEach((s, si) => {
      const where = `playthroughs[${pi}].zones[${zi}].steps[${si}]`;
      if (!s.id) errors.push(`${where}: falta id`);
      else if (ids.has(s.id)) errors.push(`step id duplicado: ${s.id}`);
      else ids.add(s.id);
      if (!STEP_TYPES.has(s.type)) errors.push(`${where} (${s.id}): type inválido "${s.type}"`);
      if (!s.description) errors.push(`${where} (${s.id}): falta description`);
      if (s.description && s.description.length > 400) warns.push(`${where} (${s.id}): description muy larga (${s.description.length} chars). Parte en dos pasos.`);
      if (s.unlocks) {
        if (!Array.isArray(s.unlocks)) errors.push(`${where} (${s.id}): unlocks debe ser array`);
        else s.unlocks.forEach(u => {
          if (!achIds.has(u)) errors.push(`${where} (${s.id}): unlocks referencia achievement inexistente "${u}"`);
        });
      }
    });
  });
});

const totalAch = (m.achievements ?? []).length;
if (m.info?.total_trophies && Number(m.info.total_trophies) !== totalAch) {
  warns.push(`info.total_trophies (${m.info.total_trophies}) no coincide con achievements.length (${totalAch})`);
}

const missableAch = (m.achievements ?? []).filter(a => a.missable).map(a => a.id);
const stepsUnlock = new Set();
(m.playthroughs ?? []).forEach(p => p.zones?.forEach(z => z.steps?.forEach(s => s.unlocks?.forEach(u => stepsUnlock.add(u)))));
const orphanMissables = missableAch.filter(id => !stepsUnlock.has(id));
if (orphanMissables.length > 0) {
  warns.push(`Achievements perdibles sin step que los desbloquee (unlocks): ${orphanMissables.join(', ')}`);
}

console.log(`\nManifest: ${m.title} (igdb_id: ${m.igdb_id})`);
console.log(`  ${totalAch} logros · ${(m.playthroughs ?? []).length} partidas · ${ids.size} pasos`);

if (errors.length) {
  console.error(`\n❌ ${errors.length} error(es):`);
  errors.forEach(e => console.error(`  - ${e}`));
}
if (warns.length) {
  console.warn(`\n⚠️  ${warns.length} aviso(s):`);
  warns.forEach(w => console.warn(`  - ${w}`));
}
if (!errors.length && !warns.length) {
  console.log('\n✅ Manifest válido y sin avisos.');
}

process.exit(errors.length ? 1 : 0);
