// Désactivé : le blocage de /gp/apercu pour les transporteurs beta a été retiré.
// Les transporteurs beta peuvent désormais naviguer librement entre /gp/apercu
// et /t/dashboard. Le hook reste exporté en no-op pour préserver les imports
// existants sans casser la compilation.
export function useBetaRedirectGuard() {
  // intentionally a no-op
}
