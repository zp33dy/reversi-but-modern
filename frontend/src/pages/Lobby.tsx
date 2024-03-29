import React, { useState, useEffect } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useNavigate, useParams } from "react-router-dom";
import { ReactComponent as CopySvg } from "../svg/copy.svg";
import config from "../app.config.json";
import { join } from "path";

const backendName = config.backend.websocket_url;
console.log(backendName);

interface SessionCodeDisplayProps {
	sessionCode: string;
}


const PlayButton: React.FC<{ websocket: WebSocket | null; joinedSessionCode: string | null; }> = ({ websocket, joinedSessionCode }) => {
	const [ws, setWs] = useState<WebSocket | null>(websocket);
	const [_joinedSessionCode, _setJoinedSessionCode] = useState<string | null>(joinedSessionCode);
	return (
		<div
			className="flex relative"
			onClick={() => {
				if (ws !== null) {
					ws.send(
						JSON.stringify({
							event: "GameStartEvent",
							session: _joinedSessionCode,
						})
					);
				} else {
					console.log("ws is null");
				}
			}}
		>
			<div
				className="relative border-highlight-c border-solid border-[1px] py-4 px-4 
  				rounded-3xl z-10 font-thin text-8xl hover:text-c hover:bg-highlight-c 
				transition duration-300 ease-in cursor-pointer">
				PLAY
			</div>
			<div className="absolute w-full h-full top-0 left-0 border-highlight-c border-solid border-[12px] rounded-3xl blur-xl"></div>
		</div>
	)
}

const SessionCodeDisplay: React.FC<SessionCodeDisplayProps> = ({ sessionCode }) => {
	const [copied, setCopied] = useState("");
	const [joinedSessionCode, setJoinedSessionCode] = useState(sessionCode);
	return (
		<div className="flex flex-row">
			<div className="relative">
				<div className="relative flex border-highlight-c border-solid border-[1px] py-6 px-6 rounded-3xl items-center text-7xl">
					<p className="font-light">Lobby Code: </p>
					<input
						type="text"
						className="flex z-10 w-56 text-7xl text-center border-none outline-none justify-center font-light bg-transparent"
						value={joinedSessionCode}
						onChange={(e) => setJoinedSessionCode(e.target.value)}
					/>
				</div>
				<div className="absolute w-full h-full top-0 left-0 border-highlight-c border-solid border-[12px] rounded-3xl blur-xl"></div>
			</div>
			{/* Copy Icon */}
			<CopyToClipboard
				text={window.location.href}
				onCopy={() => setCopied(window.location.href)}
			>
				<div className="w-32 h-32">
					<CopySvg
						className={`w-full h-full mx-10 p-4 rounded-3xl 
					border-highlight-c border-solid border-[1px]
					hover:fill-highlight-a/50 transition duration-300 ease-out cursor-pointer
					${copied === window.location.href ? "fill-a bg-highlight-d" : "bg-d fill-a"}`}
					/>
				</div>
			</CopyToClipboard>
		</div>
	)
}

