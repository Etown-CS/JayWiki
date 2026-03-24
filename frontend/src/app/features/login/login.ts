import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
})
export class Login {
  constructor(public authService: AuthService) {}

  loginGoogle() {
    this.authService.loginWithGoogle();
  }

  loginMicrosoft() {
    this.authService.loginWithMicrosoft();
  }
}