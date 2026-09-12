import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';
import { describeAuthError } from '../../core/auth-error';
import { PasswordInput } from '../../ui/password-input';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TPipe, PasswordInput],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-80 rounded-lg bg-white p-8 shadow-md dark:bg-slate-800"
      >
        <h1 class="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'auth.login.title' | t }}</h1>

        <label class="mb-3 block text-sm dark:text-slate-200">
          {{ 'auth.email' | t }}
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        <label class="mb-4 block text-sm dark:text-slate-200">
          {{ 'auth.password' | t }}
          <app-password-input formControlName="password" class="mt-1" />
        </label>

        @if (error()) {
          <p class="mb-3 text-sm text-red-600 dark:text-red-400">{{ error()! | t }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || submitting()"
          class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {{ 'auth.login.submit' | t }}
        </button>

        <div class="mt-4 flex justify-between text-sm">
          <a routerLink="/forgot-password" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.login.forgot' | t
          }}</a>
          <a routerLink="/register" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.login.register' | t
          }}</a>
        </div>
        <div class="mt-2 text-center text-sm">
          <a routerLink="/confirm-email" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.login.confirmEmail' | t
          }}</a>
        </div>
      </form>
    </main>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/dashboard');
    } catch (err) {
      this.error.set(describeAuthError(err, 'Login', (e) => (e.status === 401 ? 'auth.error.invalidCredentials' : null)));
    } finally {
      this.submitting.set(false);
    }
  }
}
