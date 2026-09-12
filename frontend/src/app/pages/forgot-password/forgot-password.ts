import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-80 rounded-lg bg-white p-8 shadow-md dark:bg-slate-800"
      >
        <h1 class="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'auth.forgot.title' | t }}</h1>

        <label class="mb-4 block text-sm dark:text-slate-200">
          {{ 'auth.email' | t }}
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </label>

        @if (sent()) {
          <p class="mb-3 text-sm text-green-700 dark:text-green-400">{{ 'auth.forgot.sent' | t }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || submitting()"
          class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {{ 'auth.forgot.submit' | t }}
        </button>

        <div class="mt-4 text-sm">
          <a routerLink="/reset-password" class="text-slate-600 hover:underline dark:text-slate-300">{{
            'auth.reset.title' | t
          }}</a>
        </div>
      </form>
    </main>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly sent = signal(false);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    try {
      await this.auth.forgotPassword(this.form.getRawValue().email);
      this.sent.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
