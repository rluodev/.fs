import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, pw } = req.body;
	if (!uuid) {
		res.status(400).json({ error: 'Missing uuid' });
		return;
	}
	const record = await mongoFindOne(uuid);
	if (record !== null && record !== undefined) {
		res.status(200).json({ url: `https://dotfs.rluo.dev/s/${record.slug}` });
		return;
	}
	const res2 = await fetch(`${process.env.API_URL}/getSignedTempUrl`, {
		method: 'POST',
		body: JSON.stringify({ uuid: uuid, pw: pw }),
		headers: {
			'Content-Type': 'application/json'
		},
	});
	if (res2.status === 200) {
		const data = await res2.json();
		const url = data.url;
		const newUrl = await mongoCreateOne(url, uuid);
		res.status(200).json({ url: newUrl });
	} else {
		console.log('Failed to fetch data')
	}
}

async function mongoFindOne(uuid: string) {
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
	const record = await collection.findOne({ uuid: uuid });
	return record;
}

async function mongoCreateOne(url: string, uuid: string) {
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
	const delTimeValue = 604800;
	const slug = Math.random().toString(36).substring(2, 8);
	const record = {
		accessPath: url,
		uuid: uuid,
		slug: slug,
		expireAt: new Date(Date.now() + 604800 * 1000),
	};

	await collection.insertOne(record);
	return `https://dotfs.rluo.dev/s/${record.slug}`;
}