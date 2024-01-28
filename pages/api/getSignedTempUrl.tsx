import { HttpRequest } from "@smithy/protocol-http";
import { S3RequestPresigner } from "@aws-sdk/s3-request-presigner";
import { parseUrl } from "@smithy/url-parser";
import { formatUrl } from "@aws-sdk/util-format-url";
import { Hash } from "@smithy/hash-node";

const createPresignedUrlWithoutClient = async ({ region, key }: { region: string, key: string }) => {
	const url = parseUrl(`${process.env.S3_URL}${key}`);
	const presigner = new S3RequestPresigner({
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
		},
		region,
		sha256: Hash.bind(null, "sha256"),
	});

	const signedUrlObject = await presigner.presign(new HttpRequest({ ...url, method: "GET" }), { expiresIn: 604800 });
	return formatUrl(signedUrlObject);
};

export default async function handler(req: any, res: any) {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { uuid, pw, isDownload } = req.body;
	if (!uuid) {
		res.status(400).json({ error: 'Missing uuid' });
		return;
	}
	const data = await fetch(`${process.env.API_URL}/searchMongo`, {
		method: 'POST',
		body: JSON.stringify({ uuid: uuid, pwHash: pw }),
		headers: {
			'Content-Type': 'application/json'
		}
	})
	if (data.status === 401) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	} else if (data.status !== 200) {
		res.status(500).json({ error: 'Server error' });
		return;
	}
	const getData = await data.json();
	let getDataKey = getData.accessPath.replaceAll(' ', '');
	if (isDownload) {
		getDataKey += '?response-content-disposition=attachment';
	}
	try {
		const noClientUrl = await createPresignedUrlWithoutClient({
			region: process.env.REGION!,
			key: getDataKey,
		});

		res.status(200).json({ url: noClientUrl });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error' });
	}
}