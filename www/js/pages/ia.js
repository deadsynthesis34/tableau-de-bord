// Page IA : trois analyses préparées à l'avance (dépenses, tâches, devoir à expliquer)
// et la question du soir. Aucune discussion libre : l'IA reçoit seulement des demandes
// construites par l'application (voir js/logic/ia-prompts.js), sans donnée personnelle.

import { listerDepenses, ajouterDepense } from "../data/depenses.js";
import { listerElements } from "../data/elements.js";
import { lireReglages } from "../data/reglages.js";
import { lireParametre, ecrireParametre } from "../data/parametres.js";
import { demanderJson, messageErreurGemini } from "../services/gemini.js";
import {
  MIN_DEPENSES_ANALYSE,
  preparerDepenses,
  construireDemandeDepenses,
  lireReponseDepenses,
  devoirsImportants,
  construireDemandeTaches,
  lireReponseTaches,
  construireDemandeDetails,
  lireReponseDetails,
} from "../logic/ia-prompts.js";
import { doitPoserQuestion } from "../logic/question-soir.js";
import { aujourdhui, versTexte, lireDate, jourCourt } from "../logic/dates.js";
import { creerFormulaireDepense } from "../components/formulaire-depense.js";
import { ouvrirDetails } from "../components/details-element.js";
import { afficherMessage } from "../components/notification.js";
import { echapperHtml, formaterMontant, texteHoraire } from "../components/outils.js";
import { ICONE_IA } from "../components/icones.js";

const CODES_A_REGLER_DANS_PARAMETRES = ["cle-manquante", "cle-invalide", "modele", "quota"];
const MENTION_IA = "Réponse générée par une IA : vérifie toujours avec la consigne de ton professeur.";

let numeroDemande = 0; // pour ignorer la réponse d'une demande que l'utilisateur a quittée

function elementPage(id) {
  return document.getElementById(id);
}

// Les textes écrits par l'IA sont toujours protégés avant d'être affichés
const sur = echapperHtml;

export async function initIA() {
  const conteneur = elementPage("ia-contenu");

  conteneur.innerHTML = `
    <div class="ia">
      <p class="ia-hors-ligne" id="ia-hors-ligne" role="status" hidden>
        Hors ligne : les analyses ont besoin d'Internet. Tu peux quand même noter tes dépenses.
      </p>

      <section class="carte question-soir" id="question-soir" aria-labelledby="titre-question-soir" hidden></section>

      <div class="ia-menu" id="ia-vue-menu">
        <div class="ia-icone">${ICONE_IA}</div>
        <h2 class="ia-titre">Comment améliorer votre journée ?</h2>
        <div class="ia-boutons">
          <button class="ia-bouton" type="button" data-action="depenses">Analyses des dépenses</button>
          <button class="ia-bouton" type="button" data-action="taches">Analyses des tâches</button>
          <button class="ia-bouton" type="button" data-action="details">Devoirs avec plus de détails</button>
        </div>
        <p class="ia-info">
          Quand tu cliques, seuls les montants ou les titres et consignes de tes devoirs sont envoyés à Gemini,
          jamais ton nom ni ton e-mail.
        </p>
      </div>

      <div class="ia-resultat" id="ia-vue-resultat" hidden>
        <button class="ia-retour" id="ia-retour" type="button">← Retour</button>
        <h2 class="ia-resultat-titre" id="ia-resultat-titre"></h2>
        <div id="ia-resultat-corps" aria-live="polite"></div>
      </div>
    </div>`;

  conteneur.querySelector(".ia-boutons").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest(".ia-bouton");
    if (!bouton) return;
    const actions = { depenses: lancerDepenses, taches: lancerTaches, details: lancerDetails };
    actions[bouton.dataset.action]();
  });

  elementPage("ia-retour").addEventListener("click", montrerMenu);

  // Bandeau "hors ligne"
  const majConnexion = () => {
    elementPage("ia-hors-ligne").hidden = navigator.onLine;
  };
  window.addEventListener("online", majConnexion);
  window.addEventListener("offline", majConnexion);
  majConnexion();

  // Question du soir : à l'ouverture, au retour dans l'application, et chaque minute
  window.addEventListener("reglages-modifies", () => verifierQuestionSoir(false));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) verifierQuestionSoir(true);
  });
  setInterval(() => verifierQuestionSoir(false), 60 * 1000);

  await verifierQuestionSoir(true);
}

