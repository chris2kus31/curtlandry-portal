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
      { refresh_token: refreshToken },
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
   * Get the base API URL for OAuth redirects.
   */
  getApiBaseUrl(): string {
    let baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";
    if (!baseUrl.endsWith("/api")) {
      baseUrl = `${baseUrl}/api`;
    }
    return baseUrl;
  },

  /**
   * Get the Google OAuth redirect URL - CurtLandry workspace
   */
  getGoogleLoginUrl(): string {
    return `${this.getApiBaseUrl()}/portal/auth/google/redirect`;
  },

  /**
   * Get the Google OAuth redirect URL - House of David workspace
   */
  getHodGoogleLoginUrl(): string {
    return `${this.getApiBaseUrl()}/portal/auth/google-hod/redirect`;
  },

  /**
   * Initiate Google login by redirecting to Laravel backend (CurtLandry)
   */
  initiateGoogleLogin(): void {
    const googleUrl = this.getGoogleLoginUrl();
    console.log("Redirecting to Google OAuth:", googleUrl);
    window.location.href = googleUrl;
  },

  /**
   * Initiate Google login by redirecting to Laravel backend (House of David)
   */
  initiateHodGoogleLogin(): void {
    const googleUrl = this.getHodGoogleLoginUrl();
    console.log("Redirecting to HOD Google OAuth:", googleUrl);
    window.location.href = googleUrl;
  },

  /**
   * Get list of users available for impersonation (Super Admin only)
   */
  async getImpersonateUsers(): Promise<
    {
      id: number;
      name: string;
      email: string;
      department?: string;
      job_title?: string;
      avatar_url?: string;
    }[]
  > {
    const response = await httpClient.get<{
      success: boolean;
      data: {
        id: number;
        name: string;
        email: string;
        department?: string;
        job_title?: string;
        avatar_url?: string;
      }[];
    }>("/portal/auth/impersonate/users");
    return response.data || [];
  },

  /**
   * Impersonate another user (Super Admin only)
   */
  async impersonate(userId: number): Promise<{
    tokens: { access_token: string; refresh_token: string };
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      full_name: string;
      avatar_url?: string;
      roles: string[];
    };
    impersonated_by: { id: number; name: string };
  }> {
    const response = await httpClient.post<{
      success: boolean;
      message: string;
      data: {
        tokens: { access_token: string; refresh_token: string };
        user: {
          id: number;
          email: string;
          first_name: string;
          last_name: string;
          full_name: string;
          avatar_url?: string;
          roles: string[];
        };
        impersonated_by: { id: number; name: string };
      };
    }>(`/portal/auth/impersonate/${userId}`);

    // Set the new token and clear old auth state
    if (response.data?.tokens?.access_token) {
      // Clear the persisted Zustand auth store to force re-initialization
      localStorage.removeItem("clm-auth");

      // Set new tokens
      localStorage.setItem("auth_token", response.data.tokens.access_token);
      httpClient.setAuthToken(response.data.tokens.access_token);

      if (response.data.tokens.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          response.data.tokens.refresh_token,
        );
      }

      // Store impersonation info so we can show a banner
      localStorage.setItem(
        "impersonated_by",
        JSON.stringify(response.data.impersonated_by),
      );
    }

    return response.data;
  },

  /**
   * Check if currently impersonating
   */
  isImpersonating(): boolean {
    return localStorage.getItem("impersonated_by") !== null;
  },

  /**
   * Get impersonation info
   */
  getImpersonationInfo(): { id: number; name: string } | null {
    const info = localStorage.getItem("impersonated_by");
    return info ? JSON.parse(info) : null;
  },

  /**
   * End impersonation (user should re-login as themselves)
   */
  endImpersonation(): void {
    // Clear all auth state - user needs to re-login
    localStorage.removeItem("impersonated_by");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("clm-auth"); // Clear persisted Zustand store
    httpClient.clearAuthToken();
  },
};
