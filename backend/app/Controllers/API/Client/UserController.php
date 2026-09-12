<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Enums\RoleName;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $query = User::with('roles:id,name')->where('company_id', $user->company_id)->orderByDesc('created_at');

        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'total' => $page->total(),
                'per_page' => $page->perPage(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = Auth::user();

        $this->validate($request, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'role' => 'nullable|string|max:255',
        ]);

        $roleName = $request->input('role');

        // Ensure company-scoped role assignment rules
        if ($roleName) {
            $authz = app(\App\Services\Authorization\AuthorizationService::class);
            if (! $authz->canAssignRole($actor, $roleName)) {
                return response()->json(['message' => 'Not allowed to assign requested role.'], 403);
            }
        }

        $password = Str::random(12);

        $new = User::create([
            'company_id' => $actor->company_id,
            'uuid' => Str::uuid()->toString(),
            'name' => $request->input('name'),
            'email' => User::normalizeEmail($request->input('email')),
            'password' => bcrypt($password),
            'status' => 'pending_verification',
        ]);

        if ($roleName) {
            $role = Role::firstOrCreate(
                ['name' => $roleName],
                ['description' => $roleName === RoleName::COMPANY_DISPATCHER->value ? 'Dispatcher for a tenant company' : 'Company role']
            );

            if ($role->name === RoleName::COMPANY_DISPATCHER->value) {
                $dispatcherPermissions = [
                    'client.access' => 'Access client features',
                    'manage.deliveries' => 'Manage deliveries',
                    'manage.customers' => 'Manage customers',
                    'manage.drivers' => 'Manage drivers',
                ];

                foreach ($dispatcherPermissions as $permissionName => $permissionDescription) {
                    $permission = Permission::firstOrCreate(
                        ['name' => $permissionName],
                        ['description' => $permissionDescription]
                    );
                    $role->permissions()->syncWithoutDetaching($permission);
                }
            }

            $new->assignRole($role);
        }

        $this->recordAudit($request, 'user.created', [
            'new_user_id' => $new->id,
            'company_id' => $actor->company_id,
            'created_by' => $actor->id,
            'role' => $roleName,
            'email' => $new->email,
        ]);

        return response()->json(['data' => $new->load('roles:id,name')], 201);
    }

    public function update(Request $request, User $userModel): JsonResponse
    {
        $actor = Auth::user();

        if ($userModel->company_id !== $actor->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $this->validate($request, [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'status' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|max:255',
        ]);

        $updatedFields = [];
        $roleName = null;

        if ($request->filled('role')) {
            $roleName = $request->input('role');
            $authz = app(\App\Services\Authorization\AuthorizationService::class);
            if (! $authz->canAssignRole($actor, $roleName)) {
                return response()->json(['message' => 'Not allowed to assign requested role.'], 403);
            }
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $userModel->roles()->sync([$role->id]);
                $updatedFields[] = 'role';
            }
        }

        $attrs = $request->only(['name', 'email', 'status']);
        $attrs = array_filter($attrs, fn($v) => $v !== null);
        $updatedFields = array_merge($updatedFields, array_keys($attrs));

        if (! empty($attrs)) {
            $userModel->forceFill($attrs)->save();
        }

        $this->recordAudit($request, 'user.updated', [
            'user_id' => $userModel->id,
            'company_id' => $actor->company_id,
            'updated_by' => $actor->id,
            'updated_fields' => $updatedFields,
            'role' => $roleName,
        ]);

        return response()->json(['data' => $userModel->fresh()]);
    }

    public function destroy(Request $request, User $userModel): JsonResponse
    {
        $actor = Auth::user();
        if ($userModel->company_id !== $actor->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            // Attempt to detach roles and sessions first to reduce FK issues
            try {
                $userModel->roles()->detach();
            } catch (\Throwable $_) {
                // detach best-effort; continue to delete
            }

            try {
                $userModel->sessions()->delete();
            } catch (\Throwable $_) {
                // best-effort
            }

            $userModel->delete();

            $this->recordAudit($request, 'user.deleted', [
                'user_id' => $userModel->id,
                'company_id' => $actor->company_id,
                'deleted_by' => $actor->id,
            ]);

            return response()->json(['message' => 'User deleted']);
        } catch (\Throwable $e) {
            // Log and provide a helpful response without exposing internals
            \Illuminate\Support\Facades\Log::warning('Failed to delete company user', ['error' => $e->getMessage(), 'user_id' => $userModel->id, 'company_id' => $actor->company_id, 'actor_id' => $actor->id]);

            $this->recordAudit($request, 'user.delete_failed', [
                'user_id' => $userModel->id,
                'company_id' => $actor->company_id,
                'failed_by' => $actor->id,
                'reason' => 'delete_failed',
            ]);

            return response()->json(['message' => 'Unable to remove the user because related records exist. Consider suspending the account instead.'], 422);
        }
    }

    public function suspend(Request $request, User $userModel): JsonResponse
    {
        $actor = Auth::user();
        if ($userModel->company_id !== $actor->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $userModel->status = 'suspended';
        $userModel->suspended_at = now();
        $userModel->save();

        $this->recordAudit($request, 'user.suspended', [
            'user_id' => $userModel->id,
            'company_id' => $actor->company_id,
            'suspended_by' => $actor->id,
        ]);

        return response()->json(['data' => $userModel->fresh()]);
    }

    public function activate(Request $request, User $userModel): JsonResponse
    {
        $actor = Auth::user();
        if ($userModel->company_id !== $actor->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $userModel->status = 'active';
        $userModel->suspended_at = null;
        $userModel->approved_at = $userModel->approved_at ?? now();
        $userModel->save();

        $this->recordAudit($request, 'user.activated', [
            'user_id' => $userModel->id,
            'company_id' => $actor->company_id,
            'activated_by' => $actor->id,
        ]);

        return response()->json(['data' => $userModel->fresh()]);
    }

    public function resetPassword(Request $request, User $userModel): JsonResponse
    {
        $actor = Auth::user();
        if ($userModel->company_id !== $actor->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // generate a temporary random password
        $temp = Str::random(12);
        $userModel->password = bcrypt($temp);
        $userModel->last_password_changed_at = now();
        $userModel->save();

        // Note: in production we'd email a reset link or temporary password. Here we return it to the caller for manual delivery.
        $this->recordAudit($request, 'user.password_reset', [
            'user_id' => $userModel->id,
            'company_id' => $actor->company_id,
            'reset_by' => $actor->id,
        ]);

        return response()->json(['message' => 'Password reset', 'temporary_password' => $temp]);
    }
}