// ---------- Navigation entre le menu et les résultats ----------
function montrerMenu() {
  numeroDemande++; // une réponse qui arrive après le retour sera ignorée
  elementPage("ia-vue-resultat").hidden = true;
  elementPage("ia-vue-menu").hidden = false;
}

function montrerResultat(titre) {
  elementPage("ia-vue-menu").hidden = true;
  elementPage("ia-vue-resultat").hidden = false;
  elementPage("ia-resultat-titre").textContent = titre;
}

function corps() {
  return elementPage("ia-resultat-corps");
}

function afficherChargement(texte = "Analyse en cours…") {
  corps().innerHTML = `<p class="ia-chargement"><span class="ia-spinner" aria-hidden="true"></span>${sur(texte)}</p>`;
}

function afficherInfo(texte) {
  corps().innerHTML = `<p class="ia-message">${sur(texte)}</p>`;
}

function afficherErreur(erreur) {
  console.error(erreur);
  const reglage = CODES_A_REGLER_DANS_PARAMETRES.includes(erreur.code);
  corps().innerHTML = `
    <p class="ia-message ia-erreur" role="alert">${sur(messageErreurGemini(erreur))}</p>
    ${reglage ? '<a class="bouton-lien" href="#parametres">Ouvrir les Paramètres</a>' : ""}`;
}

// ---------- 1. Analyse des dépenses ----------
async function lancerDepenses() {
  const numero = ++numeroDemande;
  montrerResultat("Analyse des dépenses");
  afficherChargement();

  try {
    const lignes = preparerDepenses(await listerDepenses());
    if (lignes.length < MIN_DEPENSES_ANALYSE) {
      afficherInfo(
        "Pas assez de dépenses pour analyser : il en faut au moins " + MIN_DEPENSES_ANALYSE +
          " sur les 30 derniers jours. Ajoute-en depuis l'onglet Dépenses."
      );
      return;
    }

    const reglages = await lireReglages();
    const reponse = await demanderJson({ cle: reglages.cleGemini, modele: reglages.modeleGemini, ...construireDemandeDepenses(lignes) });
    const analyse = lireReponseDepenses(reponse, lignes);
    if (numero !== numeroDemande) return;

    const { depense } = analyse;
    corps().innerHTML = `
      <article class="carte ia-carte">
        <p class="ia-etiquette">Dépense à surveiller</p>
        <p class="ia-depense">${formaterMontant(depense.montant)} · ${sur(depense.motif)} · ${jourCourt(lireDate(depense.date))}</p>
        <p>${sur(analyse.pourquoi)}</p>
        <h3 class="ia-sous-titre">Comment y remédier</h3>
        <ul class="ia-liste">${analyse.remedes.map((r) => `<li>${sur(r)}</li>`).join("")}</ul>
      </article>
      <p class="ia-mention">${MENTION_IA}</p>`;
  } catch (erreur) {
    if (numero === numeroDemande) afficherErreur(erreur);
  }
}

