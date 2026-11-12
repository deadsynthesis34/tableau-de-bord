// Graphique en barres dessiné avec de simples éléments HTML (pas de bibliothèque).
// Il servira sur l'Accueil et sur la page Dépenses.

import { formaterMontant } from "./outils.js";

const MULTIPLES_POSSIBLES = [1, 2, 2.5, 5];

// Choisit une échelle "ronde" avec 4 graduations (ex : 0, 5K, 10K, 15K, 20K)
function calculerEchelle(valeurMax) {
  const cible = Math.max(valeurMax, 1000) / 4;
  const puissance = 10 ** Math.floor(Math.log10(cible));

  let pas = puissance * 10;
  for (const multiple of MULTIPLES_POSSIBLES) {
    if (puissance * multiple >= cible) {
      pas = puissance * multiple;
      break;
    }
  }
  return { pas, max: pas * 4 };
}

// 7500 -> "7,5K" ; 500 -> "500"
function formaterGraduation(valeur) {
  if (valeur >= 1000) {
    return String(Math.round(valeur / 10) / 100).replace(".", ",") + "K";
  }
  return String(valeur);
}

//supprimé pour pouvoir donner des descriptions plus complètes que les étiquettes : export function creerGraphiqueBarres(valeurs, etiquettes) {
export function creerGraphiqueBarres(valeurs, etiquettes, descriptions = etiquettes) { //modifié pour accepter des descriptions (par défaut, les étiquettes)
  const { pas, max } = calculerEchelle(Math.max(...valeurs, 0));

  const graphique = document.createElement("div");
  graphique.className = "graphique";
  graphique.setAttribute("role", "img");
  graphique.setAttribute(
    "aria-label",
    //supprimé pour utiliser les descriptions : "Dépenses : " + etiquettes.map((e, i) => e + " " + formaterMontant(valeurs[i])).join(", ")
    "Dépenses : " + descriptions.map((e, i) => e + " " + formaterMontant(valeurs[i])).join(", ") //modifié pour utiliser les descriptions
  );

  const axe = document.createElement("div");
  axe.className = "graphique-axe";

  const zone = document.createElement("div");
  zone.className = "graphique-zone";

  // Lignes horizontales et chiffres de l'axe (de 0 % à 100 % de la hauteur)
  for (let i = 0; i <= 4; i++) {
    const pourcentage = i * 25;

    const ligne = document.createElement("div");
    ligne.className = "graphique-ligne";
    ligne.style.bottom = pourcentage + "%";
    zone.append(ligne);

    const graduation = document.createElement("span");
    graduation.className = "graphique-valeur";
    graduation.style.bottom = pourcentage + "%";
    graduation.textContent = formaterGraduation(pas * i);
    axe.append(graduation);
  }

  // Une barre par valeur
  valeurs.forEach((valeur, index) => {
    const colonne = document.createElement("div");
    colonne.className = "graphique-colonne";

    const barre = document.createElement("div");
    barre.className = "graphique-barre";
    barre.style.height = (valeur / max) * 100 + "%";
    //supprimé pour utiliser les descriptions : barre.title = etiquettes[index] + " : " + formaterMontant(valeur);
    barre.title = descriptions[index] + " : " + formaterMontant(valeur); //modifié pour utiliser les descriptions

    colonne.append(barre);
    zone.append(colonne);
  });

  // Noms des jours sous les barres
  const pied = document.createElement("div");
  pied.className = "graphique-etiquettes";
  etiquettes.forEach((texte) => {
    const etiquette = document.createElement("span");
    etiquette.textContent = texte;
    pied.append(etiquette);
  });

  graphique.append(axe, zone, pied);
  return graphique;
}
