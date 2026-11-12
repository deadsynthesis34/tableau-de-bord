// Page Accueil : bouton Synchroniser, dépenses de la semaine,
// calendrier + éléments à venir, et tâches classées par urgence.

//supprimé pour ne plus utiliser les dépenses d'exemple : import { obtenirElementsExemple, obtenirDepensesSemaineExemple } from "../data/exemples.js";
//supprimé pour utiliser les vrais devoirs et évènements : import { obtenirElementsExemple } from "../data/exemples.js";
import { listerElements } from "../data/elements.js"; //Ajouté pour lire les vrais devoirs et évènements
import { activerBoutonsDetails } from "../components/details-element.js"; //Ajouté pour ouvrir les détails avec le bouton "Détails"
import { htmlCloche } from "../components/cloche.js"; //Ajouté pour afficher la cloche avec le vrai prochain rappel
import { listerDepenses } from "../data/depenses.js"; //Ajouté pour lire les vraies dépenses
import { donneesGraphique } from "../logic/statistiques.js"; //Ajouté pour calculer les barres de la semaine
//supprimé pour avoir aussi joursEntre (état de la synchronisation) : import { aujourdhui, lireDate, versTexte, jourCourt, nomDuMois } from "../logic/dates.js";
import { aujourdhui, lireDate, versTexte, jourCourt, nomDuMois, joursEntre } from "../logic/dates.js"; //modifié pour ajouter joursEntre
import { categorieDe, classerParCategorie, trierParDate } from "../logic/classement.js";
import { creerGraphiqueBarres } from "../components/graphique.js";
//supprimé pour utiliser aussi texteHoraire, maintenant partagé : import { echapperHtml } from "../components/outils.js";
//supprimé pour avoir aussi heureDepuisDate (état de la synchronisation) : import { echapperHtml, texteHoraire } from "../components/outils.js";
import { echapperHtml, texteHoraire, heureDepuisDate } from "../components/outils.js"; //modifié pour ajouter heureDepuisDate
import { synchroniserClassroom, lireDerniereSynchro, messageErreurSynchro } from "../data/synchro.js"; //Ajouté pour le bouton Synchroniser
import { afficherMessage } from "../components/notification.js"; //Ajouté pour afficher le résultat de la synchronisation
//supprimé car la cloche est maintenant dans components/cloche.js : import { ICONE_CLOCHE, ICONE_ACTUALISER } from "../components/icones.js";
import { ICONE_ACTUALISER } from "../components/icones.js"; //modifié pour garder seulement l'icône Synchroniser

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const NB_ELEMENTS_A_VENIR = 4;

/* supprimé pour utiliser les versions partagées de components/outils.js :
// "14:00" -> "14h00"
function heureTexte(heure) {
  return heure.replace(":", "h");
}

// Texte de l'horaire : "08h00-10h00" pour un évènement, "avant 23h00" pour un devoir
function texteHoraire(element) {
  if (element.debut && element.fin) {
    return heureTexte(element.debut) + "-" + heureTexte(element.fin);
  }
  if (element.limite) {
    return "avant " + heureTexte(element.limite);
  }
  return "";
}
*/

// Une ligne de la liste "Devoir et évènement à venir"
function htmlElementAvenir(element) {
  return `
    <li class="element-avenir">
      <div class="element-date">
        <span class="element-jour">${jourCourt(lireDate(element.date))}</span>
        <span class="element-horaire">${texteHoraire(element)}</span>
      </div>
      <div class="element-texte">
        <span class="element-titre">${echapperHtml(element.titre)}</span>
        <button class="bouton-details" type="button" data-id="${echapperHtml(element.id)}">Détails</button>
      </div>
      <!-- supprimé : ancien bloc de la cloche, qui affichait une heure fixe d'exemple (element.rappel) -->
      <!-- modifié pour calculer la cloche avec les vraies règles de rappel -->
      ${htmlCloche(element)}
    </li>`;
}

// Une carte de la colonne "Tâche" (la couleur dépend de la catégorie)
function htmlTache(element, categorie) {
  return `
    <li class="tache tache-${categorie}">
      <span class="tache-date">${jourCourt(lireDate(element.date))} · ${texteHoraire(element)}</span>
      <span class="tache-titre">${echapperHtml(element.titre)}</span>
      <button class="bouton-details" type="button" data-id="${echapperHtml(element.id)}">Détails</button>
    </li>`;
}

