import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, pw, expiry } = req.body;
	if (!uuid) {
		res.status(400).json({ error: 'Missing uuid' });
		return;
	}
	const record = await mongoFindOne(uuid);
	if (record !== null && record !== undefined) {
		if (new Date(record.createdAt).getTime() + 604800000 <= Date.now()) {
			const getaurl = await fetch(`${process.env.API_URL}/getSignedTempUrl`, {
				method: 'POST',
				body: JSON.stringify({ uuid: uuid, pw: pw }),
				headers: {
					'Content-Type': 'application/json'
				},
			});
			const geturldata = await getaurl.json();
			await mongoUpdateOne(uuid, geturldata.url);
		}
		res.status(200).json({ url: `${process.env.NEXT_PUBLIC_MAIN_URL}/s/${record.slug}` });
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
		const newUrl = await mongoCreateOne(url, uuid, pw, expiry);
		res.status(200).json({ url: newUrl });
	} else {
		console.log('Failed to fetch data')
		res.status(500).json({ error: 'Server error' });
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
	client.close();
	return record;
}

async function mongoCreateOne(url: string, uuid: string, pw: string, expiry: number) {
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
		pwHash: pw,
		createdAt: new Date(),
		expireAt: new Date(expiry),
	};

	await collection.insertOne(record);
	client.close();
	return `${process.env.NEXT_PUBLIC_MAIN_URL}/s/${record.slug}`;
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
	await collection.updateOne({ uuid: uuid, createdAt: new Date() }, { $set: { accessPath: url } });
	client.close();
	return;
}