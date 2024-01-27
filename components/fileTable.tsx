import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Hash, createHash } from "crypto";

const PAGE_SIZE = 5;

export default function fileTable(jwt: { jwt: string }) {
	const [files, setFiles] = useState<{ uuid: string, fileName: string, passwordHashed: string, expireAt: Date }[]>([]); // Add type annotation for files state variable
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [allSelected, setAllSelected] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
	const [hasSelected, setHasSelected] = useState(false);
	const [isSettingPW, setIsSettingPW] = useState(false);
	const [isCopied, setIsCopied] = useState('');

	const onChangeCheckAll = (e: any) => {
		setAllSelected(e.target.checked);
		if (e.target.checked) {
			setSelectedFiles(files.map((file) => file.uuid));
			setHasSelected(true);
		} else {
			setSelectedFiles([]);
			setHasSelected(false);
		}
	};

	const onCheckOne = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.checked) {
			setSelectedFiles(selectedFiles.concat(e.target.name));
			setHasSelected(true);
			if (selectedFiles.length + 1 === files.length) {
				setAllSelected(true);
			}
		} else {
			setSelectedFiles(selectedFiles.filter((item) => item !== e.target.name));
			setHasSelected(selectedFiles.length - 1 > 0);
			setAllSelected(false);
		}
	}

	const router = useRouter();

	const fetchFiles = async () => {
		const fileList = await listFiles();
		setFiles(fileList);
		setTotalPages(Math.ceil(fileList.length / PAGE_SIZE));
		setLoaded(true);
	};

	useEffect(() => {
		fetchFiles();
	}, []);

	const listFiles = async () => {
		try {
			const response = await fetch('/api/listFiles', {
				method: 'POST',
				body: JSON.stringify({ jwt: jwt }),
				headers: {
					'Content-Type': 'application/json'
				},
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || "Failed to fetch files.");
			}
			return data.records || [];
		} catch (error) {
			console.error("Error fetching files:", error);
			return [];
		}
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const deleteFile = async (uuid: string) => {
		const res = await fetch('/api/deleteFile', {
			method: 'POST',
			body: JSON.stringify({ jwt: jwt, uuid: uuid }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status !== 200) {
			alert("Server Error.");
		}
	}

	const setPassword = async (uuid: string, password: string) => {
		const pw = password !== '' ? createHash('sha512').update(password).digest('hex') : '';
		setIsSettingPW(true);
		setLoaded(false);
		const res = await fetch('/api/setPassword', {
			method: 'POST',
			body: JSON.stringify({ jwt: jwt, uuid: uuid, pwHash: pw }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status !== 200) {
			alert("Server Error.");
		}
		setIsSettingPW(false);
	}

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);

		} catch (err) {
			console.log('Failed to copy: ', err)
		}
	};

	const renderActionButtons = () => {
		return (
			<div className="flex flex-row justify-start items-start w-full">
				<button className="bg-red-800 hover:bg-red-600 transition-all duration-250 py-1 px-2 m-2 rounded-md" onClick={async (evt) => {
					evt.preventDefault();
					setLoaded(false);
					for (let i = 0; i < selectedFiles.length; i++) {
						await deleteFile(selectedFiles[i]);
					}
					await fetchFiles();
				}}>Delete Selected</button>
			</div>
		);
	}
	const renderTable = () => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		const endIndex = startIndex + PAGE_SIZE;

		return (
			<table className="w-full h-full table-fixed overflow-scroll">
				<thead className="w-full h-full">
					<tr className="space-x-4 py-2 px-2 flex-row justify-between w-full">
						<th className="border w-[5vw]">
							<input type="checkbox" checked={allSelected} onChange={onChangeCheckAll} />
						</th>
						<th className="border">Filename</th>
						<th className="border w-[10vw] sm:w-[5vw]">Has PW?</th>
						<th className="border w-[20vw] sm:w-[15vw]">Expires At</th>
						<th className="border w-[25vw] sm:w-[15vw]">Actions</th>
					</tr>
				</thead>
				<tbody className="w-full h-full">
					{files.slice(startIndex, endIndex).map((file) => (
						<tr key={file.uuid} className="space-x-4 py-2 px-2 w-full odd:bg-slate-800">
							<td className="border"><input type="checkbox" checked={selectedFiles.indexOf(file.uuid) !== -1 || allSelected} name={file.uuid} onChange={onCheckOne} /></td>
							<td className="border truncate ... w-1/4 p-2">{file.fileName}</td>
							<td className="border">{file.passwordHashed !== '' ? 'Yes' : 'No'}</td>
							<td className="border">{new Date(file.expireAt).toLocaleString()}</td>
							<td className="border">
								<button className="bg-blue-800 hover:bg-blue-600 transition-all duration-250 py-1 px-2 m-1 rounded-md" onClick={async (evt) => {
									evt.preventDefault();
									await copyToClipboard(`${process.env.NEXT_PUBLIC_MAIN_URL}/${file.uuid}`);
									setIsCopied(file.uuid);
									setTimeout(() => {
										setIsCopied('');
									}, 2000);
								}}>
									{isCopied.indexOf(file.uuid) !== -1 ? 'Copied!' : 'Copy Link'}
								</button>
								<button className="bg-red-800 hover:bg-red-600 transition-all duration-250 py-1 px-2 m-1 rounded-md" onClick={async (evt) => {
									evt.preventDefault();
									if (file.passwordHashed === '') {
										const password = prompt('Enter password');
										if (password !== null && password !== '') {
											await setPassword(file.uuid, password);
										}
									} else if (confirm('Are you sure you want to clear the password?')) {
										await setPassword(file.uuid, '');
									}
									await fetchFiles();
									setLoaded(true);
								}}>
									{file.passwordHashed === '' ? 'Set PW' : 'Clear PW'}
								</button>
								<button className="bg-red-800 hover:bg-red-600 transition-all duration-250 py-1 px-2 m-1 rounded-md" onClick={async (evt) => {
									evt.preventDefault();
									setLoaded(false);
									await deleteFile(file.uuid);
									await fetchFiles();
								}}>
									Delete
								</button>

							</td>
						</tr>
					))}
				</tbody>
			</table>
		);
	};

	const renderPagination = () => {
		const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

		return (
			<div className="m-1 p-1">
				{currentPage > 1 && <button className="bg-blue-800 hover:bg-blue-600 transition-all duration-250 py-1 px-2 m-1 rounded-md" onClick={(evt) => {
					evt.preventDefault();
					handlePageChange(currentPage - 1);
				}}>
					&lt;
				</button>
				}
				{pages.map((page) => (
					<button
						key={page}
						onClick={(evt) => {
							evt.preventDefault();
							handlePageChange(page);
						}}
						disabled={page === currentPage}
						className={`${currentPage === page ? 'bg-blue-700' : 'bg-blue-900'} hover:bg-blue-600 transition-all duration-250 py-1 px-2 m-1 rounded-md`}
					>
						{page}
					</button>
				))}
				{currentPage < totalPages && <button className="bg-blue-800 hover:bg-blue-600 transition-all duration-250 py-1 px-2 m-1 rounded-md" onClick={(evt) => {
					evt.preventDefault();
					handlePageChange(currentPage + 1);
				}}>
					&gt;
				</button>
				}
			</div>
		);
	};

	return (
		<div className="w-full w-5/6 sm:w-4/5 flex flex-col m-auto justify-center items-center overflow-x">
			<p className="text-xl p-4">Manage Files</p>
			{!loaded && <p className="text-lg p-4">Loading...</p>}
			{loaded && files.length === 0 && <p className="text-lg p-4">No files.</p>}
			{loaded && files.length > 0 && renderTable()}
			{loaded && files.length > 0 && renderPagination()}
			{loaded && files.length > 0 && selectedFiles.length > 0 && renderActionButtons()}
			{loaded && files.length > 0 && selectedFiles.length === files.length && <p className="text-md p-2">WARNING: Top checkbox selects ALL files on ALL pages.</p>}
		</div>
	);
};