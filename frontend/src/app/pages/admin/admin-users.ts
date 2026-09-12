import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { TPipe } from '../../core/t.pipe';
import { I18nService } from '../../core/i18n.service';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  emailConfirmed: boolean;
  role: 'admin' | 'visitor';
}

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
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
                <td class="p-3 text-slate-600 dark:text-slate-300">{{ (user.role === 'admin' ? 'admin.role.admin' : 'admin.role.visitor') | t }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </main>
  `,
})
export class AdminUsers implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  readonly users = signal<AdminUser[]>([]);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

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
}
