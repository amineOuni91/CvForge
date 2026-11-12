import { isDevMode } from '@angular/core';

// Dev: API on its own port (dotnet watch). Published desktop app (publish.ps1): the API serves the Angular build itself.
export const API_BASE_URL = isDevMode() ? 'http://localhost:5145' : '';
