import { DatePipe } from '@angular/common';
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
  cvCount: number;
}

export interface AdminUserDetail extends AdminUser {
  profileInfo: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    linkedIn: string;
    gitHub: string;
    portfolio: string;
    website: string;
  };
}

export interface AdminCvSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

type PendingAction =
  | { kind: 'role'; user: AdminUser; newRole: 'admin' | 'visitor' }
  | { kind: 'activate'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | { kind: 'deleteCv'; user: AdminUser; cv: AdminCvSummary };

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, RouterLink, TPipe, Modal, DatePipe],
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
          <thead class="border-b border-slate-200 text-xs font-medium tracking-wide text-slate-400 uppercase dark:border-slate-700 dark:text-slate-500">
            <tr>
              <th class="p-3">{{ 'admin.table.email' | t }}</th>
              <th class="p-3">{{ 'admin.table.confirmed' | t }}</th>
              <th class="p-3">{{ 'admin.table.cvCount' | t }}</th>
              <th class="p-3">{{ 'admin.table.role' | t }}</th>
              <th class="p-3">{{ 'admin.table.actions' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr class="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40">
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {{ user.email.charAt(0).toUpperCase() }}
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-slate-800 dark:text-slate-100">{{ user.displayName || user.email }}</p>
                      <p class="truncate text-xs text-slate-400 dark:text-slate-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-3">
                  <span class="rounded-full px-2 py-0.5 text-xs" [class.bg-green-100]="user.emailConfirmed" [class.text-green-700]="user.emailConfirmed"
                        [class.bg-amber-100]="!user.emailConfirmed" [class.text-amber-700]="!user.emailConfirmed">
                    {{ (user.emailConfirmed ? 'admin.confirmed.yes' : 'admin.confirmed.no') | t }}
                  </span>
                </td>
                <td class="p-3 text-slate-600 dark:text-slate-300">{{ user.cvCount }}</td>
                <td class="p-3">
                  <select
                    [value]="user.role"
                    (change)="askRoleChange(user, $any($event.target).value)"
                    class="rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="visitor">{{ 'admin.role.visitor' | t }}</option>
                    <option value="admin">{{ 'admin.role.admin' | t }}</option>
                  </select>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap items-center gap-1">
                    @if (!user.emailConfirmed) {
                      <button type="button" (click)="askActivate(user)" [title]="'admin.action.activate' | t" [attr.aria-label]="'admin.action.activate' | t"
                              class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                        ✅
                      </button>
                    }
                    @if (resettingId() === user.id) {
                      <input #newPasswordInput type="password" [placeholder]="'admin.createUser.password' | t" class="w-28 rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                      <button type="button" (click)="confirmResetPassword(user, newPasswordInput.value)" [title]="'admin.action.confirm' | t" [attr.aria-label]="'admin.action.confirm' | t"
                              class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                        ✔️
                      </button>
                      <button type="button" (click)="resettingId.set(null)" [title]="'admin.action.cancel' | t" [attr.aria-label]="'admin.action.cancel' | t"
                              class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                        ✖️
                      </button>
                    } @else {
                      <button type="button" (click)="resettingId.set(user.id)" [title]="'admin.action.resetPassword' | t" [attr.aria-label]="'admin.action.resetPassword' | t"
                              class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                        🔑
                      </button>
                    }
                    <button type="button" (click)="toggleExpand(user)" [title]="'admin.action.viewEdit' | t" [attr.aria-label]="'admin.action.viewEdit' | t"
                            class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
                      ✏️
                    </button>
                    <button type="button" (click)="askDelete(user)" [title]="'admin.action.delete' | t" [attr.aria-label]="'admin.action.delete' | t"
                            class="rounded-full p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300">
                      🗑️
                    </button>
                  </div>
                  @if (actionMessage()?.userId === user.id) {
                    <p class="mt-1 text-xs text-red-600 dark:text-red-400">{{ actionMessage()?.text }}</p>
                  }
                </td>
              </tr>
              @if (expandedId() === user.id && expandedDetail(); as detail) {
                <tr class="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                  <td colspan="5" class="p-4">
                    <form [formGroup]="detailForm" (ngSubmit)="saveDetail(user)" class="mb-4 grid grid-cols-2 gap-3">
                      <label class="text-sm dark:text-slate-200">{{ 'auth.displayName' | t }}
                        <input formControlName="displayName" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                      </label>
                      <div formGroupName="personalInfo" class="col-span-2 grid grid-cols-2 gap-3">
                        <label class="text-sm dark:text-slate-200">{{ 'profile.firstName' | t }}
                          <input formControlName="firstName" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.lastName' | t }}
                          <input formControlName="lastName" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="col-span-2 text-sm dark:text-slate-200">{{ 'profile.jobTitle' | t }}
                          <input formControlName="jobTitle" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.phone' | t }}
                          <input formControlName="phone" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.city' | t }}
                          <input formControlName="city" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.country' | t }}
                          <input formControlName="country" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.linkedIn' | t }}
                          <input formControlName="linkedIn" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.gitHub' | t }}
                          <input formControlName="gitHub" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.portfolio' | t }}
                          <input formControlName="portfolio" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                        <label class="text-sm dark:text-slate-200">{{ 'profile.website' | t }}
                          <input formControlName="website" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
                        </label>
                      </div>
                      <button type="submit" [disabled]="detailForm.invalid || savingDetail()" class="col-span-2 rounded bg-slate-800 px-4 py-1.5 text-sm text-white disabled:opacity-50">
                        {{ 'profile.save' | t }}
                      </button>
                      @if (detailSaved()) {
                        <p class="col-span-2 text-sm text-green-700 dark:text-green-400">{{ 'profile.saved' | t }}</p>
                      }
                    </form>

                    <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'admin.cvs.title' | t }}</h3>
                    @if (userCvs().length === 0) {
                      <p class="text-sm text-slate-400 dark:text-slate-500">{{ 'dashboard.empty' | t }}</p>
                    } @else {
                      <ul class="divide-y divide-slate-100 dark:divide-slate-700">
                        @for (cv of userCvs(); track cv.id) {
                          <li class="flex items-center justify-between py-1.5 text-sm">
                            <a [routerLink]="['/admin/users', user.id, 'cvs', cv.id]" class="text-slate-700 hover:underline dark:text-slate-200">{{ cv.name }} <span class="text-xs text-slate-400">({{ cv.updatedAt | date: 'dd/MM/yy HH:mm' }})</span></a>
                            <button type="button" (click)="askDeleteCv(user, cv)" [title]="'admin.action.delete' | t" [attr.aria-label]="'admin.action.delete' | t"
                                    class="rounded-full p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300">
                              🗑️
                            </button>
                          </li>
                        }
                      </ul>
                    }
                  </td>
                </tr>
              }
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
  readonly expandedId = signal<string | null>(null);
  readonly expandedDetail = signal<AdminUserDetail | null>(null);
  readonly userCvs = signal<AdminCvSummary[]>([]);
  readonly savingDetail = signal(false);
  readonly detailSaved = signal(false);

  readonly createForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    role: new FormControl<'admin' | 'visitor'>('visitor', { nonNullable: true }),
  });

  readonly detailForm = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    personalInfo: new FormGroup({
      firstName: new FormControl('', { nonNullable: true }),
      lastName: new FormControl('', { nonNullable: true }),
      jobTitle: new FormControl('', { nonNullable: true }),
      email: new FormControl('', { nonNullable: true }),
      phone: new FormControl('', { nonNullable: true }),
      city: new FormControl('', { nonNullable: true }),
      country: new FormControl('', { nonNullable: true }),
      linkedIn: new FormControl('', { nonNullable: true }),
      gitHub: new FormControl('', { nonNullable: true }),
      portfolio: new FormControl('', { nonNullable: true }),
      website: new FormControl('', { nonNullable: true }),
    }),
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

  askDeleteCv(user: AdminUser, cv: AdminCvSummary): void {
    this.pending.set({ kind: 'deleteCv', user, cv });
  }

  async toggleExpand(user: AdminUser): Promise<void> {
    if (this.expandedId() === user.id) {
      this.expandedId.set(null);
      this.expandedDetail.set(null);
      return;
    }
    this.expandedId.set(user.id);
    this.detailSaved.set(false);
    const [detail, cvs] = await Promise.all([
      firstValueFrom(this.http.get<AdminUserDetail>(`${API_BASE_URL}/api/admin/users/${user.id}`)),
      firstValueFrom(this.http.get<AdminCvSummary[]>(`${API_BASE_URL}/api/admin/users/${user.id}/cvs`)),
    ]);
    this.expandedDetail.set(detail);
    this.userCvs.set(cvs);
    this.detailForm.patchValue({ displayName: detail.displayName, personalInfo: detail.profileInfo });
  }

  async saveDetail(user: AdminUser): Promise<void> {
    if (this.detailForm.invalid) return;
    this.savingDetail.set(true);
    this.detailSaved.set(false);
    try {
      const { displayName, personalInfo } = this.detailForm.getRawValue();
      await firstValueFrom(
        this.http.patch(`${API_BASE_URL}/api/admin/users/${user.id}`, { displayName, personalInfo, email: user.email, role: user.role }),
      );
      this.detailSaved.set(true);
      await this.reload();
    } finally {
      this.savingDetail.set(false);
    }
  }

  confirmTitle(action: PendingAction): string {
    switch (action.kind) {
      case 'role':
        return `Changer le rôle de ${action.user.email} ?`;
      case 'activate':
        return `Activer le compte de ${action.user.email} ?`;
      case 'delete':
        return `Supprimer ${action.user.email} ?`;
      case 'deleteCv':
        return `Supprimer « ${action.cv.name} » ?`;
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
      case 'deleteCv':
        return 'Cette action est définitive.';
    }
  }

  async confirmPending(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    this.pending.set(null);

    try {
      if (action.kind === 'role') {
        const detail = await firstValueFrom(
          this.http.get<AdminUserDetail>(`${API_BASE_URL}/api/admin/users/${action.user.id}`),
        );
        const body = {
          displayName: detail.displayName,
          personalInfo: detail.profileInfo,
          email: detail.email,
          role: action.newRole,
        };
        await firstValueFrom(this.http.patch(`${API_BASE_URL}/api/admin/users/${action.user.id}`, body));
        await this.reload();
      } else if (action.kind === 'activate') {
        await firstValueFrom(this.http.post(`${API_BASE_URL}/api/admin/users/${action.user.id}/activate`, {}));
        await this.reload();
      } else if (action.kind === 'delete') {
        await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/admin/users/${action.user.id}`));
        await this.reload();
      } else {
        await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/admin/users/${action.user.id}/cvs/${action.cv.id}`));
        this.userCvs.update((list) => list.filter((c) => c.id !== action.cv.id));
      }
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
