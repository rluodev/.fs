import "@/styles/globals.scss";
import type { AppProps } from "next/app";
import { Dosis } from 'next/font/google'
import Head from "next/head";

export const metadata = {
	title: {
		template: '%s | .fs',
		default: '.fs',
	},
	description: '.fs',
}

const dosis = Dosis({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
	const title = pageProps.title ? `${pageProps.title} | .fs` : metadata.title.default;

	return (
		<div className={`bg-gray-900 transition-colors duration-500 w-full min-h-screen ${dosis.className}`}>
			<Head>
				<title>{title}</title>
				<meta name="description" content={metadata.description} />
				<link rel="icon" href="/favicon.ico" />
				<link rel="preload" href="/dotfs.svg" as="image" />
			</Head>
			<Component {...pageProps} />
		</div>
	);
}
