import { NextApiRequest, NextApiResponse } from 'next';
import totp from 'totp-generator';
import jwtp from 'jsonwebtoken';

export default async function checkAuth(req: NextApiRequest, res: NextApiResponse) {

	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	const { jwt, otp } = req.body;

	// Check JWT validity
	if (!jwt && !otp) {
		res.status(401).json({ error: 'Missing JWT and OTP' });
		return;
	}
	let isJwtValid = false;
	let isOtpValid = false;
	if (jwt) {
		isJwtValid = validateJwt(jwt);
	}
	if (otp && !isJwtValid) {
		isOtpValid = validateOtp(otp);
	}

	// Return true if either JWT or OTP are valid, otherwise false
	const isValid = isJwtValid || isOtpValid;
	if (isValid) {
		if (jwt && !otp) {
			res.status(200).json({ valid: true, jwt: jwt });
		} else {
			const newJwt = jwtp.sign({ valid: true }, process.env.JWT_SECRET!, { expiresIn: '7d' });
			res.status(200).json({ valid: true, jwt: newJwt });
		}
	} else {
		res.status(401).json({ error: 'Invalid JWT or OTP' });
	}
};

function validateJwt(jwt: string): boolean {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error('JWT secret not found');
	}
	const decoded = jwtp.verify(jwt, secret, function (err, decoded) {
		if (err) {
			console.error("jwt invalid, asking to login again");
			return false;
		}
	});
	return true;
};

function validateOtp(otp: string): boolean {
	const secret = process.env.TOTP_SECRET;
	if (!secret) {
		throw new Error('TOTP secret not found');
	}
	const token = totp(secret);
	if (token === otp) {
		return true;
	}
	return false;
};
