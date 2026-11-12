// Synchronisation avec Google Classroom (déclenchée par le bouton Synchroniser).
// Plus tard, la synchronisation Firebase entre téléphone et PC viendra s'ajouter ici.

import { obtenirJeton, oublierJeton } from "../services/google-auth.js";
import { recupererDevoirsClassroom } from "../services/classroom.js";
import { appliquerSynchroClassroom } from "./elements.js";
import { ecrireParametre, lireParametre } from "./parametres.js";

export class ErreurSynchro extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Renvoie { ajoutes, misAJour, retires, sansDate, nombreCours }
export async function synchroniserClassroom() {
  if (!navigator.onLine) {
    throw new ErreurSynchro("hors-ligne", "Pas de connexion Internet.");
  }

  const jeton = await obtenirJeton();

  let reception;
  try {
    reception = await recupererDevoirsClassroom(jeton);
  } catch (erreur) {
    if (erreur.code === "jeton") oublierJeton(); // le jeton n'est plus valable : on en redemandera un
    throw erreur;
  }

  const bilan = await appliquerSynchroClassroom(reception.elements);
  await ecrireParametre("derniereSynchro", Date.now());

  return { ...bilan, sansDate: reception.sansDate, nombreCours: reception.nombreCours };
}

export function lireDerniereSynchro() {
  return lireParametre("derniereSynchro", null);
}

// Message lisible pour une erreur de connexion ou de synchronisation
export function messageErreurSynchro(erreur) {
  switch (erreur.code) {
    case "hors-ligne":
      return "Connecte-toi à Internet pour synchroniser.";
    case "config":
      return "Il manque l'identifiant Google : renseigne-le dans js/config.js.";
    case "reseau":
      return "Impossible de joindre Google. Vérifie ta connexion Internet.";
    case "annule":
      return "Connexion Google annulée.";
    case "refuse":
      return "Accès à Google Classroom refusé : accepte les autorisations pour synchroniser.";
    case "popup":
      return "La fenêtre de connexion Google n'a pas pu s'ouvrir. Autorise les fenêtres popup pour ce site.";
    case "jeton":
      return "Ta session Google a expiré. Clique à nouveau sur Synchroniser.";
    case "acces":
      return "Google a refusé l'accès (403) : " + erreur.message;
    default:
      return "La synchronisation a échoué : " + (erreur.message || "erreur inconnue");
  }
}
