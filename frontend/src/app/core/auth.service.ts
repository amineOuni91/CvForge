import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { PersonalInfo } from '../models/cv-document';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  profileInfo: PersonalInfo;
  emailConfirmed: boolean;
}

interface AccessTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'cvforge.accessToken';
const REFRESH_TOKEN_KEY = 'cvforge.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refreshToken = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  constructor() {
    if (this.accessToken()) {
      // deferred: firing the HTTP call synchronously here re-enters the DI container for
      // AuthService (via authInterceptor's inject(AuthService)) while it's still being
      // constructed, which throws NG0200 and looks like an auth failure -> spurious logout.
      queueMicrotask(() => {
        this.fetchMe().catch(() => this.logout());
      });
    }
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  async register(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/auth/register`, { email, password }));
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<AccessTokenResponse>(`${API_BASE_URL}/api/auth/login?useCookies=false`, { email, password }),
    );
    this.storeTokens(tokens);
    await this.fetchMe();
  }

  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.refreshToken();
    if (!refreshToken) return false;
    try {
      const tokens = await firstValueFrom(
        this.http.post<AccessTokenResponse>(`${API_BASE_URL}/api/auth/refresh`, { refreshToken }),
      );
      this.storeTokens(tokens);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/auth/forgotPassword`, { email }));
  }

  async resetPassword(email: string, resetCode: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/api/auth/resetPassword`, { email, resetCode, newPassword }),
    );
  }

  async resendConfirmationEmail(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/auth/resendConfirmationEmail`, { email }));
  }

  async confirmEmailCode(email: string, code: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/auth/confirm-email-code`, { email, code }));
    if (this.currentUser()?.email === email) await this.fetchMe();
  }

  async updateProfile(displayName: string, personalInfo: PersonalInfo): Promise<void> {
    const user = await firstValueFrom(
      this.http.patch<AuthUser>(`${API_BASE_URL}/api/auth/me`, { displayName, personalInfo }),
    );
    this.currentUser.set(user);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/api/auth/manage/info`, { oldPassword, newPassword }),
    );
  }

  async deleteAccount(password: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/api/auth/me`, { body: { password } }),
    );
    this.logout();
  }

  async requestEmailChange(newEmail: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/auth/email-change/request`, { newEmail }));
  }

  async confirmEmailChange(newEmail: string, code: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<AuthUser>(`${API_BASE_URL}/api/auth/email-change/confirm`, { newEmail, code }),
    );
    this.currentUser.set(user);
  }

  logout(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async fetchMe(): Promise<void> {
    const user = await firstValueFrom(this.http.get<AuthUser>(`${API_BASE_URL}/api/auth/me`));
    this.currentUser.set(user);
  }

  private storeTokens(tokens: AccessTokenResponse): void {
    this.accessToken.set(tokens.accessToken);
    this.refreshToken.set(tokens.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}
