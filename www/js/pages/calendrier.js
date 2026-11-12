// Page Calendrier : onglet "Calendrier" (vue du mois) et onglet "Évènements"
// (tâches classées Importants / à voir / à mettre de côté), avec le bouton + pour ajouter.

import { listerElements, ajouterElement } from "../data/elements.js";
import { aujourdhui, lireDate, versTexte, ajouterJours, joursEntre, jourCourt, nomDuMois } from "../logic/dates.js";
import { classerParCategorie, trierParDate } from "../logic/classement.js";
import { activerOnglets } from "../components/onglets.js";
import { activerBoutonsDetails } from "../components/details-element.js";
import { creerFormulaireElement } from "../components/formulaire-element.js";
import { ouvrirPopup } from "../components/popup.js";
import { htmlCloche } from "../components/cloche.js";
import { echapperHtml, texteHoraire } from "../components/outils.js";

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

let moisAffiche = debutDuMois(aujourdhui()); // premier jour du mois affiché
let categorieChoisie = "important";

function debutDuMois(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function elementPage(id) {
  return document.getElementById(id);
}

export function initCalendrier() {
  const conteneur = elementPage("calendrier-contenu");

  conteneur.innerHTML = `
    <div class="calendrier">
      <div class="calendrier-onglets" role="tablist" aria-label="Sections du calendrier">
        <button class="onglet-haut" role="tab" id="onglet-calendrier" data-onglet="calendrier"
          aria-controls="panneau-calendrier" aria-selected="true">Calendrier</button>
        <button class="onglet-haut" role="tab" id="onglet-evenements" data-onglet="evenements"
          aria-controls="panneau-evenements" aria-selected="false" tabindex="-1">Évènements</button>
      </div>

      <div class="calendrier-panneaux">
        <div id="panneau-calendrier" role="tabpanel" aria-labelledby="onglet-calendrier" data-panneau="calendrier">
          <div class="calendrier-entete">
            <h2 class="calendrier-mois" id="titre-mois" aria-live="polite"></h2>
            <div class="calendrier-commandes">
              <button class="bouton-commande" id="mois-precedent" type="button" aria-label="Mois précédent">&lt;</button>
              <button class="bouton-commande bouton-texte" id="mois-aujourdhui" type="button">Aujourd'hui</button>
              <button class="bouton-commande" id="mois-suivant" type="button" aria-label="Mois suivant">&gt;</button>
              <button class="bouton-commande bouton-texte bouton-principal" id="bouton-ajouter-calendrier" type="button">+ Ajouter</button>
            </div>
          </div>
          <p class="calendrier-erreur" id="calendrier-erreur" role="alert" hidden></p>
          <div class="calendrier-defilement">
            <div class="calendrier-grille" id="grille-mois"></div>
          </div>
        </div>

        <div id="panneau-evenements" role="tabpanel" aria-labelledby="onglet-evenements" data-panneau="evenements" hidden>
          <h2 class="evenements-titre">Tâches</h2>
          <div class="sous-onglets" role="tablist" aria-label="Urgence des tâches">
            <button class="sous-onglet" role="tab" data-onglet="important" aria-controls="liste-evenements" aria-selected="true">Importants</button>
            <button class="sous-onglet" role="tab" data-onglet="a-voir" aria-controls="liste-evenements" aria-selected="false" tabindex="-1">à voir</button>
            <button class="sous-onglet" role="tab" data-onglet="de-cote" aria-controls="liste-evenements" aria-selected="false" tabindex="-1">à mettre de côté</button>
          </div>
          <ul class="liste-evenements" id="liste-evenements"></ul>
          <div class="zone-ajout">
            <button class="bouton-ajout-grand" id="bouton-ajouter-evenement" type="button" aria-label="Ajouter un devoir ou un évènement">+</button>
          </div>
        </div>
      </div>
    </div>`;

  // Onglets du haut (Calendrier / Évènements) et sous-onglets (Importants / à voir / à mettre de côté)
  activerOnglets(conteneur.querySelector(".calendrier-onglets"), { panneaux: conteneur.querySelector(".calendrier-panneaux") });
  activerOnglets(conteneur.querySelector(".sous-onglets"), {
    onChange: (nom) => {
      categorieChoisie = nom;
      rafraichirCalendrier();
    },
  });

  // Navigation entre les mois
  elementPage("mois-precedent").addEventListener("click", () => {
    moisAffiche = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1);
    rafraichirCalendrier();
  });
  elementPage("mois-suivant").addEventListener("click", () => {
    moisAffiche = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1);
    rafraichirCalendrier();
  });
  elementPage("mois-aujourdhui").addEventListener("click", () => {
    moisAffiche = debutDuMois(aujourdhui());
    rafraichirCalendrier();
  });

  // Boutons d'ajout
  elementPage("bouton-ajouter-calendrier").addEventListener("click", ouvrirAjout);
  elementPage("bouton-ajouter-evenement").addEventListener("click", ouvrirAjout);

  // Clic sur "Détails" ou sur un bloc du calendrier : ouvre la fenêtre de détails
  activerBoutonsDetails(conteneur);

  // Mise à jour quand un élément change (ajout, suppression, annulation)
  window.addEventListener("donnees-modifiees", rafraichirCalendrier);

  return rafraichirCalendrier();
}

