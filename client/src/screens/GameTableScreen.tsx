import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useGameSocket } from '../context/SocketContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { Card } from '../components/Card.js';
import { ParchiCard, PublicPlayerSeat } from '../types/index.js';
import {
  Crown,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Clock,
  Trophy,
  Volume2,
  VolumeX,
  History,
  Bot,
  CheckCircle2,
} from 'lucide-react';

interface GameTableScreenProps {
  onMatchFinished: () => void;
  onExitToLobby: () => void;
}

export const GameTableScreen: React.FC<GameTableScreenProps> = ({
  onMatchFinished,
  onExitToLobby,
}) => {
  const { user } = useAuth();
  const {
    publicState,
    privateState,
    passCard,
    declareWin,
    sendChatMessage,
    chatMessages,
  } = useGameSocket();
  const { showToast } = useToast();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [passingCardId, setPassingCardId] = useState<string | null>(null);

  // If match status transitions to FINISHED
  useEffect(() => {
    if (publicState && publicState.status === 'FINISHED') {
      const timer = setTimeout(() => {
        onMatchFinished();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [publicState?.status]);

  if (!publicState || !privateState || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 border-4 border-gold-500/20 border-t-gold-400 rounded-full animate-spin mb-4" />
        <div className="text-base font-bold text-ivory-100">Synchronizing game table...</div>
        <div className="text-xs text-stone-400 mt-1">Distributing 16 secret parchis securely</div>
      </div>
    );
  }

  const mySeatIndex = privateState.mySeatIndex;
  const mySeat = publicState.seats[mySeatIndex];
  const isMyTurn = publicState.activeSeat === mySeatIndex && mySeat.finishedRank === null;

  const totalSeats = publicState.seats.length;

  // Relative seating calculation around circular table:
  // Find eligible clockwise pass target for mySeat
  let passTargetSeatIndex = -1;
  for (let step = 1; step <= totalSeats; step++) {
    const nextIdx = (mySeatIndex + step) % totalSeats;
    if (publicState.seats[nextIdx].finishedRank === null) {
      passTargetSeatIndex = nextIdx;
      break;
    }
  }
  const passTargetSeat = passTargetSeatIndex !== -1 ? publicState.seats[passTargetSeatIndex] : null;

  // 4-player specific positions
  const westSeat = publicState.seats[(mySeatIndex + 1) % totalSeats];
  const northSeat = publicState.seats[(mySeatIndex + 2) % totalSeats];
  const eastSeat = publicState.seats[(mySeatIndex + 3) % totalSeats];

  // All opponents in clockwise order from mySeatIndex for dynamic N-player layouts
  const opponentsClockwise: PublicPlayerSeat[] = [];
  for (let step = 1; step < totalSeats; step++) {
    const seatIdx = (mySeatIndex + step) % totalSeats;
    opponentsClockwise.push(publicState.seats[seatIdx]);
  }

  const handleSelectCard = (card: ParchiCard) => {
    if (!isMyTurn) return;
    sound.playClick();
    setSelectedCardId(card.id === selectedCardId ? null : card.id);
  };

  const handlePassCard = () => {
    if (!selectedCardId || !isMyTurn) return;
    setPassingCardId(selectedCardId);
    passCard(selectedCardId);
    setSelectedCardId(null);
    setTimeout(() => setPassingCardId(null), 600);
  };

  const handleDeclareWin = () => {
    if (!privateState.canDeclare) return;
    sound.playDeclare();
    declareWin();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  // Helper for rendering face-down opponent player pod
  const renderOpponentPod = (seat: PublicPlayerSeat, positionLabel: string) => {
    const isTurn = publicState.activeSeat === seat.seatIndex && seat.finishedRank === null;

    return (
      <div
        className={`relative flex flex-col items-center transition-all p-3 rounded-2xl ${
          isTurn
            ? 'scale-105 ring-2 ring-gold-400 bg-gold-500/10 shadow-gold-glow'
            : 'bg-table-dark/70 border border-table-border/60'
        }`}
      >
        {/* Turn Countdown Ring if active */}
        {isTurn && (
          <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-gold-500 text-table-dark text-[10px] font-black tracking-wider flex items-center gap-1 shadow animate-pulse">
            <Clock className="w-3 h-3" />
            <span>{publicState.timeRemaining}s</span>
          </div>
        )}

        {/* Finished Placement Badge */}
        {seat.finishedRank && (
          <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-wider shadow">
            {seat.finishedRank === 1 ? '1st Place 🏆' : `${seat.finishedRank}th Place`}
          </div>
        )}

        {/* Avatar */}
        <div className="relative mb-2">
          <img
            src={seat.avatarUrl}
            alt={seat.displayName}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-gold-400/50 object-cover bg-emerald-950 shadow-md"
          />
          {seat.isBot && (
            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-md bg-cyan-900 border border-cyan-400 text-cyan-200">
              <Bot className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="text-center max-w-[110px]">
          <div className="text-xs font-bold text-ivory-100 truncate">{seat.displayName}</div>
          <div className="text-[10px] text-stone-400 font-mono">Seat {seat.seatIndex + 1}</div>
        </div>

        {/* Face-Down Secret Cards (Never reveals actual identity!) */}
        <div className="flex items-center -space-x-3 mt-2">
          {Array.from({ length: seat.cardCount }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-9 sm:w-7 sm:h-11 rounded-md border border-amber-700/60 bg-gradient-to-br from-[#8a5725] to-[#42250d] shadow-sm transform -rotate-3 flex items-center justify-center text-[9px] text-gold-300 font-serif font-black select-none"
              title="Secret Face-down Parchi"
            >
              16
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 pb-24 select-none">
      {/* Top Game Bar */}
      <div className="flex items-center justify-between bg-table-surface/90 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-table-border shadow-md gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-mono text-gold-400 font-bold text-xs sm:text-sm tracking-wider">
              {publicState.roomCode}
            </span>
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-black/40 text-stone-400 font-mono">
              <span className="sm:hidden">R{publicState.roundNumber}·T{publicState.turnNumber}</span>
              <span className="hidden sm:inline">Round {publicState.roundNumber} • Turn {publicState.turnNumber}</span>
            </span>
          </div>
        </div>

        {/* Active Turn Announcement */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-center overflow-hidden">
          {isMyTurn ? (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-gold-500/20 border border-gold-500/50 text-gold-300 text-[11px] sm:text-xs font-bold shadow-gold-glow animate-pulse truncate">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">YOUR TURN ({publicState.timeRemaining}s)</span>
              <span className="hidden sm:inline">YOUR TURN TO PASS A PARCHI! ({publicState.timeRemaining}s)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-400 font-semibold truncate">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">{publicState.seats[publicState.activeSeat]?.displayName} ({publicState.timeRemaining}s)</span>
                <span className="hidden sm:inline">{publicState.seats[publicState.activeSeat]?.displayName}'s turn ({publicState.timeRemaining}s)</span>
              </span>
            </div>
          )}
        </div>

        {/* Chat Toggle & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-xl bg-table-card border border-table-border text-stone-300 hover:text-gold-400 transition-colors relative"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gold-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Playing Table Felt */}
      <div className="relative my-4 flex-1 flex flex-col justify-between items-center rounded-[40px] sm:rounded-[60px] table-felt p-4 sm:p-8 min-h-[460px] sm:min-h-[520px]">
        {/* Table Center Felt Crest */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-gold-500/20 bg-emerald-950/40 flex flex-col items-center justify-center text-center opacity-60">
            <Crown className="w-12 h-12 text-gold-400/40 mb-1" />
            <span className="font-serif font-black text-sm tracking-widest text-gold-200/50">
              {totalSeats * 4} PARCHI
            </span>
            <span className="text-[10px] font-mono text-emerald-400/60 uppercase">
              Clockwise Table
            </span>
          </div>
        </div>

        {/* Transfer Notification in center of table */}
        {publicState.lastTransfer && (
          <div className="z-15 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-gold-500/30 text-[11px] font-mono text-gold-300 animate-fade-in shadow-md mb-2">
            <span>{publicState.seats[publicState.lastTransfer.fromSeat]?.displayName}</span>
            <ArrowRight className="w-3 h-3 text-gold-400" />
            <span>{publicState.seats[publicState.lastTransfer.toSeat]?.displayName}</span>
          </div>
        )}

        {/* Dynamic Opponent Seating Layout */}
        {totalSeats === 4 ? (
          <>
            {/* NORTH: Opponent Across (Seat +2) */}
            <div className="z-10">{renderOpponentPod(northSeat, 'North')}</div>

            {/* MIDDLE ROW: WEST & EAST OPPONENTS */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 z-10">
              {/* WEST: Clockwise Target (Seat +1) */}
              <div className="flex flex-col items-center">
                {passTargetSeat?.seatIndex === westSeat.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400/80 mb-1 flex items-center gap-1 font-bold">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(westSeat, 'West')}
              </div>

              {/* EAST: Clockwise Sender (Seat +3) */}
              <div className="flex flex-col items-center">
                {passTargetSeat?.seatIndex === eastSeat.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400/80 mb-1 flex items-center gap-1 font-bold">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(eastSeat, 'East')}
              </div>
            </div>
          </>
        ) : (
          /* N > 4 players: Opponent Gallery Rail */
          <div className="w-full flex items-center justify-center gap-3 sm:gap-6 flex-wrap z-10 px-2 my-2">
            {opponentsClockwise.map((seat) => (
              <div key={seat.seatIndex} className="flex flex-col items-center">
                {seat.seatIndex === passTargetSeat?.seatIndex && (
                  <div className="text-[10px] font-mono text-gold-400 mb-1 flex items-center gap-1 font-bold animate-pulse">
                    <span>Pass Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
                {renderOpponentPod(seat, `Seat ${seat.seatIndex + 1}`)}
              </div>
            ))}
          </div>
        )}

        {/* SOUTH: YOU (The Player's interactive Hand) */}
        <div className="z-20 w-full flex flex-col items-center">
          {/* Action Callout if can declare */}
          {privateState.canDeclare && mySeat.finishedRank === null && (
            <div className="mb-3 animate-bounce">
              <button
                onClick={handleDeclareWin}
                className="gold-gradient-btn px-4 sm:px-8 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-base font-black shadow-gold-glow flex items-center gap-2 border-2 border-white ring-4 ring-gold-400/50"
              >
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-table-dark shrink-0" />
                <span>🎉 DECLARE {totalSeats * 4} PARCHI!</span>
              </button>
            </div>
          )}

          {/* Finished placement message if user already won */}
          {mySeat.finishedRank && (
            <div className="mb-3 px-4 sm:px-6 py-2 rounded-2xl bg-emerald-600/90 text-white font-serif font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gold-300 shrink-0" />
              <span>
                YOU FINISHED IN {mySeat.finishedRank === 1 ? '1ST PLACE 🏆' : `${mySeat.finishedRank}TH PLACE`}!
              </span>
            </div>
          )}

          {/* Your 4 Parchis */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-4 flex-wrap max-w-full px-1">
            {privateState.myHand.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isPassing = passingCardId === card.id;

              return (
                <Card
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  isPassing={isPassing}
                  onClick={() => handleSelectCard(card)}
                  disabled={!isMyTurn || mySeat.finishedRank !== null}
                />
              );
            })}
          </div>

          {/* Pass Action Button Bar */}
          {mySeat.finishedRank === null && (
            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-3 w-full px-2">
              {isMyTurn ? (
                <button
                  disabled={!selectedCardId}
                  onClick={handlePassCard}
                  className={`w-full sm:w-auto px-5 sm:px-8 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
                    selectedCardId
                      ? 'gold-gradient-btn shadow-gold-glow hover:scale-105 active:scale-95 animate-pulse'
                      : 'bg-table-card border border-table-border text-stone-400'
                  }`}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>
                    {selectedCardId ? (
                      <>
                        <span className="sm:hidden">
                          Pass to {passTargetSeat ? passTargetSeat.displayName.split(' ')[0] : 'Next'} ({publicState.timeRemaining}s)
                        </span>
                        <span className="hidden sm:inline">
                          Pass Selected Slip to {passTargetSeat ? passTargetSeat.displayName : 'Next Player'} ({publicState.timeRemaining}s)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="sm:hidden">👆 Tap a parchi above to pass</span>
                        <span className="hidden sm:inline">👆 Tap an unwanted parchi above to pass</span>
                      </>
                    )}
                  </span>
                </button>
              ) : (
                <div className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-2xl bg-table-dark/80 border border-table-border text-[11px] sm:text-xs text-stone-300 font-semibold flex items-center justify-center gap-2 shadow text-center">
                  <Clock className="w-3.5 h-3.5 text-gold-400 animate-spin shrink-0" />
                  <span className="truncate">
                    Waiting for {publicState.seats[publicState.activeSeat]?.displayName} to pass...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Table Chat Drawer / Side Panel */}
      {showChat && (
        <div className="fixed bottom-16 inset-x-2 sm:inset-x-auto sm:right-8 z-40 sm:w-80 bg-table-surface border border-table-border rounded-3xl shadow-2xl p-4 flex flex-col h-80">
          <div className="flex items-center justify-between border-b border-table-border pb-2 mb-2">
            <div className="text-xs font-bold text-ivory-100 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
              <span>Table Chat & Logs</span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-stone-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {publicState.logs.slice(0, 5).map((log) => (
              <div key={log.id} className="text-[11px] text-stone-400 italic">
                • {log.text}
              </div>
            ))}

            {chatMessages.map((msg) => (
              <div key={msg.id} className="p-2 rounded-xl bg-table-card border border-table-border">
                <div className="text-[10px] font-bold text-gold-300">{msg.displayName}</div>
                <div className="text-ivory-100 mt-0.5">{msg.message}</div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5">
            <input
              type="text"
              placeholder="Quick reaction..."
              maxLength={60}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-table-card border border-table-border text-xs text-ivory-100 focus:outline-none focus:border-gold-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-gold-500 text-table-dark hover:bg-gold-400 font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
