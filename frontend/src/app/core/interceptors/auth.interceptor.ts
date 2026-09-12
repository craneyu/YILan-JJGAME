import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      // 僅在請求「本來就帶著憑證」卻被拒時才登出。
      // 觀眾端不需登入，若它呼叫到需授權的端點而拿到 401，
      // 不應被強制登出並踢回登入畫面（讓呼叫端自行處理錯誤即可）。
      if (err.status === 401 && req.headers.has("Authorization")) {
        auth.logout();
        router.navigate(["/login"]);
      }
      return throwError(() => err);
    }),
  );
};
