'use client';

import { createHash } from "crypto";
import { useRouter } from "next/router";
import { useState, useEffect, FormEvent } from "react";
import { v4 as uuidv4 } from 'uuid';

interface AuthResponse {
	valid: boolean;
	jwt?: string;
}

const Page: React.FC = () => {
	const router = useRouter();
	const [authValid, setAuthValid] = useState<boolean>(false);
	const [uploadedFileURL, setUploadedFileURL] = useState<string>('');
	const [jwt, setJwt] = useState<string>('');
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [uploadInProgress, setUploadInProgress] = useState<boolean>(false);
	const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const otp = formData.get('otp');

		if (typeof otp === 'string') {
			const res = await fetch('/api/checkAuth', {
				method: 'POST',
				body: JSON.stringify({ otp }),
				headers: {
					'Content-Type': 'application/json'
				},
			}).then(res => res.json()) as AuthResponse;

			if (res.valid && res.jwt) {
				setAuthValid(true);
				setJwt(res.jwt);
				localStorage.setItem('jwt', res.jwt);
				router.reload();
			} else {
				console.error('Invalid OTP');
			}
		} else {
			console.error('OTP is not a string');
		}
	};

	const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setUploadInProgress(true);
		const formData = new FormData(event.currentTarget);
		const file = formData.get('file') as File | null;
		const deletionTime = formData.get('deletionTime') as string | null;
		const password = formData.get('password') as string | null;
		const pwHash = password ? createHash('sha512').update(password).digest('hex') : '';
		const fileId = uuidv4();
		if (file && deletionTime) {
			// Request a pre-signed POST URL from the server
			const response = await fetch('/api/getSignedUrl', {
				method: 'POST',
				body: JSON.stringify({ jwt: jwt, fileName: file.name, uuid: fileId, delTime: deletionTime, pwHash: pwHash }),
				headers: {
					'Content-Type': 'application/json'
				},
			});
			const { url } = await response.json() as { url: string };

			// Reset upload progress to zero before starting the upload
			setUploadProgress(0);

			// Create a new XMLHttpRequest
			const xhr = new XMLHttpRequest();

			// Create a function to update state with the upload progress
			const updateProgress = (event: ProgressEvent) => {
				if (event.lengthComputable) {
					// Calculate the upload progress as a percentage
					const progress = (event.loaded / event.total) * 100;
					setUploadProgress(progress);
					// TODO: Update progress on UI with progress
				}
			};

			// Set up the request
			xhr.open('PUT', url, true);
			xhr.setRequestHeader('Content-Type', file.type);
			xhr.setRequestHeader('x-amz-tagging', `expire=${encodeURIComponent(deletionTime)}`);

			// Event listener for upload progress
			xhr.upload.onprogress = updateProgress;

			// Event listener for when the request has completed
			xhr.onload = () => {
				if (xhr.status === 200) {
					console.log('File uploaded successfully');
					setUploadProgress(100); // Update progress to 100 upon completion
					const fileUrl = `${url.split('?')[0]}`;
					setUploadedFileURL(fileUrl);
					setUploadInProgress(false);
					router.push(`/${fileId}?uploadSuccess=true`)
				} else {
					console.error('File upload failed', xhr.responseText);
					setUploadProgress(0); // Reset progress on failure
					// TODO: Handle upload failed on UI
				}
			};

			// Start the upload
			xhr.send(file);
		};
	};

	const cancelUpload = () => {
		const confirmed = window.confirm('Are you sure you want to cancel the upload?');
		if (confirmed) {
			setUploadInProgress(false);
			setUploadProgress(0);
			router.reload();
		}
	};

	useEffect(() => {
		if (localStorage.getItem('jwt')) {
			setJwt(localStorage.getItem('jwt')!);
		}
		// Check if the JWT is still valid and set the auth state
		if (jwt) {
			const checkAuth = async () => {
				const res = await fetch('/api/checkAuth', {
					method: 'POST',
					body: JSON.stringify({ jwt }),
					headers: {
						'Content-Type': 'application/json',
					},
				}).then(res => res.json()) as AuthResponse;

				setAuthValid(res.valid);
			};

			checkAuth();
		}
	}, [jwt]);

	if (authValid) {
		if (!uploadInProgress) {
			return (
				<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
					<div className="bg-transparent flex-col adaptive border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[60vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
						<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
						<p className="text-white">Upload a file:</p>
						<form onSubmit={(event: React.FormEvent<HTMLFormElement> & { target: { elements: { file: { files: any[]; }; deletionTime: string; }; }; }) => handleUpload(event)} className="space-x-4 flex-col flex justify-center items-center text-center space-y-4">
							<input type="file" className="rounded-md bg-transparent border transition-all duration-250 text-white py-2 px-4" name="file" id="file" />
							<select name="deletionTime" id="deletionTime" className="text-black rounded-md border p-2 focus:outline-blue-500">
								<option value="1d">1 day</option>
								<option value="3d">3 days</option>
								<option value="7d">7 days</option>
								<option value="14d">14 days</option>
								<option value="30d">30 days</option>
								<option value="60d">60 days</option>
								<option value="90d">90 days</option>
								<option value="180d">180 days</option>
								<option value="365d">365 days</option>
								<option value="Never">Never</option>
							</select>
							<button onClick={(evt) => {
								evt.preventDefault();
								setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen);
							}}>
								Advanced Settings {isAdvancedSettingsOpen ? '▲' : '▼'}
							</button>
							{isAdvancedSettingsOpen && (
								<div className="text-white flex flex-col items-center text-start justify-center space-y-4">
									<label htmlFor="password">Password (leave blank or close advanced settings for none):</label>
									<input type="password" className="text-black rounded-md border p-2 focus:outline-blue-500" name="password" id="password" />
								</div>
							)}
							<button type="submit" className="rounded-md bg-blue-950 hover:bg-blue-800 transition-all duration-250 text-white py-2 px-4">
								Upload
							</button>
						</form>
					</div>
					<button className="rounded-md bg-blue-950 hover:bg-blue-800 transition-all duration-250 text-white py-2 px-4 m-4 text-center items-center" onClick={(evt) => {
						evt.preventDefault();
						setAuthValid(false);
						setJwt('');
						localStorage.removeItem('jwt');
						const reloadPage = () => {
							router.reload();
						};
						reloadPage();
					}}>
						Log Out
					</button>
				</div>
			);
		} else {
			return (
				<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
					<div className="bg-transparent flex-col border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[50vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
						<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
						<p className="text-white">Upload in progress ({uploadProgress.toFixed(2)}%)</p>
						<div className="w-full bg-gray-200 rounded-md">
							<div className="h-2 bg-blue-500 rounded-md" style={{ width: `${uploadProgress}%` }}></div>
						</div>
						<button onClick={cancelUpload} className="rounded-md bg-red-600 hover:bg-red-400 transition-all duration-250 text-white py-2 px-4">
							Cancel Upload
						</button>
					</div>
				</div>
			);
		}
	} else {
		return (
			<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
				<div className="bg-transparent border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[50vh] sm:w-[80vw] justify-center items-center text-center flex flex-col space-y-4 space-x-4">
					<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
					<p className="text-white">Please authenticate with your TOTP code.</p>
					<form onSubmit={(event: React.FormEvent<HTMLFormElement> & { target: HTMLFormElement }) => handleSubmit(event)} className="space-x-4">
						<input type="text" className="text-black rounded-md border p-2 focus:outline-blue-500" name="otp" id="otp" />
						<button type="submit" className="rounded-md bg-blue-950 hover:bg-blue-800 transition-all duration-250 text-white py-2 px-4">
							Submit
						</button>
					</form>
				</div>
			</div>
		);
	}
}

export default Page;