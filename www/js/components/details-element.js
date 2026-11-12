// Fenêtre "Détails" d'un devoir ou d'un évènement (titre, date, description, rappels prévus),
// avec un bouton pour le supprimer (on peut annuler la suppression).

import { ouvrirPopup } from "./popup.js";
import { afficherMessage } from "./notification.js";
import { lireElement, supprimerElement, restaurerElement } from "../data/elements.js";
import { calculerRappels } from "../logic/rappels.js";
import { lireDate, jourCourt, dateLongue } from "../logic/dates.js";
import { heureDepuisDate, texteHoraire } from "./outils.js";

const NB_RAPPELS_AFFICHES = 5;

function ligne(libelle, contenu) {
  const bloc = document.createElement("div");
  bloc.className = "details-ligne";

  const titre = document.createElement("dt");
  titre.textContent = libelle;

  const valeur = document.createElement("dd");
  if (typeof contenu === "string") {
    valeur.textContent = contenu; // textContent : le texte saisi ne peut pas être pris pour du HTML
  } else {
    valeur.append(contenu);
  }

  bloc.append(titre, valeur);
  return bloc;
}

//Ajouté pour n'ouvrir que des liens sécurisés (https) : un lien d'un autre type n'est pas affiché comme lien
function creerLien(url, texte) {
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch (erreur) {
    return null;
  }
  const lien = document.createElement("a");
  lien.href = url;
  lien.target = "_blank";
  lien.rel = "noopener noreferrer";
  lien.textContent = texte;
  return lien;
}

//Ajouté pour afficher la liste des pièces jointes d'un devoir Classroom
function creerListePiecesJointes(materiaux) {
  const liste = document.createElement("ul");
  liste.className = "details-pieces";

  materiaux.forEach((piece) => {
    const item = document.createElement("li");
    item.append(piece.type + " : ");
    const lien = piece.lien ? creerLien(piece.lien, piece.titre) : null;
    item.append(lien || piece.titre);
    liste.append(item);
  });
  return liste;
}

function creerListeRappels(element) {
  const maintenant = new Date();
  const aVenir = calculerRappels(element).filter((rappel) => rappel >= maintenant);

  if (aVenir.length === 0) {
    return "Aucun rappel prévu";
  }

  const liste = document.createElement("ul");
  liste.className = "details-rappels";

  aVenir.slice(0, NB_RAPPELS_AFFICHES).forEach((rappel) => {
    const item = document.createElement("li");
    item.textContent = jourCourt(rappel) + " à " + heureDepuisDate(rappel);
    liste.append(item);
  });

  if (aVenir.length > NB_RAPPELS_AFFICHES) {
    const reste = document.createElement("li");
    reste.textContent = "et " + (aVenir.length - NB_RAPPELS_AFFICHES) + " autres";
    liste.append(reste);
  }
  return liste;
}

export function ouvrirDetails(element) {
  const conteneur = document.createElement("div");
  conteneur.className = "details-element";

  const entete = document.createElement("header");
  entete.className = "formulaire-entete";

  const titre = document.createElement("h2");
  titre.className = "formulaire-titre";
  titre.textContent = element.titre;

  const boutonFermer = document.createElement("button");
  boutonFermer.type = "button";
  boutonFermer.className = "bouton-fermer";
  boutonFermer.textContent = "Fermer";

  entete.append(titre, boutonFermer);

  const origine = element.source === "classroom" ? "Google Classroom" : "ajouté à la main";
  const type = document.createElement("p");
  type.className = "details-type";
  //supprimé pour indiquer aussi si le devoir est déjà rendu : type.textContent = (element.type === "devoir" ? "Devoir" : "Évènement") + " · " + origine;
  type.textContent = (element.type === "devoir" ? "Devoir" : "Évènement") + " · " + origine + (element.rendu ? " · rendu" : ""); //modifié pour indiquer si le devoir est rendu

  const liste = document.createElement("dl");
  liste.className = "details-liste";

  const libelleDate = element.type === "devoir" ? "Date limite" : "Date";
  liste.append(ligne(libelleDate, dateLongue(lireDate(element.date)) + ", " + texteHoraire(element)));
  //Ajouté pour les devoirs venant de Classroom : le cours et les points
  if (element.cours) {
    liste.append(ligne("Cours", element.cours));
  }
  if (element.points !== undefined && element.points !== null) {
    liste.append(ligne("Points", String(element.points)));
  }
  if (element.description) {
    liste.append(ligne("Description", element.description));
  }
  //Ajouté pour afficher les pièces jointes et le lien vers le devoir dans Classroom
  if (element.materiaux && element.materiaux.length > 0) {
    liste.append(ligne("Pièces jointes", creerListePiecesJointes(element.materiaux)));
  }
  const lienClassroom = element.lien ? creerLien(element.lien, "Ouvrir dans Google Classroom") : null;
  if (lienClassroom) {
    liste.append(ligne("Lien", lienClassroom));
  }
  liste.append(ligne("Rappels prévus", creerListeRappels(element)));

  const boutonSupprimer = document.createElement("button");
  boutonSupprimer.type = "button";
  boutonSupprimer.className = "bouton-supprimer-element";
  boutonSupprimer.textContent = "Supprimer";

  conteneur.append(entete, type, liste, boutonSupprimer);

  const popup = ouvrirPopup(conteneur);
  boutonFermer.addEventListener("click", () => popup.fermer());

  boutonSupprimer.addEventListener("click", async () => {
    try {
      await supprimerElement(element.id);
      popup.fermer();
      afficherMessage("Supprimé", {
        actionTexte: "Annuler",
        onAction: () => restaurerElement(element.id),
      });
    } catch (erreur) {
      console.error(erreur);
      afficherMessage("Impossible de supprimer.");
    }
  });
}

// Un seul écouteur sur un conteneur : un clic sur un bouton "Détails" ou sur un bloc du calendrier
// ouvre la fenêtre de détails de l'élément (identifié par data-id).
export function activerBoutonsDetails(conteneur) {
  conteneur.addEventListener("click", async (evenement) => {
    const bouton = evenement.target.closest(".bouton-details, .bloc-element");
    if (!bouton) return;

    try {
      const element = await lireElement(bouton.dataset.id);
      if (element && !element.supprime) ouvrirDetails(element);
    } catch (erreur) {
      console.error(erreur);
    }
  });
}
