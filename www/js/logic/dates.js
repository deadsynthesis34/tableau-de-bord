// Petites fonctions pour travailler avec les dates, en français et sans bibliothèque.
// Dans tout le projet, une date est écrite sous forme de texte "AAAA-MM-JJ" (ex : "2026-11-09").

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Transforme "2026-11-09" en objet Date à minuit (heure locale)
export function lireDate(texte) {
  const [annee, mois, jour] = texte.split("-").map(Number);
  return new Date(annee, mois - 1, jour);
}

// Transforme un objet Date en texte "2026-11-09"
export function versTexte(date) {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + mois + "-" + jour;
}

// La date d'aujourd'hui, à minuit
export function aujourdhui() {
  const maintenant = new Date();
  return new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
}

// Ajoute (ou retire, si négatif) un nombre de jours à une date
export function ajouterJours(date, nombre) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + nombre);
}

// Nombre de jours entre deux dates (positif si "b" est après "a").
// On compte en jours du calendrier, sans tenir compte des heures.
export function joursEntre(a, b) {
  const UN_JOUR = 24 * 60 * 60 * 1000;
  return Math.round((b - a) / UN_JOUR);
}

// "Jeu 09" pour le jeudi 9
export function jourCourt(date) {
  return JOURS_COURTS[date.getDay()] + " " + String(date.getDate()).padStart(2, "0");
}

// "Novembre" pour une date de novembre
export function nomDuMois(date) {
  return MOIS[date.getMonth()];
}

// Ajouté pour afficher une date complète dans la fenêtre de détails : "jeudi 5 novembre 2026"
const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function dateLongue(date) {
  return (
    JOURS_LONGS[date.getDay()] + " " + date.getDate() + " " + MOIS[date.getMonth()].toLowerCase() + " " + date.getFullYear()
  );
}
