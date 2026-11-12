// Lecture des devoirs dans Google Classroom (API REST, lecture seule).
// Pour chaque cours actif : les devoirs publiés, et l'état de ton rendu (rendu ou non).

import { versTexte } from "../logic/dates.js";

const BASE = "https://classroom.googleapis.com/v1";

export class ErreurClassroom extends Error {
  constructor(code, message, statut) {
    super(message);
    this.code = code;
    this.statut = statut;
  }
}

async function appeler(chemin, parametres, jeton) {
  const url = new URL(BASE + chemin);
  Object.entries(parametres).forEach(([cle, valeur]) => {
    if (valeur !== undefined) url.searchParams.set(cle, valeur);
  });

  let reponse;
  try {
    reponse = await fetch(url, { headers: { Authorization: "Bearer " + jeton } });
  } catch (erreur) {
    throw new ErreurClassroom("reseau", "Impossible de joindre Google Classroom.");
  }

  if (!reponse.ok) {
    let detail = "";
    try {
      detail = (await reponse.json()).error.message || "";
    } catch (erreur) {
      // pas de détail lisible
    }
    const code = reponse.status === 401 ? "jeton" : reponse.status === 403 ? "acces" : "api";
    throw new ErreurClassroom(code, detail || "Erreur " + reponse.status, reponse.status);
  }
  return reponse.json();
}

// Les listes de l'API sont découpées en pages : on les récupère toutes
async function listerToutesLesPages(chemin, parametres, cleListe, jeton) {
  const resultats = [];
  let pageToken;
  do {
    const donnees = await appeler(chemin, { ...parametres, pageToken, pageSize: 100 }, jeton);
    resultats.push(...(donnees[cleListe] || []));
    pageToken = donnees.nextPageToken;
  } while (pageToken);
  return resultats;
}

// Classroom donne la date limite en UTC : on la convertit dans le fuseau horaire de l'appareil.
// Renvoie { date: "AAAA-MM-JJ", limite: "HH:MM" } ou null s'il n'y a pas de date limite.
export function convertirEcheance(dueDate, dueTime) {
  if (!dueDate) return null;

  if (!dueTime) {
    // Pas d'heure précisée : on prend la fin de la journée
    const jour = new Date(dueDate.year, dueDate.month - 1, dueDate.day);
    return { date: versTexte(jour), limite: "23:59" };
  }

  const local = new Date(
    Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, dueTime.hours || 0, dueTime.minutes || 0)
  );
  const heures = String(local.getHours()).padStart(2, "0");
  const minutes = String(local.getMinutes()).padStart(2, "0");
  return { date: versTexte(local), limite: heures + ":" + minutes };
}

// Pièces jointes d'un devoir : on garde le type, le titre et le lien
function convertirMateriaux(materiaux = []) {
  return materiaux
    .map((materiel) => {
      if (materiel.driveFile) {
        const fichier = materiel.driveFile.driveFile || {};
        return { type: "Fichier Drive", titre: fichier.title || "Fichier", lien: fichier.alternateLink };
      }
      if (materiel.youtubeVideo) {
        return { type: "Vidéo YouTube", titre: materiel.youtubeVideo.title || "Vidéo", lien: materiel.youtubeVideo.alternateLink };
      }
      if (materiel.link) {
        return { type: "Lien", titre: materiel.link.title || materiel.link.url, lien: materiel.link.url };
      }
      if (materiel.form) {
        return { type: "Formulaire", titre: materiel.form.title || "Formulaire", lien: materiel.form.formUrl };
      }
      return null;
    })
    .filter(Boolean);
}

// Transforme un devoir Classroom en élément de l'application
// (renvoie null si le devoir n'a pas de date limite)
export function convertirDevoir(devoir, cours, soumission) {
  const echeance = convertirEcheance(devoir.dueDate, devoir.dueTime);
  if (!echeance) return null;

  const creation = Date.parse(devoir.creationTime) || Date.now();

  return {
    id: "classroom-" + cours.id + "-" + devoir.id,
    type: "devoir",
    source: "classroom",
    titre: devoir.title || "(sans titre)",
    description: devoir.description || "",
    date: echeance.date,
    limite: echeance.limite,
    creeLe: creation,
    modifieLe: Date.parse(devoir.updateTime) || creation,
    supprime: false,
    cours: cours.name || "",
    points: devoir.maxPoints,
    typeTravail: devoir.workType,
    lien: devoir.alternateLink,
    materiaux: convertirMateriaux(devoir.materials),
    rendu: Boolean(soumission) && (soumission.state === "TURNED_IN" || soumission.state === "RETURNED"),
  };
}

// Récupère tous les devoirs de tous tes cours actifs.
// Renvoie { elements, sansDate, nombreCours }
export async function recupererDevoirsClassroom(jeton) {
  const cours = await listerToutesLesPages("/courses", { studentId: "me", courseStates: "ACTIVE" }, "courses", jeton);

  const elements = [];
  let sansDate = 0;

  for (const unCours of cours) {
    const [devoirs, soumissions] = await Promise.all([
      listerToutesLesPages(`/courses/${unCours.id}/courseWork`, { courseWorkStates: "PUBLISHED" }, "courseWork", jeton),
      listerToutesLesPages(`/courses/${unCours.id}/courseWork/-/studentSubmissions`, { userId: "me" }, "studentSubmissions", jeton),
    ]);

    const soumissionParDevoir = new Map(soumissions.map((s) => [s.courseWorkId, s]));

    devoirs.forEach((devoir) => {
      const element = convertirDevoir(devoir, unCours, soumissionParDevoir.get(devoir.id));
      if (element) elements.push(element);
      else sansDate++;
    });
  }

  return { elements, sansDate, nombreCours: cours.length };
}
