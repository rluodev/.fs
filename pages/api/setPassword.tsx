import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, pwHash, jwt } = req.body;
	if (!uuid || !jwt) {
		res.status(400).json({ error: 'Missing parameters' });
		return;
	}
	const isJwtValid = await fetch(`${process.env.API_URL}/checkAuth`, {
		method: 'POST',
		body: JSON.stringify({ jwt: jwt }),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(res => res.json()).then(res => res.valid);
	if (!isJwtValid) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	const mongo = await MongoClient.connect(process.env.MONGODB_URI!, {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
	});
	const db = mongo.db('fsdata');
	const collection = db.collection('fsstorrecord');
	const record = await collection.findOne({ uuid: uuid });
	if (!record) {
		res.status(404).json({ error: 'Record not found' });
		mongo.close();
		return;
	}
	const recordWrite = await collection.updateOne({ uuid: uuid }, { $set: { passwordHashed: pwHash } });
	mongo.close();
	res.status(200).json({ success: true });
}