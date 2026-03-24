import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AuthService } from './app/core/services/auth.service';

bootstrapApplication(App, appConfig)
  .then(appRef => {
    // Handle OAuth callback on app startup
    const authService = appRef.injector.get(AuthService);
    authService.tryRestoreSession();
  })
  .catch((err) => console.error(err));