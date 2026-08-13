export function getUserRoleNames(user: any | null): string[] {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .map((role: any) => role?.name)
    .filter((name): name is string => Boolean(name));
}

export function getUserPermissionNames(user: any | null): string[] {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .flatMap((role: any) => Array.isArray(role?.permissions)
      ? role.permissions
        .map((permission: any) => permission?.name)
        .filter((name): name is string => Boolean(name))
      : [])
    .filter((name, index, value) => value.indexOf(name) === index);
}

export function isPlatformAdminUser(user: any | null): boolean {
  if (!user) {
    return false;
  }

  const roleNames = getUserRoleNames(user);
  const permissions = getUserPermissionNames(user);

  return Boolean(
    user.is_system_owner ||
    user.email?.toLowerCase() === 'systemadmin@d.com' ||
    roleNames.some((name: string) => ['System Administrator', 'System Admin', 'Admin'].includes(name)) ||
    permissions.includes('manage.system') ||
    permissions.includes('manage.platform') ||
    permissions.includes('admin.access')
  );
}
