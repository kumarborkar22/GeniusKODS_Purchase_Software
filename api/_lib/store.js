function getStoreBaseUrl() {
    return String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
}

function getStoreToken() {
    return String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
}

function isStoreConfigured() {
    return Boolean(getStoreBaseUrl() && getStoreToken());
}

function encodeKeySegment(value) {
    return encodeURIComponent(String(value || ''));
}

async function storeRequest(path, method, body) {
    if (!isStoreConfigured()) {
        return null;
    }

    const response = await fetch(getStoreBaseUrl() + '/' + path, {
        method: method || 'GET',
        headers: {
            Authorization: 'Bearer ' + getStoreToken(),
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

async function getJson(key, fallbackValue) {
    const result = await storeRequest('get/' + encodeKeySegment(key), 'GET');

    if (result == null) {
        return fallbackValue;
    }

    if (result.result === null || typeof result.result === 'undefined') {
        return fallbackValue;
    }

    if (typeof result.result === 'string') {
        try {
            return JSON.parse(result.result);
        } catch (error) {
            return fallbackValue;
        }
    }

    return result.result;
}

async function setJson(key, value) {
    await storeRequest('set/' + encodeKeySegment(key) + '/' + encodeKeySegment(JSON.stringify(value)), 'POST');
    return value;
}

module.exports = {
    isStoreConfigured: isStoreConfigured,
    getJson: getJson,
    setJson: setJson
};