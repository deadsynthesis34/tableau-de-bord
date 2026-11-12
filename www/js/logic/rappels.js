// Règles des rappels (la cloche).
// "Publication" = moment où l'élément a été créé (pour Classroom : la date de publication du devoir).
// "Échéance" = date limite + heure limite d'un devoir, ou date + heure de début d'un évènement.
//
//   - Même jour que la publication : aucun rappel.
//   - Chaque soir à 18h30, de la publication jusqu'à la veille de l'échéance.
//   - Le jour J, si l'échéance est après 18h30 : un rappel à 08h00 et un à 18h30.
//   - Le jour J, si l'échéance est à 18h30 ou avant : un seul rappel, 2 heures avant l'échéance.
//   - Un rappel déjà passé au moment de la publication n'existe pas.

import { lireDate, ajouterJours, joursEntre } from "./dates.js";

const HEURE_SOIR = "18:30";
const HEURE_MATIN = "08:00";
const HEURES_AVANT = 2;

// "2026-11-09" + "18:30" -> objet Date
function dateHeure(texteDate, texteHeure) {
  return avecHeure(lireDate(texteDate), texteHeure);
}

function avecHeure(jour, texteHeure) {
  const [heures, minutes] = texteHeure.split(":").map(Number);
  return new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), heures, minutes);
}

// Moment limite de l'élément
export function echeanceDe(element) {
  if (element.type === "evenement") {
    return dateHeure(element.date, element.debut || "00:00");
  }
  return dateHeure(element.date, element.limite || "23:59");
}

// Tous les rappels prévus pour un élément, du plus tôt au plus tard
export function calculerRappels(element) {
  if (element.rendu) return []; //Ajouté pour ne plus rappeler un devoir déjà rendu

  const publication = new Date(element.creeLe);
  const echeance = echeanceDe(element);
  const jourJ = lireDate(element.date);
  const jourPublication = new Date(publication.getFullYear(), publication.getMonth(), publication.getDate());

  // Publié le jour même (ou après) : pas de rappel
  if (joursEntre(jourPublication, jourJ) <= 0) return [];

  const rappels = [];

  // Chaque soir jusqu'à la veille
  for (let jour = jourPublication; joursEntre(jour, jourJ) >= 1; jour = ajouterJours(jour, 1)) {
    rappels.push(avecHeure(jour, HEURE_SOIR));
  }

  // Le jour J
  if (echeance > avecHeure(jourJ, HEURE_SOIR)) {
    rappels.push(avecHeure(jourJ, HEURE_MATIN));
    rappels.push(avecHeure(jourJ, HEURE_SOIR));
  } else {
    rappels.push(new Date(echeance.getTime() - HEURES_AVANT * 60 * 60 * 1000));
  }

  return rappels.filter((rappel) => rappel > publication).sort((a, b) => a - b);
}

// Le prochain rappel à venir (ou null s'il n'y en a plus)
export function prochainRappel(element, maintenant = new Date()) {
  return calculerRappels(element).find((rappel) => rappel >= maintenant) || null;
}
