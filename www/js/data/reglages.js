// Réglages de l'utilisateur (clé Gemini, question du soir...), mémorisés sur l'appareil.
// ATTENTION : la clé Gemini ne doit JAMAIS être envoyée à Firebase ni synchronisée :
// elle reste uniquement sur l'appareil où elle a été saisie.

import { lireParametre, ecrireParametre } from "./parametres.js";

export const REGLAGES_PAR_DEFAUT = {
  cleGemini: "",
  modeleGemini: "gemini-3.1-flash-lite",
  contexteExplication: "",
  questionSoirActive: true,
  questionSoirDebut: "19:00",
  questionSoirFin: "22:00",
};

export async function lireReglages() {
  const reglages = {};
  for (const [cle, valeurParDefaut] of Object.entries(REGLAGES_PAR_DEFAUT)) {
    reglages[cle] = await lireParametre(cle, valeurParDefaut);
  }
  return reglages;
}

// partiel : un objet avec seulement les réglages à changer
export async function enregistrerReglages(partiel) {
  for (const [cle, valeur] of Object.entries(partiel)) {
    if (cle in REGLAGES_PAR_DEFAUT) {
      await ecrireParametre(cle, valeur);
    }
  }
  window.dispatchEvent(new window.CustomEvent("reglages-modifies"));
}
