// Base de données locale du navigateur (IndexedDB).
// Elle fonctionne hors ligne, sur le web comme dans l'.apk.
// Les données restent sur l'appareil jusqu'à la synchronisation.

const NOM_BASE = "tableau-de-bord";
const VERSION = 1;

let promesseBase = null;

// Ouvre la base (et la crée la première fois). L'ouverture n'est faite qu'une seule fois.
export function ouvrirBase() {
  if (promesseBase) return promesseBase;

  promesseBase = new Promise((resolve, reject) => {
    const demande = indexedDB.open(NOM_BASE, VERSION);

    // Appelé à la création : on prépare les "tiroirs" (magasins) de la base
    demande.onupgradeneeded = () => {
      const base = demande.result;
      if (!base.objectStoreNames.contains("depenses")) {
        base.createObjectStore("depenses", { keyPath: "id" });
      }
      if (!base.objectStoreNames.contains("elements")) {
        base.createObjectStore("elements", { keyPath: "id" }); // devoirs et évènements (plus tard)
      }
      if (!base.objectStoreNames.contains("parametres")) {
        base.createObjectStore("parametres", { keyPath: "cle" }); // réglages (plus tard)
      }
    };

    demande.onsuccess = () => resolve(demande.result);
    demande.onerror = () => {
      promesseBase = null;
      reject(demande.error);
    };
  });

  return promesseBase;
}

// Transforme une requête IndexedDB en promesse (pour utiliser await)
function enPromesse(requete) {
  return new Promise((resolve, reject) => {
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

export async function lireTout(magasin) {
  const base = await ouvrirBase();
  return enPromesse(base.transaction(magasin, "readonly").objectStore(magasin).getAll());
}

export async function lireUn(magasin, id) {
  const base = await ouvrirBase();
  return enPromesse(base.transaction(magasin, "readonly").objectStore(magasin).get(id));
}

// Ajoute l'objet, ou remplace celui qui a le même id
export async function ecrire(magasin, objet) {
  const base = await ouvrirBase();
  return enPromesse(base.transaction(magasin, "readwrite").objectStore(magasin).put(objet));
}

// Ajouté pour créer un identifiant unique pour chaque élément (utilisé par data/elements.js)
export function creerId() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "e-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}
