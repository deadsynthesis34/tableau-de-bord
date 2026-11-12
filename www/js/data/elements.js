// Lecture et écriture des devoirs et évènements dans la base locale.
// Un élément : { id, type ("devoir" ou "evenement"), source ("manuel" ou "classroom"),
//                titre, description, date "AAAA-MM-JJ",
//                limite "HH:MM" (devoir) ou debut/fin "HH:MM" (évènement),
//                creeLe, modifieLe, supprime }
// Comme pour les dépenses, un élément supprimé est seulement marqué "supprime".

import { lireTout, lireUn, ecrire, creerId } from "./db.js";

const MAGASIN = "elements";

// Prévient les pages (Accueil, Calendrier) qu'il faut se mettre à jour
function prevenir() {
  window.dispatchEvent(new window.CustomEvent("donnees-modifiees", { detail: { type: "elements" } }));
}

// Tous les éléments non supprimés
export async function listerElements() {
  const tous = await lireTout(MAGASIN);
  return tous.filter((element) => !element.supprime);
}

export function lireElement(id) {
  return lireUn(MAGASIN, id);
}

// donnees : { type, titre, description, date, limite } ou { type, titre, description, date, debut, fin }
export async function ajouterElement(donnees) {
  const maintenant = Date.now();
  const element = {
    id: creerId(),
    type: donnees.type,
    source: "manuel",
    titre: donnees.titre,
    description: donnees.description || "",
    date: donnees.date,
    creeLe: maintenant,
    modifieLe: maintenant,
    supprime: false,
  };

  if (donnees.type === "devoir") {
    element.limite = donnees.limite;
  } else {
    element.debut = donnees.debut;
    element.fin = donnees.fin;
  }

  await ecrire(MAGASIN, element);
  prevenir();
  return element;
}

async function changerEtat(id, supprime) {
  const element = await lireUn(MAGASIN, id);
  if (!element) return;
  element.supprime = supprime;
  element.modifieLe = Date.now();
  await ecrire(MAGASIN, element);
  prevenir();
}

export function supprimerElement(id) {
  return changerEtat(id, true);
}

export function restaurerElement(id) {
  return changerEtat(id, false);
}

// Ajouté pour enregistrer les devoirs reçus de Google Classroom :
//  - un devoir nouveau est ajouté, un devoir connu est mis à jour ;
//  - un devoir que tu as supprimé toi-même reste supprimé ;
//  - un devoir qui n'existe plus dans Classroom est retiré (marqué supprimé et "retire") ;
//  - un devoir retiré qui réapparaît dans Classroom revient (c'est le cas d'un devoir republié).
export async function appliquerSynchroClassroom(recus) {
  const existants = await lireTout(MAGASIN);
  const parId = new Map(existants.map((element) => [element.id, element]));
  const idsRecus = new Set(recus.map((element) => element.id));

  let ajoutes = 0;
  let misAJour = 0;
  let retires = 0;

  for (const recu of recus) {
    const ancien = parId.get(recu.id);

    if (!ancien) {
      await ecrire(MAGASIN, recu);
      ajoutes++;
      continue;
    }

    // "retire" = retiré par la synchronisation (et non supprimé par toi) : il revient s'il réapparaît
    const fusion = { ...ancien, ...recu, supprime: ancien.retire ? false : ancien.supprime, modifieLe: ancien.modifieLe };
    delete fusion.retire;

    if (ancien.retire) {
      fusion.modifieLe = Date.now();
      await ecrire(MAGASIN, fusion);
      ajoutes++;
    } else if (JSON.stringify(fusion) !== JSON.stringify(ancien)) {
      fusion.modifieLe = Date.now();
      await ecrire(MAGASIN, fusion);
      misAJour++;
    }
  }

  for (const ancien of existants) {
    if (ancien.source === "classroom" && !idsRecus.has(ancien.id) && !ancien.supprime) {
      ancien.supprime = true;
      ancien.retire = true;
      ancien.modifieLe = Date.now();
      await ecrire(MAGASIN, ancien);
      retires++;
    }
  }

  if (ajoutes || misAJour || retires) prevenir();
  return { ajoutes, misAJour, retires };
}
