/* The app follows the browser language on first load, then remembers the toggle. */
import { createSignal } from "solid-js";

export type Locale = "en" | "fr";

const STORAGE_KEY = "voltalis.locale";

function browserLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {}
  const languages = typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
  return languages.some(language => String(language).toLowerCase().startsWith("fr")) ? "fr" : "en";
}

const [locale, setLocaleSignal] = createSignal<Locale>(browserLocale());

function applyLocale(next: Locale) {
  setLocaleSignal(next);
  if (typeof document !== "undefined") document.documentElement.lang = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
}

if (typeof document !== "undefined") document.documentElement.lang = locale();
else if (typeof navigator !== "undefined" && String(navigator.language).toLowerCase().startsWith("fr")) {
  setLocaleSignal("fr");
}

export { locale };

export function setLocale(next: Locale) {
  applyLocale(next);
}

export function toggleLocale() {
  applyLocale(locale() === "fr" ? "en" : "fr");
}

export function localeCode(): string {
  return locale() === "fr" ? "fr-FR" : "en-GB";
}

/* One line per string: English is the key, French is the value, so both stay
   visible together. French values use U+2019 apostrophes and U+202F narrow
   no-break spaces before ; : ! ?, inside « » quotes, and before units.
   A key used in t() but missing here is a type error, not a silent fallback. */
