import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { jwt, fileName, uuid, delTime, pwHash } = req.body;
	// check if all exist
	if (!jwt || !fileName || !uuid || !delTime) {
		res.status(400).json({ error: 'Missing parameters' });
		return;
	}
	// Check JWT validity
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
	const region = process.env.REGION;
	const bucket = process.env.BUCKET_NAME;

	const tagging = `expire=${encodeURIComponent(delTime)}`;
	const key = `${uuid}/${fileName}`;

	// Create the S3 client
	const s3Client = new S3Client({
		region: region,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
		},
	});

	const putObjectCommand = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Tagging: tagging
	});

	const unhoistableHeaders: Set<string> = new Set(['x-amz-tagging']);

	try {
		const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
			expiresIn: 604800,
			unhoistableHeaders: unhoistableHeaders,
		});

		const client = new MongoClient(process.env.MONGODB_URI!, {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true,
			}
		});

		try {
			await client.connect();
			const database = client.db('fsdata');
			const collection = database.collection('fsstorrecord');
			const delTimeValue = delTime === 'Never' ? 0 : parseInt(delTime.slice(0, -1)) * 24 * 60 * 60 * 1000;
			const record = {
				accessPath: `/${uuid}/${fileName}`,
				fileName: fileName,
				uuid: uuid,
				passwordHashed: pwHash ?? '',
				expireAt: delTime === 'Never' ? new Date(8.64e14) : new Date(new Date(Date.now()).getTime() + delTimeValue),
			};
			await collection.insertOne(record);
			client.close();
		} catch (error) {
			console.error('Error creating mongo tracking record', error);
			res.status(500).json({ error: 'Server error.' });
		}

		res.status(200).json({
			url: presignedUrl,
		});
	} catch (error) {
		console.error('Error creating pre-signed PUT URL', error);
		res.status(500).json({ error: 'Error creating pre-signed PUT URL' });
	}
}