// ---------- 2. Analyse des tâches ----------
async function lancerTaches() {
  const numero = ++numeroDemande;
  montrerResultat("Analyse des tâches");
  afficherChargement();

  try {
    const devoirs = devoirsImportants(await listerElements());
    if (devoirs.length === 0) {
      afficherInfo("Aucun devoir Classroom important à analyser pour le moment. Synchronise Classroom depuis l'Accueil.");
      return;
    }

    const reglages = await lireReglages();
    const reponse = await demanderJson({ cle: reglages.cleGemini, modele: reglages.modeleGemini, ...construireDemandeTaches(devoirs) });
    const suggestions = lireReponseTaches(reponse, devoirs);
    if (numero !== numeroDemande) return;

    if (suggestions.length === 0) {
      afficherInfo("Aucun de tes devoirs importants ne semble rapide à faire. Commence par le plus proche de sa date limite.");
      return;
    }

    corps().innerHTML =
      `<p class="ia-intro">Ces devoirs importants semblent rapides à faire. Tu veux t'en occuper ?</p>
      <ul class="ia-suggestions">
        ${suggestions
          .map(
            (s, i) => `
          <li class="carte ia-carte" data-position="${i}">
            <p class="ia-depense">${sur(s.devoir.titre)}</p>
            <p class="ia-detail">${sur(s.devoir.cours || "")} · ${jourCourt(lireDate(s.devoir.date))}, ${texteHoraire(s.devoir)}</p>
            <p class="ia-detail"><strong>${sur(s.duree)}</strong>${s.raison ? " — " + sur(s.raison) : ""}</p>
            <div class="ia-actions">
              <button class="bouton-secondaire bouton-oui" type="button">Je le fais</button>
              <button class="bouton-secondaire bouton-non" type="button">Pas maintenant</button>
            </div>
          </li>`
          )
          .join("")}
      </ul>
      <p class="ia-mention">${MENTION_IA}</p>`;

    corps().querySelector(".ia-suggestions").addEventListener("click", (evenement) => {
      const carte = evenement.target.closest(".ia-carte");
      if (!carte) return;
      const suggestion = suggestions[Number(carte.dataset.position)];

      if (evenement.target.closest(".bouton-oui")) {
        ouvrirDetails(suggestion.devoir); // les détails contiennent le lien vers Classroom
      } else if (evenement.target.closest(".bouton-non")) {
        carte.remove();
        if (!corps().querySelector(".ia-carte")) {
          afficherInfo("D'accord. Reviens quand tu veux.");
        }
      }
    });
  } catch (erreur) {
    if (numero === numeroDemande) afficherErreur(erreur);
  }
}

// ---------- 3. Devoir avec plus de détails ----------
async function lancerDetails() {
  const numero = ++numeroDemande;
  montrerResultat("Devoirs avec plus de détails");
  afficherChargement("Chargement de tes devoirs…");

  try {
    const devoirs = devoirsImportants(await listerElements());
    if (numero !== numeroDemande) return;

    if (devoirs.length === 0) {
      afficherInfo("Aucun devoir Classroom important à expliquer pour le moment. Synchronise Classroom depuis l'Accueil.");
      return;
    }

    corps().innerHTML = `
      <p class="ia-intro">Quel devoir veux-tu comprendre ?</p>
      <ul class="ia-choix">
        ${devoirs
          .map(
            (d, i) => `
          <li><button class="ia-choix-bouton" type="button" data-position="${i}">
            <span class="ia-choix-titre">${sur(d.titre)}</span>
            <span class="ia-detail">${jourCourt(lireDate(d.date))} · ${sur(d.cours || "")}</span>
          </button></li>`
          )
          .join("")}
      </ul>`;

    corps().querySelector(".ia-choix").addEventListener("click", (evenement) => {
      const bouton = evenement.target.closest(".ia-choix-bouton");
      if (bouton) expliquerDevoir(devoirs[Number(bouton.dataset.position)], devoirs);
    });
  } catch (erreur) {
    if (numero === numeroDemande) afficherErreur(erreur);
  }
}

