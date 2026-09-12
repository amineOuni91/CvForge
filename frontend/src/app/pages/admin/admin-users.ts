import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { TPipe } from '../../core/t.pipe';
import { I18nService } from '../../core/i18n.service';
import { Modal } from '../../ui/modal';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
  role: 'admin' | 'visitor';
}

type PendingAction =
  | { kind: 'role'; user: AdminUser; newRole: 'admin' | 'visitor' }
  | { kind: 'activate'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser };

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, RouterLink, TPipe, Modal],
  template: `
    <main class="min-h-screen bg-slate-100 p-6 dark:bg-slate-900">
      <div class="mx-auto mb-6 max-w-5xl">
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'admin.title' | t }}</h1>
      </div>

      <div class="mx-auto mb-6 max-w-5xl rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
        <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'admin.createUser.title' | t }}</h2>
        <form [formGroup]="createForm" (ngSubmit)="createUser()" class="flex flex-wrap items-end gap-3">
          <label class="text-sm dark:text-slate-200">
            {{ 'admin.createUser.email' | t }}
            <input type="email" formControlName="email" class="mt-1 block rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </label>
          <label class="text-sm dark:text-slate-200">
            {{ 'admin.createUser.password' | t }}
            <input type="password" formControlName="password" class="mt-1 block rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
          </label>
          <label class="text-sm dark:text-slate-200">
            {{ 'admin.createUser.role' | t }}
            <select formControlName="role" class="mt-1 block rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
              <option value="visitor">{{ 'admin.role.visitor' | t }}</option>
              <option value="admin">{{ 'admin.role.admin' | t }}</option>
            </select>
          </label>
          <button type="submit" [disabled]="createForm.invalid || creating()" class="rounded bg-slate-800 px-4 py-1.5 text-sm text-white disabled:opacity-50">
            {{ 'admin.createUser.submit' | t }}
          </button>
        </form>
        @if (createError(); as msg) {
          <p class="mt-3 text-sm text-red-600 dark:text-red-400">{{ msg }}</p>
        }
      </div>

      <div class="mx-auto max-w-5xl overflow-x-auto rounded-lg bg-white shadow-md dark:bg-slate-800">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th class="p-3">{{ 'admin.table.email' | t }}</th>
              <th class="p-3">{{ 'admin.table.displayName' | t }}</th>
              <th class="p-3">{{ 'admin.table.confirmed' | t }}</th>
              <th class="p-3">{{ 'admin.table.role' | t }}</th>
              <th class="p-3">{{ 'admin.table.actions' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr class="border-b border-slate-100 dark:border-slate-700">
                <td class="p-3 text-slate-800 dark:text-slate-100">{{ user.email }}</td>
                <td class="p-3 text-slate-600 dark:text-slate-300">{{ user.displayName }}</td>
                <td class="p-3">
                  <span class="rounded-full px-2 py-0.5 text-xs" [class.bg-green-100]="user.emailConfirmed" [class.text-green-700]="user.emailConfirmed"
                        [class.bg-amber-100]="!user.emailConfirmed" [class.text-amber-700]="!user.emailConfirmed">
                    {{ (user.emailConfirmed ? 'admin.confirmed.yes' : 'admin.confirmed.no') | t }}
                  </span>
                </td>
                <td class="p-3">
                  <select
                    [value]="user.role"
                    (change)="askRoleChange(user, $any($event.target).value)"
                    class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="visitor">{{ 'admin.role.visitor' | t }}</option>
                    <option value="admin">{{ 'admin.role.admin' | t }}</option>
                  </select>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-2 text-xs">
                    @if (!user.emailConfirmed) {
                      <button type="button" (click)="askActivate(user)" class="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200">
                        {{ 'admin.action.activate' | t }}
                      </button>
                    }
                    @if (resettingId() === user.id) {
                      <input #newPasswordInput type="password" [placeholder]="'admin.createUser.password' | t" class="w-28 rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                      <button type="button" (click)="confirmResetPassword(user, newPasswordInput.value)" class="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200">
                        {{ 'admin.action.confirm' | t }}
                      </button>
                      <button type="button" (click)="resettingId.set(null)" class="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200">
                        {{ 'admin.action.cancel' | t }}
                      </button>
                    } @else {
                      <button type="button" (click)="resettingId.set(user.id)" class="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200">
                        {{ 'admin.action.resetPassword' | t }}
                      </button>
                    }
                    <button type="button" (click)="askDelete(user)" class="rounded border border-red-300 px-2 py-1 text-red-600 dark:border-red-800 dark:text-red-400">
                      {{ 'admin.action.delete' | t }}
                    </button>
                  </div>
                  @if (actionMessage()?.userId === user.id) {
                    <p class="mt-1 text-xs text-red-600 dark:text-red-400">{{ actionMessage()?.text }}</p>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (pending(); as action) {
        <app-modal (close)="pending.set(null)">
          <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{{ confirmTitle(action) }}</h2>
          <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ confirmHint(action) }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" (click)="pending.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">
              {{ 'admin.action.cancel' | t }}
            </button>
            <button type="button" (click)="confirmPending()" class="rounded bg-slate-800 px-3 py-1.5 text-sm text-white">
              {{ 'admin.action.confirm' | t }}
            </button>
          </div>
        </app-modal>
      }
    </main>
  `,
})
export class AdminUsers implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  readonly users = signal<AdminUser[]>([]);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly resettingId = signal<string | null>(null);
  readonly pending = signal<PendingAction | null>(null);
  readonly actionMessage = signal<{ userId: string; text: string } | null>(null);

  readonly createForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    role: new FormControl<'admin' | 'visitor'>('visitor', { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    const users = await firstValueFrom(this.http.get<AdminUser[]>(`${API_BASE_URL}/api/admin/users`));
    this.users.set(users);
  }

  async createUser(): Promise<void> {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    this.createError.set(null);
    try {
      const { email, password, role } = this.createForm.getRawValue();
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/admin/users`, { email, password, role }));
      this.createForm.reset({ role: 'visitor' });
      await this.reload();
    } catch (err) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.createError.set(message ?? this.i18n.t('admin.createUser.error'));
    } finally {
      this.creating.set(false);
    }
  }

  askRoleChange(user: AdminUser, newRole: 'admin' | 'visitor'): void {
    if (newRole === user.role) return;
    this.pending.set({ kind: 'role', user, newRole });
  }

  askActivate(user: AdminUser): void {
    this.pending.set({ kind: 'activate', user });
  }

  askDelete(user: AdminUser): void {
    this.pending.set({ kind: 'delete', user });
  }

  confirmTitle(action: PendingAction): string {
    switch (action.kind) {
      case 'role':
        return `Changer le rôle de ${action.user.email} ?`;
      case 'activate':
        return `Activer le compte de ${action.user.email} ?`;
      case 'delete':
        return `Supprimer ${action.user.email} ?`;
    }
  }

  confirmHint(action: PendingAction): string {
    switch (action.kind) {
      case 'role':
        return `Nouveau rôle : ${action.newRole === 'admin' ? 'Administrateur' : 'Visiteur'}.`;
      case 'activate':
        return 'Le compte sera marqué confirmé sans code ni email.';
      case 'delete':
        return 'Cette action est définitive : le compte et tous ses CV seront supprimés.';
    }
  }

  async confirmPending(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    this.pending.set(null);

    try {
      if (action.kind === 'role') {
        // PATCH takes the whole editable record at once (same contract as PATCH /api/auth/me
        // elsewhere in this app) — fetch the current detail first so this role-only change
        // doesn't blank out the target's displayName/personalInfo.
        const detail = await firstValueFrom(
          this.http.get<AdminRoleChangeDetail>(`${API_BASE_URL}/api/admin/users/${action.user.id}`),
        );
        const body = {
          displayName: detail.displayName,
          personalInfo: detail.profileInfo,
          email: detail.email,
          role: action.newRole,
        };
        await firstValueFrom(this.http.patch(`${API_BASE_URL}/api/admin/users/${action.user.id}`, body));
      } else if (action.kind === 'activate') {
        await firstValueFrom(this.http.post(`${API_BASE_URL}/api/admin/users/${action.user.id}/activate`, {}));
      } else {
        await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/admin/users/${action.user.id}`));
      }
      await this.reload();
    } catch {
      this.actionMessage.set({ userId: action.user.id, text: "Échec de l'action." });
    }
  }

  async confirmResetPassword(user: AdminUser, newPassword: string): Promise<void> {
    if (!newPassword) return;
    try {
      await firstValueFrom(this.http.post(`${API_BASE_URL}/api/admin/users/${user.id}/reset-password`, { newPassword }));
      this.resettingId.set(null);
    } catch {
      this.actionMessage.set({ userId: user.id, text: 'Mot de passe refusé (critères non respectés).' });
    }
  }
}

/**
 * Narrow shape for the get-before-patch in confirmPending's 'role' branch — this task doesn't
 * introduce the full `AdminUserDetail` interface yet (that's Task 7), just the 3 fields needed
 * to round-trip a role-only change without touching anything else.
 */
interface AdminRoleChangeDetail {
  displayName: string;
  profileInfo: unknown;
  email: string;
}
