// Fenêtre popup basée sur l'élément HTML <dialog> :
// elle bloque le reste de la page, se ferme avec la touche Échap
// et garde le clavier à l'intérieur (c'est le navigateur qui s'en occupe).

export function ouvrirPopup(contenu) {
  const boite = document.createElement("dialog");
  boite.className = "popup";
  boite.append(contenu);
  document.body.append(boite);

  // Quand la popup se ferme, on la retire de la page
  boite.addEventListener("close", () => boite.remove());

  // Un clic sur le fond sombre (en dehors du contenu) ferme la popup
  boite.addEventListener("click", (evenement) => {
    if (evenement.target === boite) boite.close();
  });

  boite.showModal();

  return { fermer: () => boite.close() };
}
