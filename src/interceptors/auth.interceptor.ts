import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig,
    type AxiosResponse,
    type AxiosError,
} from "axios";
import { tokenStore } from "../token.store";
import type { NetworkManagerConfig, RefreshTokenResponse, TokenPair } from "../types";
import { AuthError } from "../types";


let isRefreshing = false;

type QueueItem = {
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
};

let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null): void {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token!);
        }
    });
    failedQueue = [];
}


async function doRefresh(
    instance: AxiosInstance,
    config: NetworkManagerConfig
): Promise<string> {
    const rt = tokenStore.refreshToken;

    if (!rt) {
        throw new AuthError("Refresh token bulunamadı.");
    }

    const response = await instance.post<RefreshTokenResponse>(
        config.refreshEndpoint ?? "/auth/refresh",
        { refreshToken: rt },
        {
            // Bu isteğin interceptor'a tekrar girmesini engelle
            _metadata: { isRefreshRequest: true },
        } as InternalAxiosRequestConfig
    );

    const { accessToken, expireIn } = response.data.body;

    const newPair: TokenPair = {
        accessToken: accessToken,
    };

    tokenStore.setTokens(newPair, expireIn);
    config.onTokenRefreshed?.(newPair);

    return accessToken;
}



function setAuthHeader(headers: any, token: string): void {
    if (!headers) return;
    if (typeof headers.set === "function") {
        headers.set("Authorization", `Bearer ${token}`);
    } else {
        delete headers["Authorization"];
        delete headers["authorization"];
        headers["Authorization"] = `Bearer ${token}`;
    }
}



export function applyAuthRequestInterceptor(
    instance: AxiosInstance
): void {
    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            // Refresh token isteği ise Authorization header'ı ekleme
            if (config._metadata?.isRefreshRequest) {
                return config;
            }

            const token = tokenStore.accessToken;
            if (token) {
                setAuthHeader(config.headers, token);
            }

            return config;
        },
        (error) => Promise.reject(error)
    );
}


export function applyAuthResponseInterceptor(
    instance: AxiosInstance,
    config: NetworkManagerConfig
): void {
    instance.interceptors.response.use(
        (response: AxiosResponse) => response,

        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig;

            if (
                error.response?.status !== 401 ||
                originalRequest._metadata?.isRetryAfterRefresh ||
                originalRequest._metadata?.isRefreshRequest
            ) {
                return Promise.reject(error);
            }


            if (isRefreshing) {
                return new Promise<AxiosResponse>((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token) => {
                            originalRequest._metadata = {
                                ...originalRequest._metadata,
                                isRetryAfterRefresh: true,
                            };
                            setAuthHeader(originalRequest.headers, token);
                            resolve(instance(originalRequest));
                        },
                        reject,
                    });
                });
            }


            isRefreshing = true;
            originalRequest._metadata = {
                ...originalRequest._metadata,
                isRetryAfterRefresh: true,
            };

            try {
                const newToken = await doRefresh(instance, config);


                processQueue(null, newToken);

                setAuthHeader(originalRequest.headers, newToken);
                return instance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                tokenStore.clear();
                config.onAuthFailure?.();
                return Promise.reject(new AuthError());
            } finally {
                isRefreshing = false;
            }
        }
    );
}