import type {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from "axios";


const c = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m",
};

function colorize(color: keyof typeof c, text: string): string {
    return `${c[color]}${text}${c.reset}`;
}

function statusColor(status: number): string {
    if (status < 300) return colorize("green", String(status));
    if (status < 400) return colorize("yellow", String(status));
    return colorize("red", String(status));
}

function methodColor(method: string): string {
    const colors: Record<string, keyof typeof c> = {
        GET: "cyan",
        POST: "green",
        PUT: "yellow",
        PATCH: "yellow",
        DELETE: "red",
    };
    return colorize(colors[method.toUpperCase()] ?? "magenta", method.toUpperCase());
}


export function applyLoggerInterceptor(
    instance: AxiosInstance,
    enabled: boolean
): void {
    if (!enabled) return;

    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            config._metadata = {
                ...config._metadata,
                startTime: Date.now(),
            };

            const method = methodColor(config.method ?? "GET");
            const url = `${config.baseURL ?? ""}${config.url ?? ""}`;

            console.log(
                `${colorize("dim", "→")} ${method} ${colorize("bold", url)}`
            );

            if (config.params && Object.keys(config.params).length > 0) {
                console.log(
                    `  ${colorize("dim", "params:")}`,
                    JSON.stringify(config.params)
                );
            }

            if (config.data) {
                console.log(`  ${colorize("dim", "body:")}`, config.data);
            }

            return config;
        },
        (error) => {
            console.error(colorize("red", "✖ Request initialize error:"), error);
            return Promise.reject(error);
        }
    );

    instance.interceptors.response.use(
        (response: AxiosResponse) => {
            const elapsed = response.config._metadata?.startTime
                ? `${Date.now() - response.config._metadata.startTime}ms`
                : "?ms";

            const method = methodColor(response.config.method ?? "GET");
            const url = `${response.config.baseURL ?? ""}${response.config.url ?? ""}`;
            const status = statusColor(response.status);

            console.log(
                `${colorize("dim", "←")} ${method} ${colorize("bold", url)} ` +
                `${status} ${colorize("dim", elapsed)}`
            );

            return response;
        },

        (error: AxiosError) => {
            const config = error.config;
            const elapsed =
                config?._metadata?.startTime
                    ? `${Date.now() - config._metadata.startTime}ms`
                    : "?ms";

            const method = config ? methodColor(config.method ?? "GET") : "???";
            const url = config
                ? `${config.baseURL ?? ""}${config.url ?? ""}`
                : "unknown";

            const status = error.response
                ? statusColor(error.response.status)
                : colorize("red", "ERR");

            console.error(
                `${colorize("red", "✖")} ${method} ${colorize("bold", url)} ` +
                `${status} ${colorize("dim", elapsed)} — ${error.message}`
            );

            return Promise.reject(error);
        }
    );
}