import Navbar from "../Components/Navbar";

export default function CreateLesson() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
      <Navbar />
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto mt-6 px-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-800">Create Lesson</h2>
        <p className="text-sm text-gray-500 mt-1">Add Vocabulary (1/15)</p>
        <div className="mt-4 flex flex-col gap-1">
          <label className="text-[13px] font-semibold text-gray-700">Word</label>
          <input
            type="text"
            placeholder="Enter word"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <label className="text-[13px] font-semibold text-gray-700">Definition</label>
          <textarea
            placeholder="Enter definition"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-20"
          />
        </div>
        <button className="w-full mt-4 py-3 rounded-xl bg-violet-100 text-violet-700 text-[13px] font-semibold">
          + Add Word
        </button>
        <button className="w-full mt-6 py-3 rounded-xl bg-violet-600 text-white text-[13px] font-semibold">
          Next: Generate Quiz
        </button>
      </div>
    </div>
  );
}