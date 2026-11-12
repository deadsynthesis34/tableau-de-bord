// Appels à l'API Gemini (niveau gratuit de Google AI Studio).
// L'application n'envoie que des demandes préparées (pas de discussion libre),
// et attend toujours une réponse au format JSON.
// La clé API est lue dans les réglages de l'appareil : elle n'est jamais écrite dans le code.

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const DELAI_MAX = 45 * 1000;

export class ErreurGemini extends Error {
  constructor(code, message, statut) {
    super(message);
    this.code = code;
    this.statut = statut;
  }
}

async function detailErreur(reponse) {
  try {
    return (await reponse.json()).error.message || "";
  } catch (erreur) {
    return "";
  }
}

function erreurDepuisStatut(statut, detail) {
  const texte = detail.toLowerCase();
  if (statut === 401 || (statut === 400 && texte.includes("api key"))) {
    return new ErreurGemini("cle-invalide", detail, statut);
  }
  if (statut === 404) return new ErreurGemini("modele", detail, statut);
  if (statut === 429) return new ErreurGemini("quota", detail, statut);
  if (statut >= 500) return new ErreurGemini("serveur", detail, statut);
  if (statut === 403) return new ErreurGemini("acces", detail || "accès refusé", statut);
  return new ErreurGemini("requete", detail || "Erreur " + statut, statut);
}

function verifierConditions(cle) {
  if (!cle) {
    throw new ErreurGemini("cle-manquante", "Aucune clé Gemini enregistrée.");
  }
  if (!navigator.onLine) {
    throw new ErreurGemini("hors-ligne", "Pas de connexion Internet.");
  }
}

async function appeler(url, options) {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX);
  try {
    return await fetch(url, { ...options, signal: controleur.signal });
  } catch (erreur) {
    throw new ErreurGemini(erreur.name === "AbortError" ? "delai" : "reseau", "Impossible de joindre Gemini.");
  } finally {
    clearTimeout(minuteur);
  }
}

// Gemini met parfois le JSON entre ```json ... ``` : on retire ces balises
function lireJson(texte) {
  const nettoye = texte.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(nettoye);
  } catch (erreur) {
    throw new ErreurGemini("format", "La réponse n'est pas du JSON valide.");
  }
}

// Envoie une demande préparée (consignes + données) et renvoie la réponse JSON déjà lue
export async function demanderJson({ cle, modele, consignes, donnees }) {
  verifierConditions(cle);

  const reponse = await appeler(`${BASE}/models/${encodeURIComponent(modele)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: consignes }] },
      contents: [{ role: "user", parts: [{ text: donnees }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    }),
  });

  if (!reponse.ok) {
    throw erreurDepuisStatut(reponse.status, await detailErreur(reponse));
  }

  const corps = await reponse.json();
  const bloque = corps.promptFeedback && corps.promptFeedback.blockReason;
  const parties = corps.candidates && corps.candidates[0] && corps.candidates[0].content && corps.candidates[0].content.parts;
  const texte = parties ? parties.map((partie) => partie.text || "").join("") : "";

  if (!texte) {
    throw new ErreurGemini(bloque ? "bloque" : "format", "Réponse vide.");
  }
  return lireJson(texte);
}

// Liste les modèles de texte disponibles avec cette clé (noms sans le préfixe "models/")
export async function listerModeles(cle) {
  verifierConditions(cle);

  const reponse = await appeler(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": cle } });
  if (!reponse.ok) {
    throw erreurDepuisStatut(reponse.status, await detailErreur(reponse));
  }

  const corps = await reponse.json();
  const AUTRES_USAGES = /image|tts|live|audio|embedding|veo|imagen|robotics|computer-use|learnlm|gemma/i;

  return (corps.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((nom) => /^gemini-/.test(nom) && !AUTRES_USAGES.test(nom))
    .sort()
    .reverse();
}

// Message lisible pour une erreur Gemini
export function messageErreurGemini(erreur) {
  switch (erreur.code) {
    case "cle-manquante":
      return "Ajoute ta clé Gemini dans les Paramètres pour utiliser l'IA.";
    case "hors-ligne":
      return "L'IA a besoin d'Internet : connecte-toi pour l'utiliser.";
    case "reseau":
      return "Impossible de joindre Gemini. Vérifie ta connexion Internet.";
    case "delai":
      return "Gemini met trop de temps à répondre. Réessaie dans un moment.";
    case "cle-invalide":
      return "Gemini a refusé ta clé. Vérifie-la dans les Paramètres.";
    case "modele":
      return "Ce modèle n'existe pas ou n'est plus disponible. Change-le dans les Paramètres (bouton « Détecter les modèles »).";
    case "quota":
      return "Limite gratuite atteinte, ou ce modèle n'a pas d'accès gratuit. Réessaie plus tard ou choisis un autre modèle dans les Paramètres.";
    case "serveur":
      return "Gemini a un problème en ce moment. Réessaie dans un moment.";
    case "bloque":
      return "Gemini n'a pas voulu répondre à cette demande.";
    case "format":
      return "La réponse de Gemini était incomplète. Réessaie.";
    case "acces":
      return "Gemini a refusé l'accès (403) : " + erreur.message;
    default:
      return "L'IA a échoué : " + (erreur.message || "erreur inconnue");
  }
}
