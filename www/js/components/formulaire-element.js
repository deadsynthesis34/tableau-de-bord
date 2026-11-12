// Formulaire d'ajout d'un devoir ou d'un évènement (popup de la page Calendrier).

import { aujourdhui, versTexte } from "../logic/dates.js";

// onValider(donnees) : appelée avec { type, titre, description, date, limite } (devoir)
//                      ou { type, titre, description, date, debut, fin } (évènement)
// onAnnuler() : appelée quand on clique sur "Annuler"
export function creerFormulaireElement({ onValider, onAnnuler }) {
  const formulaire = document.createElement("form");
  formulaire.className = "formulaire-element";
  formulaire.noValidate = true; // on vérifie nous-mêmes, pour afficher nos messages

  const aujourdhuiTexte = versTexte(aujourdhui());

  formulaire.innerHTML = `
    <header class="formulaire-entete">
      <h2 class="formulaire-titre">Ajout</h2>
      <button class="bouton-annuler" type="button">Annuler</button>
    </header>

    <fieldset class="champ-motifs">
      <legend>Type</legend>
      <div class="liste-motifs">
        <label class="motif">
          <input type="radio" name="type" value="devoir" checked>
          <span>Devoir</span>
        </label>
        <label class="motif">
          <input type="radio" name="type" value="evenement">
          <span>Évènement</span>
        </label>
      </div>
    </fieldset>

    <label class="champ-texte">
      <span>Titre</span>
      <input name="titre" type="text" maxlength="80" autocomplete="off">
    </label>

    <label class="champ-texte">
      <span class="libelle-date">Date limite</span>
      <input name="date" type="date" value="${aujourdhuiTexte}" min="${aujourdhuiTexte}">
    </label>

    <div class="ligne-champs" data-champs="devoir">
      <label class="champ-texte">
        <span>Heure limite</span>
        <input name="limite" type="time" value="23:00">
      </label>
    </div>

    <div class="ligne-champs" data-champs="evenement" hidden>
      <label class="champ-texte">
        <span>Début</span>
        <input name="debut" type="time" value="08:00">
      </label>
      <label class="champ-texte">
        <span>Fin</span>
        <input name="fin" type="time" value="10:00">
      </label>
    </div>

    <label class="champ-texte">
      <span>Description (facultatif)</span>
      <textarea name="description" rows="3" maxlength="1000"></textarea>
    </label>

    <p class="formulaire-erreur" role="alert"></p>

    <button class="bouton-valider" type="submit">valider</button>`;

  const champs = formulaire.elements;
  const zoneErreur = formulaire.querySelector(".formulaire-erreur");
  const libelleDate = formulaire.querySelector(".libelle-date");
  const groupeDevoir = formulaire.querySelector('[data-champs="devoir"]');
  const groupeEvenement = formulaire.querySelector('[data-champs="evenement"]');

  function typeChoisi() {
    return formulaire.querySelector('input[name="type"]:checked').value;
  }

  // Devoir : date et heure limite. Évènement : date, début et fin.
  formulaire.addEventListener("change", (evenement) => {
    if (evenement.target.name !== "type") return;
    const estDevoir = typeChoisi() === "devoir";
    groupeDevoir.hidden = !estDevoir;
    groupeEvenement.hidden = estDevoir;
    libelleDate.textContent = estDevoir ? "Date limite" : "Date";
  });

  formulaire.querySelector(".bouton-annuler").addEventListener("click", () => {
    if (onAnnuler) onAnnuler();
  });

  function afficherErreur(message, champ) {
    zoneErreur.textContent = message;
    if (champ) champ.focus();
  }

  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    zoneErreur.textContent = "";

    const type = typeChoisi();
    const titre = champs.titre.value.trim();
    const date = champs.date.value;

    if (!titre) return afficherErreur("Entre un titre.", champs.titre);
    if (!date || date < aujourdhuiTexte) {
      return afficherErreur("Choisis une date d'aujourd'hui ou plus tard.", champs.date);
    }

    const donnees = { type, titre, description: champs.description.value.trim(), date };

    if (type === "devoir") {
      if (!champs.limite.value) return afficherErreur("Choisis une heure limite.", champs.limite);
      donnees.limite = champs.limite.value;
    } else {
      if (!champs.debut.value || !champs.fin.value) {
        return afficherErreur("Choisis l'heure de début et l'heure de fin.", champs.debut);
      }
      if (champs.fin.value <= champs.debut.value) {
        return afficherErreur("L'heure de fin doit être après le début.", champs.fin);
      }
      donnees.debut = champs.debut.value;
      donnees.fin = champs.fin.value;
    }

    try {
      await onValider(donnees);
    } catch (erreur) {
      console.error(erreur);
      zoneErreur.textContent = "Impossible d'enregistrer. Réessaie.";
    }
  });

  return formulaire;
}
