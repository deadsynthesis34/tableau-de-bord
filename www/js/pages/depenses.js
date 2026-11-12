// Page Dépenses : totaux, graphique, liste des transactions,
// popup d'ajout (+) et suppression (−) avec possibilité d'annuler.

import { listerDepenses, ajouterDepense, supprimerDepense, restaurerDepense } from "../data/depenses.js";
import { lireDate, jourCourt } from "../logic/dates.js";
import {
  periodeCourante,
  periodePrecedente,
  depensesDansPeriode,
  total,
  variationPourcent,
  donneesGraphique,
} from "../logic/statistiques.js";
import { creerGraphiqueBarres } from "../components/graphique.js";
import { creerFormulaireDepense } from "../components/formulaire-depense.js";
import { ouvrirPopup } from "../components/popup.js";
import { afficherMessage } from "../components/notification.js";
import { echapperHtml, formaterMontant } from "../components/outils.js";

let periodeChoisie = "semaine"; // "semaine", "mois" ou "annee"

function elementPage(id) {
  return document.getElementById(id);
}

// Construit la page une seule fois (le contenu est rempli ensuite par rafraichirDepenses)
export function initDepenses() {
  const conteneur = elementPage("depenses-contenu");

  conteneur.innerHTML = `
    <div class="depenses">
      <div class="depenses-haut">
        <div class="depenses-totaux">
          <div class="carte carte-total">
            <p class="total-libelle">Dépenses totales</p>
            <p class="total-montant" id="total-actuel">0 Ar</p>
          </div>
          <div class="carte carte-total">
            <p class="total-libelle">Dépenses totales précédentes</p>
            <div class="total-ligne">
              <p class="total-montant" id="total-precedent">0 Ar</p>
              <span class="badge-variation" id="badge-variation" hidden></span>
            </div>
          </div>
        </div>

        <label class="selecteur-periode">
          <span class="visuel-cache">Période affichée</span>
          <select id="choix-periode">
            <option value="semaine">Semaines</option>
            <option value="mois">Mois</option>
            <option value="annee">Années</option>
          </select>
        </label>
      </div>

      <p class="depenses-erreur" id="depenses-erreur" role="alert" hidden></p>

      <div class="depenses-bas">
        <section class="carte carte-graphique" aria-label="Graphique des dépenses">
          <div id="graphique-depenses"></div>
        </section>

        <section class="carte carte-transactions" aria-labelledby="titre-transactions">
          <h2 class="carte-titre" id="titre-transactions">Transactions</h2>
          <div class="transactions-defilement">
            <table class="tableau-transactions" id="tableau-transactions">
              <thead class="visuel-cache">
                <tr><th>Jour</th><th>Montant</th><th>Motif</th><th>Action</th></tr>
              </thead>
              <tbody id="corps-transactions"></tbody>
            </table>
            <p class="transactions-vide" id="transactions-vide" hidden>
              Aucune dépense sur cette période. Appuie sur + pour en ajouter une.
            </p>
          </div>
        </section>

        <div class="depenses-actions">
          <button class="bouton-action" id="bouton-ajouter" type="button" aria-label="Ajouter une dépense">+</button>
          <button class="bouton-action" id="bouton-supprimer" type="button" aria-pressed="false" aria-label="Choisir des dépenses à supprimer">−</button>
        </div>
      </div>
    </div>`;

  // Changement de période (Semaines / Mois / Années)
  elementPage("choix-periode").addEventListener("change", (evenement) => {
    periodeChoisie = evenement.target.value;
    rafraichirDepenses();
  });

  // Bouton + : ouvre la popup d'ajout
  elementPage("bouton-ajouter").addEventListener("click", ouvrirAjout);

  // Bouton − : active ou désactive le mode suppression (une croix apparaît sur chaque ligne)
  const boutonSupprimer = elementPage("bouton-supprimer");
  boutonSupprimer.addEventListener("click", () => {
    const actif = boutonSupprimer.getAttribute("aria-pressed") !== "true";
    boutonSupprimer.setAttribute("aria-pressed", String(actif));
    elementPage("tableau-transactions").classList.toggle("mode-suppression", actif);
  });

  // Clic sur une croix : on supprime la dépense, avec un bouton pour annuler
  elementPage("corps-transactions").addEventListener("click", async (evenement) => {
    const bouton = evenement.target.closest(".bouton-retirer");
    if (!bouton) return;

    const id = bouton.dataset.id;
    try {
      await supprimerDepense(id);
      afficherMessage("Dépense supprimée", {
        actionTexte: "Annuler",
        onAction: () => restaurerDepense(id),
      });
    } catch (erreur) {
      console.error(erreur);
      afficherMessage("Impossible de supprimer la dépense.");
    }
  });

  // Quand une dépense change (ajout, suppression, annulation), la page se met à jour
  window.addEventListener("donnees-modifiees", rafraichirDepenses);

  return rafraichirDepenses();
}

