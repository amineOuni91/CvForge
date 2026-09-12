import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';
import { describeAuthError, identityErrorCodes } from '../../core/auth-error';
import { PasswordInput } from '../../ui/password-input';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, TPipe, PasswordInput],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-80 rounded-lg bg-white p-8 shadow-md dark:bg-slate-800"
      >
        <h1 class="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'auth.reset.title' | t }}</h1>

        <label class="mb-3 block text-sm dark:text-slate-200">
          {{ 'auth.email' | t }}
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        <label class="mb-3 block text-sm dark:text-slate-200">
          {{ 'auth.reset.code' | t }}
          <input
            type="text"
            formControlName="resetCode"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        <label class="mb-4 block text-sm dark:text-slate-200">
          {{ 'auth.reset.newPassword' | t }}
          <app-password-input formControlName="newPassword" class="mt-1" />
        </label>

        @if (success()) {
          <p class="mb-3 text-sm text-green-700 dark:text-green-400">{{ 'auth.reset.success' | t }}</p>
        }
        @if (error()) {
          <p class="mb-3 text-sm text-red-600 dark:text-red-400">{{ error()! | t }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || submitting()"
          class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {{ 'auth.reset.submit' | t }}
        </button>

        <div class="mt-4 text-sm">
          <a routerLink="/login" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.login.title' | t
          }}</a>
        </div>
      </form>
    </main>
  `,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    resetCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { email, resetCode, newPassword } = this.form.getRawValue();
      await this.auth.resetPassword(email, resetCode, newPassword);
      this.success.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 1500);
    } catch (err) {
      this.error.set(
        describeAuthError(err, 'ResetPassword', (e) => {
          if (e.status !== 400) return null;
          const codes = identityErrorCodes(e);
          if (codes.some((c) => c.startsWith('Password'))) return 'auth.error.weakPassword';
          return 'auth.error.invalidResetCode';
        }),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