class LobbyPlayers extends React.Component<{ userIds: Array<number> }, {}> {
	constructor(props: { userIds: Array<number> }) {
		super(props);
	}
	render(): React.ReactNode {
		return (
			<div className="flex flex-row gap-6">
				{this.props.userIds.map((userId) => {
					return (
						<div
							key={userId}
							className="flex flex-col items-center justify-center transition-all duration-500">
							<div className="relative w-40 h-40 text-7xl items-center">
								<div className="absolute w-full h-full top-0 left-0 border-highlight-c border-solid border-[12px] rounded-full blur-xl"></div>
								<div className="relative w-full h-full border-highlight-c border-solid border-[1px] rounded-full items-center"
									key={userId.toString()}>
									<p className="w-full h-full">
										{userId
											? `${userId.toString().slice(0, 2)}\n
											${userId.toString().slice(2)}`
											: "0"}
									</p>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		);
	}
}


let lobby_init: boolean = false;
const Lobby: React.FC = () => {
	const [sessionCode, setSessionCode] = useState("");
	const [joinedSessionCode, setJoinedSessionCode] = useState(""); // contains the session code that the user has joined
	const [copied, setCopied] = useState(""); // contains the copied text
	const navigate = useNavigate();
	const [ws, setWs] = useState<WebSocket | null>(null);
	const [userIds, setUserIds] = useState<Array<number>>([]);
	const [playButtonClicked, setPlayButtonClicked] = useState(false);
	const { session_id } = useParams<{ session_id: string }>();
	const [serverMessages, setServerMessages] = useState<Array<string>>([]);
	if (
		session_id !== "0" &&
		session_id !== undefined &&
		session_id !== sessionCode
	) {
		setSessionCode(session_id);
	}
	// generate a random 16 digit number
	const custom_id: number = Math.floor(
		1000000000000000 + Math.random() * 9000000000000000
	);

	useEffect(() => {
		console.log("useEffect");
		console.log("lobby_init: " + lobby_init);
		if (lobby_init === false) {
			console.log("lobby_init is false");
			lobby_init = true;
		} else {
			return () => {
				lobby_init = false;
				ws?.close();
			};
		}
		// Establish WebSocket connection
		var socket: WebSocket;
		if (ws === null) {
			socket = new WebSocket(`${backendName}/lobby`);
			setWs(socket);
		} else {
			socket = ws;
		}

		if (session_id === "0") {
			// join lobby
			console.log("session_id is 0");
			socket.onopen = () => {
				// create new session code
				socket.send(
					JSON.stringify({
						event: "SessionCreateEvent",
					})
				);
			};
		} else {
			console.log("session_id is not 0");
			// join lobby with session code
			socket.onopen = () => {
				socket.send(
					JSON.stringify({
						event: "SessionJoinEvent",
						session: sessionCode,
						custom_id: custom_id,
					})
				);
			};
		}
		// Handle WebSocket messages
		socket.onmessage = (event) => {
			// log time in hh:mm:ss format
			var time = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
			setServerMessages((prevServerMessages) => [
				`${time}: ${event.data}`,
				...prevServerMessages,
			]);
			const data = JSON.parse(event.data);
			// handle session join event
			if (data.event === "SessionJoinEvent") {
				if (data.status === 200 ) {
					console.log("SessionJoinEvent");
					const { session } = data;
					const user_id = data.data.user_id;
					setUserIds((prevUserIds) => data.data.all_users);
					setJoinedSessionCode(session);
				} else if (data.status == 404) {
					// create new session code
					socket.send(
						JSON.stringify({
							event: "SessionCreateEvent",
						})
					);
				}

			}

			// handle session create event
			if (data.event === "SessionCreateEvent" && data.status === 200) {
				// setSessionCode(data.session);
				console.log("SessionCreateEvent");
				setUserIds([]);
				navigate(`/lobby/${data.session}`);
				socket.send(
					JSON.stringify({
						event: "SessionJoinEvent",
						session: data.session,
						custom_id: custom_id,
					})
				);
			}
			// handle game start event
			if (data.event === "GameStartEvent" && data.status === 200) {
				console.log("GameStartEvent");
				socket.close();
				navigate(`/game/${data.session}`);
			}

			// handle session leave event
			if (data.event === "SessionLeaveEvent" && data.status === 200) {
				setUserIds((prevUserIds) => data.data.all_users);
			}

			// Cleanup WebSocket connection on component unmount
			return () => {
				socket.close();
				lobby_init = false;
				setWs(null);
			};
		};
	}, []);

	return (
		<div
			className="flex flex-col text-6xl text-highlight-a justify-center w-full h-[100%]
      		items-center text-center gap-24 py-10 scrollbar-thin scrollbar-thumb-d scrollbar-track-b overflow-auto"
			key={joinedSessionCode}
		>
			<SessionCodeDisplay sessionCode={joinedSessionCode}  />
			<PlayButton websocket={ws} joinedSessionCode={joinedSessionCode} />
			<LobbyPlayers userIds={userIds} />
			{/* <div className="rounded-3xl bg-b mx-10 font-mono text-sm px-3 py-3 text-left">
				{serverMessages.map((message) => {
					return <p>{message}</p>;
				})}
			</div> */}
		</div>
	);
};

export default Lobby;
