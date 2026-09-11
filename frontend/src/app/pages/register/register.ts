import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-80 rounded-lg bg-white p-8 shadow-md"
      >
        <h1 class="mb-4 text-xl font-bold text-slate-800">{{ 'auth.register.title' | t }}</h1>

        <label class="mb-3 block text-sm">
          {{ 'auth.email' | t }}
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          />
        </label>

        <label class="mb-4 block text-sm">
          {{ 'auth.password' | t }}
          <input
            type="password"
            formControlName="password"
            class="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          />
        </label>

        @if (error()) {
          <p class="mb-3 text-sm text-red-600">{{ error()! | t }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || submitting()"
          class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
        >
          {{ 'auth.register.submit' | t }}
        </button>

        <div class="mt-4 text-sm">
          {{ 'auth.register.hasAccount' | t }}
          <a routerLink="/login" class="text-slate-600 hover:underline">{{
            'auth.register.login' | t
          }}</a>
        </div>
      </form>
    </main>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.register(email, password);
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error.set('auth.error.generic');
    } finally {
      this.submitting.set(false);
    }
  }
}