function ouvrirAjout() {
  let popup;
  const formulaire = creerFormulaireElement({
    onValider: async (donnees) => {
      await ajouterElement(donnees);
      popup.fermer();
    },
    onAnnuler: () => popup.fermer(),
  });
  popup = ouvrirPopup(formulaire);
  formulaire.elements.titre.focus();
}

// ---------- Vue du mois ----------
function creerGrilleMois(elements) {
  const aujourd = versTexte(aujourdhui());
  const annee = moisAffiche.getFullYear();
  const mois = moisAffiche.getMonth();

  // La grille commence le lundi de la première semaine et finit le dimanche de la dernière
  const dernierJour = new Date(annee, mois + 1, 0);
  const debutGrille = ajouterJours(moisAffiche, -((moisAffiche.getDay() + 6) % 7));
  const finGrille = ajouterJours(dernierJour, 6 - ((dernierJour.getDay() + 6) % 7));
  const nombreDeJours = joursEntre(debutGrille, finGrille) + 1;

  const parDate = {};
  trierParDate(elements).forEach((element) => {
    (parDate[element.date] = parDate[element.date] || []).push(element);
  });

  let html = JOURS_SEMAINE.map((nom) => `<span class="calendrier-jour-nom">${nom}</span>`).join("");

  for (let i = 0; i < nombreDeJours; i++) {
    const jour = ajouterJours(debutGrille, i);
    const texte = versTexte(jour);
    const classes = ["calendrier-cellule"];
    if (jour.getMonth() !== mois) classes.push("hors-mois");
    if (texte === aujourd) classes.push("aujourdhui");

    const blocs = (parDate[texte] || [])
      //modifié pour barrer les devoirs déjà rendus (classe "fait") et le dire aux lecteurs d'écran
      .map(
        (e) => `
          <button class="bloc-element${e.rendu ? " fait" : ""}" type="button" data-id="${echapperHtml(e.id)}"
            aria-label="${echapperHtml(e.titre)}, ${texteHoraire(e)}${e.rendu ? ", rendu" : ""}">
            <span class="bloc-titre">${echapperHtml(e.titre)}</span>
            <span class="bloc-horaire">${texteHoraire(e)}</span>
          </button>`
      )
      .join("");

    html += `
      <div class="${classes.join(" ")}">
        <span class="jour-numero">${jour.getDate()}</span>
        ${blocs}
      </div>`;
  }
  return html;
}

// ---------- Liste de l'onglet Évènements ----------
function htmlCarteEvenement(element) {
  return `
    <li class="carte-evenement">
      <div class="evenement-date">
        <span class="element-jour">${jourCourt(lireDate(element.date))}</span>
        <span class="element-horaire">${texteHoraire(element)}</span>
      </div>
      <div class="evenement-corps">
        <span class="element-titre">${echapperHtml(element.titre)}</span>
        <button class="bouton-details" type="button" data-id="${echapperHtml(element.id)}">Détails</button>
      </div>
      ${htmlCloche(element)}
    </li>`;
}

export async function rafraichirCalendrier() {
  const zoneErreur = elementPage("calendrier-erreur");

  let elements;
  try {
    elements = await listerElements();
    zoneErreur.hidden = true;
  } catch (erreur) {
    console.error(erreur);
    zoneErreur.textContent = "Le stockage du navigateur n'est pas disponible : les éléments ne peuvent pas être lus.";
    zoneErreur.hidden = false;
    return;
  }

  // Vue du mois
  elementPage("titre-mois").textContent = nomDuMois(moisAffiche) + " " + moisAffiche.getFullYear();
  elementPage("grille-mois").innerHTML = creerGrilleMois(elements);

  // Liste de la catégorie choisie
  const groupes = classerParCategorie(elements);
  const liste = groupes[categorieChoisie];
  elementPage("liste-evenements").innerHTML = liste.length
    ? liste.map(htmlCarteEvenement).join("")
    : `<li class="evenements-vide">Rien pour le moment.</li>`;
}
