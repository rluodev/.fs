import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { slug, pw } = req.body;
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
	if (new Date(record.createdAt).getTime() + 604800000 <= Date.now()) {
		const res2 = await fetch(`${process.env.API_URL}/getSignedTempUrl`, {
			method: 'POST',
			body: JSON.stringify({ uuid: record.uuid, pw: pw }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res2.status === 200) {
			const data = await res2.json();
			const url = data.url;
			const newRec = await mongoUpdateOne(record.uuid, url);
			if (newRec) {
				res.status(200).json({ accessPath: newRec.accessPath });
				return;
			} else {
				console.log('Failed to fetch data')
				res.status(500).json({ error: 'Server error' });
				return;
			}
		} else {
			console.log('Failed to fetch data')
			res.status(500).json({ error: 'Server error' });
			return;
		}
	}
	res.status(200).json({ accessPath: record.accessPath });
}

async function mongoUpdateOne(uuid: string, url: string) {
	const client = new MongoClient(process.env.MONGODB_URI!, {
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		}
	});

	await client.connect();
	const database = client.db('fsdata');
	const collection = database.collection('fsshortcuts');
	await collection.updateOne({ uuid: uuid }, { $set: { accessPath: url, createdAt: new Date() } });
	const newRec = await collection.findOne({ uuid: uuid });
	return newRec;
}