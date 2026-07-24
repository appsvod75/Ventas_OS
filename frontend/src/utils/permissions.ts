export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function hasRole(...allowed: string[]) {
  const user = getUser();
  return allowed.includes(user.role);
}

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VENTAS: 'Ventas',
} as const;
