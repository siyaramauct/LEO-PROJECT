import {
  ArrowLeftIcon,
  CheckIcon,
  SpeakerWaveIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import StudentBottomNav from "../Components/StudentBottomNav"

const currentCard = {
  word: "Nucleus",
  definition: "The control center of the cell that contains genetic material and regulates the cell's activities.",
}

export default function StudentFlashcards() {
  const navigate = useNavigate()
  const [flipped, setFlipped] = useState(false)

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-slate-50 pb-24 text-slate-950 md:pb-10 md:pl-56">
      <section className="flex w-full flex-col px-4 pt-5 min-[380px]:px-5 sm:px-6 md:px-8 md:pt-8 lg:mx-auto lg:max-w-5xl xl:max-w-6xl">
        <header className="grid grid-cols-3 items-center">
          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
            aria-label="Back to dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-center text-sm font-bold sm:text-base md:text-sm">Study Flashcards</h1>
          <p className="text-right text-xs font-bold text-slate-700">3 / 10</p>
        </header>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full w-[30%] rounded-full bg-violet-700" />
        </div>

        <article
          className="mt-5 h-[calc(100dvh-19rem)] min-h-80 max-h-[32rem] cursor-pointer rounded-3xl [perspective:1000px] min-[380px]:mt-8 md:h-[28rem] md:min-h-0 md:max-h-none md:rounded-2xl lg:h-[30rem]"
          onClick={() => setFlipped((isFlipped) => !isFlipped)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              setFlipped((isFlipped) => !isFlipped)
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={flipped ? "Show flashcard word" : "Show flashcard definition"}
        >
          <div
            className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
              flipped ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            <div className="absolute inset-0 flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 [backface-visibility:hidden] min-[380px]:p-6 md:rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase text-violet-700">
                  Word
                </span>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-violet-700 transition hover:bg-violet-50 active:scale-95"
                  aria-label="Save word"
                  onClick={(event) => event.stopPropagation()}
                >
                  <StarIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
                <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
                  <h2 className="max-w-full break-words text-4xl font-bold sm:text-5xl md:text-4xl">
                    {currentCard.word}
                  </h2>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700 transition active:scale-95"
                    aria-label="Play pronunciation"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <SpeakerWaveIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-400">Tap to see definition</p>
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 [backface-visibility:hidden] [transform:rotateY(180deg)] min-[380px]:p-6 md:rounded-2xl">
              <span className="w-fit rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase text-violet-700">
                Definition
              </span>
              <div className="my-8 h-px bg-slate-200" />
              <p className="text-sm font-medium leading-7 text-slate-700 sm:text-base md:text-sm">
                {currentCard.definition}
              </p>
              <p className="mt-auto text-center text-[11px] font-semibold text-slate-400">Tap to see word</p>
            </div>
          </div>
        </article>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95 sm:py-4 sm:text-xs md:py-3">
            <XMarkIcon className="h-5 w-5" />
            <span className="truncate">I don't know</span>
          </button>
          <button className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-3 text-[11px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-200 active:scale-95 sm:py-4 sm:text-xs md:py-3">
            <CheckIcon className="h-5 w-5" />
            <span className="truncate">I know</span>
          </button>
        </div>
      </section>
      <StudentBottomNav />
    </main>
  )
}
