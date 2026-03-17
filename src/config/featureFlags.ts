/**
 * Feature Flags — Module activation
 * 
 * GP_ONLY mode: Only GP (bagages) module is active.
 * Set GP_ONLY_MODE = false to re-enable all modules.
 */

export const GP_ONLY_MODE = true;

export const ENABLED_TRANSPORT_MODES = GP_ONLY_MODE
  ? ["bagages_international", "bagages_accompagnes", "navette", "voyageur"]
  : ["bagages_international", "bagages_accompagnes", "navette", "voyageur", "routier", "maritime", "aerien", "mobility"];

export const isModuleEnabled = (module: string): boolean => {
  if (!GP_ONLY_MODE) return true;
  const disabledModules = ["routier", "maritime", "aerien", "mobility", "coursier", "agence"];
  return !disabledModules.includes(module);
};