// Un groupe de la colonne "Tâche" : Important, à voir ou à mettre de côté
function htmlGroupeTaches(titre, categorie, elements) {
  const contenu = elements.length
    ? elements.map((e) => htmlTache(e, categorie)).join("")
    : `<li class="groupe-vide">Rien pour le moment</li>`;

  return `
    <div class="groupe-taches">
      <h3 class="groupe-titre">${titre}</h3>
      <ul class="liste-taches">${contenu}</ul>
    </div>`;
}

// Petit calendrier du mois en cours : aujourd'hui en cyan, un point sous les jours avec un élément
function creerMiniCalendrier(elements) {
  const aujourd = aujourdhui();
  const annee = aujourd.getFullYear();
  const mois = aujourd.getMonth();

  const premierDuMois = new Date(annee, mois, 1);
  const nombreDeJours = new Date(annee, mois + 1, 0).getDate();
  const decalage = (premierDuMois.getDay() + 6) % 7; // 0 = le mois commence un lundi

  const compteParDate = {};
  elements.forEach((e) => {
    compteParDate[e.date] = (compteParDate[e.date] || 0) + 1;
  });

  const conteneur = document.createElement("div");
  conteneur.className = "mini-calendrier";
  conteneur.setAttribute("role", "group");
  conteneur.setAttribute("aria-label", nomDuMois(aujourd) + " " + annee);

  const titreMois = document.createElement("p");
  titreMois.className = "mini-calendrier-mois";
  titreMois.textContent = nomDuMois(aujourd) + " " + annee;
  conteneur.append(titreMois);

  const grille = document.createElement("div");
  grille.className = "mini-calendrier-grille";

  JOURS_SEMAINE.forEach((nom) => {
    const entete = document.createElement("span");
    entete.className = "mini-calendrier-jour-nom";
    entete.textContent = nom;
    grille.append(entete);
  });

  for (let i = 0; i < decalage; i++) {
    grille.append(document.createElement("span"));
  }

  for (let numero = 1; numero <= nombreDeJours; numero++) {
    const cellule = document.createElement("span");
    cellule.className = "mini-calendrier-jour";
    cellule.textContent = numero;

    const texteDate = versTexte(new Date(annee, mois, numero));
    if (texteDate === versTexte(aujourd)) {
      cellule.classList.add("aujourdhui");
    }
    if (compteParDate[texteDate]) {
      cellule.classList.add("avec-element");
      cellule.setAttribute("aria-label", numero + " : " + compteParDate[texteDate] + " élément(s)");
    }
    grille.append(cellule);
  }

  conteneur.append(grille);
  return conteneur;
}

//supprimé pour pouvoir attendre la lecture des dépenses : export function afficherAccueil() {
export async function afficherAccueil() { //modifié pour pouvoir attendre la lecture des dépenses
  const conteneur = document.getElementById("accueil-contenu");

  //supprimé pour lire les vrais éléments : const elements = obtenirElementsExemple(); (données d'exemple de js/data/exemples.js)
  //Ajouté pour lire les vrais devoirs et évènements (liste vide si la base est inaccessible)
  let elements = [];
  try {
    elements = await listerElements();
  } catch (erreur) {
    console.error(erreur);
  }
  //supprimé pour utiliser les vraies dépenses : const depenses = obtenirDepensesSemaineExemple();
  //Ajouté pour lire les vraies dépenses de la semaine (des zéros si la base est inaccessible)
  let depenses = [0, 0, 0, 0, 0, 0, 0];
  try {
    depenses = donneesGraphique(await listerDepenses(), "semaine").valeurs;
  } catch (erreur) {
    console.error(erreur);
  }

  const aVenir = trierParDate(elements)
    .filter((e) => categorieDe(e) !== null)
    .slice(0, NB_ELEMENTS_A_VENIR);
  const groupes = classerParCategorie(elements);

  conteneur.innerHTML = `
    <div class="accueil">
      <!-- Ajouté pour afficher l'état de la dernière synchronisation à côté du bouton -->
      <div class="synchro-ligne">
      <button class="bouton-synchro" type="button">
        <span>Synchroniser</span>
        ${ICONE_ACTUALISER}
      </button>
      <p class="synchro-etat" id="synchro-etat" aria-live="polite"></p>
      </div> <!-- Ajouté pour fermer le bloc synchro-ligne -->

      <div class="accueil-grille">
        <!-- Ajouté pour mettre dépenses et "à venir" côte à côte à la même hauteur -->
        <div class="accueil-gauche">
        <section class="carte carte-depenses" aria-labelledby="titre-depenses">
          <header class="carte-entete">
            <h2 class="carte-titre" id="titre-depenses">Dépense hebdo</h2>
            <a class="lien-details" href="#depenses">Détails »</a>
          </header>
          <div id="graphique-hebdo"></div>
        </section>

        <section class="carte carte-avenir" aria-labelledby="titre-avenir">
          <h2 class="carte-titre" id="titre-avenir">Devoir et évènement à venir</h2>
          <div id="mini-calendrier"></div>
          <ul class="liste-avenir">
            <!-- modifié pour afficher un message quand il n'y a rien à venir -->
            ${aVenir.length ? aVenir.map(htmlElementAvenir).join("") : '<li class="groupe-vide">Rien à venir pour le moment. Ajoute un devoir ou un évènement depuis le Calendrier.</li>'}
          </ul>
        </section>
        </div> <!-- Ajouté pour fermer le bloc accueil-gauche -->

        <section class="carte carte-taches" aria-labelledby="titre-taches">
          <h2 class="carte-titre" id="titre-taches">Tâche</h2>
          ${htmlGroupeTaches("Important", "important", groupes.important)}
          ${htmlGroupeTaches("à voir", "a-voir", groupes["a-voir"])}
          ${htmlGroupeTaches("à mettre de côté", "de-cote", groupes["de-cote"])}
        </section>
      </div>
    </div>`;

  // Les deux parties dessinées par du code sont ajoutées dans leurs emplacements
  document.getElementById("graphique-hebdo").append(creerGraphiqueBarres(depenses, JOURS_SEMAINE));
  document.getElementById("mini-calendrier").append(creerMiniCalendrier(elements));
  afficherEtatSynchro(); //Ajouté pour écrire la date de la dernière synchronisation
}

