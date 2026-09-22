type RoleLike = { name?: string | null; permissions?: Array<{ name?: string | null }> | null };
type UserLike = { roles?: RoleLike[] | null; is_system_owner?: boolean; email?: string | null };

export function getUserRoleNames(user: UserLike | null): string[] {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .map((role: RoleLike) => role?.name)
    .filter((name): name is string => Boolean(name));
}

export function getUserPermissionNames(user: UserLike | null): string[] {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .flatMap((role: RoleLike) => Array.isArray(role?.permissions)
      ? role.permissions
        .map((permission: { name?: string | null }) => permission?.name)
        .filter((name): name is string => Boolean(name))
      : [])
    .filter((name: string, index: number, value: string[]) => value.indexOf(name) === index);
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
