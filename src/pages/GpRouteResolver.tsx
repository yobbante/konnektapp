/**
 * GpRouteResolver — Décide quoi rendre pour /gp/:gpId
 *
 * - Si le paramètre ressemble à une référence GP (ex: GP4346) → accès direct
 *   au tableau de bord GP léger via lien personnalisé (GPDirectDashboard).
 * - Sinon (UUID) → profil public GP (GPProfile).
 */
import { useParams } from "react-router-dom";
import GPProfile from "./GPProfile";
import GPDirectDashboard from "./GPDirectDashboard";

const REF_REGEX = /^GP\d{3,}$/i;

export default function GpRouteResolver() {
  const { gpId } = useParams<{ gpId: string }>();
  if (gpId && REF_REGEX.test(gpId)) {
    return <GPDirectDashboard refGp={gpId} />;
  }
  return <GPProfile />;
}