const fr = {
  /* ---- top bar ---- */
  "Switch to English": "Passer à l’anglais",
  "Switch to French": "Passer au français",
  "Refresh data": "Actualiser les données",
  "Install app": "Installer l’application",
  "Site": "Site",
  "Sign out": "Se déconnecter",
  "This site": "Ce site",
  "demo data": "données de démo",
  "connected": "connecté",
  "connecting…": "connexion…",
  "not connected": "non connecté",
  "control": "contrôle",
  /* ---- login ---- */
  "Your radiators.": "Vos radiateurs.",
  "Your rules.": "Vos règles.",
  "Connect with your MyVoltalis account to control heating and weekly schedules.": "Connectez-vous avec votre compte MyVoltalis pour piloter le chauffage et les programmes hebdomadaires.",
  "Private by design.": "Vos données restent chez vous.",
  "This page talks to Voltalis straight from your browser. Your token stays in this browser’s local storage — it is never sent to this site’s server.": "Cette page dialogue directement avec Voltalis depuis votre navigateur. Votre jeton reste dans le stockage local du navigateur ; il n’est jamais envoyé au serveur de ce site.",
  "MyVoltalis email": "E-mail MyVoltalis",
  "Password": "Mot de passe",
  "Connecting…": "Connexion…",
  "Connect": "Se connecter",
  "Try demo": "Essayer la démo",
  "Already have a token?": "Vous avez déjà un jeton ?",
  "Bearer token": "Jeton Bearer",
  "paste token": "collez le jeton",
  "Use token": "Utiliser le jeton",
  "outside": "extérieur",
  "live now": "en direct",
  /* ---- dashboard ---- */
  "Demo heating overview": "Aperçu du chauffage (démo)",
  "Heating overview": "Aperçu du chauffage",
  "Sample devices — no commands reach Voltalis.": "Appareils d’exemple — aucune commande n’est envoyée à Voltalis.",
  "Live state · {name}": "État en direct · {name}",
  "Live state": "État en direct",
  "Radiators": "Radiateurs",
  "Weekly program": "Programme hebdomadaire",
  "Default program": "Programme par défaut",
  "Quick setting": "Réglage rapide",
  "No program": "Aucun programme",
  "Heating now": "En chauffe",
  "1 active": "1 en chauffe",
  "{n} active": "{n} en chauffe",
  /* ---- appliances ---- */
  "Radiators & loads": "Appareils de chauffage",
  "{n} appliances": "{n} appareils",
  "{shown} of {total} appliances": "{shown} sur {total} appareils",
  "All": "Tous",
  "Heating": "En chauffe",
  "Off": "Arrêt",
  "Faults": "Pannes",
  "Filter appliances": "Filtrer les appareils",
  "No appliances found on this site.": "Aucun appareil sur ce site.",
  "No appliances match this filter — choose All to see them.": "Aucun appareil ne correspond à ce filtre ; choisissez « Tous » pour les afficher.",
  "Select {name}": "Sélectionner {name}",
  "this appliance": "cet appareil",
  " (off)": " (arrêt)",
  "Unnamed appliance": "Appareil sans nom",
  "Rename {name}": "Renommer {name}",
  "Rename appliance": "Renommer l’appareil",
  "Adjust heating": "Modifier le chauffage",
  "Return this appliance to its program": "L’appareil reprend son programme hebdomadaire.",
  "Diagnostics and self-test": "Diagnostic et autotest",
  "Manual override": "Réglage manuel",
  "Heating level {n}": "Niveau de chauffe {n}",
  "Stage reported by the appliance; 0 is idle": "Niveau communiqué par l’appareil ; 0 signifie arrêt.",
  "Idle": "À l’arrêt",
  "The appliance reports no heating output": "L’appareil ne chauffe pas.",
  "target": "consigne",
  "default": "par défaut",
  "Consumption: {value}": "Consommation : {value}",
  "until further notice": "jusqu’à nouvel ordre",
  "until {date}": "jusqu’au {date}",
  "Water heater": "Chauffe-eau",
  "Radiator": "Radiateur",
  "Appliance": "Appareil",
  "At home": "À la maison",
  "Short absence": "Absence courte",
  "Long absence": "Absence longue",
  /* ---- energy ---- */
  "Energy": "Énergie",
  "Consumption period": "Période de consommation",
  "Day": "Jour",
  "Week": "Semaine",
  "Month": "Mois",
  "Year": "Année",
  "Previous period": "Période précédente",
  "Next period": "Période suivante",
  "No consumption data yet.": "Pas encore de données de consommation.",
  "Loading consumption…": "Chargement de la consommation…",
  "used": "consommés",
  "estimated": "estimé",
  "average outside": "moyenne extérieure",
  "By appliance": "Par appareil",
  "This period has no detail points.": "Aucun relevé à afficher pour cette période.",
  "Consumption chart for {date}": "Graphique de consommation — {date}",
  "Peak hours": "Heures pleines",
  "Off-peak hours": "Heures creuses",
  "Outside temperature": "Température extérieure",
  "saved": "économisés",
  "Annual objective:": "Objectif annuel :",
  /* ---- weekly schedule ---- */
  "Schedule": "Programme",
  "Copy one day's slots onto other days": "Copier les créneaux d’un jour vers d’autres jours",
  "Copy day": "Copier un jour",
  "Copy this appliance's plan to other appliances": "Copier la semaine de cet appareil vers d’autres appareils",
  "Copy to…": "Copier vers…",
  "No weekly plan for {name}; showing {plan}'s week.": "Aucun programme hebdomadaire pour {name} ; la semaine de {plan} est affichée.",
  "another appliance": "un autre appareil",
  "No weekly plan to show. Choose a program to see its week.": "Aucun programme hebdomadaire à afficher. Choisissez un programme pour voir sa semaine.",
  "Appliances in this program": "Appareils de ce programme",
  "Week: {day}": "Semaine : {day}",
  "Week: hours across, days down": "Semaine : heures en haut, jours sur le côté",
  "Not set": "Non défini",
  "Select a cell to edit one hour, or drag across cells to set a whole block. A day ends at 23:59, and every change writes the appliance's whole daily plan.": "Cliquez sur une case pour modifier une heure, ou faites glisser pour définir un bloc entier. La journée se termine à 23:59 ; chaque modification enregistre la journée complète de l’appareil.",
  "Mon": "Lun",
  "Tue": "Mar",
  "Wed": "Mer",
  "Thu": "Jeu",
  "Fri": "Ven",
  "Sat": "Sam",
  "Sun": "Dim",
  "Built-in quick setting": "Réglage rapide prédéfini",
  "Show this program's weekly plan": "Afficher la semaine de ce programme",
  "Edit": "Modifier",
  "Rename, duplicate or delete this program": "Renommer, dupliquer ou supprimer ce programme",
  "Manage": "Gérer",
  "Set the duration and each appliance's mode for this quick setting": "Définir la durée et le mode de chaque appareil pour ce réglage rapide",
  "Configure": "Configurer",
  "Disable {name}": "Désactiver {name}",
  "Enable {name}": "Activer {name}",
  "Turn this program off": "Désactiver ce programme",
  "Turn this program on": "Activer ce programme",
  /* ---- programs ---- */
  "Programs": "Programmes",
  "Geolocation": "Géolocalisation",
  "Let this site use the location it already stores": "Autoriser ce site à utiliser la position déjà enregistrée",
  "Create a new weekly program": "Créer un nouveau programme hebdomadaire",
  "No programs yet. Create one to plan a week.": "Aucun programme pour l’instant. Créez-en un pour planifier une semaine.",
  "Restore default presets": "Restaurer les réglages prédéfinis",
  "Only one program runs at a time: turning one on turns the others off.": "Un seul programme s’applique à la fois : en activer un désactive les autres.",
  /* ---- health ---- */
  "System health": "Santé du système",
  " fault": " panne",
  " faults": " pannes",
  "testable": "testables",
  "Linked": "Associé",
  "Not linked": "Non associé",
  "temperature sensor": "capteur de température",
  "Connected": "Connecté",
  "Not connected": "Non connecté",
  "energy manager": "gestionnaire d’énergie",
  "notification": "notification",
  "notifications": "notifications",
  "grid alert": "alerte réseau",
  /* ---- bulk confirmation ---- */
  "Stop all heating?": "Arrêter tout le chauffage ?",
  "Resume all schedules?": "Reprendre tous les programmes ?",
  "This stops heating in every room with a manual setting. Each room keeps its current mode. You can undo this with “Resume all schedules”.": "Le chauffage s’arrête dans toutes les pièces en réglage manuel. Chaque pièce garde son mode actuel. Vous pouvez annuler avec « Reprendre tous les programmes ».",
  "This returns every manually overridden room to its schedule.": "Chaque pièce en réglage manuel reprend son programme hebdomadaire.",
  /* ---- modals ---- */
  "Calibrate {name}": "Calibrer {name}",
  "Measured temperature (°C)": "Température mesurée (°C)",
  "Enter the temperature you measure in the room. Voltalis uses it to correct this appliance’s sensor offset; it does not change the target temperature.": "Saisissez la température que vous mesurez dans la pièce. Voltalis s’en sert pour corriger le décalage du capteur de cet appareil ; la consigne n’est pas modifiée.",
  "Save calibration": "Enregistrer la calibration",
  "Copy a day": "Copier un jour",
  "Copy from": "Jour à copier",
  "source": "source",
  "Copy to 1 day": "Copier vers 1 jour",
  "Copy to {n} days": "Copier vers {n} jours",
  "Copy every slot from one day onto other days of this week. The source day stays unchanged; days outside the copy keep theirs.": "Copiez tous les créneaux d’un jour vers d’autres jours de cette semaine. Le jour source reste inchangé ; les autres jours conservent leurs créneaux.",
  "This appliance": "Cet appareil",
  "Copy this week": "Copier cette semaine",
  "This site has no other appliance to copy to.": "Ce site n’a pas d’autre appareil vers lequel copier.",
  " · already in this program": " · déjà dans ce programme",
  "Copy to 1 appliance": "Copier vers 1 appareil",
  "Copy to {n} appliances": "Copier vers {n} appareils",
  "The week of {name} is copied into {program} for each appliance you choose. An appliance that already has a week here has it replaced.": "La semaine de {name} est copiée dans {program} pour chaque appareil choisi. Si un appareil a déjà une semaine ici, elle est remplacée.",
  "this program": "ce programme",
  "Unknown": "Inconnu",
  "unknown": "inconnu",
  "No diagnostic record for this appliance yet.": "Aucun diagnostic pour cet appareil pour l’instant.",
  "connection": "connexion",
  "self-test status": "état de l’autotest",
  "consumption": "consommation",
  "self-test": "autotest",
  "available": "disponible",
  "disabled": "désactivé",
  "Run self-test": "Lancer l’autotest",
  "What the appliance reports about itself: whether it answers, whether it draws current, and whether a self-test is allowed.": "Ce que l’appareil indique sur lui-même : s’il répond, s’il consomme du courant et si un autotest est possible.",
  "A self-test takes up to a minute; the status updates when it finishes, and Refresh re-reads it.": "Un autotest prend jusqu’à une minute. L’état se met à jour à la fin ; Actualiser le relit.",
  "New weekly program": "Nouveau programme hebdomadaire",
  "An empty program is created; select it to add a week and slots.": "Un programme vide est créé ; sélectionnez-le pour ajouter une semaine et des créneaux.",
  "Name": "Nom",
  "e.g. Hiver": "ex. Hiver",
  "Create": "Créer",
  "Mode": "Mode",
  "Duration": "Durée",
  "Target temperature (°C)": "Température de consigne (°C)",
  "Apply override": "Appliquer le réglage",
  "Choose a mode and how long it should last. “Off” keeps the override active but stops heating.": "Choisissez un mode et sa durée. « Arrêt » garde le réglage manuel actif mais arrête le chauffage.",
  "Appliance {n}": "Appareil {n}",
  "Program": "Programme",
  "Deleting removes {name}{plannings}. Appliances fall back to the default program{active}. It cannot be undone.": "La suppression retire {name}{plannings}. Les appareils reviennent au programme par défaut{active}. Cette action est définitive.",
  " and the week of 1 appliance": " et la semaine d’un appareil",
  " and the weeks of {n} appliances": " et les semaines de {n} appareils",
  ", and this is the program that is on now": ", et c’est le programme en cours",
  "Rename the program, copy it, or delete it. The weekly plan and its appliances stay attached to this program.": "Renommez ce programme, copiez-le ou supprimez-le. Sa semaine programmée et ses appareils restent en place.",
  "The copy starts disabled and carries the same weeks, so next season can be built from this one without touching it.": "La copie est créée désactivée, avec les mêmes semaines ; la saison suivante peut être préparée sans toucher à l’original.",
  "Duplicate…": "Dupliquer…",
  "Delete…": "Supprimer…",
  "Duplicate": "Dupliquer",
  "Delete program": "Supprimer le programme",
  "Back": "Retour",
  "Cancel": "Annuler",
  "Save name": "Enregistrer le nom",
  "Custom end": "Fin personnalisée",
  "Until further notice": "Jusqu’à nouvel ordre",
  "Ends at": "Date et heure de fin",
  "Runs until you turn it off or enable another preset.": "Le réglage reste actif jusqu’à ce que vous l’arrêtiez ou activiez un autre réglage.",
  "Target °C": "Consigne (°C)",
  "Save and enable": "Enregistrer et activer",
  "Mode for every selected hour": "Mode pour toutes les heures sélectionnées",
  "One mode for {hours} across {days}. Ranges outside the block stay as they are.": "Un seul mode pour {hours} sur {days}. Les plages en dehors du bloc restent inchangées.",
  "1 hour": "1 heure",
  "{n} hours": "{n} heures",
  "1 day": "1 jour",
  "{n} days": "{n} jours",
  "Day {n}": "Jour {n}",
  "Apply to {n}": "Appliquer à {n}",
  "Appliance name": "Nom de l’appareil",
  "Site name": "Nom du site",
  "Make default": "Définir par défaut",
  "Set the mode for this time slot. Overlapping slots are replaced.": "Définissez le mode de ce créneau. Les créneaux qui se chevauchent sont remplacés.",
  "From": "De",
  "To": "À",
  "Delete slot": "Supprimer le créneau",
  "Save slot": "Enregistrer le créneau",
  "Heat {name}": "Chauffer {name}",
  "Copy to {day}": "Copier vers {day}",
  "Copy to {name}": "Copier vers {name}",
  "Calibrate": "Calibrer",
  "Name for the copy": "Nom de la copie",
  "Refresh": "Actualiser",
  "Week of {date}": "Semaine du {date}",
  "Close": "Fermer",
  /* ---- errors & toasts ---- */
  "Session expired — connect again.": "Session expirée ; reconnectez-vous.",
  "Incorrect email or password.": "E-mail ou mot de passe incorrect.",
  "Access denied.": "Accès refusé.",
  "Voltalis wants you on the old site; re-link your account.": "Voltalis demande de relier à nouveau votre compte.",
  "Request failed ({status})": "Échec de la requête ({status})",
  "Enter your email and password.": "Saisissez votre e-mail et votre mot de passe.",
  "Enter a site name": "Saisissez un nom de site",
  "Site renamed": "Site renommé",
  "Default site updated": "Site par défaut mis à jour",
  "Enter an appliance name": "Saisissez un nom d’appareil",
  "Appliance renamed": "Appareil renommé",
  "Override applied": "Chauffage modifié",
  "Back to weekly program": "Programme repris",
  "Schedule updated": "Programme mis à jour",
  "Slot removed": "Créneau supprimé",
  "Program enabled": "Programme activé",
  "Program disabled": "Programme désactivé",
  "Quick setting enabled": "Réglage rapide activé",
  "Quick setting disabled": "Réglage rapide désactivé",
  "Program created": "Programme créé",
  "Program renamed": "Programme renommé",
  "Program duplicated": "Programme dupliqué",
  "Program deleted": "Programme supprimé",
  "Enter a program name": "Saisissez un nom de programme",
  "Enter a name for the copy": "Saisissez un nom pour la copie",
  "No appliance has a writable setting": "Aucun appareil n’accepte de réglage",
  "Appliance states updated": "Appareils mis à jour",
  "Open a program first": "Ouvrez d’abord un programme",
  "Days copied": "Jours copiés",
  "Choose at least one appliance": "Choisissez au moins un appareil",
  "Choose when the quick setting ends": "Choisissez la fin du réglage rapide",
  "Enter a measured temperature between 7 and 45 °C": "Saisissez une température mesurée entre 7 et 45 °C",
  "Temperature calibration saved": "Calibration enregistrée",
  "No diagnostic record for this appliance": "Aucun diagnostic pour cet appareil",
  "Self-test is disabled for this appliance": "L’autotest est désactivé pour cet appareil.",
  "Self-test launched": "Autotest lancé",
  "Self-tests launched": "Autotests lancés",
  "Could not load consumption.": "Impossible de charger la consommation.",
  "No consumption data for this period.": "Aucune donnée de consommation pour cette période.",
  "Enter both a start and an end time": "Saisissez une heure de début et une heure de fin.",
  "End time must be after start time": "L’heure de fin doit être après l’heure de début.",
  "Enter a target temperature": "Saisissez une température de consigne.",
  "The source day has no slots to copy": "Le jour source n’a aucun créneau à copier.",
  "Choose at least one day": "Choisissez au moins un jour.",
  "No token in login response": "La connexion n’a pas renvoyé de jeton.",
  "Default presets restored": "Réglages prédéfinis restaurés",
  "Geolocation updated": "Géolocalisation mise à jour",
  "{name} · manual override": "{name} · réglage manuel",
  "{name} · diagnostics": "{name} · diagnostic",
  "{name} · quick setting": "{name} · réglage rapide",
  "manual override": "réglage manuel",
  /* ---- modes, statuses & durations ---- */
  "Comfort": "Confort",
  "Comfort −1": "Confort −1",
  "Comfort −2": "Confort −2",
  "Eco": "Éco",
  "Eco V": "Éco V",
  "Frost protection": "Hors gel",
  "Temperature": "Température",
  "Fault": "Panne",
  "Test running": "Test en cours",
  "No consumption": "Aucune consommation",
  "Comm. error": "Erreur de communication",
  "Status unknown": "État inconnu",
  "2 hours": "2 heures",
  "4 hours": "4 heures",
  "8 hours": "8 heures",
  "Until 22:00": "Jusqu’à 22:00",
  "3 hours": "3 heures",
  "6 hours": "6 heures",
  "12 hours": "12 heures",
  "24 hours": "24 heures",
  "3 days": "3 jours",
  "5 days": "5 jours",
  "7 days": "7 jours",
  "14 days": "14 jours",
  "21 days": "21 jours",
  "Schedule details": "Détails du programme",
  "Consumption details": "Détails de la consommation",
  "Earlier periods have no consumption data; the first point can include a catch-up from before the connection was active.": "Les périodes précédentes n’ont pas de données ; le premier relevé peut inclure un rattrapage antérieur à l’activation de la connexion.",
  "Technical details": "Détails techniques",
  "Cost": "Coût",
  "CO₂": "CO₂",
  "Used vs saved": "Consommation et économies",
  "View details": "Voir les détails",
  "Use schedule": "Suivre le programme",
  "Stop all heating": "Arrêter tout le chauffage",
  "Resume all schedules": "Reprendre tous les programmes",
  "Test all appliances": "Tester tous les appareils",
  "Create program": "Créer un programme",
  "Click a cell to change one hour; drag to change several. Each room follows its own schedule.": "Cliquez sur une case pour changer une heure ; faites glisser pour en changer plusieurs. Chaque pièce suit son propre programme.",
  "Data starts {date}. Earlier days were not tracked.": "Les données commencent le {date}. Les jours précédents ne sont pas comptés.",
  "{n} days with data": "{n} jours avec des données",
  "{n} day with data": "{n} jour avec des données",
  "Set this room's heating by hand for a while; its schedule resumes afterwards.": "Dérogation : réglez vous-même le chauffage de cette pièce pendant la durée choisie ; le programme reprend ensuite.",
  "since {date}": "depuis le {date}",
  "Used covers {period}; saved is cumulative since {date}.": "La consommation couvre {period} ; les économies sont cumulées depuis le {date}.",
  "The first point is capped: it includes a catch-up from before data collection.": "Le premier relevé est plafonné : il inclut un rattrapage antérieur au début de la collecte.",
  "Type": "Type",
  /* ---- status chip & charts ---- */
  "1 notification — view system health": "1 notification — consulter l’état du système",
  "{n} notifications — view system health": "{n} notifications — consulter l’état du système",
  "Peak hours are when electricity is most in demand, so they cost the most; off-peak hours are cheaper, usually overnight.": "Les heures pleines sont les heures de forte demande d’électricité, donc les plus chères ; les heures creuses sont moins chères, en général la nuit.",
  "{label}: {value} total": "{label} : {value} au total",
  "{label}: {value} peak": "{label} : {value} en heures pleines",
  "{label}: {value} off-peak": "{label} : {value} en heures creuses",
  "Choose how long this setting lasts and what each appliance does while it runs.": "Choisissez la durée de ce réglage et le mode de chaque appareil pendant ce temps.",
  "Give {name} a name you recognise. The new name is saved to your Voltalis account and used throughout this app.": "Donnez à {name} un nom facile à reconnaître. Le nouveau nom est enregistré sur votre compte Voltalis et utilisé dans toute l’application.",
  "The site name appears in the selector. Making it default opens this site the next time you sign in.": "Le nom du site apparaît dans le sélecteur. Le définir par défaut ouvre ce site à votre prochaine connexion.",
  "Network error: {message}": "Erreur réseau : {message}",
  "This appliance cannot be adjusted manually.": "Cet appareil ne peut pas être réglé manuellement.",
  "A self-test is not available for this appliance.": "L’autotest n’est pas disponible pour cet appareil.",
  "Week copied": "Semaine copiée",
  "Normal": "Normal",
} as const;

