// La cloche avec l'heure du prochain rappel (vide s'il n'y a plus de rappel prévu)

import { ICONE_CLOCHE } from "./icones.js";
import { prochainRappel } from "../logic/rappels.js";
import { jourCourt } from "../logic/dates.js";
import { heureDepuisDate } from "./outils.js";

export function htmlCloche(element, maintenant = new Date()) {
  const rappel = prochainRappel(element, maintenant);
  if (!rappel) return "";

  const heure = heureDepuisDate(rappel);
  return `
    <div class="element-cloche" title="Prochain rappel : ${jourCourt(rappel)} à ${heure}">
      ${ICONE_CLOCHE}
      <span>${heure}</span>
    </div>`;
}
