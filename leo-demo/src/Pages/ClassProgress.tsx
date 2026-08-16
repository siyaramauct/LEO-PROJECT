import Navbar from "../Components/Navbar";

export default function ClassProgress() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gray-50">
      <Navbar />
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto mt-6 px-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-800">Class Progress</h2>

        <div className="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
          Grade 10 Science
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="w-40 h-40 rounded-full border-8 border-violet-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-800">72%</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Average Class Score</p>
        </div>

        <div className="mt-6 flex gap-4">
          <div className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-center">
            <p className="text-[11px] text-gray-500">Lessons Completed</p>
            <p className="text-lg font-bold text-gray-800">8/12</p>
          </div>
          <div className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-center">
            <p className="text-[11px] text-gray-500">Quizzes Taken</p>
            <p className="text-lg font-bold text-gray-800">45</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-gray-800 mt-6">Highest Performing Students</h3>

        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-sm text-gray-700">1. Lisa Klopper</span>
            <span className="text-sm font-semibold text-green-600">92%</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-sm text-gray-700">2. Thando Zulu </span>
            <span className="text-sm font-semibold text-green-600">88%</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-sm text-gray-700">3. Mia Gasoer r</span>
            <span className="text-sm font-semibold text-green-600">85%</span>
          </div>
        </div>

        <button className="w-full mt-6 py-3 rounded-xl bg-violet-600 text-white text-[13px] font-semibold">
          View All Students
        </button>
      </div>
    </div>
  );
}