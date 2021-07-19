import type { Artist, Thumbnail } from "$lib/types";
import type { NextContinuationData } from "$lib/types";
import type { EndpointOutput } from "@sveltejs/kit";
import type { PlaylistItem } from "$lib/types/playlist";
import { pb } from "$lib/utils";
/** Hits the YouTube Music API for a playlist page
 *	Currently is not fully implemented.
 *
 * @export get
 * @param {*} { query }
 * @return {*}  {Promise<EndpointOutput>}
 */
export async function get({ query }): Promise<EndpointOutput> {
	const browseId = query.get("list");
	// console.log(videoId,playlistId)
	try {
		const response = await fetch(
			"https://music.youtube.com/youtubei/v1/browse?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
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
					browseId: `${browseId}`,
					browseEndpointContextMusicConfig: {
						pageType: "MUSIC_PAGE_TYPE_PLAYLIST",
					},
				}),
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					Origin: "https://music.youtube.com",
				},
			}
		);

		if (!response.ok) {
			return { status: response.status, body: response.statusText };
		}
		const {
			header: { musicDetailHeaderRenderer },
			contents: {
				singleColumnBrowseResultsRenderer: {
					tabs: [
						{
							tabRenderer: {
								content: {
									sectionListRenderer,
									sectionListRenderer: {
										contents: [
											{
												musicPlaylistShelfRenderer,
												musicPlaylistShelfRenderer: { contents },
											},
										],
									},
								},
							},
						},
					],
				},
			},
		} = await response.json();

		const playlist: {
			contents: [];
			continuations: unknown;
			playlistId: string;
		} = await sectionListRenderer;
		const playlistId = playlist?.playlistId;

		const continuations: NextContinuationData = await playlist?.continuations[0]
			.nextContinuationData;
		const parseHeader = Array(musicDetailHeaderRenderer).map(
			({ description, subtitle, thumbnail, secondSubtitle, title }) => {
				const subtitles: string = pb(subtitle, "runs:text", false);
				description = description?.runs[0]?.text
					? description?.runs[0]?.text
					: undefined;

				secondSubtitle = pb(secondSubtitle, "runs:text", false);
				return {
					description,
					subtitles,
					thumbnails:
						thumbnail["croppedSquareThumbnailRenderer"]["thumbnail"][
							"thumbnails"
						],
					playlistId,
					secondSubtitle,
					title: title.runs[0].text,
				};
			}
		)[0];
		// const [contents] = playlist;
		const parseTrack: Array<PlaylistItem> = contents.map(
			({ musicResponsiveListItemRenderer }) => {
				const length = pb(
					musicResponsiveListItemRenderer,
					"fixedColumns:0:musicResponsiveListItemFixedColumnRenderer:text:runs:0:text",
					true
				);
				const flexColumns = pb(
					musicResponsiveListItemRenderer,
					"flexColumns",
					true
				);

				const artistEndpoint = pb(
					flexColumns,
					"musicResponsiveListItemFlexColumnRenderer:1:text:runs:0",
					true
				);
				const titleBody = pb(
					flexColumns,
					"musicResponsiveListItemFlexColumnRenderer:0:text:runs:0",
					true
				);
				let videoId = undefined;
				if (
					!musicResponsiveListItemRenderer.playlistItemData &&
					!musicResponsiveListItemRenderer?.navigationEndpoint?.watchEndpoint
						?.videoId
				)
					return;
				if (musicResponsiveListItemRenderer?.playlistItemData) {
					videoId = musicResponsiveListItemRenderer?.playlistItemData.videoId;
				} else {
					videoId = titleBody?.navigationEndpoint?.watchEndpoint?.videoId
						? titleBody?.navigationEndpoint?.watchEndpoint?.videoId
						: undefined;
				}

				const title = titleBody.text;
				// console.log(artistEndpoint);
				const artist: Artist = {
					artist: artistEndpoint.text,
					browseId:
						artistEndpoint?.navigationEndpoint?.browseEndpoint?.browseId,
				};
				const thumbnail: Thumbnail = pb(
					musicResponsiveListItemRenderer,
					"thumbnail:musicThumbnailRenderer:thumbnail:thumbnails",
					true
				);
				return {
					length,
					videoId: videoId ? videoId : undefined,
					playlistId: musicPlaylistShelfRenderer.playlistId,
					thumbnail,
					title,
					artist,
				};
			}
		);
		const Tracks = parseTrack.filter((e) => {
			return e != null;
		});
		return {
			status: 200,
			body: JSON.stringify({
				continuations: continuations,
				tracks: Tracks,
				header: parseHeader,
			}),
		};
	} catch (error) {
		// output to netlify function log
		console.log(error);
		return {
			status: 500,
			// Could be a custom message or object i.e. JSON.stringify(err)
			body: JSON.stringify({ msg: error.message }),
		};
	}
}
