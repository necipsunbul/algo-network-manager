import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from "axios";

import { tokenStore } from "./token.store";
import {
    applyAuthRequestInterceptor,
    applyAuthResponseInterceptor,
} from "./interceptors/auth.interceptor";
import { applyRetryInterceptor } from "./interceptors/retry.interceptor";
import { applyLoggerInterceptor } from "./interceptors/logger.interceptor";
import { applyErrorInterceptor } from "./interceptors/error.interceptor";

import type { NetworkManagerConfig, TokenPair } from "./types";

// ─── NetworkManager ───────────────────────────────────────────────────────────

export class NetworkManager {
    private readonly instance: AxiosInstance;
    private readonly config: Required<
        Pick<NetworkManagerConfig, "baseURL" | "timeout" | "enableLogging">
    > &
        NetworkManagerConfig;

    constructor(config: NetworkManagerConfig) {

        this.config = {
            timeout: 10_000,
            refreshEndpoint: '/auth/refresh',
            maxRetries: 3,
            retryDelay: 1_000,
            retryStatusCodes: [408, 429, 500, 502, 503, 504],
            enableLogging: false,
            ...config,
        };

        this.instance = axios.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...this.config.defaultHeaders,
            },
        });

        applyLoggerInterceptor(this.instance, this.config.enableLogging ?? true);
        applyRetryInterceptor(this.instance, this.config);
        applyAuthRequestInterceptor(this.instance);
        applyAuthResponseInterceptor(this.instance, this.config);
        applyErrorInterceptor(this.instance);
    }

    setTokens(tokens: TokenPair, expiresIn?: number): void {
        tokenStore.setTokens(tokens, expiresIn);
    }

    clearTokens(): void {
        tokenStore.clear();
    }

    getAccessToken(): string | null {
        return tokenStore.accessToken;
    }

    async get<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response: AxiosResponse<T> = await this.instance.get(url, config);
        return response.data;
    }

    async post<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response: AxiosResponse<T> = await this.instance.post(
            url,
            data,
            config
        );
        return response.data;
    }

    async put<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response: AxiosResponse<T> = await this.instance.put(
            url,
            data,
            config
        );
        return response.data;
    }

    async patch<T = unknown>(
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response: AxiosResponse<T> = await this.instance.patch(
            url,
            data,
            config
        );
        return response.data;
    }

    async delete<T = unknown>(
        url: string,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response: AxiosResponse<T> = await this.instance.delete(url, config);
        return response.data;
    }

    get axiosInstance(): AxiosInstance {
        return this.instance;
    }
}