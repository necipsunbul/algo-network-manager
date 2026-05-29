import type { AxiosInstance, AxiosError } from "axios";
import { NetworkError, AuthError, TimeoutError } from "../types";

export function applyErrorInterceptor(instance: AxiosInstance): void {
    instance.interceptors.response.use(
        (response) => response,

        (error: AxiosError) => {
            if (!error.response) {
                if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
                    return Promise.reject(new TimeoutError());
                }

                return Promise.reject(
                    new NetworkError(
                        "Server response is not available. Please check your internet connection.",
                        undefined,
                        undefined
                    )
                );
            }

            const { status, data } = error.response;

            const serverMessage =
                (data as Record<string, unknown>)?.message as string | undefined ??
                (data as Record<string, unknown>)?.error as string | undefined ??
                error.message;

            switch (status) {
                case 400:
                    return Promise.reject(
                        new NetworkError(`Invalid request: ${serverMessage}`, 400, data)
                    );

                case 401:
                    return Promise.reject(new AuthError());

                case 403:
                    return Promise.reject(
                        new NetworkError(
                            "You don't have permission to perform this operation.",
                            403,
                            data
                        )
                    );

                case 404:
                    return Promise.reject(
                        new NetworkError(
                            `Resource not found: ${error.config?.url}`,
                            404,
                            data
                        )
                    );

                case 422:
                    return Promise.reject(
                        new NetworkError(
                            `Validation error: ${serverMessage}`,
                            422,
                            data
                        )
                    );

                case 429:
                    return Promise.reject(
                        new NetworkError(
                            "Too many requests. Please wait.",
                            429,
                            data
                        )
                    );

                case 500:
                case 502:
                case 503:
                case 504:
                    return Promise.reject(
                        new NetworkError(
                            `Server error (${status}): ${serverMessage}`,
                            status,
                            data
                        )
                    );

                default:
                    return Promise.reject(
                        new NetworkError(serverMessage, status, data)
                    );
            }
        }
    );
}