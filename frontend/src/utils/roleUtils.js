export const ROLE_CUSTOMER = "customer";
export const ROLE_STAFF = "staff";
export const ROLE_ADMIN = "admin";

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getCurrentRole() {
  const storedUser = getStoredUser();

  if (!storedUser?.role) {
    return null;
  }

  return String(storedUser.role).toLowerCase();
}

export function isCustomerRole(role) {
  return String(role || "").toLowerCase() === ROLE_CUSTOMER;
}

export function isStaffRole(role) {
  return String(role || "").toLowerCase() === ROLE_STAFF;
}

export function isAdminRole(role) {
  return String(role || "").toLowerCase() === ROLE_ADMIN;
}

export function isStaffOrAdmin(role) {
  return isStaffRole(role) || isAdminRole(role);
}

export function getRoleRedirectPath(role) {
  if (!role) {
    return "/login";
  }

  if (isAdminRole(role)) {
    return "/admin/dashboard";
  }

  if (isStaffRole(role)) {
    return "/staff/orders";
  }

  return "/dashboard";
}

export function canAccessRole(role, allowedRoles = []) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.map((value) => String(value).toLowerCase()).includes(String(role || "").toLowerCase());
}