/* Every string the UI can ask for. */
export type MessageKey = keyof typeof fr;

const frTable: Record<string, string> = fr;

/* Words that arrive from the backend or the demo payload already in English
   (weather names, alert levels, welcome titles): a dictionary, not UI copy.
   Unknown words pass through unchanged. */
const terms: Record<string, string> = {
  "Cloudy": "Nuageux",
  "Sunny": "Ensoleillé",
  "Clear": "Dégagé",
  "Rain": "Pluie",
  "Snow": "Neige",
  "Storm": "Orage",
  "cloudy": "nuageux",
  "sunny": "ensoleillé",
  "clear": "dégagé",
  "rain": "pluie",
  "snow": "neige",
  "storm": "orage",
  "Warning": "Avertissement",
  "Critical": "Critique",
  "warning": "avertissement",
  "critical": "critique",
  "on/off": "marche/arrêt",
  "Heating season": "Saison de chauffe",
  "Your schedule is active.": "Votre programme est actif.",
};

export function term(text: string): string {
  return locale() === "fr" ? (terms[text] ?? text) : text;
}

function frenchTypography(value: string): string {
  return value
    .replace(/ ([;:!?])/g, "\u202f$1")
    .replace(/(\d) (kWh|kg|°C|€)/g, "$1\u202f$2");
}

/* The catalogue overload type-checks known keys; the string overload carries
   already-rendered model text (errors) and passes it through unchanged. */
export function t(key: MessageKey, params?: Record<string, string | number>): string;
export function t(key: string, params?: Record<string, string | number>): string;
export function t(key: string, params?: Record<string, string | number>): string {
  const translated = locale() === "fr" ? (frTable[key] ?? key) : key;
  const filled = !params ? translated : translated.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
  return locale() === "fr" ? frenchTypography(filled) : filled;
}

/* Backend messages occasionally arrive as English phrases or as dotted tokens.
   Translate a known phrase, hide a token, and show a human sentence as-is. */
export function safeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const translated = term(text);
  if (translated !== text) return translated;
  if (/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/i.test(text)) return null;
  return text;
}
