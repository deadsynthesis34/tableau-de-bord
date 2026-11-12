// Règle de classement des tâches (devoirs et évènements) selon la date limite :
//   7 jours ou moins  -> "important"
//   de 8 à 14 jours   -> "a-voir"
//   plus de 14 jours  -> "de-cote" (à mettre de côté)
// Les éléments déjà passés ne sont classés nulle part.

import { aujourdhui, lireDate, joursEntre } from "./dates.js";

export function categorieDe(element, reference = aujourdhui()) {
  if (element.rendu) return null; //Ajouté pour ne pas classer (ni afficher dans les listes) les devoirs déjà rendus

  const jours = joursEntre(reference, lireDate(element.date));

  if (jours < 0) return null;       // déjà passé
  if (jours <= 7) return "important";
  if (jours <= 14) return "a-voir";
  return "de-cote";
}

// Trie par date, puis par heure de début (ou heure limite)
export function trierParDate(elements) {
  const heureDe = (e) => e.debut || e.limite || "00:00";
  return [...elements].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return heureDe(a) < heureDe(b) ? -1 : 1;
  });
}

// Renvoie { important: [...], "a-voir": [...], "de-cote": [...] }, chaque liste triée
export function classerParCategorie(elements, reference = aujourdhui()) {
  const groupes = { important: [], "a-voir": [], "de-cote": [] };

  trierParDate(elements).forEach((element) => {
    const categorie = categorieDe(element, reference);
    if (categorie) groupes[categorie].push(element);
  });

  return groupes;
}
