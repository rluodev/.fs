import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { slug } = req.body;
	if (!slug) {
		res.status(400).json({ error: 'Missing slug' });
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
	const collection = db.collection('fsshortcuts');
	const record = await collection.findOne({ slug: slug });
	if (!record) {
		res.status(404).json({ error: 'Shortcut not found' });
		return;
	}
	if (record.expireAt < new Date()) {
		res.status(410).json({ error: 'Shortcut expired' });
		return;
	}
	res.status(200).json({ accessPath: record.accessPath });
}