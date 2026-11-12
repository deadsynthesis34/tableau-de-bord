// Petits réglages et informations mémorisés dans la base locale
// (ex : date de la dernière synchronisation). Chaque entrée : { cle, valeur }.

import { lireUn, ecrire } from "./db.js";

const MAGASIN = "parametres";

export async function lireParametre(cle, valeurParDefaut = null) {
  const entree = await lireUn(MAGASIN, cle);
  return entree ? entree.valeur : valeurParDefaut;
}

export function ecrireParametre(cle, valeur) {
  return ecrire(MAGASIN, { cle, valeur });
}
