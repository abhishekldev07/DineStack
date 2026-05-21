import { useContext, useMemo } from "react";

import { AuthContext } from "../context/AuthContext";
import { isStaffRole, isAdminRole } from "../utils/roleUtils";

export default function useRole() {
  const { token, user } = useContext(AuthContext);

  return useMemo(() => {
    const role = user?.role || null;

    return {
      token,
      user,
      role,
      isLoggedIn: Boolean(token),
      isCustomer: role === "customer",
      isStaff: isStaffRole(role),
      isAdmin: isAdminRole(role),
      isStaffOrAdmin: isStaffRole(role) || isAdminRole(role)
    };
  }, [token, user]);
}