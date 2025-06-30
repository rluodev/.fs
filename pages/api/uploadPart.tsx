import { CreateMultipartUploadCommand, PutObjectCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MongoClient, ServerApiVersion } from "mongodb";

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { jwt, uploadId, partNumber, uuid, fileName } = req.body;
	// check if all exist
	if (!jwt || !uploadId || !partNumber || !uuid || !fileName) {
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

	// Create the S3 client
	const s3Client = new S3Client({
		region: region,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
		},
	});

	const partUploadCmd = new UploadPartCommand({
		Bucket: bucket,
		Key: `${uuid}/${fileName}`,
		PartNumber: partNumber,
		UploadId: uploadId,
	});

	const presignedUrl = await getSignedUrl(s3Client, partUploadCmd, {
		expiresIn: 604800,
	});

	res.status(200).json({ uploadId: uploadId });
}

