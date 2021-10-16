import * as CryptoJS from 'crypto-js';
import * as request from 'request-promise-native';
import * as qs from 'qs';
import { RequiredUriUrl } from 'request';
import { RequestPromiseOptions } from 'request-promise-native';

function createNonce() {
	var s = '',
		length = 32;
	do {
		s += Math.random().toString(36).substr(2);
	} while (s.length < length);
	s = s.substr(0, length);
	return s;
}

const getAuthHeader = (
	key: string,
	secret: string,
	time: string,
	nonce: string,
	organizationId: string,
	request: {
		method: string;
		path: string;
		query?: any;
		body?: any;
	}
) => {
	// secret =
	// 	'fd8a1652-728b-42fe-82b8-f623e56da8850750f5bf-ce66-4ca7-8b84-93651abc723b';
	// key = '4ebd366d-76f4-4400-a3b6-e51515d054d6';
	// time = '1543597115712';
	// nonce = '9675d0f8-1325-484b-9594-c9d6d3268890';
	// organizationId = 'da41b3bc-3d0b-4226-b7ea-aee73f94a518';
	// request.method = 'GET';
	// request.path = '/main/api/v2/hashpower/orderBook';
	// request.query = 'algorithm=X16R&page=0&size=100';
	// request.body = undefined;

	console.log(secret);
	console.log(key);
	console.log(time);
	console.log(nonce);
	console.log(organizationId);
	console.log(request.method);
	console.log(request.path);
	console.log(request.query);
	console.log(request.body);

	const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secret);

	hmac.update(key);
	hmac.update('\0');
	hmac.update(time);
	hmac.update('\0');
	hmac.update(nonce);
	hmac.update('\0');
	hmac.update('\0');
	if (organizationId) hmac.update(organizationId);
	hmac.update('\0');
	hmac.update('\0');
	hmac.update(request.method);
	hmac.update('\0');
	hmac.update(request.path);
	hmac.update('\0');
	if (request.query)
		hmac.update(
			typeof request.query == 'object'
				? qs.stringify(request.query)
				: request.query
		);
	if (request.body) {
		hmac.update('\0');
		hmac.update(
			typeof request.body == 'object'
				? JSON.stringify(request.body)
				: request.body
		);
	}

	const authKey = key + ':' + hmac.finalize().toString(CryptoJS.enc.Hex);

	console.log(authKey);

	return authKey;
};

class NicehashApi {
	locale: string;
	host: string;
	key: string;
	secret: string;
	organization: { id: string };
	localTimeDiff: number | null;
	time?: string;

	constructor({
		locale,
		host,
		key,
		secret,
		organization,
	}: {
		locale: string;
		host: string;
		key: string;
		secret: string;
		organization: { id: string };
	}) {
		this.locale = locale || 'en';
		this.host = host;
		this.key = key;
		this.secret = secret;
		this.organization = organization;
		this.localTimeDiff = null;
	}

	getTime() {
		return request({
			uri: this.host + '/api/v2/time',
			json: true,
		}).then((res) => {
			this.localTimeDiff = res.serverTime - +new Date();
			this.time = res.serverTime;
			return res.serverTime;
		});
	}

	apiCall(
		method: string,
		path: string,
		{ query, body, time }: { query?: any; body?: any; time?: string } = {}
	) {
		if (this.localTimeDiff === null) {
			return Promise.reject(
				new Error('Get server time first .getTime()')
			);
		}

		// query in path
		var [pathOnly, pathQuery] = path.split('?');
		if (pathQuery) query = { ...qs.parse(pathQuery), ...query };

		const nonce = createNonce();
		const timestamp = (time || +new Date() + this.localTimeDiff).toString();

		const options: RequiredUriUrl & RequestPromiseOptions = {
			uri: this.host + pathOnly,
			method,
			headers: {
				'X-Time': timestamp,
				'X-Nonce': nonce,
				'X-Organization-Id': this.organization.id,
				'X-Request-Id': nonce,
				// 'X-User-Agent': 'NHNodeClient',
				// 'X-User-Lang': this.locale,
				'X-Auth': getAuthHeader(
					this.key,
					this.secret,
					timestamp,
					nonce,
					this.organization.id,
					{
						method,
						path: pathOnly,
						query,
						body,
					}
				),
			},
			qs: query,
			body,
			json: true,
		};

		console.log(options);

		return request(options);
	}

	get(path: string, options?: any) {
		return this.apiCall('GET', path, options);
	}

	post(path: string, options?: any) {
		return this.apiCall('POST', path, options);
	}

	put(path: string, options?: any) {
		return this.apiCall('PUT', path, options);
	}

	delete(path: string, options?: any) {
		return this.apiCall('DELETE', path, options);
	}
}

export default NicehashApi;
