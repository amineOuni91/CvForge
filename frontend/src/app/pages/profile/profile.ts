import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { API_BASE_URL } from '../../core/api-config';
import { CvSummary } from '../../models/cv-document';
import { Modal } from '../../ui/modal';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink, TPipe, DatePipe, Modal],
  template: `
    <main class="min-h-screen bg-slate-100 p-6 dark:bg-slate-900">
      <div class="mx-auto mb-6 max-w-6xl">
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'profile.title' | t }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ auth.currentUser()?.email }}</p>
      </div>

      <div class="mx-auto grid max-w-6xl gap-6" [class.md:grid-cols-4]="showConfirmColumn()" [class.md:grid-cols-3]="!showConfirmColumn()">
        <!-- Colonne 1 : Mes CV -->
        <div class="rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
          <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'profile.myCvs.title' | t }}</h2>
          @if (auth.currentUser()?.role === 'admin') {
            <a routerLink="/admin" class="mb-3 block text-sm text-slate-600 hover:underline dark:text-slate-300">{{ 'admin.title' | t }}</a>
          }
          @if (cvs().length === 0) {
            <p class="mb-4 text-sm text-slate-400 dark:text-slate-500">{{ 'dashboard.empty' | t }}</p>
          } @else {
            <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">{{ cvs().length }} CV</p>
            <ul class="mb-4 space-y-3">
              @for (cv of recentCvs(); track cv.id) {
                <li>
                  <a [routerLink]="['/editor', cv.id]" class="block truncate text-sm font-medium text-slate-700 hover:underline dark:text-slate-200">{{ cv.name }}</a>
                  <p class="text-xs text-slate-400 dark:text-slate-500">{{ cv.updatedAt | date: 'dd/MM/yy HH:mm' }}</p>
                </li>
              }
            </ul>
          }
          <a routerLink="/dashboard" class="block w-full rounded border border-slate-300 py-2 text-center text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            {{ 'landing.cta.myCvs' | t }}
          </a>
        </div>

        <!-- Colonne 2 : Identité -->
        <div class="rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
          <form [formGroup]="form" (ngSubmit)="save()">
            <label class="mb-4 block text-sm dark:text-slate-200">
              {{ 'auth.displayName' | t }}
              <input
                type="text"
                formControlName="displayName"
                class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </label>

            <h2 class="mb-1 mt-6 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'profile.personalInfo.title' | t }}</h2>
            <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{{ 'profile.personalInfo.hint' | t }}</p>
            <div class="grid grid-cols-2 gap-3" formGroupName="personalInfo">
              <label class="text-sm dark:text-slate-200">{{ 'profile.firstName' | t }}
                <input formControlName="firstName" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>
              <label class="text-sm dark:text-slate-200">{{ 'profile.lastName' | t }}
                <input formControlName="lastName" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>
              <label class="col-span-2 text-sm dark:text-slate-200">{{ 'profile.jobTitle' | t }}
                <input formControlName="jobTitle" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>
              <label class="text-sm dark:text-slate-200">{{ 'profile.email' | t }}
                <input type="email" formControlName="email" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
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

            @if (saved()) {
              <p class="mb-3 mt-4 text-sm text-green-700 dark:text-green-400">{{ 'profile.saved' | t }}</p>
            }

            <button
              type="submit"
              [disabled]="form.invalid || saving()"
              class="mt-4 w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
            >
              {{ 'profile.save' | t }}
            </button>
          </form>
        </div>

        <!-- Colonne 3 : Sécurité -->
        <div class="rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
          <h2 class="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'profile.email.title' | t }}</h2>
          <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{{ 'profile.email.hint' | t }}</p>

          @if (emailStep() === 'idle') {
            <form [formGroup]="emailForm" (ngSubmit)="requestEmailChange()">
              <label class="mb-3 block text-sm dark:text-slate-200">
                {{ 'profile.email.new' | t }}
                <input type="email" formControlName="newEmail" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>

              @if (emailMessage(); as msg) {
                <p class="mb-3 text-sm" [class.text-green-700]="emailSuccess()" [class.dark:text-green-400]="emailSuccess()"
                   [class.text-red-600]="!emailSuccess()" [class.dark:text-red-400]="!emailSuccess()">{{ msg }}</p>
              }

              <button
                type="submit"
                [disabled]="emailForm.invalid || sendingCode()"
                class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
              >
                {{ 'profile.email.sendCode' | t }}
              </button>
            </form>
          } @else {
            <form [formGroup]="codeForm" (ngSubmit)="confirmEmailChange()">
              <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">{{ 'profile.email.sent' | t }}</p>
              <label class="mb-3 block text-sm dark:text-slate-200">
                {{ 'profile.email.code' | t }}
                <input formControlName="code" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>

              @if (emailMessage(); as msg) {
                <p class="mb-3 text-sm" [class.text-green-700]="emailSuccess()" [class.dark:text-green-400]="emailSuccess()"
                   [class.text-red-600]="!emailSuccess()" [class.dark:text-red-400]="!emailSuccess()">{{ msg }}</p>
              }

              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="codeForm.invalid || confirmingCode()"
                  class="flex-1 rounded bg-slate-800 py-2 text-white disabled:opacity-50"
                >
                  {{ 'profile.email.confirm' | t }}
                </button>
                <button type="button" (click)="cancelEmailChange()" class="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">
                  Annuler
                </button>
              </div>
            </form>
          }

          <hr class="my-6 border-slate-200 dark:border-slate-700" />

          <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'profile.password.title' | t }}</h2>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <label class="mb-3 block text-sm dark:text-slate-200">
              {{ 'profile.password.old' | t }}
              <input type="password" formControlName="oldPassword" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </label>
            <label class="mb-1 block text-sm dark:text-slate-200">
              {{ 'profile.password.new' | t }}
              <input type="password" formControlName="newPassword" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </label>
            <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{{ 'profile.password.hint' | t }}</p>
            <label class="mb-3 block text-sm dark:text-slate-200">
              {{ 'profile.password.confirm' | t }}
              <input type="password" formControlName="confirmPassword" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </label>

            @if (passwordMessage(); as msg) {
              <p class="mb-3 text-sm" [class.text-green-700]="passwordSuccess()" [class.dark:text-green-400]="passwordSuccess()"
                 [class.text-red-600]="!passwordSuccess()" [class.dark:text-red-400]="!passwordSuccess()">{{ msg }}</p>
            }

            <button
              type="submit"
              [disabled]="passwordForm.invalid || changingPassword()"
              class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
            >
              {{ 'profile.password.submit' | t }}
            </button>
          </form>

          <hr class="my-6 border-slate-200 dark:border-slate-700" />

          <button (click)="confirmingLogout.set(true)" class="w-full rounded border border-slate-300 py-2 text-slate-700 dark:border-slate-600 dark:text-slate-200">
            {{ 'profile.logout' | t }}
          </button>

          <hr class="my-6 border-slate-200 dark:border-slate-700" />

          <h2 class="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">{{ 'profile.deleteAccount.title' | t }}</h2>
          <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{{ 'profile.deleteAccount.hint' | t }}</p>
          <form [formGroup]="deleteAccountForm" (ngSubmit)="confirmingDeleteAccount.set(true)">
            <label class="mb-3 block text-sm dark:text-slate-200">
              {{ 'profile.password.old' | t }}
              <input type="password" formControlName="password" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
            </label>

            @if (deleteAccountMessage(); as msg) {
              <p class="mb-3 text-sm text-red-600 dark:text-red-400">{{ msg }}</p>
            }

            <button
              type="submit"
              [disabled]="deleteAccountForm.invalid"
              class="w-full rounded border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {{ 'profile.deleteAccount.submit' | t }}
            </button>
          </form>
        </div>

        @if (confirmingLogout()) {
          <app-modal (close)="confirmingLogout.set(false)">
            <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Se déconnecter ?</h2>
            <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Vous devrez vous reconnecter pour accéder à votre compte.</p>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="confirmingLogout.set(false)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
              <button type="button" (click)="logout()" class="rounded bg-slate-800 px-3 py-1.5 text-sm text-white">Se déconnecter</button>
            </div>
          </app-modal>
        }

        @if (confirmingDeleteAccount()) {
          <app-modal (close)="confirmingDeleteAccount.set(false)">
            <h2 class="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">{{ 'profile.deleteAccount.confirmTitle' | t }}</h2>
            <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">{{ 'profile.deleteAccount.confirmHint' | t }}</p>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="confirmingDeleteAccount.set(false)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
              <button type="button" (click)="deleteAccount()" [disabled]="deletingAccount()" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                {{ 'profile.deleteAccount.confirmSubmit' | t }}
              </button>
            </div>
          </app-modal>
        }

        <!-- Colonne 4 : Confirmation du compte (si email non confirmé) -->
        @if (showConfirmColumn()) {
          <div class="rounded-lg bg-white p-6 shadow-md dark:bg-slate-800">
            <h2 class="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'auth.confirm.title' | t }}</h2>
            <p class="mb-3 text-xs text-slate-400 dark:text-slate-500">{{ 'auth.confirm.hint' | t }}</p>

            <form [formGroup]="confirmForm" (ngSubmit)="confirmAccount()">
              <label class="mb-3 block text-sm dark:text-slate-200">
                {{ 'auth.confirm.code' | t }}
                <input formControlName="code" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
              </label>

              @if (confirmMessage(); as msg) {
                <p class="mb-3 text-sm" [class.text-green-700]="confirmSuccess()" [class.dark:text-green-400]="confirmSuccess()"
                   [class.text-red-600]="!confirmSuccess()" [class.dark:text-red-400]="!confirmSuccess()">{{ msg }}</p>
              }

              <button
                type="submit"
                [disabled]="confirmForm.invalid || confirming()"
                class="w-full rounded bg-slate-800 py-2 text-white disabled:opacity-50"
              >
                {{ 'auth.confirm.submit' | t }}
              </button>
            </form>

            <button
              type="button"
              (click)="resendConfirmation()"
              [disabled]="resendingConfirmation()"
              class="mt-3 w-full rounded border border-slate-300 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
            >
              {{ 'auth.confirm.resend' | t }}
            </button>

            @if (confirmationResent()) {
              <p class="mt-3 text-sm text-green-700 dark:text-green-400">{{ 'auth.confirm.resent' | t }}</p>
            }
          </div>
        }
      </div>
    </main>
  `,
})
export class Profile implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly confirmingLogout = signal(false);
  readonly confirmingDeleteAccount = signal(false);
  readonly deletingAccount = signal(false);
  readonly deleteAccountMessage = signal<string | null>(null);
  readonly changingPassword = signal(false);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordSuccess = signal(false);

  readonly cvs = signal<CvSummary[]>([]);
  readonly recentCvs = computed(() =>
    [...this.cvs()].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1)).slice(0, 5),
  );

  readonly emailStep = signal<'idle' | 'codeSent'>('idle');
  readonly sendingCode = signal(false);
  readonly confirmingCode = signal(false);
  readonly emailMessage = signal<string | null>(null);
  readonly emailSuccess = signal(false);

  readonly showConfirmColumn = computed(() => this.auth.currentUser()?.emailConfirmed === false);
  readonly confirming = signal(false);
  readonly confirmMessage = signal<string | null>(null);
  readonly confirmSuccess = signal(false);
  readonly resendingConfirmation = signal(false);
  readonly confirmationResent = signal(false);

  readonly confirmForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly form = new FormGroup({
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

  readonly passwordForm = new FormGroup({
    oldPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly emailForm = new FormGroup({
    newEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  readonly deleteAccountForm = new FormGroup({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly codeForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.form.patchValue({ displayName: user.displayName, personalInfo: user.profileInfo }, { emitEvent: false });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const cvs = await firstValueFrom(this.http.get<CvSummary[]>(`${API_BASE_URL}/api/cvs`));
    this.cvs.set(cvs);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      const { displayName, personalInfo } = this.form.getRawValue();
      await this.auth.updateProfile(displayName, personalInfo);
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordSuccess.set(false);
      this.passwordMessage.set(this.i18n.t('profile.password.mismatch'));
      return;
    }

    this.changingPassword.set(true);
    this.passwordMessage.set(null);
    try {
      await this.auth.changePassword(oldPassword, newPassword);
      this.passwordSuccess.set(true);
      this.passwordMessage.set(this.i18n.t('profile.password.success'));
      this.passwordForm.reset();
    } catch {
      this.passwordSuccess.set(false);
      this.passwordMessage.set(this.i18n.t('profile.password.error'));
    } finally {
      this.changingPassword.set(false);
    }
  }

  async requestEmailChange(): Promise<void> {
    if (this.emailForm.invalid) return;
    this.sendingCode.set(true);
    this.emailMessage.set(null);
    try {
      await this.auth.requestEmailChange(this.emailForm.getRawValue().newEmail);
      this.emailStep.set('codeSent');
    } catch (err) {
      this.emailSuccess.set(false);
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.emailMessage.set(message ?? this.i18n.t('profile.email.requestError'));
    } finally {
      this.sendingCode.set(false);
    }
  }

  async confirmEmailChange(): Promise<void> {
    if (this.codeForm.invalid) return;
    this.confirmingCode.set(true);
    this.emailMessage.set(null);
    try {
      const newEmail = this.emailForm.getRawValue().newEmail;
      const code = this.codeForm.getRawValue().code;
      await this.auth.confirmEmailChange(newEmail, code);
      this.emailSuccess.set(true);
      this.emailMessage.set(this.i18n.t('profile.email.success'));
      this.emailStep.set('idle');
      this.emailForm.reset();
      this.codeForm.reset();
    } catch {
      this.emailSuccess.set(false);
      this.emailMessage.set(this.i18n.t('profile.email.confirmError'));
    } finally {
      this.confirmingCode.set(false);
    }
  }

  cancelEmailChange(): void {
    this.emailStep.set('idle');
    this.emailMessage.set(null);
    this.codeForm.reset();
  }

  async confirmAccount(): Promise<void> {
    if (this.confirmForm.invalid) return;
    const email = this.auth.currentUser()?.email;
    if (!email) return;
    this.confirming.set(true);
    this.confirmMessage.set(null);
    try {
      await this.auth.confirmEmailCode(email, this.confirmForm.getRawValue().code);
      this.confirmSuccess.set(true);
      this.confirmMessage.set(this.i18n.t('auth.confirm.success'));
      this.confirmForm.reset();
    } catch {
      this.confirmSuccess.set(false);
      this.confirmMessage.set(this.i18n.t('auth.confirm.error'));
    } finally {
      this.confirming.set(false);
    }
  }

  async resendConfirmation(): Promise<void> {
    const email = this.auth.currentUser()?.email;
    if (!email) return;
    this.resendingConfirmation.set(true);
    this.confirmationResent.set(false);
    try {
      await this.auth.resendConfirmationEmail(email);
      this.confirmationResent.set(true);
    } finally {
      this.resendingConfirmation.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  async deleteAccount(): Promise<void> {
    this.deletingAccount.set(true);
    this.deleteAccountMessage.set(null);
    try {
      await this.auth.deleteAccount(this.deleteAccountForm.getRawValue().password);
      this.confirmingDeleteAccount.set(false);
      await this.router.navigateByUrl('/login');
    } catch {
      this.confirmingDeleteAccount.set(false);
      this.deleteAccountMessage.set(this.i18n.t('profile.deleteAccount.error'));
    } finally {
      this.deletingAccount.set(false);
    }
  }
}
