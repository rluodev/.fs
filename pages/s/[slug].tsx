import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Page() {
	const [destination, setDestination] = useState<string>('');

	const router = useRouter();

	const fetchData = async (slug: string) => {
		const res = await fetch(`/api/searchMongoTemp`, {
			method: 'POST',
			body: JSON.stringify({ slug: slug }),
			headers: {
				'Content-Type': 'application/json'
			},
		});
		if (res.status === 200) {
			const data = await res.json();
			const url = data.accessPath;
			router.push(url);
		} else if (res.status === 404) {
			setDestination('not found');
		} else if (res.status === 410) {
			setDestination('expired');
		} else {
			setDestination('error');
		}
	}

	useEffect(() => {
		if (!router.isReady) return;

		const { slug } = router.query;
		fetchData(slug as string);

	}, [router.isReady, router.query]);
	return (<div className="flex flex-col justify-center items-center min-w-screen min-h-screen">
		<div className="bg-transparent flex-col adaptive border border-grey-500 rounded-lg p-4 h-[80vh] w-[95vw] sm:h-[60vh] sm:w-[80vw] justify-center items-center text-center flex space-y-4">
			<img src="/dotfs.svg" alt="logo" className="h-[10vh]" />
			<p className="text-white">{destination === '' && 'Loading your file...'}{destination === 'not found' && 'File Not Found'}{destination === 'expired' && 'Link Expired'}{destination === 'error' && 'An error was encountered trying to access this file'}</p>
		</div>
	</div>
	);
}

export async function getServerSideProps() {
	return {
		props: {
			title: 'Direct Access Link',
		},
	};
}