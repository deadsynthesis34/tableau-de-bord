// Calculs sur les dépenses : périodes (semaine, mois, année), totaux, variation, données du graphique.

import { aujourdhui, ajouterJours, versTexte, lireDate } from "./dates.js";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

// La période (semaine du lundi au dimanche, mois ou année) qui contient la date de référence
export function periodeCourante(type, reference = aujourdhui()) {
  if (type === "semaine") {
    const decalage = (reference.getDay() + 6) % 7; // 0 = lundi
    const debut = ajouterJours(reference, -decalage);
    return { debut, fin: ajouterJours(debut, 6) };
  }
  if (type === "mois") {
    return {
      debut: new Date(reference.getFullYear(), reference.getMonth(), 1),
      fin: new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
    };
  }
  return {
    debut: new Date(reference.getFullYear(), 0, 1),
    fin: new Date(reference.getFullYear(), 11, 31),
  };
}

// La période juste avant (semaine précédente, mois précédent, année précédente)
export function periodePrecedente(type, reference = aujourdhui()) {
  if (type === "semaine") {
    return periodeCourante("semaine", ajouterJours(reference, -7));
  }
  if (type === "mois") {
    return periodeCourante("mois", new Date(reference.getFullYear(), reference.getMonth() - 1, 1));
  }
  return periodeCourante("annee", new Date(reference.getFullYear() - 1, 0, 1));
}

// Les dépenses dont la date est dans la période (bornes comprises)
export function depensesDansPeriode(depenses, periode) {
  const debut = versTexte(periode.debut);
  const fin = versTexte(periode.fin);
  return depenses.filter((d) => d.date >= debut && d.date <= fin);
}

export function total(depenses) {
  return depenses.reduce((somme, d) => somme + d.montant, 0);
}

// Variation en % par rapport à la période précédente (null s'il n'y a rien à comparer)
export function variationPourcent(actuel, precedent) {
  if (precedent <= 0) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

// Données du graphique : { valeurs, etiquettes, descriptions }
//   semaine -> 7 barres (un jour chacune)
//   mois    -> une barre par jour du mois
//   annee   -> 12 barres (un mois chacune)
export function donneesGraphique(depenses, type, reference = aujourdhui()) {
  const periode = periodeCourante(type, reference);
  const dansPeriode = depensesDansPeriode(depenses, periode);

  if (type === "semaine") {
    const valeurs = new Array(7).fill(0);
    dansPeriode.forEach((d) => {
      valeurs[(lireDate(d.date).getDay() + 6) % 7] += d.montant;
    });
    return { valeurs, etiquettes: JOURS_SEMAINE, descriptions: JOURS_SEMAINE };
  }

  if (type === "mois") {
    const nombreDeJours = periode.fin.getDate();
    const valeurs = new Array(nombreDeJours).fill(0);
    dansPeriode.forEach((d) => {
      valeurs[lireDate(d.date).getDate() - 1] += d.montant;
    });
    // Seuls quelques numéros sont écrits sous les barres, pour que ce reste lisible
    const NUMEROS_AFFICHES = [1, 5, 10, 15, 20, 25, 30];
    const etiquettes = valeurs.map((_, i) => (NUMEROS_AFFICHES.includes(i + 1) ? String(i + 1) : ""));
    const descriptions = valeurs.map((_, i) => "Jour " + (i + 1));
    return { valeurs, etiquettes, descriptions };
  }

  const valeurs = new Array(12).fill(0);
  dansPeriode.forEach((d) => {
    valeurs[lireDate(d.date).getMonth()] += d.montant;
  });
  return { valeurs, etiquettes: MOIS_COURTS, descriptions: MOIS_COURTS };
}
