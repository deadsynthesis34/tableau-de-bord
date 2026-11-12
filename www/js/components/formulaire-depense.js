// Formulaire d'ajout d'une dépense (montant + motif).
// Il est utilisé dans la popup de la page Dépenses,
// et servira aussi dans l'onglet IA pour la question du soir.

import { MOTIFS } from "../data/depenses.js";
import { aujourdhui, versTexte, jourCourt } from "../logic/dates.js";
import { echapperHtml } from "./outils.js";

// onValider({ montant, motif, date }) : appelée avec les valeurs saisies (peut être asynchrone)
// onAnnuler() : appelée quand on clique sur "Annuler"
//supprimé pour pouvoir changer le titre du formulaire (question du soir) : export function creerFormulaireDepense({ onValider, onAnnuler }) {
export function creerFormulaireDepense({ onValider, onAnnuler, titre = "Ajout", texteAnnuler = "Annuler" }) { //modifié pour accepter un titre et un texte d'annulation
  const formulaire = document.createElement("form");
  formulaire.className = "formulaire-depense";
  formulaire.noValidate = true; // on vérifie nous-mêmes, pour afficher nos messages

  const choixMotifs = MOTIFS.map(
    (motif) => `
      <label class="motif">
        <input type="radio" name="motif" value="${echapperHtml(motif)}">
        <span>${echapperHtml(motif)}</span>
      </label>`
  ).join("");

  formulaire.innerHTML = `
    <header class="formulaire-entete">
      <!-- modifié pour utiliser le titre et le texte d'annulation donnés (par défaut "Ajout" et "Annuler") -->
      <h2 class="formulaire-titre">${echapperHtml(titre)}</h2>
      <button class="bouton-annuler" type="button">${echapperHtml(texteAnnuler)}</button>
    </header>

    <p class="formulaire-date">Aujourd'hui, ${jourCourt(aujourdhui())}</p>

    <label class="champ-montant">
      <span>Montants</span>
      <input name="montant" type="number" inputmode="numeric" min="1" step="100" placeholder="5000">
    </label>

    <fieldset class="champ-motifs">
      <legend>Motifs</legend>
      <div class="liste-motifs">${choixMotifs}</div>
    </fieldset>

    <p class="formulaire-erreur" role="alert"></p>

    <button class="bouton-valider" type="submit">valider</button>`;

  const zoneErreur = formulaire.querySelector(".formulaire-erreur");
  const champMontant = formulaire.elements.montant;

  formulaire.querySelector(".bouton-annuler").addEventListener("click", () => {
    if (onAnnuler) onAnnuler();
  });

  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();
    zoneErreur.textContent = "";

    const montant = Math.round(Number(champMontant.value));
    const motifChoisi = formulaire.querySelector('input[name="motif"]:checked');

    if (!Number.isFinite(montant) || montant <= 0) {
      zoneErreur.textContent = "Entre un montant supérieur à 0.";
      champMontant.focus();
      return;
    }
    if (!motifChoisi) {
      zoneErreur.textContent = "Choisis un motif.";
      return;
    }

    try {
      // La date est lue à ce moment-là : si la popup reste ouverte après minuit, c'est le bon jour
      await onValider({ montant, motif: motifChoisi.value, date: versTexte(aujourdhui()) });
    } catch (erreur) {
      console.error(erreur);
      zoneErreur.textContent = "Impossible d'enregistrer. Réessaie.";
    }
  });

  return formulaire;
}
