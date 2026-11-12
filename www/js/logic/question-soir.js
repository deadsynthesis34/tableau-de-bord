// Quand faut-il poser la question "combien as-tu dépensé aujourd'hui ?"
// Règle : le réglage est activé, l'heure est dans la plage choisie (19h-22h par défaut),
// et la question n'a pas déjà été traitée aujourd'hui (répondue ou refusée).

import { versTexte } from "./dates.js";

function enMinutes(texteHeure) {
  const [heures, minutes] = texteHeure.split(":").map(Number);
  return heures * 60 + minutes;
}

// La plage peut passer minuit (ex : 22:00 -> 01:00)
export function dansLaPlage(debut, fin, maintenant = new Date()) {
  const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
  const d = enMinutes(debut);
  const f = enMinutes(fin);
  return d <= f ? minutes >= d && minutes < f : minutes >= d || minutes < f;
}

export function doitPoserQuestion({ active, debut, fin, traiteeLe }, maintenant = new Date()) {
  if (!active) return false;
  if (traiteeLe === versTexte(maintenant)) return false;
  return dansLaPlage(debut, fin, maintenant);
}
