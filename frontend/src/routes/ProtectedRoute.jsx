import { Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "../context/AuthContext";
import { canAccessRole, getRoleRedirectPath } from "../utils/roleUtils";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, isHydrating, user } = useContext(AuthContext);

  // While hydrating, don't render protected UI or make role decisions
  if (isHydrating) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role || null;

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !canAccessRole(role, allowedRoles)) {
    return <Navigate to={getRoleRedirectPath(role)} replace />;
  }

  return children;
}