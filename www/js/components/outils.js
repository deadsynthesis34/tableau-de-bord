// Petits outils utilisés par plusieurs pages

// Empêche un texte (titre d'un devoir, par exemple) d'être pris pour du code HTML
export function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 30000 -> "30.000 Ar"
export function formaterMontant(montant) {
  return String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " Ar";
}

// Ajouté pour partager l'affichage des heures entre l'Accueil, le Calendrier et les détails

// "14:00" -> "14h00"
export function heureTexte(heure) {
  return heure.replace(":", "h");
}

// Un objet Date -> "18h30"
export function heureDepuisDate(date) {
  return String(date.getHours()).padStart(2, "0") + "h" + String(date.getMinutes()).padStart(2, "0");
}

// Texte de l'horaire : "08h00-10h00" pour un évènement, "avant 23h00" pour un devoir
export function texteHoraire(element) {
  if (element.debut && element.fin) {
    return heureTexte(element.debut) + "-" + heureTexte(element.fin);
  }
  if (element.limite) {
    return "avant " + heureTexte(element.limite);
  }
  return "";
}
