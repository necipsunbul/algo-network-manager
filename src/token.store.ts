import { accessTokenTitle, refreshTokenTitle, tokenExpiresAtTitle } from "./app.configs";
import type { TokenPair } from "./types";

class TokenStore {
    private _accessToken: string | null = localStorage.getItem(accessTokenTitle) || null;
    private _refreshToken: string | null = localStorage.getItem(refreshTokenTitle) || null;
    private _expiresAt: number | null = Number(localStorage.getItem(tokenExpiresAtTitle)) || null;


    get accessToken(): string | null {
        return this._accessToken;
    }

    get refreshToken(): string | null {
        return this._refreshToken;
    }


    get isExpired(): boolean {
        if (!this._expiresAt) return false;
        return Date.now() >= this._expiresAt;
    }


    get hasValidToken(): boolean {
        return !!this._accessToken && !this.isExpired;
    }

    setTokens(tokens: TokenPair, expiresIn?: number): void {
        this._accessToken = tokens.accessToken;
        localStorage.setItem(accessTokenTitle, tokens.accessToken);
        if (tokens.refreshToken) {
            this._refreshToken = tokens.refreshToken;
            localStorage.setItem(refreshTokenTitle, tokens.refreshToken);
        }
        if (expiresIn) {
            this._expiresAt = Date.now() + (expiresIn - 10) * 1000;
            localStorage.setItem(tokenExpiresAtTitle, this._expiresAt.toString());
        }
    }

    updateAccessToken(token: string, expiresIn?: number): void {
        this._accessToken = token;

        if (expiresIn) {
            this._expiresAt = Date.now() + (expiresIn - 10) * 1000;
        }
    }


    clear(): void {
        this._accessToken = null;
        this._refreshToken = null;
        this._expiresAt = null;
    }
}

export const tokenStore = new TokenStore();