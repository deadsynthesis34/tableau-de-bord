// Gère le changement de page avec la barre latérale.
// La page affichée est mémorisée dans l'adresse (#accueil, #depenses...),
// donc recharger la page ou revenir en arrière garde la bonne page.

//supprimé pour ajouter la page Paramètres : const pagesValides = ["accueil", "calendrier", "depenses", "ia"];
const pagesValides = ["accueil", "calendrier", "depenses", "ia", "parametres"]; //modifié pour ajouter la page Paramètres

const boutons = document.querySelectorAll(".menu-bouton");
const sections = document.querySelectorAll(".page");

function afficherPage(nom) {
  // Si le nom n'est pas valide (ou vide), on affiche l'accueil
  if (!pagesValides.includes(nom)) {
    nom = "accueil";
  }

  // On montre seulement la section demandée
  sections.forEach((section) => {
    section.hidden = section.id !== "page-" + nom;
  });

  // On met en avant le bouton de la page active
  boutons.forEach((bouton) => {
    const estActif = bouton.dataset.page === nom;
    bouton.classList.toggle("actif", estActif);
    if (estActif) {
      bouton.setAttribute("aria-current", "page");
    } else {
      bouton.removeAttribute("aria-current");
    }
  });
}

export function initNavigation() {
  // Un clic sur un bouton change l'adresse (#...), ce qui déclenche "hashchange"
  boutons.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      location.hash = bouton.dataset.page;
    });
  });

  window.addEventListener("hashchange", () => {
    afficherPage(location.hash.slice(1));
  });

  // Affichage au démarrage
  afficherPage(location.hash.slice(1));
}
