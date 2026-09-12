import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);

  if (!auth.currentUser()) {
    try {
      await auth.fetchMe();
    } catch {
      return router.createUrlTree(['/login']);
    }
  }

  return auth.currentUser()?.role === 'admin' ? true : router.createUrlTree(['/dashboard']);
};
