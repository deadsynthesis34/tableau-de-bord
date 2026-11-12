// Onglets accessibles : clic, et flèches gauche/droite au clavier.
// liste : l'élément qui contient les boutons (role="tab", avec data-onglet="nom")
// options.panneaux : conteneur de panneaux (data-panneau="nom") à afficher/masquer (facultatif)
// options.onChange(nom) : appelée quand l'onglet change (facultatif)

export function activerOnglets(liste, { panneaux, onChange } = {}) {
  const onglets = [...liste.querySelectorAll('[role="tab"]')];

  function choisir(onglet, deplacerFocus) {
    onglets.forEach((o) => {
      const actif = o === onglet;
      o.setAttribute("aria-selected", String(actif));
      o.tabIndex = actif ? 0 : -1;
    });

    if (panneaux) {
      panneaux.querySelectorAll("[data-panneau]").forEach((panneau) => {
        panneau.hidden = panneau.dataset.panneau !== onglet.dataset.onglet;
      });
    }

    if (deplacerFocus) onglet.focus();
    if (onChange) onChange(onglet.dataset.onglet);
  }

  onglets.forEach((onglet, index) => {
    onglet.addEventListener("click", () => choisir(onglet, false));

    onglet.addEventListener("keydown", (evenement) => {
      if (evenement.key !== "ArrowRight" && evenement.key !== "ArrowLeft") return;
      evenement.preventDefault();
      const decalage = evenement.key === "ArrowRight" ? 1 : onglets.length - 1;
      choisir(onglets[(index + decalage) % onglets.length], true);
    });
  });
}
