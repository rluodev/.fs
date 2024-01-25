'use client';

import { createHash } from "crypto";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useState } from "react";

export default function Page() {

	console.log(process.env.NEXT_PUBLIC_MAIN_URL)
	const router = useRouter();
	const [fileUuid, setfileUuid] = useState(''); // dynamic slug
	const [queryParams, setQueryParams] = useState<URLSearchParams>();
	const [objectState, setObjectState] = useState<any>({});
	const [passwordRequired, setPasswordRequired] = useState<boolean>(false);
	const [hasGeneratedTempUrl, setHasGeneratedTempUrl] = useState<boolean>(false);
	const [hasGeneratedDlUrl, setHasGeneratedDlUrl] = useState<boolean>(false);
	const [dlUrlIsGenerating, setDlUrlIsGenerating] = useState<boolean>(true);
	const [tempUrlIsGenerating, setTempUrlIsGenerating] = useState<boolean>(true);
	const [tempUrl, setTempUrl] = useState<string>('');
	const [tempShortcutUrl, setTempShortcutUrl] = useState<string>('');
	const [pw, setPw] = useState<string>('');

	useEffect(() => {
		if (!router.isReady) return;

		setQueryParams(new URLSearchParams(window.location.search));
		const { uuid } = router.query;
		setfileUuid(uuid as string);
		fetchData(uuid as string);

	}, [router.isReady, router.query]);

	const generateTempSignedUrl = async () => {
		const res = await fetch(`/api/getSignedTempUrl`, {
			method: 'POST',
			body: JSON.stringify({ uuid: fileUuid, pw: pw }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status === 200) {
			const data = await res.json();
			setTempUrl(data.url);
			setDlUrlIsGenerating(false);
		} else {
			console.log('Failed to fetch data')
		}

	}

	const generateTempSignedShortcutUrl = async () => {
		const res = await fetch(`/api/createShortcutUrl`, {
			method: 'POST',
			body: JSON.stringify({ uuid: fileUuid, pw: pw }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status === 200) {
			const data = await res.json();
			setTempShortcutUrl(data.url);
			setTempUrlIsGenerating(false);
		} else {
			console.log('Failed to fetch data')
		}

	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const password = formData.get('pw') as string;
		setPw(createHash('sha512').update(password).digest('hex'));
		const res = await fetch(`/api/searchMongo`, {
			method: 'POST',
			body: JSON.stringify({ uuid: fileUuid, pwHash: createHash('sha512').update(password).digest('hex') }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status === 200) {
			const data = await res.json();
			console.log(data)
			setObjectState(data);
		} else if (res.status === 401) {
			setPasswordRequired(true);
		} else {
			console.log('Failed to fetch data')
		}
	};

	const fetchData = async (uid: string) => {
		const res = await fetch(`/api/searchMongo`, {
			method: 'POST',
			body: JSON.stringify({ uuid: uid }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status === 200) {
			const data = await res.json();
			console.log(data)
			setObjectState(data);
		} else if (res.status === 401) {
			setPasswordRequired(true);
		} else {
			console.log('Failed to fetch data')
		}
	}

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.log('Failed to copy: ', err)
		}
	};
	if (Object.keys(objectState).length !== 0) {
		if (queryParams && queryParams.has('uploadSuccess')) {
			return (
				<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
					<div className="bg-transparent flex-col adaptive border rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[60vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
						<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
						<p className="text-white">🎉 Yay! Your upload of <span className="font-bold underline underline-offset-2">{objectState.fileName}</span> was successful! 🎉</p>
						<p className="text-white">Here&apos;s your share link (click/tap to copy)</p>
						<button className="text-white rounded-lg border p-4 transition-all duration-250 text-center items-center bg-gray-900 hover:bg-gray-700" onClick={(evt) => {
							evt.preventDefault();
							copyToClipboard(`${process.env.NEXT_PUBLIC_MAIN_URL}/${fileUuid}`);
						}}>
							{process.env.NEXT_PUBLIC_MAIN_URL}/{fileUuid}
						</button>
						<p className="text-white">This file expires at {new Date(objectState.expireAt).toLocaleString()}</p>
						{!hasGeneratedTempUrl && <button className="text-white rounded-lg border p-4 transition-all duration-250 text-center items-center bg-gray-900 hover:bg-gray-700" onClick={(evt) => {
							evt.preventDefault();
							setHasGeneratedTempUrl(true);
							generateTempSignedShortcutUrl();
						}}>
							Generate a direct access link (lasts for 7 days)
						</button>
						}
						{hasGeneratedTempUrl && <button className={`text-white rounded-lg border p-4 transition-all duration-250 text-center items-center ${tempUrlIsGenerating && 'disabled'} bg-gray-900 hover:bg-gray-700`} onClick={(evt) => {
							evt.preventDefault();
							copyToClipboard(tempShortcutUrl);
						}}>
							{tempUrlIsGenerating ? 'Generating...' : tempShortcutUrl}
						</button>
						}
					</div>
				</div>
			);
		} else {
			return (
				<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
					<div className="bg-transparent flex-col adaptive border rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[60vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
						<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
						<p className="text-white">🎉 Someone shared this file (<span className="font-bold underline underline-offset-2">{objectState.fileName}</span>) with you! 🎉</p>
						<p className="text-white">Here&apos;s your download!</p>
						{!hasGeneratedDlUrl && <button className="text-white rounded-lg border p-4 transition-all duration-250 text-center items-center bg-gray-900 hover:bg-gray-700" onClick={(evt) => {
							evt.preventDefault();
							setHasGeneratedDlUrl(true);
							generateTempSignedUrl();
						}}>
							Generate Download Link
						</button>
						}
						{hasGeneratedDlUrl && <Link href={tempUrl} className="text-white rounded-lg border p-4 transition-all duration-250 text-center items-center bg-gray-900 hover:bg-gray-700" download>
							{dlUrlIsGenerating ? 'Generating...' : 'Click to Download'}
						</Link>}
						<p className="text-white">This file expires at {new Date(objectState.expireAt).toLocaleString()}</p>
						{!hasGeneratedTempUrl && <button className="text-white rounded-lg border p-4 transition-all duration-250 text-center items-center bg-gray-900 hover:bg-gray-700" onClick={(evt) => {
							evt.preventDefault();
							setHasGeneratedTempUrl(true);
							generateTempSignedUrl();
						}}>
							Generate a direct access link (lasts for 7 days)
						</button>
						}
						{hasGeneratedTempUrl && <button className={`text-white rounded-lg border p-4 transition-all duration-250 text-center items-center ${tempUrlIsGenerating && 'disabled'} bg-gray-900 hover:bg-gray-700`} onClick={(evt) => {
							evt.preventDefault();
							copyToClipboard(tempShortcutUrl);
						}}>
							{tempUrlIsGenerating ? 'Generating...' : tempShortcutUrl}
						</button>
						}
					</div>
				</div>
			);
		}
	} else if (passwordRequired) {
		return (
			<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
				<div className="bg-transparent border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[50vh] sm:w-[80vw] justify-center items-center text-center flex flex-col space-y-4 space-x-4">
					<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
					<p className="text-white">Please enter the file access password:</p>
					<form onSubmit={async (event: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement }) => await handleSubmit(event)} className="space-x-4">
						<input type="password" className="text-black rounded-md border p-2 focus:outline-blue-500" name="pw" id="pw" />
						<button type="submit" className="rounded-md bg-blue-950 hover:bg-blue-800 transition-all duration-250 text-white py-2 px-4">
							Submit
						</button>
					</form>
				</div>

			</div>
		);
	} else {
		return (
			<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
				<div className="bg-transparent flex-col adaptive border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[60vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
					<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
					<p className="text-white">Loading your file...</p>
				</div>
			</div>
		);
	}
}