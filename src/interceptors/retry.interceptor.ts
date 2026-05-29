import type {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";
import type { NetworkManagerConfig } from "../types";

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;



function calcDelay(attempt: number, baseDelay: number): number {
    const exponential = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 200;
    return exponential + jitter;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


export function applyRetryInterceptor(
    instance: AxiosInstance,
    config: NetworkManagerConfig
): void {
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY;
    const retryStatusCodes = config.retryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES;

    instance.interceptors.response.use(
        (response) => response,

        async (error: AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig;

            if (!originalRequest) {
                return Promise.reject(error);
            }

            if (!originalRequest._metadata) {
                originalRequest._metadata = {};
            }

            const retryCount = originalRequest._metadata.retryCount ?? 0;


            const statusCode = error.response?.status;
            const shouldRetry =
                retryCount < maxRetries &&
                (statusCode === undefined || retryStatusCodes.includes(statusCode)) &&
                !originalRequest._metadata.isRetryAfterRefresh;

            if (!shouldRetry) {
                return Promise.reject(error);
            }


            originalRequest._metadata.retryCount = retryCount + 1;

            const delay = calcDelay(retryCount + 1, retryDelay);

            console.warn(
                `🔁 Retry ${retryCount + 1}/${maxRetries} — ` +
                `${originalRequest.method?.toUpperCase()} ${originalRequest.url} — ` +
                `${delay.toFixed(0)}ms waiting...`
            );

            await sleep(delay);

            return instance(originalRequest);
        }
    );
}