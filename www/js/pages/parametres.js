// Page Paramètres : question du soir, clé et modèle Gemini, contexte des explications.

import { lireReglages, enregistrerReglages } from "../data/reglages.js";
import { demanderJson, listerModeles, messageErreurGemini } from "../services/gemini.js";
import { identifiantConfigure } from "../services/google-auth.js";
import { afficherMessage } from "../components/notification.js";

function elementPage(id) {
  return document.getElementById(id);
}

export async function initParametres() {
  const conteneur = elementPage("parametres-contenu");

  conteneur.innerHTML = `
    <form class="parametres" id="formulaire-parametres" novalidate>
      <section class="carte parametres-bloc" aria-labelledby="titre-param-soir">
        <h2 class="carte-titre" id="titre-param-soir">Question du soir</h2>
        <label class="case-a-cocher">
          <input type="checkbox" name="questionSoirActive">
          <span>Poser la question « combien as-tu dépensé aujourd'hui ? » chaque soir</span>
        </label>
        <div class="ligne-champs">
          <label class="champ-texte"><span>De</span><input type="time" name="questionSoirDebut"></label>
          <label class="champ-texte"><span>À</span><input type="time" name="questionSoirFin"></label>
        </div>
        <p class="parametres-aide">La question s'affiche quand tu ouvres l'application entre ces deux heures, une seule fois par jour.</p>
      </section>

      <section class="carte parametres-bloc" aria-labelledby="titre-param-ia">
        <h2 class="carte-titre" id="titre-param-ia">Intelligence artificielle (Gemini)</h2>

        <label class="champ-texte">
          <span>Clé API Gemini</span>
          <span class="champ-cle">
            <input type="password" name="cleGemini" autocomplete="off" spellcheck="false">
            <button class="bouton-secondaire" type="button" id="afficher-cle" aria-pressed="false">Afficher</button>
          </span>
        </label>
        <p class="parametres-aide">
          Crée une clé gratuite sur aistudio.google.com. Elle reste seulement sur cet appareil et n'est jamais synchronisée.
        </p>

        <label class="champ-texte">
          <span>Modèle</span>
          <input type="text" name="modeleGemini" list="liste-modeles" autocomplete="off" spellcheck="false">
          <datalist id="liste-modeles"></datalist>
        </label>

        <div class="parametres-actions">
          <button class="bouton-secondaire" type="button" id="detecter-modeles">Détecter les modèles</button>
          <button class="bouton-secondaire" type="button" id="tester-ia">Tester la connexion</button>
        </div>
        <p class="parametres-resultat" id="resultat-ia" role="status"></p>

        <label class="champ-texte">
          <span>Contexte pour les explications des devoirs</span>
          <textarea name="contexteExplication" rows="3" maxlength="500"
            placeholder="Exemple : j'aime le football, explique avec des exemples de matchs"></textarea>
        </label>
        <p class="parametres-aide">
          Ce texte est envoyé à Gemini avec le devoir à expliquer. N'y écris aucune information privée.
          Sur le niveau gratuit de Gemini, Google peut utiliser ce qui est envoyé pour améliorer ses produits.
        </p>
      </section>

      <section class="carte parametres-bloc" aria-labelledby="titre-param-google">
        <h2 class="carte-titre" id="titre-param-google">Google Classroom</h2>
        <p id="etat-google"></p>
      </section>

      <button class="bouton-valider parametres-enregistrer" type="submit">Enregistrer</button>
    </form>`;

  const formulaire = elementPage("formulaire-parametres");
  const champs = formulaire.elements;
  const zoneResultat = elementPage("resultat-ia");

  elementPage("etat-google").textContent = identifiantConfigure()
    ? "Identifiant Google renseigné ✓ (dans js/config.js)."
    : "Identifiant Google manquant ✗ : renseigne-le dans js/config.js pour synchroniser Classroom.";

  // Remplit le formulaire avec les réglages enregistrés
  const reglages = await lireReglages();
  champs.questionSoirActive.checked = reglages.questionSoirActive;
  champs.questionSoirDebut.value = reglages.questionSoirDebut;
  champs.questionSoirFin.value = reglages.questionSoirFin;
  champs.cleGemini.value = reglages.cleGemini;
  champs.modeleGemini.value = reglages.modeleGemini;
  champs.contexteExplication.value = reglages.contexteExplication;

  function afficherResultat(texte, estErreur) {
    zoneResultat.textContent = texte;
    zoneResultat.classList.toggle("erreur", Boolean(estErreur));
  }

  // Afficher / masquer la clé
  const boutonCle = elementPage("afficher-cle");
  boutonCle.addEventListener("click", () => {
    const visible = boutonCle.getAttribute("aria-pressed") !== "true";
    boutonCle.setAttribute("aria-pressed", String(visible));
    boutonCle.textContent = visible ? "Masquer" : "Afficher";
    champs.cleGemini.type = visible ? "text" : "password";
  });

  // Liste des modèles disponibles avec cette clé
  elementPage("detecter-modeles").addEventListener("click", async () => {
    afficherResultat("Recherche des modèles…", false);
    try {
      const modeles = await listerModeles(champs.cleGemini.value.trim());
      elementPage("liste-modeles").replaceChildren(
        ...modeles.map((nom) => {
          const option = document.createElement("option");
          option.value = nom;
          return option;
        })
      );
      afficherResultat(
        modeles.length + " modèles trouvés. Clique dans le champ Modèle pour en choisir un (les « flash-lite » sont les plus légers).",
        false
      );
    } catch (erreur) {
      afficherResultat(messageErreurGemini(erreur), true);
    }
  });

  // Test avec les valeurs saisies (même si elles ne sont pas encore enregistrées)
  elementPage("tester-ia").addEventListener("click", async () => {
    afficherResultat("Test en cours…", false);
    const modele = champs.modeleGemini.value.trim();
    try {
      const reponse = await demanderJson({
        cle: champs.cleGemini.value.trim(),
        modele,
        consignes: 'Réponds uniquement avec ce JSON : {"ok": true}',
        donnees: "Test de connexion.",
      });
      afficherResultat(reponse && reponse.ok ? "Connexion réussie avec le modèle " + modele + " ✓" : "Le modèle répond, mais pas comme prévu. Réessaie.", !(reponse && reponse.ok));
    } catch (erreur) {
      afficherResultat(messageErreurGemini(erreur), true);
    }
  });

  // Enregistrement
  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();

    if (!champs.questionSoirDebut.value || !champs.questionSoirFin.value || champs.questionSoirDebut.value === champs.questionSoirFin.value) {
      afficherMessage("Choisis deux heures différentes pour la question du soir.");
      return;
    }
    if (!champs.modeleGemini.value.trim()) {
      afficherMessage("Indique un modèle Gemini (ou clique sur « Détecter les modèles »).");
      return;
    }

    try {
      await enregistrerReglages({
        questionSoirActive: champs.questionSoirActive.checked,
        questionSoirDebut: champs.questionSoirDebut.value,
        questionSoirFin: champs.questionSoirFin.value,
        cleGemini: champs.cleGemini.value.trim(),
        modeleGemini: champs.modeleGemini.value.trim(),
        contexteExplication: champs.contexteExplication.value.trim(),
      });
      afficherMessage("Réglages enregistrés.");
    } catch (erreur) {
      console.error(erreur);
      afficherMessage("Impossible d'enregistrer les réglages.");
    }
  });
}
