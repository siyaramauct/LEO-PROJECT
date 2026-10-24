// -----------------------------------------------------------------------------
// Image Match Activity
//
// A matching game built from the lesson's flashcards that have images. The
// student picks a word, then the image that goes with it. Correct pairs turn
// green and stay locked; a wrong guess clears the selection so they can try
// again. "Play again" reshuffles both columns.
//
// Opened from the flashcard page when a lesson has at least two image cards.
//
// Route: /lesson/:lessonId/match || Access: students
// -----------------------------------------------------------------------------

import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentBottomNav from "../Components/StudentBottomNav";
import { errorMessage } from "../data/errors";
import { getFlashcards, type LessonFlashcard } from "../data/flashcards";
import { bucketImageUrl } from "../utils/images";

// A flashcard that has a picture.
type MatchCard = LessonFlashcard & { image_path: string };

// Returns a shuffled copy using the Fisher-Yates method: walk backwards
// through the list, swapping each item with a random one at or before it.
// Every order is equally likely.
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export default function ImageMatchActivity() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [round, setRound] = useState(0); // Bumped by "Play again" to reshuffle.
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Only cards with an image can be part of the game.
  useEffect(() => {
    if (!lessonId) return;
    const loadCards = async () => {
      setIsLoading(true);

      try {
        const imageCards = await getFlashcards(lessonId, { imagesOnly: true });
        setCards(imageCards.filter((card): card is MatchCard => card.image_path !== null));
      } catch (loadError) {
        console.error("Failed to load matching cards:", loadError);
        setError(errorMessage(loadError, "The matching game could not be loaded right now."));
      } finally {
        setIsLoading(false);
      }
    };
    void loadCards();
  }, [lessonId]);

  // Words and images are shuffled separately so the columns don't line up.
  // "round" is listed as a dependency, and read with void, so each new round
  // reshuffles while normal re-renders keep the same order.
  const words = useMemo(() => {
    void round;
    return shuffled(cards);
  }, [cards, round]);
  const images = useMemo(() => {
    void round;
    return shuffled(cards);
  }, [cards, round]);
  const isComplete = cards.length >= 2 && matchedIds.length === cards.length;

  // A pair matches when the image belongs to the same flashcard as the word.
  function chooseImage(cardId: string) {
    if (!selectedWordId || matchedIds.includes(cardId)) return;
    if (cardId === selectedWordId) {
      setMatchedIds((current) => [...current, cardId]);
      setFeedback("Correct match.");
    } else {
      setFeedback("Not quite. Try that word with another image.");
    }
    setSelectedWordId(null);
  }

  function restart() {
    setMatchedIds([]);
    setSelectedWordId(null);
    setFeedback("");
    setRound((current) => current + 1);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StudentBottomNav />
      <main className="min-h-dvh bg-slate-50 pb-nav-20 lg:ml-56 lg:pb-0">
        <header className="border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/lesson/${lessonId}`)}
              aria-label="Back to flashcards"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <p className="text-xs font-medium text-violet-700">Lesson practice</p>
              <h1 className="mt-1 text-base font-bold">Match words to images</h1>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          {isLoading && (
            <p className="py-16 text-center text-sm text-slate-500">Loading image cards...</p>
          )}
          {!isLoading && (error || cards.length < 2) && (
            <section className="rounded-xl border border-slate-100 bg-white p-8 text-center">
              <h2 className="text-lg font-bold">Matching activity unavailable</h2>
              <p className="mt-2 text-sm text-slate-500">
                {error || "This lesson needs at least two flashcards with images."}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/lesson/${lessonId}`)}
                className="mt-5 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Back to flashcards
              </button>
            </section>
          )}
          {!isLoading && !error && cards.length >= 2 && (
            <>
              <section className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">Choose a word, then choose its image</h2>
                    <p className="mt-1 text-xs text-slate-500">Matched pairs stay highlighted.</p>
                  </div>
                  <span className="text-sm font-semibold text-violet-700">
                    {matchedIds.length} of {cards.length} matched
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-700 transition-all"
                    style={{ width: `${(matchedIds.length / cards.length) * 100}%` }}
                  />
                </div>
              </section>

              {isComplete ? (
                <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                  <h2 className="mt-3 text-xl font-bold">All images matched</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    You matched every word in this activity.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={restart}
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      <RotateCcw size={16} /> Play again
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/quiz/${lessonId}`)}
                      className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      Continue to quiz
                    </button>
                  </div>
                </section>
              ) : (
                <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <h2 className="text-sm font-bold">Words</h2>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                      {words.map((card) => {
                        const matched = matchedIds.includes(card.flashcard_id);
                        const selected = selectedWordId === card.flashcard_id;
                        return (
                          <button
                            key={card.flashcard_id}
                            type="button"
                            disabled={matched}
                            onClick={() => {
                              setSelectedWordId(card.flashcard_id);
                              setFeedback("");
                            }}
                            className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${matched ? "border-emerald-200 bg-emerald-50 text-emerald-700" : selected ? "border-violet-700 bg-violet-50 text-violet-800 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"}`}
                          >
                            {matched && <CheckCircle2 size={15} className="mr-1.5 inline" />}
                            {card.word}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4">
                    <h2 className="text-sm font-bold">Images</h2>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {images.map((card) => {
                        const matched = matchedIds.includes(card.flashcard_id);
                        const imageUrl = bucketImageUrl(card.image_path);
                        return (
                          <button
                            key={card.flashcard_id}
                            type="button"
                            disabled={matched || !selectedWordId}
                            onClick={() => chooseImage(card.flashcard_id)}
                            aria-label={
                              matched ? `Matched image for ${card.word}` : "Choose this image"
                            }
                            className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition ${matched ? "border-emerald-500 opacity-60" : selectedWordId ? "border-transparent hover:border-violet-500" : "cursor-not-allowed border-transparent opacity-70"}`}
                          >
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                            {matched && (
                              <span className="absolute inset-0 flex items-center justify-center bg-emerald-900/25">
                                <CheckCircle2 size={30} className="text-white" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
              {feedback && !isComplete && (
                <p
                  role="status"
                  className={`mt-4 rounded-lg px-4 py-3 text-center text-sm font-semibold ${feedback.startsWith("Correct") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                >
                  {feedback}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
