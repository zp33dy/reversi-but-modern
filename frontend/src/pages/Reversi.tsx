import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface BoardProps {
    theme: string;
    rows: number;
    cols: number;
    socket: WebSocket | null;
  }
  
interface BoardState {
active_row: number;
active_col: number;
clicked_row: number;
clicked_col: number;
screen_height: number;
rotation: number;
}

interface ChipProps {
    color: string;
    bg_color: string;
}

class Chip extends React.Component<ChipProps> {
    render() {
        const { color, bg_color } = this.props;

        return (
        <div className={`items-center justify-center w-[90%] h-[90%] rounded-full ${bg_color}`}>
            <div
                className={`items-center justify-center transition-all duration-300 ease-out rounded-full w-full h-full ${color}`}
            ></div>
        </div>

        );
    }
}

class ChipPlacedEvent {
  user_id: number;
  data: { row: number; col: number };
  session: string;
  event: string = "ChipPlacedEvent";
  type: string = "request";

  constructor(user_id: number, row: number, col: number, session?: string) {
    this.user_id = user_id;
    this.data = {
      row: row,
      col: col,
    };
    this.session = session ?? 'test00session';
  }


  public to_json() {
    return JSON.stringify(this);
  }
}

class Board extends React.Component<BoardProps, BoardState> {
    active_attrs: string;
    unactive_attrs: string;
    // board: list[dict[row: int, col: int, chip: Chip]]
    board: Array<{ row: number, col: number, chip: JSX.Element }> = [];
    chips: { [key: number]: JSX.Element } = {
        1 : <Chip color="bg-highlight-a/70 border-4 border-black/40" bg_color='bg-a'/>,
        2 : <Chip color="bg-highlight-d/70 border-4 border-black/40" bg_color='bg-a' />,
    };

    current_chip_number: number = 1;

    constructor(props: BoardProps) {
        super(props);
        this.state = {
        active_row: -1,
        active_col: -1,
        clicked_row: -1,
        clicked_col: -1,
        screen_height: window.innerHeight,
        rotation: 0,
        };  
        this.active_attrs = "bg-b text-highlight-b font-semibold text-xl";
        this.unactive_attrs = "text-highlight-b font-extralight text-xl";
    }

    cyclePlayer() {
        this.current_chip_number = this.current_chip_number === 1 ? 2 : 1;
    }

    componentDidMount() {
        // Update the screen height state when the component mounts
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        // Remove the event listener when the component unmounts
        window.removeEventListener('resize', this.handleResize);
    }

    handleResize = () => {
        // Update the screen height state when the window is resized
        this.setState({ screen_height: Math.min(window.innerHeight, window.innerWidth) });
    }
    render() {
        const squares = [];
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const { active_row, active_col, clicked_col, clicked_row, screen_height, rotation } = this.state;
        const row_amount = this.props.rows;
        const col_amount = this.props.cols;
        const numberLabels = Array.from({ length: col_amount -1 }, (_, i) => i + 1);
        const { theme, socket } = this.props;

        // call websocket on click
        const handleClick = (row: number, col: number) => {
            this.setState({
                clicked_col: col,
                clicked_row: row,
            });
            this.board.push({ row: row, col: col, chip: this.chips[this.current_chip_number]});
            this.cyclePlayer();
            if (socket) {
                socket.send(new ChipPlacedEvent(1, row, col).to_json())
            }
        };
        // generate squares
        for (let row = 0; row < row_amount; row++) {
        for (let col = -1; col < col_amount-1; col++) {
            // add orientation squares
            if (row === row_amount - 1 && col === -1) {
            // add empty square
            squares.push(
                <div
                key={`${row}-${col}`}
                className={``}
                
                ></div>
            );
            continue;
            }
            if (row < row_amount - 1 && col === -1) {
              // add letters
              // background if active
              const active_attrs = row === active_row ? this.active_attrs : this.unactive_attrs;
              const letter = letters[row];
              squares.push(
                  <div
                  key={`${row}:${col}`}
                  className={`flex justify-center items-center transition-all duration-700 ease-out rounded-full ${active_attrs}`}
                  >
                  {letter}
                  </div>
              );
              continue;
            }
            if (row === row_amount -1 && col > -1) {
              // add numbers
              // background if active
              const active_attrs = col === active_col ? this.active_attrs : this.unactive_attrs;
              const number = numberLabels[col];
              
              squares.push(
                  <div
                  key={`${row}-${col}`}
                  className={`flex justify-center items-center transition-all duration-700 ease-out rounded-full ${active_attrs}`}
                  >
                  {number}
                  </div>
              );
              continue;
            }
            // add normal squares
            const color = (row + col) % 2 === 0 ? "bg-b " : "bg-d";
            const isActive = row === clicked_row && col === clicked_col;
            const chip = this.board.find((item) => item.row === row && item.col === col)?.chip ?? <Chip color="bg-transparent rounded-lg w-[0%] h-[0%] border-transparent" bg_color=''/>;
            squares.push(
            <div
                key={`${row}-${col}`}
                className={`flex ${color} justify-center items-center transition-all duration-1000 ease-out`}
                // set state of hover row and col
                onMouseEnter={() => {
                this.setState({
                    active_row: row,
                    active_col: col,
                });
                }}
                // send WS message and set active row and col
                onClick={() => {
                  handleClick(row, col);
                }}
            >
                <div className={`flex w-full h-full justify-center items-center hover:bg-highlight-d/50 hover:rounded-2xl 
                bg-transparent transition-all duration-[1200ms] ease-out hover:duration-200`}>
                    {/* render chip on click into the square */}
                    <div className='flex w-full h-full items-center justify-center'>{chip}</div>
                </div>

                
            </div>
            );
        }
        }
      const px = Math.floor(screen_height * 0.8);
      const px_rest_width = (Math.min(window.innerHeight, window.innerWidth - px) ) / 1.42 * 1;
      return (
        <div className={`flex flex-col lg:flex-row items-center justify-center`}>
            <div className={theme + " grid grid-cols-9 grid-rows-9"} style={{ height: px, width: px }}>
            {squares}
            </div>
            <div className="flex flex-row justify-around items-center relative my-5 lg:my-0 lg:mx-5 max-h-[80vh] overflow-hidden" style={{ height: px_rest_width, width: px_rest_width }}>
                <div
                    className={`absolute -z-1 w-[98%] h-[98%] bg-transparent border-highlight-c rounded-full border-4
                    border-t-1 border-l-0 border-r-0 border-b-0 transition-all duration-[1s] ease-out 
                    ${this.current_chip_number === 1 ? 'rotate-90 border-highlight-a' : '-rotate-90 border-highlight-d'} `}
                ></div>
                <div className="flex rounded-full bg-b justify-center items-center text-8xl" style={{ height: px_rest_width/2.2, width: px_rest_width/2.2 }}>
                    A
                </div>
                <div className="flex rounded-full bg-c justify-center items-center text-8xl" style={{ height: px_rest_width/2.2, width: px_rest_width/2.2 }}>
                    B
                </div>
            </div>
        </div>
      );
    }
}



