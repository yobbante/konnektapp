/**
 * Feature Flags — Module activation
 *
 * GP_ONLY mode désactivé pour le lancement public du 01/07/2026.
 * Tous les modes de transport sont à nouveau accessibles.
 */

export const GP_ONLY_MODE = false;

export const ENABLED_TRANSPORT_MODES = GP_ONLY_MODE
  ? ["bagages_international", "bagages_accompagnes", "navette", "voyageur"]
  : ["bagages_international", "bagages_accompagnes", "navette", "voyageur", "routier", "maritime", "aerien", "mobility"];

export const isModuleEnabled = (module: string): boolean => {
  if (!GP_ONLY_MODE) return true;
  const disabledModules = ["routier", "maritime", "aerien", "mobility", "coursier", "agence"];
  return !disabledModules.includes(module);
};
