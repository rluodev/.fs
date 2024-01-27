import { MongoClient, ServerApiVersion } from "mongodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, jwt } = req.body;
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

	const client = new S3Client({
		region: process.env.REGION,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
		},
	});

	const deleteObjectCommand = new DeleteObjectCommand({
		Bucket: process.env.BUCKET_NAME!,
		Key: `${uuid}/${record.fileName}`
	});

	try {
		await client.send(deleteObjectCommand);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
		mongo.close();
		return;
	}
	await collection.deleteOne({ uuid: uuid });
	mongo.close();
	res.status(200).json({ success: true });
}