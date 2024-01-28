import type { IncomingMessage, ServerResponse } from "node:http";

type ReturnType = [number, string];
type RouteCallback = (req: IncomingMessage, res: ServerResponse) => ReturnType | void;
type ErrorHandler = (req: IncomingMessage, res: ServerResponse, error: unknown) => ReturnType | void;

interface MethodObject {
    [methodName: string]: RouteCallback;
}

class Route {
    public routePath: string;
    public methodCallbacks: MethodObject;
    public errorCallback: ErrorHandler | undefined;

    constructor(routePath: string) {
        this.routePath = routePath;

        const noCallback: RouteCallback = (req, res) => { return [500, "Method not supported by route"]; };
        this.methodCallbacks = {
            get: noCallback,
            post: noCallback,
            put: noCallback,
            patch: noCallback,
            head: noCallback,
            options: noCallback
        };
    }

    public get(callback: RouteCallback): this {
        this.methodCallbacks.get = callback;

        return this;
    }

    public post(callback: RouteCallback): this {
        this.methodCallbacks.post = callback;

        return this;
    }

    public put(callback: RouteCallback): this {
        this.methodCallbacks.put = callback;

        return this;
    }

    public patch(callback: RouteCallback): this {
        this.methodCallbacks.patch = callback;

        return this;
    }

    public head(callback: RouteCallback): this {
        this.methodCallbacks.head = callback;

        return this;
    }

    public options(callback: RouteCallback): this {
        this.methodCallbacks.options = callback;

        return this;
    }

    public errorHandler(handler: ErrorHandler): this {
        this.errorCallback = handler;

        return this;
    }
}

export { Route };
export type { MethodObject, RouteCallback, ErrorHandler };
