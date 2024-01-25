import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, pwHash } = req.body;
	if (!uuid) {
		res.status(400).json({ error: 'Missing uuid' });
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
		return;
	}
	if (record.passwordHashed !== '' && record.passwordHashed !== pwHash) {
		res.status(401).json({ error: 'Invalid password' });
		return;
	}
	if (record.expireAt < new Date()) {
		res.status(410).json({ error: 'Record expired' });
		return;
	}
	res.status(200).json({ accessPath: record.accessPath, expireAt: record.expireAt, fileName: record.fileName });
}