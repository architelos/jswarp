import { extname } from "node:path";

import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import type { Server as HttpServer, IncomingMessage, ServerResponse } from "node:http";

import { parse } from "node:url";

import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { PathLike } from "node:fs";
import type { FileHandle } from "node:fs/promises";

import { Route } from "./route.js";
import type { ErrorHandler } from "./route.js";


interface RoutesObject {
    [routePath: string]: Route;
}

class App {
    public server: HttpServer | HttpsServer | any;

    private https: boolean;
    private keyFile: PathLike | FileHandle;
    private certFile: PathLike | FileHandle;
    private faviconFile: PathLike;

    private routes: RoutesObject;
    private errorCallback: ErrorHandler | undefined;

    constructor(
        https: boolean = false,
        keyFile: PathLike | FileHandle = "",
        certFile: PathLike | FileHandle = "",
        favicon: PathLike = ""
    ) {
        this.https = https;
        this.keyFile = keyFile;
        this.certFile = certFile;

        this.faviconFile = favicon;
        if (this.faviconFile) {
            this.setFavicon(this.faviconFile);
        }

        this.routes = {};
    }

    private getFaviconRoute(): Route {
        let mimeType: string;

        const fileExtension = extname(this.faviconFile.toString());
        switch (fileExtension) {
            case ".ico":
                mimeType = "image/x-icon";

                break;

            case ".png":
                mimeType = "image/png";

                break;

            case ".jpg":
                mimeType = "image/jpeg";

                break;

            case ".jpeg":
                mimeType = "image/jpeg";

                break;

            default:
                throw new TypeError("invalid favicon file extension");
        }

        const faviconRoute = new Route("/favicon.ico");
        faviconRoute.get((req, res) => {
            res.setHeader("Content-Type", mimeType);

            res.statusCode = 200;
            createReadStream(this.faviconFile).pipe(res);
        });

        return faviconRoute;
    }

    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const method = (req.method || "GET").toLowerCase();

        const url = req.url || "/";
        const routePath = parse(url).pathname || "/";

        const routeObject = this.routes[routePath.toLowerCase()];

        let response;
        try {
            response = routeObject.methodCallbacks[method](req, res);
        } catch (error) {
            if (!routeObject.errorCallback) {
                throw error;
            }

            response = routeObject.errorCallback(req, res, error);
        }

        if (response) {
            res.statusCode = response[0];
            res.end(response[1]);
        }
    }

    public setFavicon(faviconFile: PathLike): this {
        this.faviconFile = faviconFile;

        const faviconRoute = this.getFaviconRoute();
        this.addRoute(faviconRoute);

        return this;
    }

    public errorHandler(handler: ErrorHandler): this {
        this.errorCallback = handler;

        return this;
    }

    public addRoute(route: Route): this {
        this.routes[route.routePath.toLowerCase()] = route;

        return this;
    }

    public addRoutes(routes: Array<Route>): this {
        for (const route of routes) {
            this.routes[route.routePath.toLowerCase()] = route;
        }

        return this;
    }

    public async listen(port: number = 8080): Promise<void> {
        if (this.server) { return; }

        if (this.https && (!this.keyFile || !this.certFile)) {
            throw new TypeError("https but no key or no cert");
        }

        if (!this.https) {
            this.server = createHttpServer(async (req, res) => {
                try {
                    await this.handleRequest(req, res);
                } catch (error) {
                    if (!this.errorCallback) {
                        throw error;
                    }

                    const response = this.errorCallback(req, res, error);
                    if (response) {
                        res.statusCode = response[0];
                        res.end(response[1]);
                    }
                }
            });
        } else {
            const key = await readFile(this.keyFile);
            const cert = await readFile(this.certFile);

            this.server = createHttpsServer({ key: key, cert: cert }, async (req, res) => {
                try {
                    await this.handleRequest(req, res);
                } catch (error) {
                    if (!this.errorCallback) {
                        throw error;
                    }

                    const response = this.errorCallback(req, res, error);
                    if (response) {
                        res.statusCode = response[0];
                        res.end(response[1]);
                    }
                }
            });
        }

        this.server.listen(port);
    }
}

export { App };
export type { RoutesObject };
