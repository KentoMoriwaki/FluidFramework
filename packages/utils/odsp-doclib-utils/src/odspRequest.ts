/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import fetch from "node-fetch";
import {
    IOdspAuthRequestInfo,
    authRequestWithRetry,
} from "./odspAuth";

export async function getAsync(
    url: string,
    authRequestInfo: IOdspAuthRequestInfo,
): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return authRequest(authRequestInfo, async (config: RequestInit) => fetch(url, config));
}

export async function putAsync(
    url: string,
    authRequestInfo: IOdspAuthRequestInfo,
): Promise<Response> {
    return authRequest(authRequestInfo, async (config: RequestInit) => {
        const putConfig = {
            ...config,
            method: "PUT",
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return fetch(url, putConfig);
    });
}

export async function postAsync(
    url: string,
    body: any,
    authRequestInfo: IOdspAuthRequestInfo,
): Promise<Response> {
    return authRequest(authRequestInfo, async (config: RequestInit) => {
        const postConfig = {
            ...config,
            body,
            method: "POST",
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return fetch(url, postConfig);
    });
}

export async function unauthPostAsync(url: string, body: any): Promise<Response> {
    return safeRequestCore(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return fetch(url, { body, method: "POST" });
    });
}

async function authRequest(
    authRequestInfo: IOdspAuthRequestInfo,
    requestCallback: (config: RequestInit) => Promise<Response>,
): Promise<Response> {
    return authRequestWithRetry(
        authRequestInfo,
        async (config: RequestInit) => safeRequestCore(async () => requestCallback(config)),
    );
}

async function safeRequestCore(requestCallback: () => Promise<Response>): Promise<Response> {
    let response: Response;
    try {
        response = await requestCallback();
    } catch (error) {
        if (error?.response?.status) {
            response = error.response;
        } else {
            throw error;
        }
    }
    return response;
}
