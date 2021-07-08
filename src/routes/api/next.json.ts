import { parseContents } from "$lib/endpoints/nextUtils";

// import NextParser from "/nextUtils";

export async function get({ query }) {
	const i = query.get("index") ? query.get("index") : "";
	const params = query.get("params") ? query.get("params") : "";
	const video_id = query.get("videoId") ? query.get("video_id") : "";
	const playlist_id = query.get("playlistId") ? query.get("playlistId") : "";
	const ctoken = query.get("ctoken") ? query.get("ctoken") : "";
	let cont = `continuation: ${ctoken}`;
	const response = await fetch(
		`https://music.youtube.com/youtubei/v1/next?alt=json&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`,
		{
			method: "POST",
			body: JSON.stringify({
				context: {
					client: {
						clientName: "WEB_REMIX",
						clientVersion: "0.1",
					},

					user: {
						enableSafetyMode: false,
					},
				},

				continuation: `${ctoken ? ctoken : ""}`,
				isAudioOnly: true,
				enablePersistentPlaylistPanel: true,
				index: `${i ? i : ""}`,
				params: `${params ? params : ""}`,
				tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
				videoId: `${video_id}`,
				playlistId: `${playlist_id}`,
				watchEndpointMusicConfig: {
					hasPersistentPlaylistPanel: true,
					musicVideoType: "MUSIC_VIDEO_TYPE_ATV",
				},
			}),
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				Origin: "https://music.youtube.com",
			},
			// referrer: `https://music.youtube.com/watch?v=${videoId}&list=${playlistId}`,
		}
	);
	if (!response.ok) {
		// NOT res.status >= 200 && res.status < 300
		return { statusCode: response.status, body: response.statusText };
	}
	const data = await response.json();
	if (!params) {
		let {
			contents: {
				singleColumnMusicWatchNextResultsRenderer: {
					tabbedRenderer: {
						watchNextTabbedResultsRenderer: {
							tabs: [
								{
									tabRenderer: {
										content: {
											musicQueueRenderer: {
												content: {
													playlistPanelRenderer: {
														contents,
														continuations: [
															{
																nextRadioContinuationData: {
																	clickTrackingParams,
																	continuation,
																},
															},
														],
													},
												},
											},
										},
									},
								},
							],
						},
					},
				},
			},
			currentVideoEndpoint: { watchEndpoint },
		} = data;
		async function parser(
			contents,
			continuation,
			clickTrackingParams,
			watchEndpoint?
		) {
			// let d = await contents;
			// const parse = new NextParser(watchEndpoint, contents, watchEndpoint);
			// let currentMix = await watchEndpoint.playlistId;
			let parsed = await parseContents(
				contents,
				continuation,
				clickTrackingParams,
				watchEndpoint ? watchEndpoint : ""
			);

			// console.log(parsed + "parsed 1 ");
			return parsed;
		}
		// parser(contents);
		// await console.log(parse);
		return {
			statusCode: 200,
			body: JSON.stringify(
				await parser(contents, continuation, clickTrackingParams, watchEndpoint)
			),
		};
	}
	let watchEndpoint;
	let {
		// currentVideoEndpoint: { watchEndpoint },
		continuationContents: {
			playlistPanelContinuation: {
				contents,
				continuations: [
					{
						nextRadioContinuationData: { clickTrackingParams, continuation },
					},
				],
				playlistId,
				...rest
			} = watchEndpoint,
		},
	} = data;
	async function parser(contents, continuation, clickTrackingParams, rest) {
		// let d = await contents;
		// const parse = new NextParser(watchEndpoint, contents, watchEndpoint);
		// let currentMix = await watchEndpoint.playlistId;
		let parsed = await parseContents(
			contents,
			continuation,
			clickTrackingParams,
			rest
		);
		// console.log(parsed + "parsed 2 ");
		return parsed;
	}
	return {
		statusCode: 200,
		body: JSON.stringify(
			await parser(contents, continuation, clickTrackingParams, rest)
		),
	};
}

// output to netlify function log
//     console.log(error)
//     return {
//         statusCode: 500,
//         // Could be a custom message or object i.e. JSON.stringify(err)
//         body: JSON.stringify({ msg: error.message })
//     }
// }