interface ReversiProps {
    theme: string;
  }
  
  const Reversi: React.FC<ReversiProps> = ({ theme }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [connected_session, setConnectedSession] = useState<string | null>(null);
    const { session_id } = useParams<{ session_id: string }>();
    useEffect(() => {
      const newSocket = new WebSocket('ws://localhost:8888/chat');
      setSocket(newSocket);
  
      newSocket.onmessage = (event) => {
        const message = event.data;
        const json_event = JSON.parse(message);
        if (json_event.event === 'SessionJoinEvent' && json_event.status === 200) {
          setConnectedSession(json_event.data.session);
        };
        setMessages((prevMessages) => [message, ...prevMessages]);
      };
      newSocket.onopen = (event) => {
        console.log('connected');
        newSocket.send(JSON.stringify({
          event: 'SessionJoinEvent',
          type: 'request',
          data: {
            session: session_id
        },}));
      };
  
      return () => {
        newSocket.close();
      };
    }, []);
  
    const sendMessage = () => {
      if (socket) {
        socket.send(inputValue);
        setInputValue('');
      }
    };
  
    return (
      <div className={`${theme} flex flex-col md:flex-col space-x-4 space-y-4 my-10 justify-around px-[5%] overflow-y-visible text-highlight-c`}>
        {/* Board Component */}
        <div className="flex-shrink">
          <Board theme={theme} rows={9} cols={9} socket={socket} />
        </div>
  
        <div>
          {connected_session? `connected to session: ${connected_session}` : 'connecting...'}
        </div>
        {/* Websocket communication */}
        <div className="flex-auto text-highlight-c">
          <div
            className={`bg-c text-center h-[63vh] text-highlight-c message-list flex-auto rounded-3xl overflow-auto transition-all 
            duration-300 scrollbar-thin scrollbar-thumb-d scrollbar-track-b w-[80%] my-48`}
          >
            {messages.map((message, index) => (
              <p key={index} className="transition-all duration-300">
                {message}
              </p>
            ))}
          </div>
  
          <div className="flex flex-row justify-end m-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`rounded-full text-highlight-c flex-auto mx-[3%] py-2 bg-d text-center border-2 border-transparent 
              transition duration-300 focus:border-2 focus:border-highlight-b outline-none placeholder-highlight-a`}
              placeholder="Communicate with the websocket"
            />
  
            <button
              onClick={sendMessage}
              className={`px-10 py-2 basis[20%] transition duration-300 text-highlight-a rounded-full bg-d hover:border-red-700`}
            >
              Send
            </button>
          </div>
        </div>

      </div>
    );
  };
  

export default Reversi;