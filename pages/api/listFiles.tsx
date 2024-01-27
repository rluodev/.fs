import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { jwt } = req.body;
	if (!jwt) {
		res.status(400).json({ error: 'Missing auth jwt' });
		return;
	}
	if (!await jwtVerified(jwt)) {
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
	const records = await collection.find().toArray();
	res.status(200).json({ records: records });
	mongo.close();
	return;
}

async function jwtVerified(jwt: string) {
	const res = await fetch(`${process.env.API_URL}/checkAuth`, {
		method: 'POST',
		body: JSON.stringify({ jwt: jwt }),
		headers: {
			'Content-Type': 'application/json'
		},
	}).then(res => res.json())
	return res.valid;
}