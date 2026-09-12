import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, TPipe],
  template: `
    <main class="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div class="w-80 rounded-lg bg-white p-8 shadow-md dark:bg-slate-800">
        <h1 class="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'profile.title' | t }}</h1>

        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ auth.currentUser()?.email }}</p>

        <form [formGroup]="form" (ngSubmit)="save()">
          <label class="mb-4 block text-sm dark:text-slate-200">
            {{ 'auth.displayName' | t }}
            <input
              type="text"
              formControlName="displayName"
              class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </label>

          @if (saved()) {
            <p class="mb-3 text-sm text-green-700 dark:text-green-400">{{ 'profile.saved' | t }}</p>
          }

          <button
            type="submit"
            [disabled]="form.invalid || saving()"
            class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
          >
            {{ 'profile.save' | t }}
          </button>
        </form>

        <button (click)="logout()" class="mt-4 w-full rounded border border-slate-300 py-2 text-slate-700 dark:border-slate-600 dark:text-slate-200">
          {{ 'profile.logout' | t }}
        </button>
      </div>
    </main>
  `,
})
export class Profile {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) this.form.patchValue({ displayName: user.displayName }, { emitEvent: false });
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      await this.auth.updateDisplayName(this.form.getRawValue().displayName);
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