//Ajouté pour mettre à jour l'Accueil quand une dépense est ajoutée, supprimée ou restaurée
window.addEventListener("donnees-modifiees", () => {
  afficherAccueil();
});

//Ajouté pour que le bouton "Détails" des cartes de l'Accueil ouvre la fenêtre de détails
activerBoutonsDetails(document.getElementById("accueil-contenu"));

//Ajouté pour le bouton Synchroniser (synchronisation avec Google Classroom)
function texteDerniereSynchro(horodatage) {
  if (!horodatage) return "Pas encore synchronisé";

  const date = new Date(horodatage);
  const jour = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = joursEntre(jour, aujourdhui());
  const heure = heureDepuisDate(date);

  if (difference === 0) return "Dernière synchronisation : aujourd'hui à " + heure;
  if (difference === 1) return "Dernière synchronisation : hier à " + heure;
  return "Dernière synchronisation : " + jourCourt(jour) + " à " + heure;
}

async function afficherEtatSynchro() {
  const zone = document.getElementById("synchro-etat");
  if (!zone) return;
  try {
    zone.textContent = texteDerniereSynchro(await lireDerniereSynchro());
  } catch (erreur) {
    zone.textContent = "";
  }
}

function texteBilan(bilan) {
  const pluriel = (nombre) => (nombre > 1 ? "s" : "");
  const parties = [];
  if (bilan.ajoutes) parties.push(bilan.ajoutes + " ajouté" + pluriel(bilan.ajoutes));
  if (bilan.misAJour) parties.push(bilan.misAJour + " mis à jour");
  if (bilan.retires) parties.push(bilan.retires + " retiré" + pluriel(bilan.retires));

  let texte = parties.length ? "Classroom synchronisé : " + parties.join(", ") + "." : "Classroom est déjà à jour.";
  if (bilan.sansDate) {
    texte += " " + bilan.sansDate + " devoir" + pluriel(bilan.sansDate) + " sans date limite ignoré" + pluriel(bilan.sansDate) + ".";
  }
  return texte;
}

async function lancerSynchro() {
  const bouton = document.querySelector(".bouton-synchro");
  if (!bouton || bouton.disabled) return;

  bouton.disabled = true;
  bouton.classList.add("en-cours");

  try {
    afficherMessage(texteBilan(await synchroniserClassroom()), { duree: 8000 });
  } catch (erreur) {
    console.error(erreur);
    afficherMessage(messageErreurSynchro(erreur), { duree: 10000 });
  } finally {
    // L'Accueil a peut-être été redessiné pendant la synchronisation : on reprend le bouton actuel
    const actuel = document.querySelector(".bouton-synchro");
    if (actuel) {
      actuel.disabled = false;
      actuel.classList.remove("en-cours");
    }
    afficherEtatSynchro();
  }
}

document.getElementById("accueil-contenu").addEventListener("click", (evenement) => {
  if (evenement.target.closest(".bouton-synchro")) lancerSynchro();
});
