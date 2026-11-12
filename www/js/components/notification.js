// Petit message qui apparaît en bas de l'écran puis disparaît tout seul.
// Peut contenir un bouton d'action (par exemple "Annuler").

let zone = null;

function obtenirZone() {
  if (!zone) {
    zone = document.createElement("div");
    zone.className = "zone-toasts";
    zone.setAttribute("aria-live", "polite"); // lu par les lecteurs d'écran
    document.body.append(zone);
  }
  return zone;
}

export function afficherMessage(texte, { actionTexte, onAction, duree = 6000 } = {}) {
  const message = document.createElement("div");
  message.className = "toast";

  const contenu = document.createElement("span");
  contenu.textContent = texte;
  message.append(contenu);

  const retirer = () => message.remove();

  if (actionTexte) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = actionTexte;
    bouton.addEventListener("click", () => {
      if (onAction) onAction();
      retirer();
    });
    message.append(bouton);
  }

  obtenirZone().append(message);
  setTimeout(retirer, duree);
}
