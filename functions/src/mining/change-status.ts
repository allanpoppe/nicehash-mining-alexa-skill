import * as functions from 'firebase-functions';
import * as express from 'express';
import NicehashApi from '../models/nicehash-api';
// import { db } from '../config/firebase';

const app = express();

app.post('/', async (req, res) => {
	try {
		const { action } = req.body;

		const nicehashApiConfig: {
			locale: string;
			host: string;
			key: string;
			secret: string;
			organization: { id: string };
		} = functions.config().nicehash.api;

		const rigConfig: {
			rigId: string;
			action: 'START' | 'STOP' | 'POWER_MODE';
		} = {
			rigId: functions.config().nicehash.rig.id,
			action,
		};

		const nicehashApi = new NicehashApi(nicehashApiConfig);

		const time = await nicehashApi.getTime();

		const returnValue = await nicehashApi.post(
			'/main/api/v2/mining/rigs/status2',
			{
				body: rigConfig,
				time,
			}
		);

		res.status(200).send({ nicehashApiConfig, time, returnValue });
	} catch (error) {
		if (error instanceof Error) {
			res.status(500).json(error.message);
		}
	}
});

// app.post('/entries', (req, res) => {
// 	const { title, text } = req.body;

// 	try {
// 		const entry = db.collection('entries').doc();
// 		const entryObject = {
// 			id: entry.id,
// 			title,
// 			text,
// 		};

// 		entry.set(entryObject);

// 		res.status(200).send({
// 			status: 'success',
// 			message: 'entry added successfully',
// 			data: entryObject,
// 		});
// 	} catch (error) {
// 		if (error instanceof Error) {
// 			res.status(500).json(error.message);
// 		}
// 	}
// });

exports.changeStatus = functions.https.onRequest(app);
