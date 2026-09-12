import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';
import { describeAuthError } from '../../core/auth-error';

@Component({
  selector: 'app-confirm-email',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-80 rounded-lg bg-white p-8 shadow-md dark:bg-slate-800"
      >
        <h1 class="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'auth.confirm.title' | t }}</h1>
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ 'auth.confirm.hint' | t }}</p>

        <label class="mb-3 block text-sm dark:text-slate-200">
          {{ 'auth.email' | t }}
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        <label class="mb-4 block text-sm dark:text-slate-200">
          {{ 'auth.confirm.code' | t }}
          <input
            type="text"
            formControlName="code"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        @if (success()) {
          <p class="mb-3 text-sm text-green-700 dark:text-green-400">{{ 'auth.confirm.success' | t }}</p>
        }
        @if (error()) {
          <p class="mb-3 text-sm text-red-600 dark:text-red-400">{{ error()! | t }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || submitting()"
          class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {{ 'auth.confirm.submit' | t }}
        </button>

        <button
          type="button"
          (click)="resend()"
          [disabled]="!form.controls.email.value || resending()"
          class="mt-3 w-full rounded border border-slate-300 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
        >
          {{ 'auth.confirm.resend' | t }}
        </button>

        @if (resent()) {
          <p class="mt-3 text-sm text-green-700 dark:text-green-400">{{ 'auth.confirm.resent' | t }}</p>
        }

        <div class="mt-4 text-sm">
          <a routerLink="/login" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.login.title' | t
          }}</a>
        </div>
      </form>
    </main>
  `,
})
export class ConfirmEmail {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly resending = signal(false);
  readonly resent = signal(false);

  readonly form = new FormGroup({
    email: new FormControl(this.route.snapshot.queryParamMap.get('email') ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { email, code } = this.form.getRawValue();
      await this.auth.confirmEmailCode(email, code);
      this.success.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 1500);
    } catch (err) {
      this.error.set(describeAuthError(err, 'ConfirmEmail', (e) => (e.status === 400 ? 'auth.confirm.error' : null)));
    } finally {
      this.submitting.set(false);
    }
  }

  async resend(): Promise<void> {
    const email = this.form.controls.email.value;
    if (!email) return;
    this.resending.set(true);
    this.resent.set(false);
    this.error.set(null);
    try {
      await this.auth.resendConfirmationEmail(email);
      this.resent.set(true);
    } catch (err) {
      this.error.set(describeAuthError(err, 'ResendConfirmation', () => null));
    } finally {
      this.resending.set(false);
    }
  }
}