async function expliquerDevoir(devoir, devoirs) {
  const numero = ++numeroDemande;
  elementPage("ia-resultat-titre").textContent = devoir.titre;
  afficherChargement("Explication en cours…");

  try {
    const reglages = await lireReglages();
    const reponse = await demanderJson({
      cle: reglages.cleGemini,
      modele: reglages.modeleGemini,
      ...construireDemandeDetails(devoir, reglages.contexteExplication),
    });
    const explication = lireReponseDetails(reponse);
    if (numero !== numeroDemande) return;

    corps().innerHTML = `
      <article class="carte ia-carte">
        <h3 class="ia-sous-titre">En résumé</h3>
        <p>${sur(explication.resume)}</p>
        <h3 class="ia-sous-titre">Comment t'y prendre</h3>
        <ol class="ia-liste">${explication.etapes.map((e) => `<li>${sur(e)}</li>`).join("")}</ol>
        ${
          explication.termes.length
            ? `<h3 class="ia-sous-titre">Mots à connaître</h3>
               <dl class="ia-termes">${explication.termes.map((t) => `<dt>${sur(t.terme)}</dt><dd>${sur(t.explication)}</dd>`).join("")}</dl>`
            : ""
        }
        ${explication.exemple ? `<h3 class="ia-sous-titre">Un exemple</h3><p>${sur(explication.exemple)}</p>` : ""}
      </article>
      <p class="ia-mention">${MENTION_IA}</p>
      <button class="bouton-secondaire" id="ia-autre-devoir" type="button">Choisir un autre devoir</button>`;

    elementPage("ia-autre-devoir").addEventListener("click", lancerDetails);
  } catch (erreur) {
    if (numero === numeroDemande) afficherErreur(erreur);
  }
}

// ---------- Question du soir ----------
async function verifierQuestionSoir(naviguer) {
  const zone = elementPage("question-soir");
  if (!zone || zone.dataset.etat === "confirmation") return;

  let due = false;
  try {
    const reglages = await lireReglages();
    due = doitPoserQuestion({
      active: reglages.questionSoirActive,
      debut: reglages.questionSoirDebut,
      fin: reglages.questionSoirFin,
      traiteeLe: await lireParametre("questionSoirTraiteeLe", null),
    });
  } catch (erreur) {
    console.error(erreur);
  }

  if (due && zone.hidden) {
    afficherQuestion();
    if (naviguer) location.hash = "ia"; // à l'ouverture, on arrive directement sur l'onglet IA
  } else if (!due && !zone.hidden) {
    // On ne retire pas le formulaire si l'utilisateur est en train de saisir un montant
    const saisie = zone.querySelector('input[name="montant"]');
    if (!(saisie && saisie.value)) {
      zone.hidden = true;
      zone.replaceChildren();
    }
  }
}

function marquerTraitee() {
  return ecrireParametre("questionSoirTraiteeLe", versTexte(aujourdhui()));
}

function fermerQuestion() {
  const zone = elementPage("question-soir");
  zone.hidden = true;
  zone.dataset.etat = "";
  zone.replaceChildren();
}

function afficherQuestion() {
  const zone = elementPage("question-soir");
  zone.dataset.etat = "formulaire";
  zone.hidden = false;

  const formulaire = creerFormulaireDepense({
    titre: "Combien avez-vous dépensé aujourd'hui ?",
    texteAnnuler: "Pas ce soir",
    onValider: async (depense) => {
      await ajouterDepense(depense);
      await marquerTraitee();
      afficherConfirmation("Dépense enregistrée.");
    },
    onAnnuler: async () => {
      await marquerTraitee(); // la question ne sera plus posée aujourd'hui
      fermerQuestion();
      afficherMessage("D'accord, la question reviendra demain soir.");
    },
  });
  formulaire.querySelector(".formulaire-titre").id = "titre-question-soir";

  const rien = document.createElement("button");
  rien.type = "button";
  rien.className = "bouton-secondaire question-rien";
  rien.textContent = "Je n'ai rien dépensé aujourd'hui";
  rien.addEventListener("click", async () => {
    await marquerTraitee();
    afficherConfirmation("Noté : aucune dépense aujourd'hui.");
  });

  zone.replaceChildren(formulaire, rien);
}

function afficherConfirmation(texte) {
  const zone = elementPage("question-soir");
  zone.dataset.etat = "confirmation";
  zone.innerHTML = `
    <h2 class="carte-titre" id="titre-question-soir">${sur(texte)}</h2>
    <div class="ia-actions">
      <button class="bouton-secondaire" id="question-autre" type="button">Ajouter une autre dépense</button>
      <button class="bouton-secondaire" id="question-fin" type="button">Terminer</button>
    </div>`;
  elementPage("question-autre").addEventListener("click", afficherQuestion);
  elementPage("question-fin").addEventListener("click", fermerQuestion);
}