function ouvrirAjout() {
  let popup;
  const formulaire = creerFormulaireDepense({
    onValider: async (depense) => {
      await ajouterDepense(depense);
      popup.fermer();
    },
    onAnnuler: () => popup.fermer(),
  });
  popup = ouvrirPopup(formulaire);
  formulaire.elements.montant.focus();
}

// Badge rouge (hausse), vert (baisse) ou gris (identique)
function afficherVariation(actuel, precedent) {
  const badge = elementPage("badge-variation");
  const variation = variationPourcent(actuel, precedent);

  if (variation === null) {
    badge.hidden = true;
    return;
  }

  badge.hidden = false;
  badge.classList.remove("hausse", "baisse", "stable");

  if (variation > 0) {
    badge.classList.add("hausse");
    badge.textContent = "▲ +" + variation + "\u00a0%";
    badge.setAttribute("aria-label", variation + " % de plus que la période précédente");
  } else if (variation < 0) {
    badge.classList.add("baisse");
    badge.textContent = "▼ −" + Math.abs(variation) + "\u00a0%";
    badge.setAttribute("aria-label", Math.abs(variation) + " % de moins que la période précédente");
  } else {
    badge.classList.add("stable");
    badge.textContent = "0\u00a0%";
    badge.setAttribute("aria-label", "Identique à la période précédente");
  }
}

function afficherTransactions(depenses) {
  const corps = elementPage("corps-transactions");

  // Les plus récentes en premier
  const triees = [...depenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.creeLe - a.creeLe;
  });

  corps.innerHTML = triees
    .map((d) => {
      const jour = jourCourt(lireDate(d.date));
      const montant = formaterMontant(d.montant);
      return `
        <tr>
          <td class="col-jour">${jour}</td>
          <td class="col-montant">${montant}</td>
          <td class="col-motif">${echapperHtml(d.motif)}</td>
          <td class="col-action">
            <button class="bouton-retirer" type="button" data-id="${echapperHtml(d.id)}"
              aria-label="Supprimer la dépense de ${montant} du ${jour}">×</button>
          </td>
        </tr>`;
    })
    .join("");

  elementPage("transactions-vide").hidden = triees.length > 0;
  elementPage("tableau-transactions").hidden = triees.length === 0;
}

export async function rafraichirDepenses() {
  const zoneErreur = elementPage("depenses-erreur");

  let toutes;
  try {
    toutes = await listerDepenses();
    zoneErreur.hidden = true;
  } catch (erreur) {
    console.error(erreur);
    zoneErreur.textContent = "Le stockage du navigateur n'est pas disponible : les dépenses ne peuvent pas être lues.";
    zoneErreur.hidden = false;
    return;
  }

  const periode = periodeCourante(periodeChoisie);
  const dansPeriode = depensesDansPeriode(toutes, periode);
  const precedentes = depensesDansPeriode(toutes, periodePrecedente(periodeChoisie));

  const totalActuel = total(dansPeriode);
  const totalPrecedent = total(precedentes);

  elementPage("total-actuel").textContent = formaterMontant(totalActuel);
  elementPage("total-precedent").textContent = formaterMontant(totalPrecedent);
  afficherVariation(totalActuel, totalPrecedent);

  const { valeurs, etiquettes, descriptions } = donneesGraphique(toutes, periodeChoisie);
  const zoneGraphique = elementPage("graphique-depenses");
  zoneGraphique.replaceChildren(creerGraphiqueBarres(valeurs, etiquettes, descriptions));

  afficherTransactions(dansPeriode);
}
