import type { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

export interface TokenPair {
    accessToken: string;
    refreshToken?: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    message?: string;
    errorCode?: string | number;
    body: {
        accessToken: string;
        refreshToken?: string;
        expireIn?: number;
    };
}

export interface NetworkManagerConfig {
    baseURL: string;
    timeout?: number;
    defaultHeaders?: Record<string, string>;
    refreshEndpoint?: string;
    maxRetries?: number;
    retryDelay?: number;
    retryStatusCodes?: number[];
    enableLogging?: boolean;
    onAuthFailure?: () => void;
    onTokenRefreshed?: (tokens: TokenPair) => void;
}

export interface RequestMetadata {
    startTime?: number;
    retryCount?: number;
    isRetryAfterRefresh?: boolean;
    isRefreshRequest?: boolean;
}

declare module "axios" {
    interface InternalAxiosRequestConfig {
        _metadata?: RequestMetadata;
    }
}

export interface RequestInterceptor {
    name: string;
    onFulfilled?: (
        config: AxiosRequestConfig
    ) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
    onRejected?: (error: unknown) => unknown;
}

export interface ResponseInterceptor {
    name: string;
    onFulfilled?: (
        response: AxiosResponse
    ) => AxiosResponse | Promise<AxiosResponse>;
    onRejected?: (error: AxiosError) => unknown;
}

export class NetworkError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly response?: unknown
    ) {
        super(message);
        this.name = "NetworkError";
    }
}

export class AuthError extends NetworkError {
    constructor(message = "Session expired. Please login again.") {
        super(message, 401);
        this.name = "AuthError";
    }
}

export class TimeoutError extends NetworkError {
    constructor(message = "Request timeout.") {
        super(message, 408);
        this.name = "TimeoutError";
    }
}