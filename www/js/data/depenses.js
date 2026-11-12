// Lecture et écriture des dépenses dans la base locale.
// Une dépense : { id, montant (en Ar), motif, date "AAAA-MM-JJ", creeLe, modifieLe, supprime }
// Une dépense supprimée n'est pas effacée : elle est seulement marquée "supprime".
// Cela permettra plus tard de synchroniser les suppressions entre le téléphone et le PC,
// et d'annuler une suppression.

import { lireTout, lireUn, ecrire } from "./db.js";

const MAGASIN = "depenses";

export const MOTIFS = ["Gouté", "Crédits", "Etude", "Divers"];

function creerId() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "d-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Prévient les pages (Accueil, Dépenses) qu'il faut se mettre à jour
function prevenir() {
  window.dispatchEvent(new window.CustomEvent("donnees-modifiees", { detail: { type: "depenses" } }));
}

// Toutes les dépenses non supprimées
export async function listerDepenses() {
  const toutes = await lireTout(MAGASIN);
  return toutes.filter((depense) => !depense.supprime);
}

export async function ajouterDepense({ montant, motif, date }) {
  const maintenant = Date.now();
  const depense = {
    id: creerId(),
    montant,
    motif,
    date,
    creeLe: maintenant,
    modifieLe: maintenant,
    supprime: false,
  };
  await ecrire(MAGASIN, depense);
  prevenir();
  return depense;
}

async function changerEtat(id, supprime) {
  const depense = await lireUn(MAGASIN, id);
  if (!depense) return;
  depense.supprime = supprime;
  depense.modifieLe = Date.now();
  await ecrire(MAGASIN, depense);
  prevenir();
}

export function supprimerDepense(id) {
  return changerEtat(id, true);
}

export function restaurerDepense(id) {
  return changerEtat(id, false);
}
