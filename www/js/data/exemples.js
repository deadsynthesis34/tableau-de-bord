// DONNÉES D'EXEMPLE TEMPORAIRES.
// Elles servent seulement à voir la page Accueil avant d'avoir le vrai stockage.
// Plus tard, ce fichier sera remplacé par la lecture de la base locale (IndexedDB).
// Les dates sont calculées à partir d'aujourd'hui pour que le classement fonctionne toujours.

import { aujourdhui, ajouterJours, versTexte } from "../logic/dates.js";

function dansJours(nombre) {
  return versTexte(ajouterJours(aujourdhui(), nombre));
}

export function obtenirElementsExemple() {
  return [
    { id: "ex-1", type: "devoir", source: "classroom", titre: "Deadline devoir Design Jazz", date: dansJours(3), limite: "23:00", rappel: "18h30" },
    { id: "ex-2", type: "evenement", source: "manuel", titre: "Réunion de groupe", date: dansJours(1), debut: "14:00", fin: "15:00", rappel: "12h00" },
    { id: "ex-3", type: "evenement", source: "manuel", titre: "Tournage pub", date: dansJours(9), debut: "08:00", fin: "10:00", rappel: "18h30" },
    { id: "ex-4", type: "evenement", source: "manuel", titre: "Programmation", date: dansJours(16), debut: "14:00", fin: "16:00", rappel: "18h30" },
    { id: "ex-5", type: "devoir", source: "classroom", titre: "Deadline Layout mobile", date: dansJours(17), limite: "23:00", rappel: "18h30" },
  ];
}

// Total dépensé chaque jour de la semaine en cours (Lun, Mar, Mer, Jeu, Ven, Sam, Dim), en Ar
export function obtenirDepensesSemaineExemple() {
  return [4000, 5000, 2000, 7000, 1000, 9000, 12000];
}
