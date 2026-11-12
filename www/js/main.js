// Point de départ de l'application
import { initNavigation } from "./navigation.js";
import { afficherAccueil } from "./pages/accueil.js"; //Ajouté pour pouvoir afficher la page Accueil
import { initDepenses } from "./pages/depenses.js"; //Ajouté pour pouvoir construire la page Dépenses
import { initCalendrier } from "./pages/calendrier.js"; //Ajouté pour pouvoir construire la page Calendrier
import { initIA } from "./pages/ia.js"; //Ajouté pour pouvoir construire la page IA
import { initParametres } from "./pages/parametres.js"; //Ajouté pour pouvoir construire la page Paramètres

initNavigation();
afficherAccueil(); //Ajouté pour remplir la page Accueil au démarrage
initDepenses(); //Ajouté pour construire la page Dépenses et la remplir avec les vraies dépenses
initCalendrier(); //Ajouté pour construire la page Calendrier et la remplir avec les vrais devoirs et évènements
initParametres(); //Ajouté pour construire la page Paramètres
initIA(); //Ajouté pour construire la page IA et poser la question du soir si c'est l'heure
