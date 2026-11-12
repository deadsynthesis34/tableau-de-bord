// Connexion à Google (Google Identity Services, "token client").
// Le script de Google n'est chargé qu'au moment de se connecter, donc l'application
// reste utilisable hors ligne. Le jeton d'accès est gardé seulement en mémoire :
// il expire au bout d'environ une heure, et il disparaît quand on ferme la page.

import { GOOGLE_CLIENT_ID } from "../config.js";

const SCRIPT_GOOGLE = "https://accounts.google.com/gsi/client";

// Ce que l'application a le droit de lire (lecture seule) :
// tes cours, tes devoirs, et l'état de tes rendus.
export const PORTEES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
].join(" ");

// Erreur avec un "code" pour que l'interface choisisse le bon message
export class ErreurGoogle extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

let promesseScript = null;
let jeton = null; // { valeur, expireA }

export function identifiantConfigure() {
  return Boolean(GOOGLE_CLIENT_ID) && !GOOGLE_CLIENT_ID.startsWith("COLLE-ICI");
}

function chargerScriptGoogle() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  if (!promesseScript) {
    promesseScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_GOOGLE;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        promesseScript = null; // pour pouvoir réessayer
        reject(new ErreurGoogle("reseau", "Le script de connexion Google n'a pas pu être chargé."));
      };
      document.head.append(script);
    });
  }
  return promesseScript;
}

// Renvoie un jeton valide. Si besoin, ouvre la fenêtre de connexion Google :
// cette fonction doit donc être appelée à la suite d'un clic de l'utilisateur.
export async function obtenirJeton() {
  if (!identifiantConfigure()) {
    throw new ErreurGoogle("config", "L'identifiant Google n'est pas renseigné dans js/config.js.");
  }

  // Jeton encore valable (avec une minute de marge) : on le réutilise
  if (jeton && jeton.expireA > Date.now() + 60 * 1000) {
    return jeton.valeur;
  }

  await chargerScriptGoogle();

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: PORTEES,
      callback: (reponse) => {
        if (reponse.error) {
          const code = reponse.error === "access_denied" ? "refuse" : "autre";
          reject(new ErreurGoogle(code, reponse.error_description || reponse.error));
          return;
        }
        jeton = { valeur: reponse.access_token, expireA: Date.now() + Number(reponse.expires_in) * 1000 };
        resolve(jeton.valeur);
      },
      error_callback: (erreur) => {
        const code = erreur && erreur.type === "popup_closed" ? "annule" : "popup";
        reject(new ErreurGoogle(code, (erreur && (erreur.message || erreur.type)) || "Fenêtre Google fermée."));
      },
    });
    client.requestAccessToken();
  });
}

// À appeler si Google répond que le jeton n'est plus valable
export function oublierJeton() {
  jeton = null;
}
