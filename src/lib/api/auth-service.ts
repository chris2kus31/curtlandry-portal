// src/lib/api/auth-service.ts
import { httpClient } from "./http-client";
import type { AuthResponse } from "@/types/auth";

export const authService = {
  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post("/portal/auth/logout");
    } finally {
      httpClient.clearAuthToken();
    }
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthResponse> {
    return httpClient.get("/portal/auth/me");
  },

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await httpClient.post<AuthResponse>(
      "/portal/auth/refresh",
      { refresh_token: refreshToken }
    );

    // Store new tokens
    if (response.token) {
      httpClient.setAuthToken(response.token);
    }
    if (response.refresh_token) {
      localStorage.setItem("refresh_token", response.refresh_token);
    }

    return response;
  },

  /**
   * Get the Google OAuth redirect URL (Laravel handles the OAuth flow)
   */
  getGoogleLoginUrl(): string {
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
    // Ensure baseUrl ends with /api
    if (!baseUrl.endsWith("/api")) {
      baseUrl = `${baseUrl}/api`;
    }
    return `${baseUrl}/portal/auth/google/redirect`;
  },

  /**
   * Initiate Google login by redirecting to Laravel backend
   */
  initiateGoogleLogin(): void {
    const googleUrl = this.getGoogleLoginUrl();
    console.log("Redirecting to Google OAuth:", googleUrl);
    window.location.href = googleUrl;
  },
};
