import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing) },
  { path: 'accueil', loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.Register) },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'confirm-email',
    loadComponent: () => import('./pages/confirm-email/confirm-email').then((m) => m.ConfirmEmail),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
  {
    path: 'editor/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/editor/editor').then((m) => m.Editor),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin-users').then((m) => m.AdminUsers),
  },
  {
    path: 'admin/users/:userId/cvs/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/editor/editor').then((m) => m.Editor),
  },
  {
    // no authGuard: rendered by the backend's headless Chromium with data injected via
    // window.__cv, no auth token to attach in that context (see PdfService.RenderCvPdfAsync)
    path: 'print/:id',
    loadComponent: () => import('./pages/print/print').then((m) => m.Print),
  },
  {
    // no authGuard: rendered by the backend's headless Chromium with data injected via
    // window.__letter, no auth token to attach in that context (see PdfService)
    path: 'print/letter/:id',
    loadComponent: () => import('./pages/print-letter/print-letter').then((m) => m.PrintLetter),
  },
];
